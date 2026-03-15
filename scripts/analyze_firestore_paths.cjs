const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/services');

// A quick helper script to show where collection(db, 'XXX') or doc(db, 'XXX') are used 
// in the service files to estimate refactoring size.
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js'));

let matchCount = 0;
files.forEach(file => {
  const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('collection(db') || line.includes('doc(db')) {
      console.log(`${file}:${index + 1} -> ${line.trim()}`);
      matchCount++;
    }
  });
});

console.log(`\nFound ${matchCount} Firestore DB path references needing studioId injection.`);
