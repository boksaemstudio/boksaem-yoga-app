const fs = require('fs');
const koreanRegex = /[\u3131-\uD79D]/;
const data = require('./audit_result.json');

const allFiles = [...data.components, ...data.nonComponents];
const needsWork = [];
const commentsOnly = [];

for (const item of allFiles) {
  const filePath = item.file.replace(/\//g, '\\');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let realKorean = 0;
  let commentKorean = 0;
  let alreadyWrapped = 0;
  const realSamples = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!koreanRegex.test(line)) continue;
    
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('/**')) {
      commentKorean++;
      continue;
    }
    if (trimmed.startsWith('import ')) continue;
    if (line.includes('t(') || line.includes('t("')) {
      alreadyWrapped++;
      continue;
    }
    realKorean++;
    if (realSamples.length < 5) realSamples.push({ line: i+1, text: trimmed.substring(0, 120) });
  }
  
  if (realKorean > 0) {
    needsWork.push({ file: item.file, realKorean, commentKorean, alreadyWrapped, isComponent: item.isComponent, samples: realSamples });
  } else {
    commentsOnly.push({ file: item.file, commentKorean, alreadyWrapped });
  }
}

console.log('=== REAL KOREAN NEEDING t() ===');
console.log('Files:', needsWork.length);
needsWork.sort((a,b) => b.realKorean - a.realKorean);
needsWork.forEach(f => {
  const type = f.isComponent ? 'COMP' : 'UTIL';
  console.log(`\n${f.realKorean} real | ${type} | ${f.file}`);
  f.samples.forEach(s => console.log(`  L${s.line}: ${s.text}`));
});

console.log('\n=== ALREADY DONE (comments/wrapped only) ===');
console.log('Files:', commentsOnly.length);
commentsOnly.forEach(f => console.log(`  OK | ${f.file}`));

fs.writeFileSync('needs_work.json', JSON.stringify(needsWork, null, 2));
