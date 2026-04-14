const fs = require('fs');
const files = [
  'src/App.jsx',
  'src/studioConfig.js',
  'src/i18n/onboardingI18n.js',
  'src/constants/aiMessages.js',
  'src/constants/meditationConstants.js',
  'src/init/security.js'
];
files.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const matches = c.match(/\bt\s*\(\s*["']g_/g);
  if (matches) {
    console.log('STILL HAS t(g_) in ' + f + ': ' + matches.length + ' occurrences');
  } else {
    console.log('Clean: ' + f);
  }
});
