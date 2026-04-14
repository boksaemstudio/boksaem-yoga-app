const fs = require('fs');
const path = require('path');

const files = [
  "src/components/AdminScheduleManager.jsx",
  "src/components/common/InstallBanner.jsx",
  "src/components/profile/AISection.jsx",
  "src/components/profile/LoginPage.jsx",
  "src/components/profile/MemberSalesHistory.jsx",
  "src/components/profile/MembershipInfo.jsx",
  "src/components/profile/MessagesTab.jsx",
  "src/components/profile/MyStatsChart.jsx",
  "src/components/profile/ProfileHeader.jsx",
  "src/components/profile/ProfileTabs.jsx",
  "src/components/profile/PWAInstallPrompts.jsx",
  "src/components/profile/RecentAttendance.jsx",
  "src/components/profile/tabs/NoticeTab.jsx",
  "src/components/profile/tabs/PriceTab.jsx",
  "src/components/profile/tabs/ScheduleTab.jsx",
  "src/components/profile/WorkoutReportModal.jsx",
  "src/hooks/useMemberData.js",
  "src/hooks/useMemberProfile.js"
];

let fixed = 0;

for (const relPath of files) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // Determine path logic for import
  const depth = relPath.split('/').length - 2; // src/components -> 1 -> '../'.  src/components/profile -> 2 -> '../../'
  const importPrefix = depth === 0 ? './' : '../'.repeat(depth);
  const importPath = importPrefix + 'stores/useLanguageStore';

  // Inject Import if missing
  if (!content.includes('useLanguageStore')) {
    // find last import or top of file
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const eolIndex = content.indexOf('\\n', lastImportIndex);
      content = content.slice(0, eolIndex + 1) + `import { useLanguageStore } from '${importPath}';\\n` + content.slice(eolIndex + 1);
    } else {
      content = `import { useLanguageStore } from '${importPath}';\\n` + content;
    }
  }

  // Inject const t = useLanguageStore(s => s.t);
  // Match main export/component
  // e.g. const Component = (...) => {  OR export default function(...) {
  const regexList = [
    /(const\s+[A-Z]\w+\s*=\s*(?:memo\()?.*=>\s*\{(?:\r?\n)?)/,
    /(export\s+default\s+(?:function|const)\s+[A-Z]\w*\s*\(.*\)\s*(?:=>\s*)?\{(?:\r?\n)?)/,
    /(export\s+(?:function|const)\s+[A-Z]\w*\s*\(.*\)\s*(?:=>\s*)?\{(?:\r?\n)?)/
  ];

  let injected = false;
  for (const regex of regexList) {
    if (regex.test(content) && !injected) {
      content = content.replace(regex, `$1  const t = useLanguageStore(s => s.t);\\n`);
      injected = true;
    }
  }

  // Special case for hooks: typically export function useHook(...) { or export const useHook = (...) => {
  if (!injected && relPath.startsWith('src/hooks/')) {
    const hookRegex = /(export\s+(?:const|function)\s+use[A-Z]\w+\s*=*\s*\(.*?\)\s*(?:=>\s*)?\{(?:\r?\n)?)/;
    if (hookRegex.test(content)) {
      content = content.replace(hookRegex, `$1  const t = useLanguageStore(s => s.t);\\n`);
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
      content = content.replace(anyFuncRegex, `$1  const t = useLanguageStore(s => s.t);\\n`);
      fs.writeFileSync(fullPath, content, 'utf8');
      fixed++;
      console.log('Fixed (fallback):', relPath);
    } else {
      console.warn('Could not inject into:', relPath);
    }
  }
}
console.log('Total fixed injection:', fixed);
