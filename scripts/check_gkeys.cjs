const fs = require('fs');
const content = fs.readFileSync('src/utils/translations.js', 'utf8');

// g_ 키가 제대로 값을 갖고 있는지 체크
const gKeyPattern = /"(g_[a-f0-9]{6})"\s*:\s*"([^"]*)"/g;
let total = 0, empty = 0, selfRef = 0;
let match;
while ((match = gKeyPattern.exec(content)) !== null) {
    total++;
    const key = match[1];
    const val = match[2];
    if (!val || val.trim() === '') empty++;
    if (val === key) selfRef++;
}
console.log('Total g_ keys found:', total);
console.log('Empty values:', empty);
console.log('Self-referencing (key=value):', selfRef);

// MembersTab에서 사용하는 핵심 g_ 키들 체크
const specific = ['g_384a99','g_6eb5cd','g_c9d6b7','g_416913','g_f49db8','g_3c19bc','g_8209e5','g_7b3c6e'];
specific.forEach(k => {
    const re = new RegExp('"' + k + '"\\s*:\\s*"([^"]*)"');
    const m = content.match(re);
    console.log(k + ':', m ? (m[1].substring(0, 40) || 'EMPTY') : 'NOT FOUND IN FILE');
});

// 단위_명 체크
const unitMatch = content.match(/"단위_명"\s*:\s*"([^"]*)"/);
console.log('단위_명:', unitMatch ? unitMatch[1] : 'NOT FOUND');
