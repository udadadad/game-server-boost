const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    diskAction: (data) => ipcRenderer.invoke('disk-action', data),
    checkVault: () => ipcRenderer.invoke('check-vault'),
    send: (channel, data) => ipcRenderer.send(channel, data)
});
