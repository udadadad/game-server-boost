const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getApps: () => ipcRenderer.invoke('get-apps'),
    checkUpdates: () => ipcRenderer.invoke('check-updates'),
    downloadApp: (appId) => ipcRenderer.invoke('download-app', appId),
    launchApp: (appId) => ipcRenderer.invoke('launch-app', appId),
    uninstallApp: (appId) => ipcRenderer.invoke('uninstall-app', appId),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    toggleAutostart: (enabled) => ipcRenderer.invoke('toggle-autostart', enabled),
    openDownloads: () => ipcRenderer.invoke('open-downloads'),
    cleanCache: () => ipcRenderer.invoke('clean-cache'),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, data) => callback(data)),
    send: (channel, data) => ipcRenderer.send(channel, data)
});
