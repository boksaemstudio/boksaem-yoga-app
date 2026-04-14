const fs = require('fs');

let c = fs.readFileSync('src/pages/OnboardingPage.jsx', 'utf8');

if (!c.includes('import ContactModal')) {
    c = c.replace(
        "import { detectOnboardingLang, getOnboardingStrings } from '../i18n/onboardingI18n';",
        "import { detectOnboardingLang, getOnboardingStrings } from '../i18n/onboardingI18n';\nimport ContactModal from '../components/common/ContactModal';"
    );
}

if (!c.includes('setIsContactModalOpen')) {
    c = c.replace(
        "const [step, setStep] = useState(0);",
        "const [step, setStep] = useState(0);\n  const [isContactModalOpen, setIsContactModalOpen] = useState(false);"
    );
}

const renderCTARegex = /if\s*\(t\.ctaType === 'email'\)\s*\{[\s\S]*?return null;\s*\};/;
c = c.replace(renderCTARegex, `if (t.ctaType === 'email') {
      return <button onClick={() => setIsContactModalOpen(true)} style={{ ...buttonStyle, background: '#FBB117', color: '#000', marginTop: '12px', boxShadow: '0 4px 15px rgba(251, 177, 23, 0.2)' }}>
        <EnvelopeSimple weight="fill" /> {t.kakaoBtn || 'Contact Super Admin'}
      </button>;
    }
    return null;
  };`);

const divReturnString = "return <div style={containerStyle}>";
const newDivReturnString = "return <div style={containerStyle}>\n                <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />";

// Replace all occurrences (Step 0, 1, 2)
c = c.split(divReturnString).join(newDivReturnString);

fs.writeFileSync('src/pages/OnboardingPage.jsx', c);
console.log('Successfully injected ContactModal into OnboardingPage.jsx');
