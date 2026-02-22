const { exec } = require('child_process');
const fs = require('fs');

exec('npx vite build', (error, stdout, stderr) => {
    fs.writeFileSync('build_debug.log', `ERROR:\n${error}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`);
    console.log('Build finished. Check build_debug.log');
});
