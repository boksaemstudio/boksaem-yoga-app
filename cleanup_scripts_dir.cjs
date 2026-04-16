const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ARCHIVE_ROOT = '_workspace_archive';
const SCRIPTS_DIR = 'scripts';
const TARGET_ARCHIVE = path.join(ARCHIVE_ROOT, 'scripts_folder_mess');

fs.mkdirSync(TARGET_ARCHIVE, { recursive: true });

// Essential operational scripts that should STAY in /scripts/
const ESSENTIAL_SCRIPTS = [
  'deploy_all.cjs',
  'deploy_passflow.cjs',
  'update_version.js',
  'verify_assets.js',
  'seed_demo_data.js'
];

const files = fs.readdirSync(SCRIPTS_DIR, { withFileTypes: true });

function move(fileObj) {
  const oldPath = path.join(SCRIPTS_DIR, fileObj.name);
  const dest = path.join(TARGET_ARCHIVE, fileObj.name);
  try {
    try { execSync(`git rm --cached ${oldPath}`, { stdio: 'ignore' }); } catch(e) {}
    fs.renameSync(oldPath, dest);
    console.log(`Moved ${oldPath} -> ${dest}`);
  } catch(e) {
    console.error(`Failed to move ${oldPath}:`, e.message);
  }
}

for (const f of files) {
  if (!f.isFile()) continue;
  
  if (!ESSENTIAL_SCRIPTS.includes(f.name)) {
      move(f);
  }
}

console.log('Scripts folder cleanup complete!');
