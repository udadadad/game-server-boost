const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    expiry: { type: mongoose.Schema.Types.Mixed, default: null }, // Date string or "lifetime"
    usedKey: { type: String, default: null },
    lastLogin: { type: Date, default: null },
    ip: { type: String, default: null }
});

module.exports = mongoose.model('User', userSchema);
