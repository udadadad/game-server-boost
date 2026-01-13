require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const axios = require('./node_modules/axios/index.d.cts');

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
        copy_msg: "_Copy and paste it into the app to activate\\._"
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
        copy_msg: "_Скопируйте и вставьте в программу для активации\\._"
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
        copy_msg: "_Скопіюйте та вставте в програму для активації\\._"
    }
};

// --- Database Helpers ---
function getSettings() {
    return fs.existsSync(SETTINGS_FILE) ? JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) : {};
}

function saveUserLang(userId, lang) {
    const settings = getSettings();
    settings[userId] = { lang };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function getUserLang(userId) {
    const settings = getSettings();
    return settings[userId]?.lang || 'en';
}

function getInventory() {
    return JSON.parse(fs.readFileSync(INV_FILE, 'utf8'));
}

function saveInventory(inv) {
    fs.writeFileSync(INV_FILE, JSON.stringify(inv, null, 2));
}

function markKeyUsed(userId, cat, key) {
    const used = fs.existsSync(USED_FILE) ? JSON.parse(fs.readFileSync(USED_FILE, 'utf8')) : [];
    used.push({ userId, cat, key, date: new Date().toISOString() });
    fs.writeFileSync(USED_FILE, JSON.stringify(used, null, 2));
}

function getFileIds() {
    return fs.existsSync(FILE_IDS_FILE) ? JSON.parse(fs.readFileSync(FILE_IDS_FILE, 'utf8')) : {};
}

function saveFileId(type, fileId) {
    const ids = getFileIds();
    ids[type] = fileId;
    fs.writeFileSync(FILE_IDS_FILE, JSON.stringify(ids, null, 2));
}

// --- Bot Logic ---
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
        [Markup.button.callback(t.buy, 'main_buy')],
        [Markup.button.callback(t.reviews, 'main_reviews'), Markup.button.callback(t.support, 'main_support')],
        [Markup.button.callback(t.download, 'main_download')]
    ];

    // Add Admin button for authorized user
    if (ctx.from.id === ADMIN_ID) {
        buttons.push([Markup.button.callback('🛡 Admin Panel', 'admin_stats')]);
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
    const sales = fs.existsSync(USED_FILE) ? JSON.parse(fs.readFileSync(USED_FILE, 'utf8')) : [];

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

bot.launch().then(() => console.log('CyberBoost Shop Bot is LIVE!'));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
