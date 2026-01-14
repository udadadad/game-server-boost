require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// --- Configuration ---
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('ERROR: BOT_TOKEN not found in .env file!');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const INV_FILE = path.join(__dirname, 'inventory.json');
const USED_FILE = path.join(__dirname, 'used_keys.json');
const SETTINGS_FILE = path.join(__dirname, 'bot_settings.json');
const FILE_IDS_FILE = path.join(__dirname, 'file_ids.json');
const TRIALS_FILE = path.join(__dirname, 'trials.json');
const SERVER_URL = 'https://game-server-boost.onrender.com';

// --- Admin Configuration ---
// TO GET YOUR ID: Send /id to @userinfobot or similar bot
const ADMIN_ID = 1854451325; // Установил ваш ID (Ajanokoji)

// --- Translations ---
const TRANSLATIONS = {
    'en': {
        welcome: "🚀 *Welcome to CyberBoost Cloud Store\\!*\nThe ultimate destination for elite game optimization\\.",
        select_option: "Select an option below:",
        buy: "🛒 Buy License Key",
        reviews: "⭐ Reviews",
        support: "🛠 Support",
        download: "📥 Download Launcher",
        select_format: "📥 *Select Launcher Format:*",
        setup: "Setup (Installer)",
        portable: "Portable (No Install)",
        select_plan: "🛒 *Select your Power Plan:*\nAll payments are processed securely via *Telegram Stars*\\.",
        back: "⬅️ Back",
        reviews_channel: "⭐ *Customer Reviews*\nJoin our community and see what others say about *CyberBoost PRO*\\.",
        support_text: "🛠 *Premium Support*\nExperiencing issues? Our team is ready to help\\.",
        out_of_stock: "Sorry, this plan is currently out of stock!",
        success_pay: "✅ *Payment Successful\\!*\nYour Key:\n",
        copy_msg: "_Copy and paste it into the app to activate\\._",
        free_trial: "🎁 Get Free Trial (1 Hour)",
        trial_claimed: "❌ *Access Denied*\nYou have already claimed your free trial\\.",
        trial_success: "🎁 *Your Free Trial Key:*",
    },
    'ru': {
        welcome: "🚀 *Добро пожаловать в CyberBoost Store\\!*\nЛучший софт для оптимизации ваших игр\\.",
        select_option: "Выберите действие:",
        buy: "🛒 Купить ключ",
        reviews: "⭐ Отзывы",
        support: "🛠 Поддержка",
        download: "📥 Скачать Лаунчер",
        select_format: "📥 *Выберите формат лаунчера:*",
        setup: "Setup (Установочный)",
        portable: "Portable (Без установки)",
        select_plan: "🛒 *Выберите тарифный план:*\nОплата принимается через *Telegram Stars*\\.",
        back: "⬅️ Назад",
        reviews_channel: "⭐ *Отзывы клиентов*\nУзнайте\\, что говорят другие о *CyberBoost PRO*\\.",
        support_text: "🛠 *Премиум Поддержка*\nЕсть вопросы? Наша команда готова помочь\\.",
        out_of_stock: "К сожалению\\, этот тариф сейчас закончился\\!",
        success_pay: "✅ *Оплата прошла успешно\\!*\nВаш ключ:\n",
        copy_msg: "_Скопируйте и вставьте в программу для активации\\._",
        free_trial: "🎁 Пробный период (1 час)",
        trial_claimed: "❌ *Ошибка*\nВы уже получали бесплатный ключ\\.",
        trial_success: "🎁 *Ваш бесплатный ключ:*",
    },
    'uk': {
        welcome: "🚀 *Ласкаво просимо до CyberBoost Store\\!*\nНайкращий софт для оптимізації ваших ігор\\.",
        select_option: "Оберіть дію:",
        buy: "🛒 Купити ключ",
        reviews: "⭐ Відгуки",
        support: "🛠 Підтримка",
        download: "📥 Завантажити Лаунчер",
        select_format: "📥 *Оберіть формат лаунчера:*",
        setup: "Setup (Встановлювач)",
        portable: "Portable (Без встановлення)",
        select_plan: "🛒 *Оберіть тарифний план:*\nОплата приймається через *Telegram Stars*\\.",
        back: "⬅️ Назад",
        reviews_channel: "⭐ *Відкуки клієнтів*\nДізнайтеся\\, що говорять інші про *CyberBoost PRO*\\.",
        support_text: "🛠 *Преміум Підтримка*\nЄ питання? Наша команда готова допомогти\\.",
        out_of_stock: "На жаль\\, цей тариф зараз закінчився\\!",
        success_pay: "✅ *Оплата пройшла успішно\\!*\nВаш ключ:\n",
        copy_msg: "_Скопіюйте та вставте в програму для активації\\._",
        free_trial: "🎁 Пробний період (1 година)",
        trial_claimed: "❌ *Помилка*\nВи вже отримували безкоштовний ключ\\.",
        trial_success: "🎁 *Ваш безкоштовний ключ:*"
    }
};

// --- Database Helpers (Optimized: In-Memory + Async Save) ---
let cache = {
    settings: {},
    inventory: {},
    used_keys: [],
    file_ids: {},
    trials: {}
};

function loadData() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) cache.settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        if (fs.existsSync(INV_FILE)) cache.inventory = JSON.parse(fs.readFileSync(INV_FILE, 'utf8'));
        if (fs.existsSync(USED_FILE)) cache.used_keys = JSON.parse(fs.readFileSync(USED_FILE, 'utf8'));
        if (fs.existsSync(FILE_IDS_FILE)) cache.file_ids = JSON.parse(fs.readFileSync(FILE_IDS_FILE, 'utf8'));
        if (fs.existsSync(TRIALS_FILE)) cache.trials = JSON.parse(fs.readFileSync(TRIALS_FILE, 'utf8'));
        console.log("Data loaded into memory.");
    } catch (e) {
        console.error("Failed to load data:", e);
    }
}
loadData(); // Load on start

function saveAsync(file, data) {
    fs.writeFile(file, JSON.stringify(data, null, 2), (err) => {
        if (err) console.error(`Failed to save ${file}:`, err);
    });
}

function getSettings() { return cache.settings; }
function saveUserLang(userId, lang) {
    cache.settings[userId] = { lang };
    saveAsync(SETTINGS_FILE, cache.settings);
}
function getUserLang(userId) { return cache.settings[userId]?.lang || 'en'; }

function getInventory() { return cache.inventory; }
function saveInventory(inv) {
    cache.inventory = inv;
    saveAsync(INV_FILE, cache.inventory);
}

function markKeyUsed(userId, cat, key) {
    cache.used_keys.push({ userId, cat, key, date: new Date().toISOString() });
    saveAsync(USED_FILE, cache.used_keys);
}
function getUsedKeys() { return cache.used_keys; }

function getFileIds() { return cache.file_ids; }
function saveFileId(type, fileId) {
    cache.file_ids[type] = fileId;
    saveAsync(FILE_IDS_FILE, cache.file_ids);
}

function getTrials() { return cache.trials; }
function saveTrial(userId, data) {
    cache.trials[userId] = data;
    saveAsync(TRIALS_FILE, cache.trials);
}

// --- Bot Logic ---
bot.catch((err, ctx) => {
    // Ignore "Message is not modified" error
    if (err.description && err.description.includes('message is not modified')) {
        return;
    }
    console.error(`Ooops, encountered an error for ${ctx.updateType}`, err);
});

bot.start((ctx) => {
    ctx.replyWithMarkdownV2(
        `🌐 *Please select your language / Выберите язык / Оберіть мову:*`,
        Markup.inlineKeyboard([
            [Markup.button.callback('🇺🇸 English', 'setlang_en')],
            [Markup.button.callback('🇷🇺 Русский', 'setlang_ru')],
            [Markup.button.callback('🇺🇦 Українська', 'setlang_uk')]
        ])
    );
});

bot.action(/setlang_(.+)/, (ctx) => {
    const lang = ctx.match[1];
    saveUserLang(ctx.from.id, lang);
    return showMainMenu(ctx, lang);
});

function showMainMenu(ctx, lang) {
    const t = TRANSLATIONS[lang];
    const text = `${t.welcome}\n\n${t.select_option}`;
    const buttons = [
        [Markup.button.callback(t.buy, 'main_buy'), Markup.button.callback(t.free_trial, 'main_trial')],
        [Markup.button.callback(t.download, 'main_download')],
        [Markup.button.callback(t.reviews, 'main_reviews'), Markup.button.callback(t.support, 'main_support')]
    ];

    // Add Admin button for authorized user
    if (ctx.from.id === ADMIN_ID) {
        buttons.push([Markup.button.callback('🛡 Admin Panel', 'admin_stats')]);
    }

    if (ctx.from.id === ADMIN_ID) {
        buttons.push([Markup.button.callback('🎁 Create Giveaway', 'quick_abuse')]);
    }

    if (ctx.updateType === 'callback_query') {
        return ctx.editMessageText(text, { parse_mode: 'MarkdownV2', ...Markup.inlineKeyboard(buttons) });
    }
    return ctx.replyWithMarkdownV2(text, Markup.inlineKeyboard(buttons));
}

// --- Admin Handlers ---
bot.action('admin_stats', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery('Access Denied');

    const inv = getInventory();
    const settings = getSettings();
    const sales = getUsedKeys();

    // Calculate Revenue
    const PRICES = { '1day': 50, '1week': 250, '1month': 700, 'lifetime': 3000 };
    const totalRev = sales.reduce((acc, sale) => acc + (PRICES[sale.cat] || 0), 0);
    const userCount = Object.keys(settings).length;

    const stats = `🛡 *CyberBoost Admin Terminal*\n\n` +
        `👥 *Total Users:* \`${userCount}\`\n` +
        `💰 *Total Revenue:* \`${totalRev}\` Stars\n` +
        `📦 *Total Sales:* \`${sales.length}\`\n\n` +
        `*Live Inventory:*\n` +
        `▫️ 1 Day: \`${inv['1day'].length}\` left\n` +
        `▫️ 1 Week: \`${inv['1week'].length}\` left\n` +
        `▫️ 1 Month: \`${inv['1month'].length}\` left\n` +
        `▫️ Lifetime: \`${inv['lifetime'].length}\` left\n\n` +
        `*Status:* ${Object.values(inv).some(a => a.length > 0) ? "🟢 Online" : "🔴 Refill Required"}`;

    ctx.editMessageText(stats, {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Back to Shop', 'back_to_main')]
        ])
    });
});

// Admin Document Listener (to "teach" the bot file IDs)
bot.on('document', async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const doc = ctx.message.document;
    const name = doc.file_name.toLowerCase();

    let type = '';
    if (name.includes('setup')) type = 'setup';
    else if (name.endsWith('.exe')) type = 'portable';

    if (type) {
        saveFileId(type, doc.file_id);
        ctx.reply(`✅ *Bot Updated\\!*\\nFile type \`${type}\` successfully linked to ID:\\n\`${doc.file_id}\``, { parse_mode: 'MarkdownV2' });
    }
});

bot.action('main_download', async (ctx) => {
    const lang = getUserLang(ctx.from.id);
    const t = TRANSLATIONS[lang];

    ctx.editMessageText(t.select_format, {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
            [Markup.button.callback(t.setup, 'dl_setup')],
            [Markup.button.callback(t.portable, 'dl_portable')],
            [Markup.button.callback(t.back, 'back_to_main')]
        ])
    });
});

async function getLatestAsset(ctx, isSetup) {
    const repo = "udadadad/game-booster";
    try {
        const res = await axios.get(`https://api.github.com/repos/${repo}/releases/latest`);
        const assets = res.data.assets;

        return assets.find(a => {
            const name = a.name.toLowerCase();
            if (isSetup) return name.includes('setup') && name.endsWith('.exe');
            return !name.includes('setup') && name.endsWith('.exe') && !name.includes('blockmap');
        });
    } catch (e) {
        console.error("GitHub API Error:", e);
        return null;
    }
}

bot.action('dl_setup', async (ctx) => {
    const fileIds = getFileIds();
    if (fileIds.setup) {
        await ctx.answerCbQuery('Sending Setup...');
        return ctx.replyWithDocument(fileIds.setup);
    }

    await ctx.answerCbQuery('Fetching from GitHub...');
    const asset = await getLatestAsset(ctx, true);
    if (asset) {
        ctx.replyWithMarkdownV2(`🚀 *Download Setup*\\n\\n📦 *File:* \`${asset.name}\`\\n⚖️ *Size:* \`${(asset.size / 1024 / 1024).toFixed(1)} MB\``,
            Markup.inlineKeyboard([[Markup.button.url('📥 Download Setup', asset.browser_download_url)]])
        );
    } else {
        ctx.reply("Error: Could not find Setup file in the latest release.");
    }
});

bot.action('dl_portable', async (ctx) => {
    const fileIds = getFileIds();
    if (fileIds.portable) {
        await ctx.answerCbQuery('Sending Portable...');
        return ctx.replyWithDocument(fileIds.portable);
    }

    await ctx.answerCbQuery('Fetching from GitHub...');
    const asset = await getLatestAsset(ctx, false);
    if (asset) {
        ctx.replyWithMarkdownV2(`🚀 *Download Portable*\\n\\n📦 *File:* \`${asset.name}\`\\n⚖️ *Size:* \`${(asset.size / 1024 / 1024).toFixed(1)} MB\``,
            Markup.inlineKeyboard([[Markup.button.url('📥 Download Portable', asset.browser_download_url)]])
        );
    } else {
        ctx.reply("Error: Could not find Portable file in the latest release.");
    }
});

bot.action('main_buy', (ctx) => {
    const lang = getUserLang(ctx.from.id);
    const t = TRANSLATIONS[lang];
    ctx.editMessageText(t.select_plan, {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('1 Day (50 Stars)', 'buy_1day')],
            [Markup.button.callback('1 Week (250 Stars)', 'buy_1week')],
            [Markup.button.callback('1 Month (700 Stars)', 'buy_1month')],
            [Markup.button.callback('🔥 LIFETIME (3000 Stars)', 'buy_lifetime')],
            [Markup.button.callback(t.back, 'back_to_main')]
        ])
    });
});

bot.action('main_reviews', (ctx) => {
    const lang = getUserLang(ctx.from.id);
    const t = TRANSLATIONS[lang];
    ctx.editMessageText(t.reviews_channel, {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
            [Markup.button.url('🔗 Link', 'https://t.me/YOUR_REVIEWS_CHANNEL')],
            [Markup.button.callback(t.back, 'back_to_main')]
        ])
    });
});

bot.action('main_support', (ctx) => {
    const lang = getUserLang(ctx.from.id);
    const t = TRANSLATIONS[lang];
    ctx.editMessageText(t.support_text, {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
            [Markup.button.url('👨‍💻 Contact', 'https://t.me/Kyotaka_Ayanakouji1')],
            [Markup.button.callback(t.back, 'back_to_main')]
        ])
    });
});

bot.action('back_to_main', (ctx) => {
    return showMainMenu(ctx, getUserLang(ctx.from.id));
});

// Prices in Telegram Stars (XTR)
const PRODUCT_PRICES = {
    '1day': 50,
    '1week': 250,
    '1month': 700,
    'lifetime': 3000
};

const PRODUCT_NAMES = {
    '1day': 'CyberBoost PRO (1 Day)',
    '1week': 'CyberBoost PRO (1 Week)',
    '1month': 'CyberBoost PRO (1 Month)',
    'lifetime': 'CyberBoost PRO (LIFETIME)'
};

async function sendStarInvoice(ctx, id) {
    const lang = getUserLang(ctx.from.id);
    const t = TRANSLATIONS[lang];
    const inv = getInventory();
    if (inv[id].length === 0) {
        return ctx.reply(t.out_of_stock);
    }

    // In Stars (XTR), price is 1:1
    return ctx.sendInvoice({
        title: PRODUCT_NAMES[id],
        description: `License key for CyberBoost PRO (${id})`,
        payload: id,
        provider_token: '', // Important: Empty for Stars
        currency: 'XTR',
        prices: [{ label: 'Price', amount: PRODUCT_PRICES[id] }]
    });
}

bot.action(/buy_(.+)/, (ctx) => {
    const id = ctx.match[1];
    return sendStarInvoice(ctx, id);
});

// Payment Handling
bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));

bot.on('successful_payment', async (ctx) => {
    const productId = ctx.successful_payment.invoice_payload;
    const inv = getInventory();
    const lang = getUserLang(ctx.from.id);
    const t = TRANSLATIONS[lang];

    if (inv[productId] && inv[productId].length > 0) {
        const key = inv[productId].shift(); // Remove the first available key
        saveInventory(inv);
        markKeyUsed(ctx.from.id, productId, key);

        await ctx.replyWithMarkdownV2(
            `${t.success_pay}\`${key}\`\\n\\n${t.copy_msg}`
        );
    } else {
        await ctx.reply(t.out_of_stock + ' Please contact admin.');
    }
});

bot.action('main_trial', async (ctx) => {
    const userId = ctx.from.id;
    const lang = getUserLang(userId);
    const t = TRANSLATIONS[lang];

    const trials = getTrials();

    if (trials[userId]) {
        return ctx.replyWithMarkdownV2(t.trial_claimed);
    }

    try {
        await ctx.answerCbQuery('Generating trial key...');
        const res = await axios.post(`${SERVER_URL}/bot/generate-key`);
        if (res.data.success) {
            const key = res.data.key;

            // Mark as claimed
            saveTrial(userId, { key, date: new Date().toISOString() });

            await ctx.replyWithMarkdownV2(
                `${t.trial_success}\n\n\`${key}\`\n\n${t.copy_msg}`
            );
        } else {
            ctx.reply('Error: Could not generate trial key. Try again later.');
        }
    } catch (e) {
        console.error("Trial API Error:", e);
        ctx.reply('Error: License server unreachable.');
    }
});

// --- User Tracking for Broadcasts ---
const USERS_LIST_FILE = path.join(__dirname, 'users_list.json');

function trackUser(ctx) {
    const userId = ctx.from.id;
    let users = fs.existsSync(USERS_LIST_FILE) ? JSON.parse(fs.readFileSync(USERS_LIST_FILE, 'utf8')) : [];

    // Auto-sync with cache.settings (which has all users who set a language)
    const knownUsers = Object.keys(cache.settings).map(Number);
    let updated = false;

    knownUsers.forEach(id => {
        if (!users.includes(id)) {
            users.push(id);
            updated = true;
        }
    });

    if (!users.includes(userId)) {
        users.push(userId);
        updated = true;
    }

    if (updated) {
        fs.writeFileSync(USERS_LIST_FILE, JSON.stringify(users));
    }
}

bot.use((ctx, next) => {
    if (ctx.from) trackUser(ctx);
    return next();
});

// --- Interactive Giveaway Wizard ---
const adminState = {}; // { userId: { step: 'NONE', data: {} } }

function escapeMarkdown(text) {
    if (!text) return '';
    return text.toString().replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

bot.action('quick_abuse', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    adminState[ctx.from.id] = { step: 'DURATION', data: {} };
    ctx.editMessageText("🎁 *Create Giveaway \\- Step 1*\nSelect Key Duration:", {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('1 Hour', 'abuse_dur_1Hour'), Markup.button.callback('1 Day', 'abuse_dur_1Day')],
            [Markup.button.callback('1 Week', 'abuse_dur_1Week'), Markup.button.callback('1 Month', 'abuse_dur_1Month')],
            [Markup.button.callback('❌ Cancel', 'abuse_cancel')]
        ])
    });
});

bot.action(/abuse_dur_(.+)/, (ctx) => {
    if (!adminState[ctx.from.id]) return;
    adminState[ctx.from.id].data.duration = ctx.match[1];
    adminState[ctx.from.id].step = 'ACTIVATIONS';

    ctx.editMessageText(`✅ Selected: ${ctx.match[1].replace('-', '\\-')}\n\n*Step 2: Select Max Activations*`, {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('100', 'abuse_max_100'), Markup.button.callback('1000', 'abuse_max_1000')],
            [Markup.button.callback('10,000', 'abuse_max_10000'), Markup.button.callback('Unlimited (999k)', 'abuse_max_999999')],
            [Markup.button.callback('❌ Cancel', 'abuse_cancel')]
        ])
    });
});

bot.action(/abuse_max_(.+)/, (ctx) => {
    if (!adminState[ctx.from.id]) return;
    adminState[ctx.from.id].data.activations = parseInt(ctx.match[1]);
    adminState[ctx.from.id].step = 'LANGUAGE';

    ctx.editMessageText(
        `✅ Duration: ${adminState[ctx.from.id].data.duration.replace('-', '\\-')}\n` +
        `✅ Activations: ${adminState[ctx.from.id].data.activations}\n\n` +
        `*Step 3: Select Language for Headers*`,
        {
            parse_mode: 'MarkdownV2',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🇷🇺 Русский', 'abuse_lang_ru')],
                [Markup.button.callback('🇺🇸 English', 'abuse_lang_en')],
                [Markup.button.callback('🇺🇦 Українська', 'abuse_lang_uk')],
                [Markup.button.callback('❌ Cancel', 'abuse_cancel')]
            ])
        }
    );
});

bot.action(/abuse_lang_(.+)/, (ctx) => {
    if (!adminState[ctx.from.id]) return;
    adminState[ctx.from.id].data.lang = ctx.match[1];
    adminState[ctx.from.id].step = 'MESSAGE';

    ctx.editMessageText(
        `✅ Duration: ${adminState[ctx.from.id].data.duration.replace('-', '\\-')}\n` +
        `✅ Activations: ${adminState[ctx.from.id].data.activations}\n` +
        `✅ UI Language: ${adminState[ctx.from.id].data.lang}\n\n` +
        `*Step 4: Send the Broadcast Message*\n` +
        `Reply with the text for the giveaway\\.`,
        { parse_mode: 'MarkdownV2' }
    );
});

bot.on('text', async (ctx, next) => {
    const userId = ctx.from.id;
    if (userId === ADMIN_ID && adminState[userId] && adminState[userId].step === 'MESSAGE') {
        const msg = ctx.message.text;
        const data = adminState[userId].data;

        // Finalize
        ctx.reply("⚙️ Generating Key & Broadcasting...");

        try {
            const res = await axios.post(`${SERVER_URL}/admin/generate-key`, {
                type: data.duration,
                maxActivations: data.activations
            });

            if (res.data.success) {
                const key = res.data.key.code;

                // Labels based on selected language
                const labels = {
                    'en': { max: '[max activations', key: 'key:', msg: 'message:' },
                    'ru': { max: '[максимум активаций', key: 'ключ:', msg: 'сообщение:' },
                    'uk': { max: '[максимум активацій', key: 'ключ:', msg: 'повідомлення:' }
                };
                const L = labels[data.lang] || labels['ru'];

                const broadcastText =
                    `${L.max} ${data.activations}]\n` +
                    `${L.key} \`${key}\`\n` +
                    `${L.msg}\n` +
                    `${escapeMarkdown(msg)}`;

                // Broadcast to EVERYONE
                const users = fs.existsSync(USERS_LIST_FILE) ? JSON.parse(fs.readFileSync(USERS_LIST_FILE, 'utf8')) : [];
                let sent = 0;

                for (const u of users) {
                    try {
                        await bot.telegram.sendMessage(u, broadcastText, { parse_mode: 'MarkdownV2' });
                        sent++;
                    } catch (e) { }
                }

                ctx.reply(`✅ Done! Sent to ${sent} users.`);
            }
        } catch (e) {
            ctx.reply("Error: " + e.message);
        }

        // Reset State
        adminState[userId] = null;
    } else {
        next();
    }
});

bot.action('abuse_cancel', (ctx) => {
    adminState[ctx.from.id] = null;
    ctx.deleteMessage();
    ctx.reply("Giveaway creation cancelled.");
});

bot.launch().then(() => console.log('CyberBoost Shop Bot is LIVE!'));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
