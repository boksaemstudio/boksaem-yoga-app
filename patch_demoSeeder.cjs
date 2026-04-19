const fs = require('fs');

const seederPath = 'functions/helpers/demoSeeder.js';
let seederContent = fs.readFileSync(seederPath, 'utf8');

// 1. Modify the 1-week loop (d = 7) to 1-month loop (d = 30)
seederContent = seederContent.replace(/for\s*\(\s*let\s*d\s*=\s*7\s*;\s*d\s*>=\s*0\s*;\s*d--\s*\)/, 'for (let d = 30; d >= 0; d--)');

// 2. Add Branch 2 to demoDatasets dynamically instead of hardcoding
// We can just update the initialization logic for branches.
// Find: BRANCHES: [{ id: 'main', name: data.studioName, color: '#D4AF37', themeColor: '#FBB117' }],
seederContent = seederContent.replace(
    /BRANCHES:\s*\[\{\s*id:\s*'main',\s*name:\s*data.studioName,\s*color:\s*'#D4AF37',\s*themeColor:\s*'#FBB117'\s*\}\]/,
    `BRANCHES: [
        { id: 'main', name: data.studioName, color: '#D4AF37', themeColor: '#FBB117' },
        { id: 'branch2', name: data.studioName + (langCode === 'ko' ? ' 2호점' : (langCode === 'ja' ? ' 2号店' : (langCode === 'zh' ? ' 2号店' : ' Branch 2'))), color: '#333333', themeColor: '#222222' }
    ]`
);

// 3. Update FEATURES.MULTI_BRANCH to true
seederContent = seederContent.replace(/MULTI_BRANCH:\s*false/, 'MULTI_BRANCH: true');

// 4. Spread classes and instructors across branches, but doing it deeply is complex.
// The easiest way is to assign a random branch to classes and check-ins.
// Let's modify the class generation to assign branch: 'main' or 'branch2'
// Find: branch: 'main', status: 'normal',
seederContent = seederContent.replace(/branch:\s*'main',/g, "branch: Math.random() > 0.3 ? 'main' : 'branch2',");

fs.writeFileSync(seederPath, seederContent);
console.log('demoSeeder.js updated successfully for 30 days and multi-branch.');
