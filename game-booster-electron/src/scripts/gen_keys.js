const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateKey(prefix) {
    return prefix + "-" + crypto.randomBytes(4).toString('hex').toUpperCase() + "-" + crypto.randomBytes(4).toString('hex').toUpperCase();
}

const keys = {
    "1day": [],
    "1week": [],
    "1month": [],
    "lifetime": []
};

// 100 on 1 day
for (let i = 0; i < 100; i++) keys["1day"].push(generateKey("BOOST-1D"));
// 100 on 1 week
for (let i = 0; i < 100; i++) keys["1week"].push(generateKey("BOOST-1W"));
// 100 on 1 month
for (let i = 0; i < 100; i++) keys["1month"].push(generateKey("BOOST-1M"));
// 1 on lifetime
keys["lifetime"].push(generateKey("BOOST-LIFETIME"));

const keys_output = JSON.stringify(keys, null, 2);
fs.writeFileSync(path.join(__dirname, '../../keys.json'), keys_output);

// Generate Hashes for internal use
const hashedKeys = {
    "1day": keys["1day"].map(k => crypto.createHash('sha256').update(k).digest('hex')),
    "1week": keys["1week"].map(k => crypto.createHash('sha256').update(k).digest('hex')),
    "1month": keys["1month"].map(k => crypto.createHash('sha256').update(k).digest('hex')),
    "lifetime": keys["lifetime"].map(k => crypto.createHash('sha256').update(k).digest('hex'))
};

fs.writeFileSync(path.join(__dirname, '../../hashes.json'), JSON.stringify(hashedKeys, null, 2));

console.log("Success: 301 keys written to keys.json (KEEP THIS SAFE!)");
console.log("Success: 301 hashes written to hashes.json (Safe for App bundle)");

