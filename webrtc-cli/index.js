const peerMap = new Map()
const channels = new Map()
const peer_channel = new Map()
const tasks = new Map()

// const servers = { iceServers: [{ "urls": ["stun:stun.l.google.com:19302"] }] }
var stompClient = null

function connect(signal) {
    let token = 1//makeid(6)
    let type = 'answer'
    let socket = new SockJS(signal)
    stompClient = Stomp.over(socket)
    stompClient.connect({
        "token": token,
        "type": type,
    }, _ => {
        $('#fileRoot').prop('readonly', true)
        $('#dirBtn').off()
        stompClient.subscribe('/user/queue/onsdp', onsdp)
        stompClient.subscribe('/user/queue/oncandidate', oncandidate)

        showMsg("connect success, your token: " + token)
        document.title = document.title + ' ' + token
    }, _ => {
        showMsg("connect failue")
        stompClient = null
    })
}

async function onsdp(msg) {
    let dto = JSON.parse(msg.body)
    console.log(dto)
    let remote = dto.remote
    let desc = JSON.parse(dto.value)
    if (desc.type == 'offer') {
        let pc = createPeer(remote)
        await pc.setRemoteDescription(new RTCSessionDescription(desc))
        await pc.setLocalDescription(await pc.createAnswer())
        pc.setRemoteDescription(new RTCSessionDescription(desc))
        stompClient.send("/app/sdp", {}, JSON.stringify({ remote: remote, value: JSON.stringify(pc.localDescription) }))
    }
}

function oncandidate(msg) {
    console.log(msg.body)
    let dto = JSON.parse(msg.body)
    let remote = dto.remote
    let candidate = dto.value
    let pc = peerMap.get(remote)
    console.log('oncandidate get ' + pc)
    if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)))
    }
}

function createPeer(remote) {
    // let pc = new RTCPeerConnection(servers)
    let pc = new RTCPeerConnection(null)
    console.log(pc)
    peerMap.set(remote, pc)
    peer_channel.set(remote, new Array())
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            stompClient.send("/app/candidate", {}, JSON.stringify({ remote: remote, value: JSON.stringify(event.candidate) }))
        } else {
            console.log("Sent All Ice")
        }
    }
    pc.ondatachannel = async ({ channel }) => {
        const label = channel.label
        console.log(`answer data channel ${label} created!`)
        if (label == 'protocol') {
            channel.onmessage = ({ data }) => handler(data, channel, remote)
            const files = await listFiles()
            channel.send(JSON.stringify({ handler: 'listFiles', data: files }))
        }
    }
    pc.onconnectionstatechange = (event) => {
        console.log(`${remote} pc ${pc.connectionState}`)
        if (pc.connectionState == 'disconnected' || pc.connectionState == 'failed') {
            peerMap.delete(remote)
            let channelIds = peer_channel.get(remote)
            if (channelIds) {
                channelIds.forEach(channelId => {
                    const channel = channels.get(channelId)
                    if (channel) {
                        channel.close()
                    }
                    channels.delete(channelId)
                })
            }
            peer_channel.delete(remote)
        }
    }
    return pc
}

async function handler(protocol, channel, remote) {
    console.log(protocol)
    protocol = JSON.parse(protocol)
    if (protocol.handler == 'listFiles') {
        const files = await listFiles(protocol.data)
        channel.send(JSON.stringify({ handler: 'listFiles', data: files }))
    }
    if (protocol.handler == 'download') {
        const fileInfo = await window.electron.invoke('fileInfo', protocol.data)
        console.log(fileInfo)
        if (!fileInfo) {
            console.log('fail access ' + protocol.data)
            return
        }
        channel.send(JSON.stringify({ handler: 'download', data: fileInfo }))
        download(protocol.data, fileInfo.size, remote)
    }
}

async function listFiles(dir) {
    const files = await window.electron.invoke('listFiles', dir)
    return files
}

const MAX_CHUNK_SIZE = 262144;
async function download(filepath, size, remote) {
    let pc = peerMap.get(remote)
    if (!pc) {
        console.log(`no peerconnection for ${remote}`)
        return
    }
    const channelId = nextChannelId()
    let channel = pc.createDataChannel(`download-${filepath}`)
    let task = {
        filepath: filepath,
        chunkSize: 0,
        lowWaterMark: 0,
        highWaterMark: 0,
        bufferedAmount: 0,
        size: size,
        received: 0,
        send: 0,
        buffered: [],
        channelId: channelId,
        pause: false
    }
    tasks.set(channelId, task)
    channel.onopen = () => {
        task.chunkSize = Math.min(pc.sctp.maxMessageSize, MAX_CHUNK_SIZE)
        task.lowWaterMark = task.chunkSize
        task.highWaterMark = Math.max(task.chunkSize * 8, 1048576)
        console.log('Send buffer low water threshold: ', task.lowWaterMark)
        console.log('Send buffer high water threshold: ', task.highWaterMark)
        channel.bufferedAmountLowThreshold = task.lowWaterMark
        channel.onbufferedamountlow = (e) => {
            console.log('BufferedAmountLow event:', e);
            if (task.pause) {
                task.pause = false
                sendData(channel, task)
            }
        }
        console.log(`channelId ${channelId}`)
        channels.set(channelId, channel)
        peer_channel.get(remote).push(channelId)
        channel.binaryType = 'arraybuffer'
        channel.onclose = () => {
            console.log(`remote ${remote} channel ${channel.label} close`)
            channels.delete(channelId)
        }
    }

    window.electron.send('download', task)
}

window.electron.on('sendData', (channelId, data) => {
    const channel = channels.get(channelId)
    const task = tasks.get(channelId)
    if (channel && task) {
        task.received += data.length
        task.buffered.push(data)
        sendData(channel, task)
    }
    // if (channel && task && channel.readyState == 'open') {
    //     channel.send(data)
    //     console.log(`${task.received} / ${task.size}`)
    //     if (task.received == task.size) {
    //         console.log('send finished')
    //         channel.close()
    //     }
    // }
})

function sendData(channel, task) {
    console.log(task.pause)
    if (task.pause) {
        return
    }
    if (channel.readyState == 'open') {
        let bufferedAmount = channel.bufferedAmount;
        let data = task.buffered.shift()
        while (data) {
            channel.send(data.buffer);
            task.send += data.length;
            bufferedAmount += data.length;
            console.log(`${task.send} / ${task.size}`)
            if (bufferedAmount >= task.highWaterMark) {
                // if (channel.bufferedAmount < task.lowWaterMark) {
                //     task.pause = true;
                //     // task.timeout = setTimeout(() => sendData(channel, task), 0);
                // }
                task.pause = true;
                console.log(`Paused sending, buffered amount: ${task.bufferedAmount} (announced: ${channel.bufferedAmount})`);
                break;
            }
            data = task.buffered.shift()
        }
    }
    if (task.send == task.size) {
        console.log('send finished')
        channel.close()
    }
}

window.electron.on('readFileErr', (task, err) => {
    console.log(err)
    const channel = channels.get(task.channelId)
    if (channel && channel.readyState == 'open') {
        channel.send(JSON.stringify({ handler: 'downloaderr', data: err }))
        channel.close()
    }
})

function showMsg(msg) {
    window.electron.send('showMsg', msg)
}

function makeid(length) {
    let result = ''
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let charactersLength = characters.length
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }
    return result
}

var nextChannelId = function () {
    let channelId = 0
    return function () {
        channelId++
        return channelId
    }
}()

window.electron.on('app-close', _ => {
    if (stompClient != null) {
        stompClient.disconnect(_ => {
            showMsg("Bye~")
        })
    }
    window.electron.send('closed')
})

$('#connectBtn').on('click', async _ => {
    let signalServer = $('#signal').val()
    signalServer = 'http://localhost:8080/signalling' //for test
    if (signalServer == '') {
        showMsg("signal server address can't be null!")
        return
    }
    const check = await window.electron.invoke('checkDir', $('#fileRoot').val())
    if (!check) {
        showMsg("wrong file root!")
        return
    }
    if (stompClient != null) {
        window.showMsg("already connected!")
        return
    }
    connect(signalServer)

})

$('#dirBtn').on('click', async _ => {
    const path = await window.electron.invoke('dir')
    if (path) {
        $('#fileRoot').val(path)
    }
})
