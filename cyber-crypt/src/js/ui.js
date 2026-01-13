const vaultCore = document.getElementById('vault-core');
const vaultStatus = document.getElementById('vault-status');
const vaultInfo = document.getElementById('vault-info');
const setupPanel = document.getElementById('setup-panel');
const unlockPanel = document.getElementById('unlock-panel');
const lockPanel = document.getElementById('lock-panel');
const logWindow = document.getElementById('log-window');

const btnCreate = document.getElementById('btn-create');
const btnUnlock = document.getElementById('btn-unlock');
const btnLock = document.getElementById('btn-lock');
const btnDelete = document.getElementById('btn-delete');

const diskSizeInput = document.getElementById('disk-size');
const vaultPassInput = document.getElementById('vault-pass');

function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    logWindow.innerHTML = `[${time}] ${msg}<br>${logWindow.innerHTML}`;
}

async function handleAction(action) {
    const size = diskSizeInput.value;
    const password = vaultPassInput.value;

    addLog(`Initiating ${action.toUpperCase()}...`);

    const result = await window.api.diskAction({ action, size, password });

    if (result.success) {
        addLog(result.log);
        updateUI(action);
    } else {
        addLog(`ERROR: ${result.message}`);
    }
}

function updateUI(action) {
    if (action === 'create' || action === 'mount') {
        vaultCore.className = 'vault-unlocked';
        vaultStatus.innerText = 'VAULT UNLOCKED';
        vaultStatus.style.color = '#50fa7b';
        vaultInfo.innerText = 'Disk mounted. You can now access your files.';
        setupPanel.style.display = 'none';
        unlockPanel.style.display = 'none';
        lockPanel.style.display = 'block';
    } else if (action === 'unmount') {
        vaultCore.className = 'vault-locked';
        vaultStatus.innerText = 'VAULT LOCKED';
        vaultStatus.style.color = '#bd93f9';
        vaultInfo.innerText = 'Encrypted storage is hidden from system.';
        setupPanel.style.display = 'none'; // Assume vault exists now
        unlockPanel.style.display = 'block';
        lockPanel.style.display = 'none';
    } else if (action === 'delete') {
        vaultCore.className = 'vault-locked';
        vaultStatus.innerText = 'VAULT DELETED';
        vaultStatus.style.color = '#ff5555';
        vaultInfo.innerText = 'All data destroyed. System ready for new initialization.';
        setupPanel.style.display = 'block';
        unlockPanel.style.display = 'none';
        lockPanel.style.display = 'none';
    }
}

btnCreate.onclick = () => handleAction('create');
btnUnlock.onclick = () => handleAction('mount');
btnLock.onclick = () => handleAction('unmount');

// Handle all delete triggers
document.querySelectorAll('.delete-trigger').forEach(btn => {
    btn.onclick = () => {
        if (confirm("Вы уверены? Это действие ПОЛНОСТЬЮ и БЕЗВОЗВРАТНО удалит все файлы в сейфе!")) {
            handleAction('delete');
        }
    };
});

// Startup check
async function init() {
    addLog("CyberCrypt PRO Security System Active.");
    addLog("Analyzing storage vectors...");

    // Check if vault is there
    const vaultExists = await window.api.checkVault();

    if (vaultExists) {
        addLog("EXISTING VAULT DETECTED.");
        setupPanel.style.display = 'none';
        unlockPanel.style.display = 'block';
        updateUI('unmount');
    } else {
        addLog("No Vault found in secure sectors.");
        setupPanel.style.display = 'block';
        unlockPanel.style.display = 'none';
    }
}

init();
