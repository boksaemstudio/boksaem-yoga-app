/**
 * Auto-fix ALL variable shadowing of translation function t
 * Replaces callback parameter t with safe alternatives
 */
const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !['node_modules','dist','.git','scripts'].includes(f.name)) files.push(...scanDir(p));
    else if (f.isFile() && (f.name.endsWith('.jsx')||f.name.endsWith('.js')) && !f.name.includes('.cjs')) files.push(p);
  }
  return files;
}

const fixes = [
  // MembersTab.jsx
  { file: 'src/components/admin/tabs/MembersTab.jsx', patterns: [
    { from: /\.map\(t\s*=>\s*t\.total\)/g, to: '.map(item => item.total)' },
    { from: /pushTokens\.some\(t\s*=>\s*t\.memberId/g, to: 'pushTokens.some(tk => tk.memberId' },
  ]},
  // AdminMemberDetailModal.jsx
  { file: 'src/components/AdminMemberDetailModal.jsx', patterns: [
    { from: /pushTokens\.some\(t\s*=>\s*t\.memberId/g, to: 'pushTokens.some(tk => tk.memberId' },
  ]},
  // useAdminData.js
  { file: 'src/hooks/useAdminData.js', patterns: [
    { from: /\.map\(t\s*=>\s*parseInt\(t\./g, to: '.map(item => parseInt(item.' },
    { from: /\.map\(t\s*=>\s*\(\{/g, to: '.map(item => ({' },
  ]},
  // SmartDataImporter.jsx
  { file: 'src/components/admin/data-import/SmartDataImporter.jsx', patterns: [
    { from: /tabs\.find\(t\s*=>\s*t\.id/g, to: 'tabs.find(tab => tab.id' },
  ]},
  // FaceRegistrationModal.jsx
  { file: 'src/components/checkin/FaceRegistrationModal.jsx', patterns: [
    { from: /\.forEach\(t\s*=>\s*t\.stop/g, to: '.forEach(track => track.stop' },
  ]},
  // PrescriptionWizardView.jsx
  { file: 'src/components/meditation/views/PrescriptionWizardView.jsx', patterns: [
    { from: /\.map\(t\s*=>\s*<button\s*key=\{t\.id\}/g, to: '.map(iType => <button key={iType.id}' },
  ]},
];

let totalFixed = 0;

for (const fix of fixes) {
  const filePath = fix.file;
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ ${filePath} not found, skipping`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  for (const p of fix.patterns) {
    content = content.replace(p.from, p.to);
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${filePath}`);
    totalFixed++;
  }
}

// Special: useAdminData.js - also fix the mapped object properties
const adminDataFile = 'src/hooks/useAdminData.js';
if (fs.existsSync(adminDataFile)) {
  let c = fs.readFileSync(adminDataFile, 'utf8');
  // Fix: .map(item => ({ ...item  (replace t. with item. in the mapped block)
  // This is tricky since we need context. Let's do it line by line
  const lines = c.split('\n');
  let inMapBlock = false;
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('.map(item => ({')) {
      inMapBlock = true;
      continue;
    }
    if (inMapBlock) {
      // Replace t. references with item.
      if (/\bt\./.test(lines[i]) && !/\bt\(/.test(lines[i])) {
        lines[i] = lines[i].replace(/\bt\./g, 'item.');
        changed = true;
      }
      if (lines[i].includes('}))')) {
        inMapBlock = false;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(adminDataFile, lines.join('\n'));
    console.log('✅ useAdminData.js (map block)');
  }
}

// Special: MembersTab.jsx - fix the full expression on line 852
const membersTabFile = 'src/components/admin/tabs/MembersTab.jsx';
if (fs.existsSync(membersTabFile)) {
  let c = fs.readFileSync(membersTabFile, 'utf8');
  // The pattern might be: summary.monthlyReRegTrend.map(t => t.total)
  // After first fix it becomes: summary.monthlyReRegTrend.map(item => item.total)
  // But we need to check if there are still t => t.xxx patterns
  const before = c;
  // Generic fix: any remaining .map(t => t.xxx) or .filter(t => t.xxx)
  c = c.replace(/\.(map|filter|find|some|forEach)\(t\s*=>\s*t\b/g, '.$1(item => item');
  if (c !== before) {
    fs.writeFileSync(membersTabFile, c);
    console.log('✅ MembersTab.jsx (remaining patterns)');
    totalFixed++;
  }
}

console.log(`\nDone. Fixed ${totalFixed} files.`);
