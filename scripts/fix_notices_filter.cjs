const fs = require('fs');
const p = 'src/components/admin/tabs/NoticesTab.jsx';
let c = fs.readFileSync(p, 'utf8');

// notices.length === 0 → notices.filter(n => !n.isSystemNotice).length === 0
c = c.replace(
    'notices.length === 0',
    'notices.filter(n => !n.isSystemNotice).length === 0'
);

// [...notices].sort → [...notices].filter(n => !n.isSystemNotice).sort
c = c.replace(
    '[...notices].sort',
    '[...notices].filter(n => !n.isSystemNotice).sort'
);

fs.writeFileSync(p, c, 'utf8');
console.log('✅ NoticesTab — isSystemNotice 필터 추가 완료');
