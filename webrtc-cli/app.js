const { app, BrowserWindow, Menu, dialog } = require('electron')
const path = require('path')
const url = require('url')
const ipc = require('electron').ipcMain
const fs = require("fs")

let win
let status = 0
app.once('ready', () => {
    win = new BrowserWindow({
        width: 400,
        height: 250,
        backgroundColor: '#D6D8DC',
        // resizable: false,
        // minimizable: false,
        // maximizable: false,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        }
    })
    Menu.setApplicationMenu(null)

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))
    win.webContents.openDevTools() // fot test
    win.once('ready-to-show', () => {
        win.show()
    })
    win.on('close', function (e) {
        if (status == 0) {
            if (win) {
                e.preventDefault()
                win.webContents.send('app-close')
            }
        }
    })
})

ipc.on('closed', _ => {
    status = 1
    win = null
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

ipc.on('showMsg', (_, msg) => {
    showMsg(msg)
})

function showMsg(msg) {
    dialog.showMessageBoxSync({ message: msg })
}

ipc.handle('dir', (event) => {
    let dir = dialog.showOpenDialogSync({ properties: ['openDirectory'] })
    if (dir) {
        root = dir[0]
    }
    return dir
})

ipc.handle('checkDir', (event, dir) => {
    return fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()
})

let root
ipc.handle('listFiles', (event, dir) => {
    if (!dir || dir == 'root') {
        dir = root
    }
    if (dir.startsWith('root')) {
        dir = dir.replace('root', root)
    }
    console.log(dir)
    let list = []
    fs.readdirSync(dir).filter(file => {
        try {
            fs.lstatSync(path.join(dir, file))
            return true
        } catch (error) {
            return false
        }
    }).sort((a, b) => {
        let aIsDir = fs.lstatSync(path.join(dir, a)).isDirectory(),
            bIsDir = fs.lstatSync(path.join(dir, b)).isDirectory()

        if (aIsDir && !bIsDir) {
            return -1
        }

        if (!aIsDir && bIsDir) {
            return 1
        }
        return a.localeCompare(b)
    }).forEach(file => {
        let filePath = path.join(dir, file)
        let stat = fs.lstatSync(filePath)
        list.push({
            name: file,
            dir: stat.isDirectory(),
            size: stat.size,
            updated: stat.mtime
        })
    })
    return { parent: dir.replace(root, 'root'), files: list }
})

ipc.handle('fileInfo', (event, filepath) => {
    let realPath = filepath
    if (realPath.startsWith('root')) {
        realPath = realPath.replace('root', root)
    }
    console.log("fileInfo:" + realPath)
    let stat = fs.lstatSync(realPath)
    if (stat.isDirectory()) {
        return undefined
    }
    return { filepath: filepath, name: path.basename(realPath), size: stat.size }
})

ipc.on('download', (event, task) => {
    let filepath = task.filepath
    if (filepath.startsWith('root')) {
        filepath = filepath.replace('root', root)
    }
    const readStream = fs.createReadStream(filepath)
    readStream.on('data', chunk => {
        task.received += chunk.length
        win.webContents.send('sendData', task, chunk)
    })
})