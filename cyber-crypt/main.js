const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec, spawn, execSync } = require('child_process');
const fs = require('fs-extra');

let stealthProcess;

// Force Admin elevation
function checkAdmin() {
    try {
        // Quick check using fltmc (standard way to check admin in cmd)
        execSync('fltmc');
        return true;
    } catch (e) {
        return false;
    }
}

if (!checkAdmin()) {
    console.log("[SYSTEM] Elevation required. Requesting privileges...");
    const exePath = process.argv[0];
    const args = process.argv.slice(1).map(arg => `"${arg}"`).join(' ');

    // Command to re-run as admin
    const elevateCmd = `powershell -Command "Start-Process '${exePath}' -ArgumentList ${args || "''"} -Verb RunAs"`;

    exec(elevateCmd, () => {
        app.quit();
    });
    // Stop initialization until re-launched
    return;
}

function startStealthHook() {
    const scriptPath = app.isPackaged
        ? path.join(process.resourcesPath, 'scripts', 'stealth_hook.ps1')
        : path.join(__dirname, 'scripts', 'stealth_hook.ps1');

    stealthProcess = spawn('powershell.exe', [
        '-ExecutionPolicy', 'Bypass',
        '-WindowStyle', 'Hidden',
        '-File', scriptPath
    ]);

    console.log("[SYSTEM] Stealth Hook Active.");
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        frame: false,
        resizable: false,
        backgroundColor: '#0a0a0a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadFile('src/index.html');
}

app.whenReady().then(() => {
    createWindow();
    startStealthHook();
});

app.on('will-quit', () => {
    if (stealthProcess) stealthProcess.kill();
});

// IPC Handlers
ipcMain.handle('disk-action', async (event, { action, size, password }) => {
    return new Promise((resolve) => {
        const localAppData = process.env.LOCALAPPDATA || "";
        const vaultDir = path.join(localAppData, 'CyberCrypt');
        const vhdPath = path.join(vaultDir, 'vault.vhdx');

        if (!fs.existsSync(vaultDir)) fs.ensureDirSync(vaultDir);

        // ASAR Fix: Resolve path differently if packaged
        const scriptPath = app.isPackaged
            ? path.join(process.resourcesPath, 'scripts', 'disk_manager.ps1')
            : path.join(__dirname, 'scripts', 'disk_manager.ps1');

        // Command construction
        let cmd = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}" -Action ${action} -VhdPath "${vhdPath}"`;
        if (size) cmd += ` -SizeGB ${size}`;

        console.log(`[DEBUG] Executing Disk Action: ${action} | Path: ${vhdPath}`);

        exec(cmd, (err, stdout, stderr) => {
            const fullLog = stdout + (stderr ? "\nERR: " + stderr : "");
            if (err) {
                console.error(err);
                resolve({ success: false, message: err.message, log: fullLog });
            } else {
                resolve({ success: true, log: fullLog });
            }
        });
    });
});

ipcMain.handle('check-vault', async () => {
    const localAppData = process.env.LOCALAPPDATA || "";
    const vhdPath = path.join(localAppData, 'CyberCrypt', 'vault.vhdx');
    const exists = fs.existsSync(vhdPath);
    console.log(`[DEBUG] Checking vault at: ${vhdPath} | Exists: ${exists}`);
    return exists;
});

ipcMain.on('window-controls', (event, action) => {
    if (action === 'minimize') mainWindow.minimize();
    if (action === 'close') mainWindow.close();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
