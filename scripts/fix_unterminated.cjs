const fs = require('fs');
const { execSync } = require('child_process');

// Get all modified files in git
const statusOutput = execSync('git status --porcelain', { encoding: 'utf8' });
const modifiedFiles = statusOutput
  .split('\n')
  .filter(line => line.startsWith(' M ') || line.startsWith('M '))
  .map(line => line.slice(3).trim())
  .filter(f => f.endsWith('.js') || f.endsWith('.jsx'));

modifiedFiles.push('src/components/instructor/InstructorHome.jsx'); // Ensure inclusion

let fixedCount = 0;

for (const file of modifiedFiles) {
  if (!fs.existsSync(file)) continue;
  
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  let fixedContent = [];
  let i = 0;
  let fileChanged = false;

  while (i < lines.length) {
    let line = lines[i];
    
    // Simplistic heuristic: if line has an odd number of UNESCAPED double quotes, it might be an unterminated string
    const countUnescapedQuotes = (str, q) => {
       let count = 0;
       for(let j=0; j<str.length; j++) {
           if(str[j] === q && (j === 0 || str[j-1] !== '\\')) {
               count++;
           }
       }
       return count;
    };

    const dq = countUnescapedQuotes(line, '"');
    const sq = countUnescapedQuotes(line, "'");

    if (dq % 2 !== 0 && i < lines.length - 1) {
      // Unterminated double quote string -> merge with next line via literal \n
      const nextLine = lines[i+1];
      line = line + "\\n" + nextLine;
      i++; // Skip the next line
      fileChanged = true;
      // Re-evaluate in case it spans 3 lines (recursion)
      while (countUnescapedQuotes(line, '"') % 2 !== 0 && i < lines.length - 1) {
          line = line + "\\n" + lines[i+1];
          i++;
      }
    } 
    else if (sq % 2 !== 0 && i < lines.length - 1) {
      const nextLine = lines[i+1];
      line = line + "\\n" + nextLine;
      i++;
      fileChanged = true;
      while (countUnescapedQuotes(line, "'") % 2 !== 0 && i < lines.length - 1) {
          line = line + "\\n" + lines[i+1];
          i++;
      }
    }

    fixedContent.push(line);
    i++;
  }

  if (fileChanged) {
     const newText = fixedContent.join('\n');
     if (newText !== content) {
        fs.writeFileSync(file, newText, 'utf8');
        console.log('Fixed unterminated strings in:', file);
        fixedCount++;
     }
  }
}

console.log('Total files fixed by heuristic:', fixedCount);
