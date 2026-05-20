require('dotenv').config();
const mongoose = require('mongoose');
const Key = require('./models/Key');

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });

function generatePattern(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function createKey(type, maxActivations = 1) {
    const code = `BSP_${type}_${generatePattern()}`;

    const newKey = new Key({
        code,
        type,
        max_activations: maxActivations,
        uses: 0,
        active: true,
        source: 'cli'
    });

    await newKey.save();

    console.log(`-----------------------------------`);
    console.log(`Generated Key: ${code}`);
    console.log(`Type:          ${type}`);
    console.log(`Activations:   ${maxActivations}`);
    console.log(`-----------------------------------`);
    process.exit(0);
}

// Simple CLI
const args = process.argv.slice(2);
if (args.length < 1) {
    console.log("Usage: node generate_keys.js <type> [maxActivations]");
    console.log("Types: 1Hour, 1Day, 1Week, 1Month, LifeTime");
    process.exit(1);
}

const type = args[0];
const maxActivations = parseInt(args[1]) || 1;

createKey(type, maxActivations);
