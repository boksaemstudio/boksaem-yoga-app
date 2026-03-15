const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let issues = {
  uncheckedAsync: [],
  consoleUsage: [],
  hardcodedTokens: []
};

walkDir('./src', function(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Unchecked Async Functions
  // Very simplistic match: finding "async " but no "try {" inside the file. 
  // A better metric: how many "async " keywords vs "try {" keywords.
  if (content.includes('async ') && !content.includes('try {')) {
     issues.uncheckedAsync.push(filePath);
  }

  // 2. Console Usage (warn/error are acceptable, but generic logs in production are bad practice)
  const logMatches = content.match(/console\.log\(/g);
  if (logMatches && logMatches.length > 5) {
     issues.consoleUsage.push(`${filePath} (${logMatches.length} logs)`);
  }

  // 3. Potential Tokens/Keys
  if (/bearer\s+[A-Za-z0-9\-_=]+/i.test(content) || /(apikey|secret|token)\s*=\s*['"][A-Za-z0-9\-_]+['"]/i.test(content)) {
     issues.hardcodedTokens.push(filePath);
  }
});

console.log("=== GOD-LEVEL AUDIT REPORT ===");
console.log(`[Unchecked Async Files] - Lacking try/catch block entirely: ${issues.uncheckedAsync.length}`);
issues.uncheckedAsync.forEach(f => console.log(`  - ${f}`));

console.log(`\n[Heavy Console.log Usage] - Potential performance/privacy leaks: ${issues.consoleUsage.length}`);
issues.consoleUsage.forEach(f => console.log(`  - ${f}`));

console.log(`\n[Hardcoded Secrets/Tokens]: ${issues.hardcodedTokens.length}`);
issues.hardcodedTokens.forEach(f => console.log(`  - ${f}`));
