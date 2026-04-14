const fs = require('fs');
const path = require('path');

const files = [
  'src/components/admin/AdminHeader.jsx',
  'src/components/checkin/CheckInKeypadSection.jsx',
  'src/components/checkin/SelectionModal.jsx',
  'src/components/common/CustomGlassModal.jsx',
  'src/components/common/ErrorBoundary.jsx',
  'src/components/common/ErrorBoundary.test.jsx',
  'src/components/common/InstallBanner.jsx',
  'src/components/common/NetworkStatus.jsx',
  'src/components/Keypad.jsx',
  'src/components/meditation/views/ActiveSessionView.jsx',
  'src/components/meditation/views/PrescriptionWizardView.jsx',
  'src/components/profile/MemberSalesHistory.jsx',
  'src/components/profile/MembershipInfo.jsx',
  'src/components/profile/PWAInstallPrompts.jsx'
];

let fixed = 0;

for (const relPath of files) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // Verify missing t
  if (content.includes('const t =') || content.includes('let t =') || content.includes('function t(') || content.includes('{ t }') || content.includes('{t}') || content.includes(' t,')) {
      continue;
  }

  // Determine path logic for import
  const depth = relPath.split('/').length - 2;
  const importPrefix = depth === 0 ? './' : '../'.repeat(depth);
  const importPath = importPrefix + 'stores/useLanguageStore';

  // Inject Import if missing
  if (!content.includes('useLanguageStore')) {
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const eolIndex = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, eolIndex + 1) + `import { useLanguageStore } from '${importPath}';\n` + content.slice(eolIndex + 1);
    } else {
      content = `import { useLanguageStore } from '${importPath}';\n` + content;
    }
  }

  // Inject const t = useLanguageStore(s => s.t);
  const regexList = [
    /(const\s+[A-Z]\w+\s*=\s*(?:memo\()?.*=>\s*\{(?:\r?\n)?)/,
    /(export\s+default\s+(?:function|const|class)\s+[A-Z]\w*\s*\(.*\)\s*(?:=>\s*)?\{(?:\r?\n)?)/,
    /(export\s+(?:function|const|class)\s+[A-Z]\w*\s*\(.*\)\s*(?:=>\s*)?\{(?:\r?\n)?)/,
    /([A-Z]\w+\.prototype\.\w+\s*=\s*function\s*\(.*\)\s*\{(?:\r?\n)?)/,
    /(constructor\s*\(.*\)\s*\{(?:\r?\n)?)/
  ];

  let injected = false;
  for (const regex of regexList) {
    if (regex.test(content) && !injected) {
      // Avoid injecting into Class components that naturally can't use hooks! 
      if (!content.includes('extends Component') && !content.includes('extends React.Component')) {
         content = content.replace(regex, `$1  const t = useLanguageStore(s => s.t);\n`);
         injected = true;
      }
    }
  }

  // For Error Boundary (Class components), hooks don't work. Use global store instead inside render.
  if (!injected && (content.includes('extends Component') || content.includes('extends ErrorBoundary'))) {
     const renderRegex = /(render\s*\(\)\s*\{(?:\r?\n)?)/;
     if (renderRegex.test(content)) {
        content = content.replace(renderRegex, `$1    const t = (key) => { try { return useLanguageStore.getState().t(key); } catch(e) { return key; } };\n`);
        injected = true;
     } else {
        // Just inject globally
        content = `const t = (key) => { try { return useLanguageStore.getState().t(key); } catch(e) { return key; } };\n` + content;
        injected = true;
     }
  }
  
  if (injected) {
    fs.writeFileSync(fullPath, content, 'utf8');
    fixed++;
    console.log('Fixed:', relPath);
  } else {
    // See if we can find any arrow function or function
    const anyFuncRegex = /(const\s+\w+\s*=\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>\s*\{(?:\r?\n)?)/;
    if (anyFuncRegex.test(content)) {
      content = content.replace(anyFuncRegex, `$1  const t = useLanguageStore(s => s.t);\n`);
      fs.writeFileSync(fullPath, content, 'utf8');
      fixed++;
      console.log('Fixed (fallback):', relPath);
    } else {
      console.warn('Could not inject into:', relPath);
    }
  }
}
console.log('Total fixed injection:', fixed);

// Fix classMapping.ts specifically via global injection
const classMapStr = fs.readFileSync('src/utils/classMapping.ts', 'utf8');
if (!classMapStr.includes('const t =')) {
  const newStr = `import { useLanguageStore } from '../stores/useLanguageStore';\nconst t = (key) => { try { return useLanguageStore.getState().t(key); } catch(e) { return key; } };\n` + classMapStr;
  fs.writeFileSync('src/utils/classMapping.ts', newStr, 'utf8');
  console.log('Fixed: src/utils/classMapping.ts');
}
