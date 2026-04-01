const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/services');

// A robust script to replace `collection(db, 'name')` with `tenantDb.collection('name')`
// and `doc(db, 'name', 'id')` with `tenantDb.doc('name', 'id')`
// Exception 1: settings collection remains global for now (to avoid breaking admin config)
// Exception 2: system_state, fcm_tokens, images, error_logs, etc. as needed

const globalCollections = [
    'settings',
    'system_state',
    'fcm_tokens',
    'error_logs',
    'images', // Images could be tenant-specific, but let's keep global for OSMU v1 to avoid immediate 404s
    'fcmTokens',
    'push_tokens'
];

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        arrayOfFiles.push(path.join(dirPath, '/', file));
      }
    }
  });
  return arrayOfFiles;
}

const files = getAllFiles(srcDir);
let totalReplaced = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Add tenantDb import if not present, but only if we are going to modify
  const needsImport = content.includes('collection(db') || content.includes('doc(db');
  
  if (needsImport && !content.includes('tenantDb')) {
     // Find the last import line
     const lines = content.split('\n');
     let lastImportIdx = -1;
     for(let i=0; i<lines.length; i++) {
         if (lines[i].startsWith('import ')) {
             lastImportIdx = i;
         }
     }
     
     if (lastImportIdx !== -1) {
         // calculate relative path to utils/tenantDb
         const relativePath = path.relative(path.dirname(file), path.join(__dirname, '../src/utils/tenantDb')).replace(/\\/g, '/');
         lines.splice(lastImportIdx + 1, 0, `import { tenantDb } from '${relativePath}';`);
         content = lines.join('\n');
     }
  }

  // 2. Replace collection(db, '...') -> tenantDb.collection('...')
  // Regex matches: collection(db, 'members') or collection(db, "sales") or collection(db, name)
  content = content.replace(/collection\(\s*db\s*,\s*(['"`]?[a-zA-Z0-9_]+['"`]?)\s*\)/g, (match, p1) => {
      // Check if it's a global collection
      const cleanName = p1.replace(/['"`]/g, '');
      if (globalCollections.includes(cleanName)) {
          return `tenantDb.globalCollection(${p1})`;
      }
      totalReplaced++;
      return `tenantDb.collection(${p1})`;
  });

  // 3. Replace doc(db, '...', '...') -> tenantDb.doc('...', '...')
  // Matches: doc(db, 'members', id)
  content = content.replace(/doc\(\s*db\s*,\s*(['"`]?[a-zA-Z0-9_]+['"`]?)\s*,\s*([^)]+)\)/g, (match, p1, p2) => {
      const cleanName = p1.replace(/['"`]/g, '');
      if (globalCollections.includes(cleanName)) {
          return `tenantDb.globalDoc(${p1}, ${p2})`;
      }
      totalReplaced++;
      return `tenantDb.doc(${p1}, ${p2})`;
  });

  // 4. Replace doc(collection(...)) -> doc is from firestore, collection is already wrapped.
  // Actually, if we do tenantDb.collection, passing it to native doc() still works if imported.
  // BUT wait, doc(collectionRef) is for auto-id. 
  // Let's use our wrapper: tenantDb.doc('members')
  content = content.replace(/doc\(\s*collection\(\s*db\s*,\s*(['"`]?[a-zA-Z0-9_]+['"`]?)\s*\)\s*\)/g, (match, p1) => {
      totalReplaced++;
      return `tenantDb.doc(${p1})`; // our wrapper handles auto-id if id is undefined
  });

  if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated: ${path.relative(__dirname, file)}`);
  }
});

console.log(`\nReplaced ${totalReplaced} Firestore references with tenantDb wrappers.`);
