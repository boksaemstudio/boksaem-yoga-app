const fs = require('fs');
const path = require('path');

const filesToFix = [
  './src/components/meditation/views/InitialPrepView.jsx',
  './src/components/meditation/views/WeatherView.jsx',
  './src/hooks/useMemberUI.test.jsx'
];

filesToFix.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('const t = (key) =>')) return;
  if (content.includes('const t = useLanguageStore')) return;
  if (content.includes('function t(')) return;
  
  const targetPath = './src/stores/useLanguageStore';
  const fileDir = path.dirname(file);
  let relPath = path.relative(fileDir, targetPath).replace(/\\/g, '/');
  if (!relPath.startsWith('.')) relPath = './' + relPath;

  const injection = `import { useLanguageStore } from '${relPath}';\nconst t = (key) => {\n  try { return useLanguageStore.getState().t(key); } catch(e) { return null; }\n};\n`;

  content = injection + content;

  fs.writeFileSync(file, content);
  console.log('Fixed using relative path:', file);
});
