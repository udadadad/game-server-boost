const mongoose = require('mongoose');

const botUserSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    username: { type: String, default: 'Unknown' },
    name: { type: String, default: 'No Name' },
    lastSeen: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BotUser', botUserSchema);
