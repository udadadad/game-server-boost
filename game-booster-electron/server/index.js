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

    // In a real app, generate a JWT here
    const token = crypto.randomBytes(32).toString('hex');

    res.json({ success: true, active, reason, token, expiry: userData.expiry });
});

app.post('/activate', (req, res) => {
    const { user, key } = req.body;
    const db = getDB();
    const license = db.keys.find(k => k.code === key);

    if (!license || !license.active) {
        return res.status(404).json({ success: false, message: "Invalid or inactive key" });
    }

    if (license.uses >= license.max_activations) {
        return res.status(400).json({ success: false, message: "Key has reached maximum activations" });
    }

    if (!db.users[user]) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // Calculate expiry
    const now = new Date();
    let expiryDate;

    switch (license.type) {
        case '1Hour': expiryDate = new Date(now.getTime() + 60 * 60 * 1000); break;
        case '1Day': expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); break;
        case '1Week': expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); break;
        case '1Month': expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); break;
        case 'LifeTime': expiryDate = "lifetime"; break;
        default: return res.status(400).json({ success: false, message: "Invalid key type" });
    }

    // Update user
    db.users[user].expiry = (expiryDate === "lifetime") ? "lifetime" : expiryDate.toISOString();
    db.users[user].usedKey = key;

    // Update key usage
    license.uses += 1;
    if (license.uses >= license.max_activations) {
        license.active = false;
    }

    saveDB(db);
    res.json({ success: true, expiry: db.users[user].expiry });
});

// Check status route
app.get('/status/:user', (req, res) => {
    const { user } = req.params;
    const db = getDB();
    const userData = db.users[user];

    if (!userData) return res.status(404).json({ success: false });

    // Check if the key the user used still exists
    if (userData.usedKey) {
        const keyExists = db.keys.find(k => k.code === userData.usedKey);
        if (!keyExists) {
            userData.expiry = null;
            userData.usedKey = null;
            saveDB(db);
        }
    }

    res.json({ expiry: userData.expiry });
});

// --- Admin Routes ---
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

app.get('/admin/users', (req, res) => {
    const db = getDB();
    const users = Object.keys(db.users).map(name => ({
        name,
        expiry: db.users[name].expiry
    }));
    res.json(users);
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
