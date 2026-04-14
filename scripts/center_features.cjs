const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findHtmlFiles(filePath, fileList);
    } else if (file === 'home.html') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const htmlFiles = findHtmlFiles(publicDir);

const cssFix = `
        /* Feature Cards Center Alignment Fix */
        .spec-category > div:first-child { text-align: center !important; }
        .spec-category > div:first-child h3 { justify-content: center !important; }
        .feature-card { text-align: center !important; }
        .feature-card .f-icon { margin-left: auto !important; margin-right: auto !important; display: inline-flex !important; }
        .feature-card .f-points { display: inline-block !important; text-align: left !important; }
`;

let fixCount = 0;

for (const file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('.spec-category')) {
    if (!content.includes('Feature Cards Center Alignment Fix')) {
      content = content.replace('</style>', cssFix + '    </style>');
      fs.writeFileSync(file, content, 'utf8');
      console.log('✅ Applied CSS fix to ' + file);
      fixCount++;
    } else {
      console.log('⏭️ Already fixed: ' + file);
    }
  }
}

console.log('Done! Updated ' + fixCount + ' files.');
