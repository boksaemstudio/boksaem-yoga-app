/**
 * inject_t_declaration.cjs
 * 
 * useLanguageStore가 import되어 있지만 const t = useLanguageStore(s => s.t) 선언이 
 * 컴포넌트 안에 없는 파일에 자동으로 추가합니다.
 */
const fs = require('fs');

const files = [
  'src/components/checkin/CheckInKeypadSection.jsx',
  'src/components/common/CustomGlassModal.jsx',
  'src/components/Keypad.jsx',
  'src/components/profile/AISection.jsx',
  'src/components/profile/AttendanceHistory.jsx',
  'src/components/profile/LoginPage.jsx',
  'src/components/profile/MembershipInfo.jsx',
  'src/components/profile/MessagesTab.jsx',
  'src/components/profile/ProfileHeader.jsx',
  'src/components/profile/ProfileTabs.jsx',
  'src/components/profile/PWAInstallPrompts.jsx',
  'src/components/profile/RecentAttendance.jsx',
  'src/components/profile/tabs/NoticeTab.jsx',
];

let fixed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // Skip if already has const t = useLanguageStore
  if (/const\s+t\s*=\s*useLanguageStore/.test(content)) {
    console.log('SKIP (already has t): ' + f);
    return;
  }
  
  // Find the component function opening and inject t declaration after it
  // Pattern: }) => { or }) => JSX or function Component() {
  // We need to find the first { after the component signature
  
  // Strategy: find "}) => {" or similar patterns and add "const t = useLanguageStore(s => s.t);" on the next line
  
  // For arrow functions with immediate JSX return (no { body)
  // e.g., "}) => <div" - need to convert to block body
  
  const lines = content.split('\n');
  let injected = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Pattern 1: "}) => {" - already has block body
    if (/\)\s*=>\s*\{/.test(line) && !injected && i > 0) {
      // Check if this is the component function (not a nested arrow)
      // Heuristic: it's within the first 20 lines
      if (i < 25) {
        lines.splice(i + 1, 0, '  const t = useLanguageStore(s => s.t);');
        injected = true;
        break;
      }
    }
    
    // Pattern 2: "}) => <" - arrow with immediate JSX return, need block body
    if (/\)\s*=>\s*</.test(line) && !injected && i < 25) {
      // Convert to block body: add { before < and find closing and add }
      lines[i] = line.replace(/\)\s*=>\s*</, ') => {\n  const t = useLanguageStore(s => s.t);\n  return <');
      injected = true;
      // Need to add closing } before the export or end
      // Find the last line that has "export default" or end of file
      for (let j = lines.length - 1; j > i; j--) {
        if (/^export\s+default/.test(lines[j].trim())) {
          // Add closing } before export
          lines.splice(j, 0, '};');
          break;
        }
      }
      break;
    }
  }
  
  if (injected) {
    fs.writeFileSync(f, lines.join('\n'));
    console.log('✅ Fixed: ' + f);
    fixed++;
  } else {
    console.log('⚠️  Could not auto-fix: ' + f);
  }
});

console.log('\nTotal fixed: ' + fixed);
