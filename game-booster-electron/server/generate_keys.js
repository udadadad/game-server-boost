const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'database.json');

function generatePattern(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function createKey(type, maxActivations = 1) {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, keys: [] }, null, 2));
    }

    const db = JSON.parse(fs.readFileSync(DB_PATH));

    // BSP_[Duration]_[Random]
    const code = `BSP_${type}_${generatePattern()}`;

    const newKey = {
        code,
        type, // 1Hour, 1Day, 1Week, 1Month, LifeTime
        max_activations: maxActivations,
        uses: 0,
        active: true,
        created_at: new Date().toISOString()
    };

    db.keys.push(newKey);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    console.log(`-----------------------------------`);
    console.log(`Generated Key: ${code}`);
    console.log(`Type:          ${type}`);
    console.log(`Activations:   ${maxActivations}`);
    console.log(`-----------------------------------`);
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
