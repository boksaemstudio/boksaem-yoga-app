const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('npx vite build --force', { stdio: 'pipe' });
  fs.writeFileSync('vite_debug.txt', 'SUCCESS:\n' + output.toString());
} catch (error) {
  fs.writeFileSync('vite_debug.txt', 'ERROR STATUS: ' + error.status + '\nSTDOUT:\n' + error.stdout.toString() + '\nSTDERR:\n' + error.stderr.toString());
}
