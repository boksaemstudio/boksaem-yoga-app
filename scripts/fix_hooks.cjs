const fs = require('fs');

const filePaths = [
  "C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\src\\components\\admin\\AdminAIAssistant.jsx",
  "C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\src\\components\\admin\\tabs\\BookingsTab.jsx",
  "C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\src\\components\\checkin\\SuccessDetails.jsx",
  "C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\src\\components\\common\\CustomDatePicker.jsx",
  "C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\src\\components\\instructor\\InstructorHome.jsx",
  "C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\src\\components\\instructor\\InstructorSchedule.jsx",
  "C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\src\\components\\member\\PushNotificationSettings.jsx"
];

let totalFixed = 0;

for (const path of filePaths) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf-8');
    const regex = /(const\s+[a-z]\w+\s*=\s*(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>\s*\{(?:\r?\n)*\s*)const\s+t\s*=\s*useLanguageStore\([^)]+\);\s*/g;
    
    const newContent = content.replace(regex, '$1');
    if (content !== newContent) {
      fs.writeFileSync(path, newContent, 'utf-8');
      totalFixed++;
      console.log('Fixed:', path);
    }
  }
}
console.log('Total fixed:', totalFixed);
