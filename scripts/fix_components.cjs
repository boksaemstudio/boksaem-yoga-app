const fs = require('fs');

const filesToFix = [
  'src/components/admin/AdminAIAssistant.jsx',
  'src/components/admin/tabs/BookingsTab.jsx',
  'src/components/checkin/SuccessDetails.jsx',
  'src/components/checkin/TopBar.jsx',
  'src/components/common/CustomDatePicker.jsx',
  'src/components/instructor/InstructorHome.jsx',
  'src/components/instructor/InstructorSchedule.jsx',
  'src/components/member/PushNotificationSettings.jsx',
  'src/pages/InstructorPage.jsx',
  'src/pages/LoginPage.jsx',
  'src/pages/OnboardingPage.jsx'
];

filesToFix.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let lines = content.split('\n');
  
  let inserted = false;
  for (let i = 0; i < lines.length; i++) {
    // Component definition match
    if (/const\s+[A-Z][a-zA-Z0-9]*\s*=\s*(memo\()?/.test(lines[i]) || /function\s+[A-Z][a-zA-Z0-9]*/.test(lines[i])) {
      
      // Look for the open bracket of the component block
      for(let j=i; j < Math.min(i+30, lines.length); j++) {
         if (lines[j].includes('{')) {
            if (!content.includes('const t = useLanguageStore')) {
                lines.splice(j + 1, 0, '  const t = useLanguageStore(s => s.t);');
                inserted = true;
                break;
            }
         }
      }
    }
    if(inserted) break;
  }
  
  if (inserted) {
    fs.writeFileSync(f, lines.join('\n'));
    console.log('✅ Restored t hook to ' + f);
  } else if (!content.includes('const t = useLanguageStore')) {
    console.log('⚠️ Failed to restore t hook or already has it: ' + f);
  }
});
