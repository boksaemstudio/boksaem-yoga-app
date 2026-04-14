const fs = require('fs');
const path = require('path');

const filesToFix = [
  './src/components/profile/tabs/PriceTab.jsx',
  './src/components/profile/tabs/ScheduleTab.jsx',
  './src/components/profile/WorkoutReportModal.jsx',
  './src/constants/aiMessages.js',
  './src/constants/meditationConstants.js',
  './src/hooks/useAdminData.js',
  './src/hooks/useAdminMemberDetail.js',
  './src/hooks/useAttendanceStats.js',
  './src/hooks/useMeditationAI.js',
  './src/hooks/useMemberData.js',
  './src/hooks/useMemberProfile.js',
  './src/hooks/useRevenueStats.js',
  './src/hooks/useScheduleData.js',
  './src/hooks/useWeatherAwareness.js',
  './src/i18n/onboardingI18n.js',
  './src/init/security.js',
  './src/pages/MemberProfile.jsx',
  './src/studioConfig.js'
];

filesToFix.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('const t = (key) =>')) return;
  if (content.includes('const t = useLanguageStore')) return;
  if (content.includes('function t(')) return;
  
  const dir = path.dirname(file);
  let relativePath = path.relative(dir, './src/stores/useLanguageStore').replace(/\\/g, '/');
  if (!relativePath.startsWith('.')) relativePath = './' + relativePath;

  const injection = `import { useLanguageStore } from '${relativePath}';\nconst t = (key) => {\n  try { return useLanguageStore.getState().t(key); } catch(e) { return null; }\n};\n`;

  content = injection + content;

  fs.writeFileSync(file, content);
  console.log('Fixed:', file);
});
