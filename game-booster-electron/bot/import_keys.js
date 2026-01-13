const fs = require('fs');
const path = require('path');

const RAW_KEYS_PATH = 'C:\\Users\\JDH\\Desktop\\raw_keys.txt';
const BOT_DB_PATH = path.join(__dirname, 'inventory.json');

function importKeys() {
    if (!fs.existsSync(RAW_KEYS_PATH)) {
        console.error('Keys file not found on desktop!');
        return;
    }

    const content = fs.readFileSync(RAW_KEYS_PATH, 'utf8');
    const lines = content.split('\n');

    const inventory = {
        '1day': [],
        '1week': [],
        '1month': [],
        'lifetime': []
    };

    let currentCat = null;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.includes('--- 1 DAY ---')) currentCat = '1day';
        else if (trimmed.includes('--- 7 DAYS ---')) currentCat = '1week';
        else if (trimmed.includes('--- 30 DAYS ---')) currentCat = '1month';
        else if (trimmed.includes('--- LIFETIME ---')) currentCat = 'lifetime';
        else if (trimmed.startsWith('CB-') && currentCat) {
            inventory[currentCat].push(trimmed);
        }
    });

    fs.writeFileSync(BOT_DB_PATH, JSON.stringify(inventory, null, 2));
    console.log('Successfully imported keys to bot inventory.');
}

importKeys();
