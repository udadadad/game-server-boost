const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const { download } = require('electron-dl');
const { exec, execSync } = require('child_process');

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
const APPS_CONFIG = path.join(app.getPath('userData'), 'apps_config.json');
const DOWNLOADS_DIR = path.join(app.getPath('userData'), 'apps_bin');

// Ensure directories exist
fs.ensureDirSync(DOWNLOADS_DIR);

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        backgroundColor: '#000000',
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadFile('src/index.html');
}

app.whenReady().then(() => {
    // Initial config setup & Migration
    const defaultApps = [
        {
            id: "cyberboost",
            name: "CyberBoost PRO",
            description: "Ultimate Game Optimizer with Live Monitoring.",
            github: "udadadad/game-booster",
            exeName: "Setup",
            installPath: "Programs\\BoosterPRO\\BoosterPRO.exe",
            localVersion: "0.0.0",
            installed: false,
            path: ""
        },
        {
            id: "cyberspoofer",
            name: "CyberSpoofer PRO",
            description: "Advanced Hardware ID & MAC Address Spoofer.",
            github: "udadadad/cyber-spoofer",
            exeName: "CyberSpoofer.Setup",
            installPath: "Programs\\cyber-spoofer\\CyberSpoofer.exe",
            localVersion: "0.0.0",
            installed: false,
            path: ""
        },
        {
            id: "cybercrypt",
            name: "CyberCrypt PRO",
            description: "Hidden & Encrypted Secret Vault for your files.",
            github: "udadadad/cyber-crypt",
            exeName: "CyberCrypt.PRO.Setup",
            installPath: "Programs\\cyber-crypt\\CyberCrypt.exe",
            localVersion: "0.0.0",
            installed: false,
            path: ""
        }
    ];

    if (!fs.existsSync(APPS_CONFIG)) {
        fs.writeJsonSync(APPS_CONFIG, { apps: defaultApps });
    } else {
        // Migration: Add missing apps AND missing fields
        const config = fs.readJsonSync(APPS_CONFIG);
        let changed = false;

        // 1. Add new apps from defaultApps
        defaultApps.forEach(defaultApp => {
            const exists = config.apps.find(a => a.id === defaultApp.id);
            if (!exists) {
                config.apps.push(defaultApp);
                changed = true;
            }
        });

        // 2. Add/Update fields in existing apps
        config.apps = config.apps.map(app => {
            const defaultApp = defaultApps.find(d => d.id === app.id);
            if (defaultApp) {
                // Force update these critical fields
                const fieldsToForce = ['installPath', 'exeName', 'github'];
                fieldsToForce.forEach(f => {
                    if (app[f] !== defaultApp[f]) {
                        app[f] = defaultApp[f];
                        changed = true;
                    }
                });

                for (let key in defaultApp) {
                    if (app[key] === undefined) {
                        app[key] = defaultApp[key];
                        changed = true;
                    }
                }
            }
            return app;
        });

        if (changed) fs.writeJsonSync(APPS_CONFIG, config);
    }
    createWindow();
});

// IPC Handlers
ipcMain.handle('get-apps', async () => {
    return fs.readJsonSync(APPS_CONFIG);
});

ipcMain.handle('check-updates', async () => {
    const config = fs.readJsonSync(APPS_CONFIG);
    const updatedApps = [];
    const localAppData = process.env.LOCALAPPDATA || "";

    for (let appObj of config.apps) {
        // DETECT IF INSTALLED MANUALLY
        const installPath = appObj.installPath || "";
        const possiblePaths = [
            path.join(localAppData, installPath),
            path.join(localAppData, installPath.replace('Programs\\', ''))
        ];

        if (possiblePaths.some(p => fs.existsSync(p))) {
            appObj.installed = true;
        }

        try {
            const response = await axios.get(`https://api.github.com/repos/${appObj.github}/releases/latest`);
            const latestTag = response.data.tag_name.replace('v', '');
            appObj.latestVersion = latestTag;

            // 1. Look for explicit keyword (e.g. "Portable")
            let asset = response.data.assets.find(a =>
                a.name.toLowerCase().includes(appObj.exeName.toLowerCase()) &&
                a.name.toLowerCase().endsWith('.exe')
            );

            // 2. Fallback: Take any .exe that doesn't have "setup" or "install" in the name
            if (!asset) {
                asset = response.data.assets.find(a =>
                    a.name.toLowerCase().endsWith('.exe') &&
                    !a.name.toLowerCase().includes('setup') &&
                    !a.name.toLowerCase().includes('install')
                );
            }

            if (asset) {
                appObj.downloadUrl = asset.browser_download_url;
                appObj.assetName = asset.name;
            } else {
                appObj.downloadUrl = null;
            }

            if (appObj.installed && appObj.localVersion !== latestTag) {
                appObj.updateRequired = true;
            } else {
                appObj.updateRequired = false;
            }
            updatedApps.push(appObj);
        } catch (e) {
            console.error(`Error checking update for ${appObj.name}:`, e.message);
            updatedApps.push(appObj);
        }
    }

    config.apps = updatedApps;
    fs.writeJsonSync(APPS_CONFIG, config);
    return config;
});

ipcMain.handle('download-app', async (event, appId) => {
    const config = fs.readJsonSync(APPS_CONFIG);
    const appObj = config.apps.find(a => a.id === appId);
    if (!appObj || !appObj.downloadUrl) return { success: false, message: "Download URL not found" };

    const win = BrowserWindow.getFocusedWindow();

    try {
        await download(win, appObj.downloadUrl, {
            directory: DOWNLOADS_DIR,
            filename: appObj.assetName,
            onProgress: (progress) => {
                win.webContents.send('download-progress', { appId, progress: Math.floor(progress.percent * 100) });
            }
        });

        // Update local config
        appObj.localVersion = appObj.latestVersion;
        appObj.installed = true;
        appObj.path = path.join(DOWNLOADS_DIR, appObj.assetName);
        appObj.updateRequired = false;

        fs.writeJsonSync(APPS_CONFIG, config);
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
});

ipcMain.handle('launch-app', async (event, appId) => {
    const config = fs.readJsonSync(APPS_CONFIG);
    const appObj = config.apps.find(a => a.id === appId);

    if (!appObj || !appObj.installed) {
        return { success: false, message: "App not installed" };
    }

    const localAppData = process.env.LOCALAPPDATA || "";
    const installPath = appObj.installPath || "";
    const altInstallPath = installPath.replace('Programs\\', '');

    const possiblePaths = [
        path.join(localAppData, installPath),
        path.join(localAppData, altInstallPath)
    ];

    let installedPath = possiblePaths.find(p => fs.existsSync(p));

    // SMART SEARCH: If not found, look in the directory for ANY .exe
    if (!installedPath) {
        const installDir = path.join(localAppData, path.dirname(installPath));
        if (fs.existsSync(installDir)) {
            const files = fs.readdirSync(installDir);
            const foundExe = files.find(f => f.toLowerCase().endsWith('.exe') && !f.toLowerCase().includes('uninstall'));
            if (foundExe) {
                installedPath = path.join(installDir, foundExe);
            }
        }
    }

    const installerPath = appObj.path;

    // 1. If Update is REQUIRED, always run installer
    if (appObj.updateRequired) {
        if (fs.existsSync(installerPath)) {
            console.log(`[HUB] Updating: Running Silent Installer ${installerPath}`);
            exec(`"${installerPath}" /S`);
            return { success: true, message: "Update started silently." };
        }
    }

    // 2. If already installed, launch the actual EXE
    if (installedPath) {
        console.log(`[HUB] Launching installed app: ${installedPath}`);
        shell.openPath(installedPath);
        return { success: true };
    }

    // 3. Fallback: If installed EXE missing but installer exists, run installer
    if (fs.existsSync(installerPath)) {
        console.log(`[HUB] App exe missing at checked paths. Re-running installer: ${installerPath}`);
        exec(`"${installerPath}" /S`);
        return { success: true, message: "Installation started silently." };
    }

    return { success: false, message: "Application files not found. Checked: " + possiblePaths.join(', ') };
});

ipcMain.handle('uninstall-app', async (event, appId) => {
    const config = fs.readJsonSync(APPS_CONFIG);
    const appObj = config.apps.find(a => a.id === appId);

    if (!appObj) return { success: false, message: "App not found" };

    const localAppData = process.env.LOCALAPPDATA || "";
    const fullInstallPath = path.join(localAppData, appObj.installPath || "");
    const installDir = path.dirname(fullInstallPath);

    if (!fs.existsSync(installDir)) {
        return { success: false, message: "Install directory not found" };
    }

    // Search for any .exe starting with 'Uninstall'
    const files = fs.readdirSync(installDir);
    const uninstallerFile = files.find(f =>
        f.toLowerCase().startsWith('uninstall') &&
        f.toLowerCase().endsWith('.exe')
    );

    if (uninstallerFile) {
        const uninstallerPath = path.join(installDir, uninstallerFile);
        console.log(`[HUB] Uninstalling: Running Silent Uninstaller ${uninstallerPath}`);
        exec(`"${uninstallerPath}" /S`);

        // Clean up local config state
        appObj.installed = false;
        appObj.localVersion = "0.0.0";
        appObj.updateRequired = false;

        fs.writeJsonSync(APPS_CONFIG, config);
        return { success: true };
    }

    return { success: false, message: "Uninstaller not found in " + installDir };
});

ipcMain.handle('get-settings', () => {
    return {
        autostart: app.getLoginItemSettings().openAtLogin
    };
});

ipcMain.handle('toggle-autostart', (event, enabled) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    return true;
});

ipcMain.handle('open-downloads', () => {
    shell.openPath(DOWNLOADS_DIR);
});

ipcMain.handle('clean-cache', () => {
    try {
        const files = fs.readdirSync(DOWNLOADS_DIR);
        files.forEach(f => {
            if (f.toLowerCase().includes('setup') || f.toLowerCase().includes('portable')) {
                fs.removeSync(path.join(DOWNLOADS_DIR, f));
            }
        });
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
});

ipcMain.on('window-controls', (event, action) => {
    if (action === 'close') app.quit();
    if (action === 'minimize') mainWindow.minimize();
});
