const fs = require('fs');

const filesToFix = [
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
  './src/studioConfig.js',
  './src/components/profile/tabs/PriceTab.jsx',
  './src/components/profile/tabs/ScheduleTab.jsx',
  './src/components/profile/WorkoutReportModal.jsx'
];

filesToFix.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Strip out the injected 'const t =' block from earlier attempts
  content = content.replace(/import \{ useLanguageStore \} from '[^']+';\s*const t = \(key\) => \{\s*try \{ return useLanguageStore\.getState\(\)\.t\(key\); \} catch\(e\) \{ return null; \}\s*\};\s*/g, '');

  // If ANY of these files STILL do not have a standard 'const t = useLanguageStore'
  // but they have t("..."), we will strip t("...") || from them so they don't throw!
  if (!content.includes('useLanguageStore(s => s.t)') && !content.includes('const { t } = useLanguage()') && !content.includes('t = useLanguage()')) {
      // Find t("...") || "Korean" and replace with "Korean"
      content = content.replace(/t\("g_[^"]+"\)\s*\|\|\s*("[^"]*")/g, '$1');
      content = content.replace(/t\('g_[^']+'\)\s*\|\|\s*('[^']*')/g, '$1');
      content = content.replace(/t\("g_[^"]+"\)\s*\|\|\s*(`[^`]*`)/g, '$1');
      
      // Secondary fallback (in case there's multiple ||)
      content = content.replace(/t\("g_[^"]+"\)\s*\|\|\s*/g, '');
  }

  // Very specific fix for aiMessages.js to remove duplicate imports
  if (file.includes('aiMessages.js')) {
      content = content.replace(/import \{ useLanguageStore \} from '\.\.\/stores\/useLanguageStore';\n?/g, '');
  }

  fs.writeFileSync(file, content);
  console.log('Cleaned file:', file);
});
