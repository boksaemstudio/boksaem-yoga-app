const fs = require('fs');

const path = './firebase.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Find passflow-0324 to use as template
const template = data.hosting.find(h => h.site === 'passflow-0324');

// Check if passflowai already exists
const existing = data.hosting.findIndex(h => h.site === 'passflowai');

const clone = JSON.parse(JSON.stringify(template));
clone.site = 'passflowai';

if (existing !== -1) {
    data.hosting[existing] = clone;
} else {
    data.hosting.push(clone);
}

fs.writeFileSync(path, JSON.stringify(data, null, 2));
console.log('firebase.json patched successfully.');
