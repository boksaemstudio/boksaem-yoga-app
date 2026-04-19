const fs = require('fs');
const path = require('path');

const file = 'src/components/MemberScheduleCalendar.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('formatDate')) {
    const importMatch = content.match(/import.*?;?\n/g);
    const lastImport = importMatch[importMatch.length - 1];
    content = content.replace(lastImport, lastImport + `import { formatDate } from '../utils/formatters';\n`);
}

// Ensure language exists
if (!content.includes('const language = useLanguageStore(s => s.language)')) {
    content = content.replace(/const t = useLanguageStore\(s => s\.t\);/g, 'const t = useLanguageStore(s => s.t);\n  const language = useLanguageStore(s => s.language);');
}

fs.writeFileSync(file, content);
console.log('Patched Date in:', file);
