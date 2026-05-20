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
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'cb_sec_a8b92d8e4f5a1c0d3e2b1029384756';
const BotUser = require('./models/BotUser');

const activeAdminSessions = new Set();

function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing Admin Token' });
    }
    const token = authHeader.split(' ')[1];
    if (activeAdminSessions.has(token)) {
        return next();
    }
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid Admin Token' });
}

function authenticateInternal(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Missing Internal Key' });
    }
    const token = authHeader.split(' ')[1];
    if (token === INTERNAL_API_KEY) {
        return next();
    }
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid Internal Key' });
}

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
        const token = require('crypto').randomBytes(32).toString('hex');
        userData.sessionToken = token;
        await userData.save();

        res.json({ success: true, active, reason, token, expiry: userData.expiry });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/verify-session', async (req, res) => {
    const { user, token } = req.body;
    try {
        const userData = await User.findOne({ username: user });
        if (!userData || userData.sessionToken !== token) {
            return res.json({ success: false, message: "Invalid session" });
        }

        let active = true;
        let reason = null;

        // Check if key exists
        if (userData.usedKey) {
            const keyExists = await Key.findOne({ code: userData.usedKey });
            if (!keyExists) {
                userData.expiry = null;
                userData.usedKey = null;
                userData.sessionToken = null;
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

        res.json({ success: true, active, reason, expiry: userData.expiry });
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
        const token = require('crypto').randomBytes(32).toString('hex');
        userData.sessionToken = token;
        await userData.save();

        keyData.uses++;
        if (keyData.uses >= keyData.max_activations) {
            keyData.active = false;
        }
        await keyData.save();

        res.json({ success: true, expiry: expiryDate, token });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get('/status/:user', async (req, res) => {
    const { user } = req.params;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ expiry: null });
    }
    const token = authHeader.split(' ')[1];

    try {
        const userData = await User.findOne({ username: user });
        if (!userData || !userData.expiry || userData.sessionToken !== token) {
            return res.json({ expiry: null });
        }

        if (userData.usedKey) {
            const keyExists = await Key.findOne({ code: userData.usedKey });
            if (!keyExists) {
                userData.expiry = null;
                userData.sessionToken = null;
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
// --- Admin/Bot Routes ---
app.post('/admin/sync-bot-users', authenticateInternal, async (req, res) => {
    const { userId, username, first_name, last_name, referrerId } = req.body;
    try {
        let user = await BotUser.findOne({ userId });

        const updateData = {
            username: username || 'Unknown',
            name: `${first_name || ''} ${last_name || ''}`.trim() || 'No Name',
            lastSeen: new Date()
        };

        if (user) {
            // Existing user, just update info
            Object.assign(user, updateData);
        } else {
            // New User
            user = new BotUser({ userId, ...updateData });
            // Only set referrer if it's a NEW user and referrer exists
            if (referrerId && referrerId !== userId) {
                const refUser = await BotUser.findOne({ userId: referrerId });
                if (refUser) {
                    user.referredBy = referrerId;
                    console.log(`[Refferal] ${userId} invited by ${referrerId}`);
                }
            }
        }
        await user.save();
        res.json({ success: true, referredBy: user.referredBy });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/bot/purchase-success', authenticateInternal, async (req, res) => {
    const { userId, amount } = req.body; // amount in Stars
    try {
        const user = await BotUser.findOne({ userId });
        if (user && user.referredBy) {
            const referrer = await BotUser.findOne({ userId: user.referredBy });
            if (referrer) {
                // Reward Logic: 10% of purchase price as Points? 
                // Let's do simplified: 1 Sale = 1 Point. 3 Points = 1 Week Code.
                referrer.referrals += 1;
                referrer.rewardBalance += 1;
                await referrer.save();
                console.log(`[Referral] User ${referrer.userId} rewarded for sale!`);
            }
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.post('/bot/get-profile', authenticateInternal, async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await BotUser.findOne({ userId });
        res.json(user || {});
    } catch (e) { res.json({}); }
});

app.post('/bot/claim-reward', authenticateInternal, async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await BotUser.findOne({ userId });
        if (!user || user.rewardBalance < 3) {
            return res.json({ success: false, message: "Not enough points" });
        }

        // Generate Reward Key (1 Week)
        const type = '1Week';
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomPart = '';
        for (let i = 0; i < 16; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const code = `BSP_${type}_${randomPart}`;

        const newKey = new Key({
            code, type, max_activations: 1, uses: 0, active: true, source: 'referral_reward'
        });
        await newKey.save();

        // Deduct balance
        user.rewardBalance -= 3;
        await user.save();

        res.json({ success: true, key: code });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// --- Admin Routes ---
app.get('/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const users = await User.find({}, 'username ip lastLogin expiry usedKey');
        res.json(users);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.get('/admin/bot-users', authenticateAdmin, async (req, res) => {
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
        const token = require('crypto').randomBytes(32).toString('hex');
        activeAdminSessions.add(token);
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin Password' });
    }
});

app.get('/admin/stats', authenticateAdmin, async (req, res) => {
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

app.get('/admin/keys', authenticateAdmin, async (req, res) => {
    try {
        const keys = await Key.find({});
        res.json(keys);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.post('/admin/generate-key', authenticateAdmin, async (req, res) => {
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

app.post('/admin/delete-key', authenticateAdmin, async (req, res) => {
    const { code } = req.body;
    try {
        await Key.deleteOne({ code });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/admin/delete-user', authenticateAdmin, async (req, res) => {
    const { name } = req.body; // 'name' here is username based on old logic
    try {
        await User.deleteOne({ username: name });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/admin/reset-user', authenticateAdmin, async (req, res) => {
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
app.post('/bot/generate-key', authenticateInternal, async (req, res) => {
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
