const fs = require('fs');
const content = fs.readFileSync('src/components/admin/tabs/StudioSettingsTab.jsx', 'utf8');
const hangulRegex = /'[^']*[\uac00-\ud7a3]+[^']*'|"[^"]*[\uac00-\ud7a3]+[^"]*"|>[^<]*[\uac00-\ud7a3]+[^<]*</g;
const matches = content.match(hangulRegex) || [];
const result = [...new Set(matches)].map(m => m.replace(/^>|<$/g, '').trim()).filter(x => x);
fs.writeFileSync('korean_strings.json', JSON.stringify(result, null, 2), 'utf8');