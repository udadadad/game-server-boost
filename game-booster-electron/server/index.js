const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Serve admin panel from /public

// Helper to read/write DB
function getDB() {
    if (!fs.existsSync(DB_PATH)) {
        // Initialize if missing (Render ephemeral FS check)
        const initialDB = { users: {}, keys: [] };
        fs.writeFileSync(DB_PATH, JSON.stringify(initialDB));
        return initialDB;
    }
    return JSON.parse(fs.readFileSync(DB_PATH));
}
function saveDB(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Routes
app.post('/register', (req, res) => {
    const { user, pass } = req.body;
    const db = getDB();

    if (db.users[user]) {
        return res.status(400).json({ success: false, message: "User already exists" });
    }

    db.users[user] = { pass, expiry: null };
    saveDB(db);
    res.json({ success: true });
});

app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    const db = getDB();
    const userData = db.users[user];

    if (!userData || userData.pass !== pass) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    let active = true;
    let reason = null;

    // Check if the key the user used still exists
    if (userData.usedKey) {
        const keyExists = db.keys.find(k => k.code === userData.usedKey);
        if (!keyExists) {
            // Key was deleted by admin! Revoke access
            userData.expiry = null;
            userData.usedKey = null;
            saveDB(db);
            active = false;
            reason = "revoked";
        }
    }

    if (active && userData.expiry !== "lifetime") {
        if (!userData.expiry) {
            active = false;
            reason = "missing";
        } else {
            const expiry = new Date(userData.expiry);
            if (new Date() > expiry) {
                active = false;
                reason = "expired";
            }
        }
    }

    // Track Metadata
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    userData.lastLogin = new Date().toISOString();
    userData.ip = ip;
    saveDB(db);

    // In a real app, generate a JWT here
    const token = crypto.randomBytes(32).toString('hex');

    res.json({ success: true, active, reason, token, expiry: userData.expiry });
});

app.post('/activate', (req, res) => {
    const { user, key } = req.body;
    const db = getDB();
    const keyIndex = db.keys.findIndex(k => k.code === key && k.active);

    if (keyIndex === -1) {
        return res.status(400).json({ success: false, message: "Invalid or already used key" });
    }

    const keyData = db.keys[keyIndex];
    const duration = keyData.type; // e.g., "1Day", "LifeTime"
    let expiryDate = null;

    if (duration !== "LifeTime") {
        const now = new Date();
        if (duration === "1Hour") now.setHours(now.getHours() + 1);
        else if (duration === "1Day") now.setDate(now.getDate() + 1);
        else if (duration === "1Week") now.setDate(now.getDate() + 7);
        else if (duration === "1Month") now.setMonth(now.getMonth() + 1);
        expiryDate = now.toISOString();
    } else {
        expiryDate = "lifetime";
    }

    // Update user
    if (!db.users[user]) {
        db.users[user] = { pass: 'auto', expiry: null }; // Should already exist from register
    }

    db.users[user].expiry = expiryDate;
    db.users[user].usedKey = key;

    // Update key usage
    keyData.uses++;
    if (keyData.uses >= keyData.max_activations) {
        keyData.active = false;
    }

    saveDB(db);
    res.json({ success: true, expiry: expiryDate });
});

app.get('/status/:user', (req, res) => {
    const { user } = req.params;
    const db = getDB();
    const userData = db.users[user];

    if (!userData || !userData.expiry) {
        return res.json({ expiry: null });
    }

    // Verify key still exists
    if (userData.usedKey) {
        const keyExists = db.keys.find(k => k.code === userData.usedKey);
        if (!keyExists) {
            userData.expiry = null;
            saveDB(db);
            return res.json({ expiry: null });
        }
    }

    res.json({ expiry: userData.expiry });
});

// --- Admin Routes ---
app.post('/admin/sync-bot-users', (req, res) => {
    const { userId, username, first_name, last_name } = req.body;
    const db = getDB();
    if (!db.botUsers) db.botUsers = {};

    db.botUsers[userId] = {
        username: username || 'Unknown',
        name: `${first_name || ''} ${last_name || ''}`.trim() || 'No Name',
        lastSeen: new Date().toISOString()
    };

    saveDB(db);
    res.json({ success: true });
});

app.get('/admin/bot-users', (req, res) => {
    const db = getDB();
    const users = Object.keys(db.botUsers || {}).map(id => ({
        id,
        ...db.botUsers[id]
    }));
    res.json(users);
});

app.post('/admin/login', (req, res) => {
    const { pass } = req.body;
    if (pass === ADMIN_PASSWORD) {
        res.json({ success: true, token: 'admin-session-token' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin Password' });
    }
});

app.get('/admin/stats', (req, res) => {
    const db = getDB();
    const stats = {
        totalUsers: Object.keys(db.users).length,
        totalKeys: db.keys.length,
        totalActivations: db.keys.reduce((sum, k) => sum + k.uses, 0)
    };
    res.json(stats);
});

app.get('/admin/keys', (req, res) => {
    res.json(getDB().keys);
});

app.post('/admin/generate-key', (req, res) => {
    const { type, maxActivations } = req.body;
    const db = getDB();

    // BSP_[Duration]_[LongRandomAlphanumeric]
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 16; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const code = `BSP_${type}_${randomPart}`;

    const newKey = {
        code,
        type,
        max_activations: parseInt(maxActivations) || 1,
        uses: 0,
        active: true,
        created_at: new Date().toISOString()
    };

    db.keys.push(newKey);
    saveDB(db);
    res.json({ success: true, key: newKey });
});

app.post('/admin/delete-key', (req, res) => {
    const { code } = req.body;
    const db = getDB();
    db.keys = db.keys.filter(k => k.code !== code);
    saveDB(db);
    res.json({ success: true });
});

app.post('/admin/delete-user', (req, res) => {
    const { name } = req.body;
    const db = getDB();
    delete db.users[name];
    saveDB(db);
    res.json({ success: true });
});

app.post('/admin/reset-user', (req, res) => {
    const { name } = req.body;
    const db = getDB();
    if (db.users[name]) {
        db.users[name].expiry = null;
        saveDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: "User not found" });
    }
});

// --- Bot API (Trial Keys) ---
app.post('/bot/generate-key', (req, res) => {
    // For production, you should add an API_KEY check here for security
    const type = '1Hour';
    const db = getDB();

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 16; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const code = `BSP_${type}_${randomPart}`;
    const newKey = {
        code,
        type,
        max_activations: 1,
        uses: 0,
        active: true,
        created_at: new Date().toISOString(),
        source: 'telegram_bot_trial'
    };

    db.keys.push(newKey);
    saveDB(db);
    res.json({ success: true, key: newKey.code });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Booster Server is LIVE on port ${PORT}!`);
});
