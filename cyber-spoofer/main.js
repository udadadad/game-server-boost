const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { exec, execSync } = require('child_process');
const fs = require('fs-extra');

let mainWindow;

// Force Admin elevation
function checkAdmin() {
    try {
        execSync('fltmc');
        return true;
    } catch (e) {
        return false;
    }
}

if (!checkAdmin()) {
    const exePath = process.argv[0];
    const args = process.argv.slice(1).map(arg => `"${arg}"`).join(' ');
    const elevateCmd = `powershell -Command "Start-Process '${exePath}' -ArgumentList ${args || "''"} -Verb RunAs"`;
    exec(elevateCmd, () => {
        app.quit();
    });
    return;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 600,
        frame: false,
        backgroundColor: '#050505',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('src/index.html');
}

app.whenReady().then(createWindow);

ipcMain.handle('run-spoof', async () => {
    return new Promise((resolve) => {
        const scriptPath = path.join(__dirname, 'scripts', 'main_spoof.ps1');
        // Execute with high priority and bypass
        const cmd = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`;

        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                resolve({ success: false, message: err.message });
            } else {
                resolve({ success: true, log: stdout });
            }
        });
    });
});

ipcMain.on('window-controls', (event, action) => {
    if (action === 'close') app.quit();
    if (action === 'minimize') mainWindow.minimize();
});
