const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
// --- MongoDB Setup ---
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Key = require('./models/Key');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const MONGO_URI = process.env.MONGO_URI;
const BotUser = require('./models/BotUser');

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Routes
// Routes
app.post('/register', async (req, res) => {
    const { user, pass } = req.body;
    try {
        const existingUser = await User.findOne({ username: user });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }
        const newUser = new User({ username: user, password: pass });
        await newUser.save();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/login', async (req, res) => {
    const { user, pass } = req.body;
    try {
        const userData = await User.findOne({ username: user });
        if (!userData || userData.password !== pass) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        let active = true;
        let reason = null;

        // Check if key exists
        if (userData.usedKey) {
            const keyExists = await Key.findOne({ code: userData.usedKey });
            if (!keyExists) {
                userData.expiry = null;
                userData.usedKey = null;
                await userData.save();
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

        userData.lastLogin = new Date();
        userData.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await userData.save();

        const token = require('crypto').randomBytes(32).toString('hex');
        res.json({ success: true, active, reason, token, expiry: userData.expiry });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/activate', async (req, res) => {
    const { user, key } = req.body;
    try {
        const keyData = await Key.findOne({ code: key, active: true });
        if (!keyData) {
            return res.status(400).json({ success: false, message: "Invalid or already used key" });
        }

        const duration = keyData.type;
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

        let userData = await User.findOne({ username: user });
        if (!userData) {
            // Should exist, but fail-safe
            userData = new User({ username: user, password: 'auto' });
        }

        userData.expiry = expiryDate;
        userData.usedKey = key;
        await userData.save();

        keyData.uses++;
        if (keyData.uses >= keyData.max_activations) {
            keyData.active = false;
        }
        await keyData.save();

        res.json({ success: true, expiry: expiryDate });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/status/:user', async (req, res) => {
    const { user } = req.params;
    try {
        const userData = await User.findOne({ username: user });
        if (!userData || !userData.expiry) {
            return res.json({ expiry: null });
        }

        if (userData.usedKey) {
            const keyExists = await Key.findOne({ code: userData.usedKey });
            if (!keyExists) {
                userData.expiry = null;
                await userData.save();
                return res.json({ expiry: null });
            }
        }
        res.json({ expiry: userData.expiry });
    } catch (e) {
        res.json({ expiry: null });
    }
});

// --- Admin Routes ---
// --- Admin Routes ---
app.post('/admin/sync-bot-users', async (req, res) => {
    const { userId, username, first_name, last_name } = req.body;
    try {
        const updateData = {
            username: username || 'Unknown',
            name: `${first_name || ''} ${last_name || ''}`.trim() || 'No Name',
            lastSeen: new Date()
        };
        await BotUser.findOneAndUpdate({ userId }, updateData, { upsert: true, new: true });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/admin/bot-users', async (req, res) => {
    try {
        const users = await BotUser.find({});
        res.json(users);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.post('/admin/login', (req, res) => {
    const { pass } = req.body;
    if (pass === ADMIN_PASSWORD) {
        res.json({ success: true, token: 'admin-session-token' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin Password' });
    }
});

app.get('/admin/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({});
        const totalKeys = await Key.countDocuments({});
        // Aggregate total activations
        const result = await Key.aggregate([
            { $group: { _id: null, totalActivations: { $sum: "$uses" } } }
        ]);
        const totalActivations = result.length > 0 ? result[0].totalActivations : 0;

        res.json({ totalUsers, totalKeys, totalActivations });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/admin/keys', async (req, res) => {
    try {
        const keys = await Key.find({});
        res.json(keys);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.post('/admin/generate-key', async (req, res) => {
    const { type, maxActivations } = req.body;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 16; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const code = `BSP_${type}_${randomPart}`;

    try {
        const newKey = new Key({
            code,
            type,
            max_activations: parseInt(maxActivations) || 1,
            uses: 0,
            active: true,
            source: 'admin_panel'
        });
        await newKey.save();
        res.json({ success: true, key: newKey });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/admin/delete-key', async (req, res) => {
    const { code } = req.body;
    try {
        await Key.deleteOne({ code });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/admin/delete-user', async (req, res) => {
    const { name } = req.body; // 'name' here is username based on old logic
    try {
        await User.deleteOne({ username: name });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/admin/reset-user', async (req, res) => {
    const { name } = req.body;
    try {
        const user = await User.findOne({ username: name });
        if (user) {
            user.expiry = null;
            await user.save();
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: "User not found" });
        }
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- Bot API (Trial Keys) ---
app.post('/bot/generate-key', async (req, res) => {
    const type = '1Hour';

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 16; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const code = `BSP_${type}_${randomPart}`;

    try {
        const newKey = new Key({
            code,
            type,
            max_activations: 1,
            uses: 0,
            active: true,
            source: 'telegram_bot_trial'
        });
        await newKey.save();
        res.json({ success: true, key: newKey.code });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Booster Server is LIVE on port ${PORT}!`);
});
