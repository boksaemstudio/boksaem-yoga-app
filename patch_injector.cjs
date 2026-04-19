const fs = require('fs');
const path = 'functions/helpers/liveInjector.js';
let content = fs.readFileSync(path, 'utf8');

// Replace the hardcoded `main_${todayStr}`
content = content.replace(/const docId = `main_\$\{todayStr\}`;/g, "const docId = Math.random() > 0.5 ? `main_${todayStr}` : `branch2_${todayStr}`;");

// Replace the hardcoded branchId: 'main' in the attendance object
content = content.replace(/branchId: 'main'/g, "branchId: docId.startsWith('main') ? 'main' : 'branch2'");

fs.writeFileSync(path, content);
console.log("liveInjector patched!");
