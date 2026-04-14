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

  // Fix literal \\n
  content = content.replace(/const t = useLanguageStore\(s => s\.t\);\\n/g, 'const t = useLanguageStore(s => s.t);\n');

  // If t is already an argument, remove the declaration
  if (/const\s+\w+\s*=\s*\([^)]*\bt\b[^)]*\)\s*=>\s*\{\s*const t = useLanguageStore/.test(content)) {
     content = content.replace(/const t = useLanguageStore\(s => s\.t\);\n\s*/g, '');
  }

  // Same for function (..., t, ...)
  if (/function\s+\w+\s*\([^)]*\bt\b[^)]*\)\s*\{\s*const t = useLanguageStore/.test(content)) {
     content = content.replace(/const t = useLanguageStore\(s => s\.t\);\n\s*/g, '');
  }

  fs.writeFileSync(fullPath, content, 'utf8');
  fixed++;
}
console.log('Total fixed syntax:', fixed);
