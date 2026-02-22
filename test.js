const fs = require('fs'); 
try {
  fs.writeFileSync('out.txt', 'CheckIn src size: ' + fs.statSync('src/pages/CheckInPage.jsx').size + 
  '\nCheckIn src includes v7: ' + fs.readFileSync('src/pages/CheckInPage.jsx', 'utf8').includes('v2026.02.22.v7') + 
  '\nDist file size: ' + fs.statSync('dist/assets/CheckInPage-bMgZ8n86.js').size + 
  '\nDist file includes v7: ' + fs.readFileSync('dist/assets/CheckInPage-bMgZ8n86.js', 'utf8').includes('v2026.02.22.v7'));
} catch (e) {
  fs.writeFileSync('out.txt', 'Error: ' + e.message);
}
