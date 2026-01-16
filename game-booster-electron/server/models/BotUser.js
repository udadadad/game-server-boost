const mongoose = require('mongoose');

const botUserSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    username: { type: String, default: 'Unknown' },
    name: { type: String, default: 'No Name' },
    lastSeen: { type: Date, default: Date.now },
    referredBy: { type: Number, default: null }, // ID of the user who invited this user
    referrals: { type: Number, default: 0 }, // Count of successful invites (who purchased)
    rewardBalance: { type: Number, default: 0 } // Points available to claim
});

module.exports = mongoose.model('BotUser', botUserSchema);
