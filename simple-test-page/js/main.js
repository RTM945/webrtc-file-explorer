const servers = { iceServers: [{ "urls": ["stun:stun.l.google.com:19302"] }] }
const downloadTasks = new Map()

var stompClient = null
var protocolDataChannel = null

function connect(token) {
    if (token == '') {
        return
    }

    let type = 'offer'
    let socket = new SockJS('http://localhost:8080/signalling')
    stompClient = Stomp.over(socket)
    stompClient.connect({
        "token": token,
        "type": type,
    }, async (frame) => {
        console.log(`Connected: ${frame}`)
        let pc = createPeer()
        stompClient.subscribe('/user/queue/onsdp', msg => onsdp(msg, pc))
        stompClient.subscribe('/user/queue/oncandidate', msg => oncandidate(msg, pc))
        await pc.setLocalDescription(await pc.createOffer())
        stompClient.send("/app/sdp", {}, JSON.stringify({ remote: '', value: JSON.stringify(pc.localDescription) }))
    }, (frame) => {
        console.log(`Connect failue: ${frame}`)
    })
}

function createPeer() {
    let pc = new RTCPeerConnection(servers)
    console.log(pc)
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            stompClient.send("/app/candidate", {}, JSON.stringify({ remote: '', value: JSON.stringify(event.candidate) }))
        } else {
            console.log("Sent All Ice")
        }
    }
    let channel = pc.createDataChannel('protocol')
    protocolDataChannel = channel
    console.log("offer protocol data channel created!")
    channel.onmessage = event => handle(event.data)
    pc.ondatachannel = ({ channel }) => {
        if (channel.label.startsWith('download')) {
            recieveData(channel)
        }
    }
    return pc
}

async function onsdp(msg, pc) {
    console.log(msg.body)
    let dto = JSON.parse(msg.body)
    let remote = dto.remote
    let desc = JSON.parse(dto.value)
    await pc.setRemoteDescription(new RTCSessionDescription(desc))
}

function oncandidate(msg, pc) {
    console.log(msg)
    if (msg.body) {
        let dto = JSON.parse(msg.body)
        let candidate = dto.value
        pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
    }
}

function handle(data) {
    console.log(data)
    let protocol = JSON.parse(data)
    if (protocol.handler == 'listFiles') {
        listFiles(protocol.data)
    }
    if (protocol.handler == 'download') {
        let fileInfo = protocol.data
        let task = downloadTasks.get(fileInfo.filepath)
        console.log(`task ${task}`)
        if (task) {
            task.name = fileInfo.name
            task.size = fileInfo.size
            setProgress(task)
        }
    }
}

function listFiles(data) {
    $('#tokenModel').modal('hide')
    $('#tasks').hide()
    $('#main').show()
    $('#files').show()
    let table = $('#files > tbody')
    let breadcrumb = $('#breadcrumb')
    breadcrumb.show()
    let parents = data.parent.split('/')
    breadcrumb.html('')
    breadcrumb.append(`<li><a href="javascript:void(0)" onclick="return listFilesReq('root')">root</a></li>`)
    let traval = 'root'
    for (let i = 1; i < parents.length; i++) {
        const parent = parents[i]
        traval += '/' + parent
        breadcrumb.append(`<li><a href="javascript:void(0)" onclick="return listFilesReq('${traval}')">${parent}</a></li>`)
    }
    let tablecontents = ''
    data.files.forEach(file => {
        tablecontents += '<tr>'
        if (file.dir) {
            tablecontents += `<td data-dir='true'><span class="glyphicon glyphicon-folder-close" aria-hidden="true"></span>  ${file.name}</td>`
            tablecontents += '<td> - </td>'
            tablecontents += '<td> - </td>'
        } else {
            tablecontents += `<td data-dir='false'><span class="glyphicon glyphicon-file" aria-hidden="true"></span> ${file.name}</td>`
            tablecontents += '<td>' + formatBytes(file.size) + '</td>'
            tablecontents += '<td>' + file.updated + '</td>'
        }
        tablecontents += '</tr>'
    })
    table.html(tablecontents)
    table.off('dblclick', 'td')
    table.on('dblclick', 'td', function () {
        let td = $(this)
        let path = data.parent + '/' + td.text().trim()
        if (td.data('dir')) {
            listFilesReq(path)
        } else {
            if (confirm(`确认下载${td.text().trim()}?`)) {
                download(path)
            }
        }
    })
}

function formatBytes(bytes, decimals) {
    if (bytes == 0) return '0 Bytes'
    let k = 1024,
        dm = decimals <= 0 ? 0 : decimals || 2,
        sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

function listFilesReq(path) {
    protocolDataChannel.send(JSON.stringify({ handler: 'listFiles', data: path }))
}

function setProgress(task) {
    let table = $('#tasks > tbody')
    let tr =
        `<tr>
            <td>${task.name}</td>
            <td>
                <div class="progress">
                    <div id="${task.name}-progress" class="progress-bar" 
                        role="progressbar" role="progressbar" 
                        aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%">
                    </div>
                </div>
            </td>
            <td><span class="glyphicon glyphicon-remove" aria-hidden="true"></span> 取消</td>
        </tr>`
    table.append(tr)
}

function showTasks() {
    $('#files').hide()
    $('#breadcrumb').hide()
    $('#tasks').show()
}

function download(path) {
    if (downloadTasks.has(path)) {
        alert('正在下载中')
        return
    }
    downloadTasks.set(path, { path: path, name: '', size: 0, recieved: 0, buffer: [] })
    protocolDataChannel.send(JSON.stringify({ handler: 'download', data: path }))
}

function recieveData(channel) {
    let path = channel.label.split('-')[1]
    let myTask = downloadTasks.get(path)
    if (myTask) {
        channel.binaryType = 'arraybuffer'
        channel.onmessage = ({ data }) => {
            console.log(`${myTask.name} recieve ${data.byteLength} bytes`)
            myTask.recieved += data.byteLength
            myTask.buffer.push(data)
            let progress = Math.ceil(myTask.recieved / myTask.size * 100)
            $('#' + $.escapeSelector(`${myTask.name}-progress`)).css('width', progress + '%').attr('aria-valuenow', progress)
        }
        channel.onclose = _ => {
            console.log(`size: ${myTask.size}, recieved: ${myTask.recieved}`)
            if (myTask.recieved == myTask.size) {
                const blob = new Blob(myTask.buffer, { type: "application/octet-stream" })
                saveAs(blob, myTask.name)
            } else {
                console.log(`download failed, ${path} channel closed`)
            }
            myTask.buffer = []
            downloadTasks.delete(myTask.path)
        }
    }
}

function saveAs(blob, fileName) {
    var url = window.URL.createObjectURL(blob);

    var anchorElem = document.createElement("a");
    anchorElem.style = "display: none";
    anchorElem.href = url;
    anchorElem.download = fileName;

    document.body.appendChild(anchorElem);
    anchorElem.click();

    document.body.removeChild(anchorElem);

    // On Edge, revokeObjectURL should be called only after
    // a.click() has completed, atleast on EdgeHTML 15.15048
    setTimeout(function () {
        window.URL.revokeObjectURL(url);
    }, 1000);
}