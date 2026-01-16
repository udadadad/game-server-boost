const mongoose = require('mongoose');

const keySchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    type: { type: String, required: true }, // "1Hour", "LifeTime", etc.
    max_activations: { type: Number, default: 1 },
    uses: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    source: { type: String, default: 'admin' }
});

module.exports = mongoose.model('Key', keySchema);
