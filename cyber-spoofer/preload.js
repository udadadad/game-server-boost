const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    runSpoof: () => ipcRenderer.invoke('run-spoof'),
    send: (channel, data) => ipcRenderer.send(channel, data)
});
