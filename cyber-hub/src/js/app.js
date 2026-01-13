const appGrid = document.getElementById('app-grid');
const refreshBtn = document.getElementById('refresh-btn');
const downloadOverlay = document.getElementById('download-overlay');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

async function renderApps() {
    const config = await window.api.getApps();
    appGrid.innerHTML = '';

    config.apps.forEach(app => {
        const card = document.createElement('div');
        card.className = 'app-card';

        let versionStatus = 'Available';
        let badgeClass = 'uptodate';

        if (app.installed) {
            versionStatus = app.updateRequired ? 'Update Required' : 'Up to Date';
            badgeClass = app.updateRequired ? 'update-required' : 'uptodate';
        }
        const btnText = app.installed ? (app.updateRequired ? 'UPDATE' : 'LAUNCH') : 'DOWNLOAD';
        const btnClass = 'primary-btn';

        card.innerHTML = `
            ${app.installed ? `<button class="uninstall-btn-top" onclick="handleUninstall('${app.id}')" title="Uninstall">×</button>` : ''}
            <div class="app-name">${app.name}</div>
            <div class="app-desc">${app.description}</div>
            <div class="app-meta">
                <span class="version-badge ${badgeClass}">${versionStatus}</span>
                <button class="${btnClass}" onclick="handleAppAction('${app.id}', ${app.installed}, ${app.updateRequired})">${btnText}</button>
            </div>
        `;
        appGrid.appendChild(card);
    });
}

async function handleUninstall(appId) {
    if (confirm("Are you sure you want to uninstall this application?")) {
        const result = await window.api.uninstallApp(appId);
        if (result.success) {
            renderApps();
        } else {
            alert("Error: " + result.message);
        }
    }
}

async function handleAppAction(appId, installed, updateRequired) {
    if (!installed || updateRequired) {
        const downloadTitle = document.getElementById('download-title');
        // Show overlay
        downloadOverlay.style.display = 'flex';
        downloadTitle.innerText = 'Downloading App...';
        progressBar.style.width = '0%';
        progressText.innerText = '0%';

        const result = await window.api.downloadApp(appId);

        if (result.success) {
            progressBar.style.width = '100%';
            progressText.innerText = '100%';
            downloadTitle.innerText = 'Preparing...';

            // Automatically trigger the installation/first-run logic
            window.api.launchApp(appId);

            // Wait for 3 seconds to give the silent installer time to initialize
            await new Promise(resolve => setTimeout(resolve, 3000));

            downloadOverlay.style.display = 'none';
            renderApps();
        } else {
            downloadOverlay.style.display = 'none';
            alert("Error downloading app: " + result.message);
        }
    } else {
        const result = await window.api.launchApp(appId);
        if (!result.success) {
            alert("Error launching app: " + result.message);
            // Re-check updates if launch failed might be a missing file
            checkUpdates();
        }
    }
}

async function checkUpdates() {
    refreshBtn.innerText = 'Checking...';
    refreshBtn.disabled = true;

    await window.api.checkUpdates();
    await renderApps();

    refreshBtn.innerText = 'Check for Updates';
    refreshBtn.disabled = false;
}

const navApps = document.getElementById('nav-apps');
const navSettings = document.getElementById('nav-settings');
const viewApps = document.getElementById('view-apps');
const viewSettings = document.getElementById('view-settings');

// Settings Elements
const settingAutostart = document.getElementById('setting-autostart');
const btnCleanCache = document.getElementById('btn-clean-cache');
const btnOpenFolder = document.getElementById('btn-open-folder');

// Tab Switching
navApps.onclick = () => {
    navApps.classList.add('active');
    navSettings.classList.remove('active');
    viewApps.style.display = 'block';
    viewSettings.style.display = 'none';
};

navSettings.onclick = async () => {
    navSettings.classList.add('active');
    navApps.classList.remove('active');
    viewSettings.style.display = 'block';
    viewApps.style.display = 'none';

    // Load Settings
    const settings = await window.api.getSettings();
    settingAutostart.checked = settings.autostart;
};

// Settings Logic
settingAutostart.onchange = async () => {
    await window.api.toggleAutostart(settingAutostart.checked);
};

btnOpenFolder.onclick = () => {
    window.api.openDownloads();
};

btnCleanCache.onclick = async () => {
    const res = await window.api.cleanCache();
    if (res.success) alert("Installer cache cleared!");
};

// Event Listeners
refreshBtn.onclick = checkUpdates;

window.api.onDownloadProgress((data) => {
    progressBar.style.width = data.progress + '%';
    progressText.innerText = data.progress + '%';
});

// Initial Load
renderApps().then(() => {
    // Auto check updates on start
    checkUpdates();
});
