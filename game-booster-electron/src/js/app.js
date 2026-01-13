// --- I18N Logic ---
const translations = {
    en: {
        nav_dashboard: "Dashboard", nav_optimize: "Optimize", nav_processes: "Processes", nav_games: "Games", nav_settings: "Settings",
        section_system: "System", section_app: "Application", section_power: "Power & CPU", section_network: "Network",
        section_deep: "Deep Optimization", section_services: "Services Guard",
        opt_temp: "Clear Temporary Files", opt_ram: "Intelligent RAM Cleaner", opt_extreme: "Extreme Service Cleaner",
        opt_anim: "Disable Windows Animations", opt_turbo: "Turbo Mode (Defender Suspend)",
        opt_power: "Enable Ultimate Power Plan", opt_priority: "High Priority for Active Game", opt_cores: "Unpark CPU Cores",
        opt_dns: "Flush DNS Cache", opt_tcp: "Optimize TCP/IP", opt_nagle: "Disable Nagle Algorithm (Lower Ping)",
        opt_gpu: "Gpu Tweaks", opt_timer: "Timer Resolution", opt_visual: "Disable Visual Effects",
        opt_memory: "Memory Optimization", opt_process_priority: "Process Priority",
        opt_telemetry: "Privacy & Telemetry", opt_junk: "Full Junk Cleaner",
        deep_desc: "Aggressive system tweaks. Some may require reboot.",
        sett_lang: "Language:", sett_startup: "Run at Startup", sett_tray: "Minimize to Tray", sett_autoboost: "Enable Auto-Boost (Real-time Detection)"
    },
    ru: {
        nav_dashboard: "Обзор", nav_optimize: "Оптимизация", nav_processes: "Процессы", nav_games: "Игры", nav_settings: "Настройки",
        section_system: "Система", section_app: "Приложение", section_power: "Питание и CPU", section_network: "Сеть",
        section_deep: "Глубокая оптимизация", section_services: "Контроль служб",
        opt_temp: "Очистка временных файлов", opt_ram: "Умная очистка ОЗУ", opt_extreme: "Экстремальная очистка служб",
        opt_anim: "Отключить анимации Windows", opt_turbo: "Турбо режим (Пауза Защитника)",
        opt_power: "Максимальная производительность", opt_priority: "Высокий приоритет для игры", opt_cores: "Разпарковка ядер CPU",
        opt_dns: "Очистка DNS кэша", opt_tcp: "Оптимизация TCP/IP", opt_nagle: "Отключить Nagle (Ниже пинг)",
        opt_gpu: "Твики GPU", opt_timer: "Разрешение таймера", opt_visual: "Отключить визуальные эффекты",
        opt_memory: "Оптимизация памяти", opt_process_priority: "Приоритет процессов",
        opt_telemetry: "Приватность и Телеметрия", opt_junk: "Полная очистка мусора",
        deep_desc: "Агрессивные системные твики. Некоторые требуют перезагрузки.",
        sett_lang: "Язык:", sett_startup: "Запуск при старте", sett_tray: "Сворачивать в трей", sett_autoboost: "Auto-Boost (Детектор игр)"
    },
    uk: {
        nav_dashboard: "Огляд", nav_optimize: "Оптимізація", nav_processes: "Процеси", nav_games: "Ігри", nav_settings: "Налаштування",
        section_system: "Система", section_app: "Додаток", section_power: "Живлення і CPU", section_network: "Мережа",
        section_deep: "Глибока оптимізація", section_services: "Контроль служб",
        opt_temp: "Очищення тимчасових файлів", opt_ram: "Розумна очистка ОЗУ", opt_extreme: "Екстремальне очищення служб",
        opt_anim: "Вимкнути анімації Windows", opt_turbo: "Турбо режим (Пауза Захисника)",
        opt_power: "Максимальна продуктивність", opt_priority: "Високий пріоритет для гри", opt_cores: "Розпаркування ядер CPU",
        opt_dns: "Очищення DNS кешу", opt_tcp: "Оптимізація TCP/IP", opt_nagle: "Вимкнути Nagle (Нижчий пінг)",
        opt_gpu: "Твіки GPU", opt_timer: "Роздільність таймера", opt_visual: "Вимкнути візуальні ефекти",
        opt_memory: "Оптимізація пам'яті", opt_process_priority: "Пріоритет процесів",
        opt_telemetry: "Приватність та Телеметрія", opt_junk: "Повна очистка сміття",
        deep_desc: "Агресивні системні твіки. Деякі потребують перезавантаження.",
        sett_lang: "Мова:", sett_startup: "Запуск при старті", sett_tray: "Згортати в трей", sett_autoboost: "Auto-Boost (Детектор ігор)"
    }
};

function changeLanguage(lang) {
    localStorage.setItem('app_lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });
}

// --- Navigation Logic ---
function switchTab(tabName) {
    // Hide all contents
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(`tab-${tabName}`).style.display = 'flex'; // grid or flex

    // Update active nav
    document.querySelectorAll('.nav-links li').forEach(el => {
        el.classList.remove('active');
        if (el.innerText.toLowerCase().includes(tabName.split('-')[0])) { // fuzzy match
            el.classList.add('active');
        }
    });

    // Special logic
    if (tabName === 'processes') refreshProcesses();
}

// Map Nav clicks
document.querySelectorAll('.nav-links li').forEach((li, index) => {
    const tabs = ['dashboard', 'boost', 'processes', 'games', 'settings'];
    li.onclick = () => switchTab(tabs[index]);
});

// --- Dashboard Logic ---
let cpuChartVal, ramChartVal, gpuChartVal;

function initCharts() {
    const cpuCtx = document.getElementById('cpuChart').getContext('2d');
    const ramCtx = document.getElementById('ramChart').getContext('2d');
    const gpuCtx = document.getElementById('gpuChart').getContext('2d');

    const commonOpts = {
        type: 'doughnut',
        options: {
            cutout: '75%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    };

    cpuChartVal = new Chart(cpuCtx, {
        ...commonOpts,
        data: { labels: ['Used', 'Free'], datasets: [{ data: [0, 100], backgroundColor: ['#ffffff', '#333'] }] }
    });

    ramChartVal = new Chart(ramCtx, {
        ...commonOpts,
        data: { labels: ['Used', 'Free'], datasets: [{ data: [0, 100], backgroundColor: ['#ffffff', '#333'] }] }
    });

    gpuChartVal = new Chart(gpuCtx, {
        ...commonOpts,
        data: { labels: ['Used', 'Free'], datasets: [{ data: [0, 100], backgroundColor: ['#ffffff', '#333'] }] }
    });
}
initCharts();

async function updateMetrics() {
    const stats = await window.api.invoke('get-usage-stats');
    if (stats) {
        // Update Text
        document.getElementById('cpu-val').innerText = stats.cpuLoad + "%";
        document.getElementById('ram-val').innerText = stats.ramUsedGB + " GB";

        let gpuLabel = stats.gpuLoad + "%";
        if (stats.gpuTemp > 0) gpuLabel += ` (${stats.gpuTemp}°C)`;
        document.getElementById('gpu-val').innerText = gpuLabel;

        // Update Charts
        cpuChartVal.data.datasets[0].data = [stats.cpuLoad, 100 - stats.cpuLoad];
        cpuChartVal.update();

        ramChartVal.data.datasets[0].data = [stats.ramLoad, 100 - stats.ramLoad];
        ramChartVal.update();

        gpuChartVal.data.datasets[0].data = [stats.gpuLoad, 100 - stats.gpuLoad];
        gpuChartVal.update();
    }
}
// Poll every 5 seconds to save resources
setInterval(updateMetrics, 5000);

// --- Settings Logic ---
async function saveSettings() {
    const settings = {
        startup: document.getElementById('sett-startup').checked,
        tray: document.getElementById('sett-tray').checked,
        autoBoost: document.getElementById('sett-autoboost').checked,
        lang: document.getElementById('sett-lang').value
    };
    await window.api.invoke('save-settings', settings);
    alert("System Preferences Updated!");
}

// Update Handling
if (window.api.onUpdateReady) {
    window.api.onUpdateReady((notes) => {
        const modal = document.createElement('div');
        modal.className = 'update-modal';
        modal.innerHTML = `
            <div class="update-content">
                <h3>NEW UPDATE DOWNLOADED</h3>
                <div class="notes">${notes}</div>
                <p>Update will be applied automatically on next launch.</p>
                <button onclick="this.parentElement.parentElement.remove()">CLOSE</button>
            </div>
        `;
        document.body.appendChild(modal);
    });
}

if (window.api.onAutoBoostStatus) {
    window.api.onAutoBoostStatus((status) => {
        const log = document.getElementById('log-output');
        const statusText = document.getElementById('status-text');

        if (status === 'ACTIVATED') {
            log.innerHTML += `> <span style="color:#bf00ff">[AUTO-BOOST] Game Detected. Applying Profile...</span><br>`;
            statusText.innerText = "AUTO-BOOST ACTIVE";
            statusText.style.color = "#bf00ff";
            statusText.classList.add('optimized');
        } else if (status === 'IDLE') {
            log.innerHTML += `> <span style="color:#888">[AUTO-BOOST] Game Closed. System Idle.</span><br>`;
            statusText.innerText = "READY";
            statusText.style.color = "#00ff00";
            statusText.classList.remove('optimized');
        }
    });
}

if (window.api.onRestoreTrigger) {
    window.api.onRestoreTrigger(() => {
        // Trigger the restore button logic
        document.getElementById('restore-btn').click();
    });
}

// License Expiration Handler
if (window.api.onLicenseExpired) {
    window.api.onLicenseExpired(() => {
        alert('⚠️ Ваша подписка закончилась!\nПожалуйста, введите новый ключ для продолжения работы.');
        localStorage.removeItem('current_user');
        window.location.href = 'login.html?mode=activation&reason=expired';
    });
}

async function loadVersionInfo() {
    try {
        const version = await window.api.invoke('app-get-version');
        const vElem = document.getElementById('version-text');
        if (vElem) vElem.innerText = version;
    } catch (e) { }
}

async function loadLicenseInfo() {
    const user = localStorage.getItem('current_user');
    const display = document.getElementById('expiry-date');
    if (!user || !display) return;

    const info = await window.api.invoke('auth-get-license', { user });
    if (info && info.expiry) {
        if (info.expiry === "lifetime") {
            display.innerText = "LIFETIME ACCESS";
            display.style.color = "#00e5ff";
        } else {
            const date = new Date(info.expiry);
            display.innerText = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    } else {
        display.innerText = "NO LICENSE";
        display.style.color = "#ff4444";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('app_lang') || 'en';
    document.getElementById('sett-lang').value = savedLang;
    changeLanguage(savedLang);

    switchTab('dashboard', document.querySelector('.nav-links li'));
    checkCalibration();
    loadLicenseInfo();
    loadVersionInfo();
});

document.getElementById('boost-btn').addEventListener('click', async () => {
    const btn = document.getElementById('boost-btn');
    const log = document.getElementById('log-output');

    log.innerHTML += "> Initiating Boost Sequence...<br>";
    btn.disabled = true;
    btn.innerText = "OPTIMIZING...";

    // Collect flags from Boost Tab
    const config = {
        power: document.getElementById('chk-power')?.checked ?? true,
        network: document.getElementById('chk-tcp')?.checked ?? true,
        debloat: document.getElementById('chk-temp')?.checked ?? true,
        ram: document.getElementById('chk-ram')?.checked ?? true,
        extreme: document.getElementById('chk-extreme')?.checked ?? false,
        turbo: document.getElementById('chk-turbo')?.checked ?? false,
        temp: document.getElementById('chk-temp')?.checked ?? true,
        // BEAST MODE flags
        gpu: document.getElementById('chk-gpu')?.checked ?? false,
        timer: document.getElementById('chk-timer')?.checked ?? false,
        visual: document.getElementById('chk-visual')?.checked ?? false,
        memory: document.getElementById('chk-memory')?.checked ?? false,
        priority: document.getElementById('chk-priority')?.checked ?? false,
        telemetry: document.getElementById('chk-telemetry')?.checked ?? false,
        junk: document.getElementById('chk-junk')?.checked ?? false,
        services: []
    };

    // Collect checked services
    const serviceIds = [
        'BDESVC', 'bthserv', 'DPS', 'FontCache', 'hidserv', 'iphlpsvc',
        'Spooler', 'SSDPSRV', 'StiSvc', 'StorSvc', 'SysMain', 'Themes',
        'VaultSvc', 'WdiSystemHost', 'WSearch'
    ];
    serviceIds.forEach(id => {
        if (document.getElementById(`svc-${id}`)?.checked) {
            config.services.push(id);
        }
    });

    log.innerHTML += `> Configuration: Power=${config.power}, Net=${config.network}, Debloat=${config.debloat}<br>`;

    const result = await window.api.invoke('run-boost', config);

    setTimeout(() => {
        if (result.success) {
            log.innerHTML += "> <span style='color:#fff'>OPTIMIZATION COMPLETE.</span><br>";
            // Visual feedback on success
            const status = document.getElementById('status-text');
            status.innerText = "OPTIMIZED";
            status.style.color = "#bf00ff"; // Neon Purple
            status.classList.add('optimized'); // Trigger CSS Animation
        } else {
            log.innerHTML += `> <span style='color:red'>ERROR: ${result.message}</span><br>`;
        }
        btn.disabled = false;
        btn.innerText = "DEACTIVATE BOOST";
    }, 2000);
});

document.getElementById('restore-btn').addEventListener('click', async () => {
    if (!confirm("Revert all optimizations to Windows Defaults?")) return;

    const log = document.getElementById('log-output');
    log.innerHTML += "> <span style='color:#ffff00'>RESTORING DEFAULTS...</span><br>";

    const result = await window.api.invoke('run-restore');

    if (result.success) {
        log.innerHTML += "> <span style='color:#00ff00'>SYSTEM RESTORED.</span><br>";
        log.innerHTML += "> Power Plan: Balanced<br>";
        document.getElementById('status-text').innerText = "RESTORED";
        document.getElementById('status-text').style.color = "#888";
    } else {
        log.innerHTML += `> Error: ${result.message}<br>`;
    }
});

// --- Auto-Calibration Logic ---
async function checkCalibration() {
    // Always scan on startup to update Info card, regardless of calibration status
    const log = document.getElementById('log-output');
    log.innerHTML += "> SCANNING HARDWARE For Auto-Calibration...<br>";

    const specs = await window.api.invoke('get-system-specs');

    if (specs) {
        // Update Info Card (Real-time)
        document.getElementById('os-info').innerText = specs.os;
        document.getElementById('cpu-info').innerText = specs.cpuBrand;
        document.getElementById('gpu-info').innerText = specs.gpuName;

        document.getElementById('cpu-val').innerText = specs.cpuCores + " Cores";
        document.getElementById('ram-val').innerText = specs.ramTotal + " GB";

        // Perform calibration if new or force check
        const isCalibrated = localStorage.getItem('is_calibrated');

        // Auto-configure based on specs
        log.innerHTML += `> Detected: ${specs.ramTotal}GB RAM | ${specs.gpuName}<br>`;

        const calibration = await window.api.invoke('auto-calibrate', specs);

        // Apply visual toggle states based on calibration
        document.getElementById('chk-temp').checked = calibration.flags.includes('debloat');
        document.getElementById('chk-ram').checked = calibration.flags.includes('ram');
        document.getElementById('chk-extreme').checked = calibration.flags.includes('extreme');

        // BEAST MODE auto-calibration
        if (document.getElementById('chk-gpu')) {
            document.getElementById('chk-gpu').checked = calibration.flags.includes('gpu');
        }
        if (document.getElementById('chk-timer')) {
            document.getElementById('chk-timer').checked = calibration.flags.includes('timer');
        }
        if (document.getElementById('chk-visual')) {
            document.getElementById('chk-visual').checked = calibration.flags.includes('visual');
        }
        if (document.getElementById('chk-memory')) {
            document.getElementById('chk-memory').checked = calibration.flags.includes('memory');
        }
        if (document.getElementById('chk-priority')) {
            document.getElementById('chk-priority').checked = calibration.flags.includes('priority');
        }

        log.innerHTML += `> Applied Smart Profile: <span style='color:#bf00ff'>${calibration.profile.toUpperCase()}</span><br>`;

        localStorage.setItem('is_calibrated', 'true');
    } else {
        log.innerHTML += "> <span style='color:red'>HARDWARE SCAN FAILED.</span><br>";
    }
}

// --- Processes Tab ---
async function refreshProcesses() {
    const list = document.getElementById('proc-list');
    list.innerHTML = '<tr><td colspan="5">Scanning...</td></tr>';

    const procs = await window.api.invoke('get-processes');
    list.innerHTML = '';

    procs.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.name}</td>
            <td>${p.pid}</td>
            <td>${(p.mem / 1024 / 1024).toFixed(1)} MB</td>
            <td>${p.cpu.toFixed(1)}%</td>
            <td><button onclick="killProcess(${p.pid})" style="padding:5px 10px; font-size:10px;">KILL</button></td>
        `;
        list.appendChild(row);
    });
}

window.killProcess = async (pid) => {
    if (confirm("Terminate process " + pid + "?")) {
        await window.api.invoke('kill-process', pid);
        refreshProcesses();
    }
};

// --- Games Tab ---
async function scanGames() {
    const grid = document.getElementById('games-grid');
    grid.innerHTML = 'Scanning libraries...';

    const games = await window.api.invoke('scan-games');
    grid.innerHTML = '';

    games.forEach(g => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div style="font-size:30px; margin-bottom:10px;">🎮</div>
            <strong>${g.name}</strong><br>
            <span style="font-size:12px; color:#666">${g.exe}</span>
        `;
        card.onclick = () => {
            document.getElementById('log-output').innerHTML += `> Launching ${g.name} in BOOST MODE...<br>`;
        };
        grid.appendChild(card);
    });
}
