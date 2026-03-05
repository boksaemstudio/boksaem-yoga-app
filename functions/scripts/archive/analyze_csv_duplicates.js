const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', '..', '회원현황_20260201.csv');

try {
    const data = fs.readFileSync(csvPath, 'utf8');
    const lines = data.split('\n');

    // Skip header
    const rows = lines.slice(1).filter(line => line.trim().length > 0);

    const phoneMap = {};

    rows.forEach(line => {
        // Simple CSV parsing: remove leading/trailing quotes and split by ","
        // This assumes the format observed in view_file: "val1","val2",...
        const cleanLine = line.trim().replace(/^"|"$/g, '');
        const cols = cleanLine.split('","');

        // Name is index 1, Phone is index 9 (based on header row in view_file)
        // 0: 회원번호, 1: 이름, ..., 9: 휴대폰1
        const name = cols[1];
        const phone = cols[9];

        if (phone) {
            const last4 = phone.replace(/[^0-9]/g, '').slice(-4);
            if (last4.length === 4) {
                if (!phoneMap[last4]) {
                    phoneMap[last4] = [];
                }
                phoneMap[last4].push({ name, phone });
            }
        }
    });

    const duplicates = [];
    Object.keys(phoneMap).forEach(key => {
        if (phoneMap[key].length > 1) {
            duplicates.push({ last4: key, members: phoneMap[key] });
        }
    });

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} sets of duplicates in CSV:`);
        duplicates.forEach(d => {
            console.log(`\nLast 4 Digits: ${d.last4}`);
            d.members.forEach(m => console.log(` - ${m.name} (${m.phone})`));
        });
    } else {
        console.log('No duplicates found in CSV.');
    }

} catch (err) {
    console.error('Error reading/parsing CSV:', err);
}
