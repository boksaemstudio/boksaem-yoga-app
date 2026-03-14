const fs = require('fs');
const data = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));
const undefs = [];
data.forEach(file => {
  file.messages.forEach(msg => {
    if (msg.ruleId === 'no-undef' || msg.ruleId === 'react/jsx-no-undef') {
      undefs.push({ file: file.filePath, line: msg.line, msg: msg.message, rule: msg.ruleId });
    }
  });
});
console.log(JSON.stringify(undefs, null, 2));
