const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const srcDir = 'C:\\Users\\boksoon\\.gemini\\antigravity\\brain\\a4141fb1-3287-41cf-a9d3-f13f98ff973f';
const destDir = path.join(process.cwd(), 'public', 'assets', 'bg');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Remove old backgrounds
const oldFiles = fs.readdirSync(destDir).filter(f => f.startsWith('random_bg_') || f.startsWith('medieval_bg_'));
for (const f of oldFiles) {
  fs.unlinkSync(path.join(destDir, f));
}

const files = fs.readdirSync(srcDir).filter(f => f.startsWith('medieval_') && f.endsWith('.png'));
console.log('Found files:', files);

let ix = 1;
async function processFiles() {
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, 'medieval_bg_' + ix + '.webp');
    await sharp(srcPath)
      .resize({ width: 1920, height: 1080, fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(destPath);
    console.log('Processed', destPath);
    ix++;
  }
}
processFiles();
