const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: 'src/components/admin/member-detail/MemberInfoTab.jsx',
    find: "import { getMembershipLabel } from '../../../utils/membershipLabels';",
    replace: "import { getMembershipLabel } from '../../../utils/membershipLabels';\nimport { formatPhoneNumber } from '../../../utils/formatters';"
  },
  {
    file: 'src/components/ScheduleHelpers.jsx',
    find: "import { useStudioConfig } from '../contexts/StudioContext';",
    replace: "import { useStudioConfig } from '../contexts/StudioContext';\nimport { formatPhoneNumber } from '../utils/formatters';"
  },
  {
    file: 'src/pages/SuperAdminPage.jsx',
    find: "import { httpsCallable } from 'firebase/functions';",
    replace: "import { httpsCallable } from 'firebase/functions';\nimport { formatPhoneNumber } from '../utils/formatters';"
  }
];

fixes.forEach(({ file, find, replace }) => {
  const filePath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('formatPhoneNumber') && content.includes("from '../../../utils/formatters'") || content.includes("from '../utils/formatters'")) {
    // Check if already imported
    if (content.includes("import { formatPhoneNumber }")) {
      console.log(`[SKIP] ${file} - already has formatPhoneNumber import`);
      return;
    }
  }
  if (!content.includes(find)) {
    console.log(`[WARN] ${file} - target string not found, trying line-based`);
    // Try line-based approach
    const lines = content.split('\n');
    const idx = lines.findIndex(l => l.trim().includes(find.trim().split('\n')[0].trim()));
    if (idx >= 0) {
      const importLine = find.includes('membershipLabels') 
        ? "import { formatPhoneNumber } from '../../../utils/formatters';"
        : find.includes('StudioContext')
        ? "import { formatPhoneNumber } from '../utils/formatters';"
        : "import { formatPhoneNumber } from '../utils/formatters';";
      lines.splice(idx + 1, 0, importLine);
      content = lines.join('\n');
    }
  } else {
    content = content.replace(find, replace);
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[OK] ${file} - formatPhoneNumber import added`);
});

console.log('\n✅ All formatPhoneNumber imports fixed!');
