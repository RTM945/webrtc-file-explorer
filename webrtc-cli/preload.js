const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
    'electron', {
        send: (channel, ...args) => {
            ipcRenderer.send(channel, ...args)
        },
        on: (channel, func) => {
            ipcRenderer.on(channel, (event, ...args) => func(...args))
        },
        sendSync: (channel, data, callback) => {
            callback(ipcRenderer.sendSync(channel, data))
        },
        invoke: async (event, ...args) => {
            const result = await ipcRenderer.invoke(event, ...args)
            return result
        }
    }
)

// //renderer
// const result = await ipcRenderer.invoke('my-event', arg1, arg2)

// //main
// ipcMain.handler('my-event', async (arg1, arg2) => {
//     const result = await doSomething(arg1, arg2)
//     return result
// })

// //renderer
// ipcRenderer.send('my-event', arg1, arg2)
// ipcRenderer.on('his-event', (arg) => {
//     doSomething(arg)
// })

// //main
// ipcMain.on('my-event', (arg, arg2) => {
//     const result = doOtherthing(arg)
//     window.webContents.send('his-event', result)
// })
