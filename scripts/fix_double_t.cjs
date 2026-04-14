const fs = require('fs');
let c = fs.readFileSync('src/components/admin/tabs/AttendanceTrendChart.jsx', 'utf8');
const count = (c.match(/t\(t\(/g) || []).length;
console.log('Remaining t(t() calls:', count);

// Fix: t(t('key') -> t('key')
c = c.replace(/t\(t\((['"])/g, 't($1');
fs.writeFileSync('src/components/admin/tabs/AttendanceTrendChart.jsx', c);

const count2 = (c.match(/t\(t\(/g) || []).length;
console.log('After fix:', count2);
