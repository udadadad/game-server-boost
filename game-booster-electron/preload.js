const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    invoke: (channel, data) => {
        const validChannels = [
            'auth-login', 'auth-register', 'auth-activate', 'auth-get-license',
            'run-boost', 'run-restore',
            'get-system-specs', 'auto-calibrate',
            'get-processes', 'kill-process', 'scan-games',
            'get-usage-stats', 'save-settings', 'app-get-version'
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
    },
    onUpdateReady: (callback) => ipcRenderer.on('update-ready', (event, notes) => callback(notes)),
    onAutoBoostStatus: (callback) => ipcRenderer.on('auto-boost-status', (event, status) => callback(status)),
    onRestoreTrigger: (callback) => ipcRenderer.on('trigger-restore', (event) => callback()),
    onLicenseExpired: (callback) => ipcRenderer.on('license-expired', (event) => callback()),
    // Expose System Info later
    on: (channel, func) => {
        const validChannels = ['overlay-update', 'update-opacity', 'log-message'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    send: (channel, data) => {
        const validChannels = ['window-minimize', 'window-maximize', 'window-close'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    }
});

