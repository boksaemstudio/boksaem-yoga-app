const fs = require('fs');
const content = fs.readFileSync('dist/assets/AdminDashboard-HgyhLSEA-v12.js', 'utf8');
const start = Math.max(0, 414048 - 100);
const end = Math.min(content.length, 414048 + 100);
console.log(content.substring(start, end));