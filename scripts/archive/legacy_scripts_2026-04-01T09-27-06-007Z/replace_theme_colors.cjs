const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../src');

// Function to recursively find all files with specific extensions
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      const ext = path.extname(file);
      if (ext === '.jsx' || ext === '.js') {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles(directoryPath);

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // Replace Hex Codes
  newContent = newContent.replace(/#D4AF37/gi, 'var(--primary-gold)');
  
  // Custom linear gradients in modals
  // e.g., 'linear-gradient(145deg, rgba(30,30,35,0.98), rgba(20,20,25,0.98))'
  newContent = newContent.replace(/'linear-gradient\(145deg,\s*rgba\(30,30,35,0\.98\),\s*rgba\(20,20,25,0\.98\)\)'/g, 'var(--bg-modal)');

  // Replace rgba(212, 175, 55, <alpha>) or similar formats
  // Match rgba(212,175,55,XXX) with varied spacing
  const rgbaRegex = /rgba\(\s*212\s*,\s*175\s*,\s*55\s*,\s*([0-9.]+)\s*\)/g;
  newContent = newContent.replace(rgbaRegex, (match, alpha) => {
    return `rgba(var(--primary-rgb), ${alpha})`;
  });

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedCount++;
    console.log(`Updated: ${path.relative(directoryPath, file)}`);
  }
});

console.log('---');
console.log(`Total files modified: ${modifiedCount}`);
