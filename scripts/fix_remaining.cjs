const fs = require('fs');

const fixes = [
  // 1. Keypad
  {
    file: 'src/components/Keypad.jsx',
    replace: [
      {
        from: /const Keypad = memo\(\(\{\s*onKeyPress,\s*onClear,\s*disabled\s*\}\) => \{\r?\n/,
        to: "const Keypad = memo(({ onKeyPress, onClear, disabled }) => {\n  const t = useLanguageStore(s => s.t);\n"
      },
      {
        from: /const t = useLanguageStore\(s => s\.t\);\s*/g,
        to: ""
      }
    ]
  },
  // 2. AdminHeader
  {
    file: 'src/components/admin/AdminHeader.jsx',
    replace: [
      {
        from: /const AdminHeader = \(\{\s*studioName,\s*onLogout\s*\}\) => \{\r?\n/,
        to: "const AdminHeader = ({ studioName, onLogout }) => {\n  const t = useLanguageStore(s => s.t);\n"
      }
    ]
  },
  // 3. CheckInKeypadSection
  {
    file: 'src/components/checkin/CheckInKeypadSection.jsx',
    replace: [
      {
        from: /const CheckInKeypadSection = memo\(\(\{\s*phoneNumber,\s*setPhoneNumber,\s*onConfirm\s*\}\) => \{\r?\n/,
        to: "const CheckInKeypadSection = memo(({ phoneNumber, setPhoneNumber, onConfirm }) => {\n  const t = useLanguageStore(s => s.t);\n"
      }
    ]
  },
  // 4. SelectionModal
  {
    file: 'src/components/checkin/SelectionModal.jsx',
    replace: [
      {
        from: /const SelectionModal = memo\(\(\{\s*isOpen,\s*members,\s*onSelect,\s*onClose\s*\}\) => \{\r?\n/,
        to: "const SelectionModal = memo(({ isOpen, members, onSelect, onClose }) => {\n  const t = useLanguageStore(s => s.t);\n"
      }
    ]
  },
  // 5. CustomGlassModal
  {
    file: 'src/components/common/CustomGlassModal.jsx',
    replace: [
      {
        from: /const CustomGlassModal = \(\{\s*title,\s*children,\s*onClose,\s*actions,\s*maxWidth = '500px',\s*preventBackgroundClose = false,\s*icon: Icon\s*\}\) => \{\r?\n/,
        to: "const CustomGlassModal = ({ title, children, onClose, actions, maxWidth = '500px', preventBackgroundClose = false, icon: Icon }) => {\n  const t = useLanguageStore(s => s.t);\n"
      }
    ]
  },
  // 6. NetworkStatus
  {
    file: 'src/components/common/NetworkStatus.jsx',
    replace: [
      {
        from: /export default function NetworkStatus\(\) \{\r?\n/,
        to: "export default function NetworkStatus() {\n  const t = useLanguageStore(s => s.t);\n"
      }
    ]
  },
  // 7. ActiveSessionView
  {
    file: 'src/components/meditation/views/ActiveSessionView.jsx',
    replace: [
      {
        from: /export const ActiveSessionView = \(\{\s*sessionState,\s*activeTab,\s*setActiveTab,\s*onEndSession,\s*volume = 50,\s*onVolumeChange,\s*isMuted = false,\s*onToggleMute\s*\}\) => \{\r?\n/,
        to: "export const ActiveSessionView = ({ sessionState, activeTab, setActiveTab, onEndSession, volume = 50, onVolumeChange, isMuted = false, onToggleMute }) => {\n  const t = useLanguageStore(s => s.t);\n"
      }
    ]
  },
  // 8. PrescriptionWizardView
  {
    file: 'src/components/meditation/views/PrescriptionWizardView.jsx',
    replace: [
      {
        from: /export const PrescriptionWizardView = \(\{\s*step,\s*setStep,\s*preferences,\s*setPreferences,\s*onSubmit,\s*isGenerating\s*\}\) => \{\r?\n/,
        to: "export const PrescriptionWizardView = ({ step, setStep, preferences, setPreferences, onSubmit, isGenerating }) => {\n  const t = useLanguageStore(s => s.t);\n"
      }
    ]
  }
];

fixes.forEach(f => {
  if (!fs.existsSync(f.file)) return;
  let text = fs.readFileSync(f.file, 'utf8');
  
  // ensure useLanguageStore is imported
  if (!text.includes('useLanguageStore')) {
    const depth = f.file.split('/').length - 2;
    const prefix = depth === 0 ? './' : '../'.repeat(depth);
    text = `import { useLanguageStore } from '${prefix}stores/useLanguageStore';\n` + text;
  }
  
  f.replace.forEach(r => {
    text = text.replace(r.from, r.to);
  });
  
  // For Keypad 2nd replace specifically to run last:
  if (f.file.includes('Keypad.jsx') && f.replace.length > 1) {
     text = text.replace(f.replace[1].from, f.replace[1].to);
     text = text.replace(/=> \{\s*\n*const Keypad = memo/, '=> {\nconst Keypad = memo'); // fix accidental wipes
  }

  // Double check basic fallback just in case
  if (!text.includes('useLanguageStore(s => s.t)') && !text.includes('getState()')) {
      console.warn("FAILED ALREADY INJECT VIA REGEX:", f.file);
  }

  fs.writeFileSync(f.file, text, 'utf8');
  console.log('Explicitly Fixed:', f.file);
});
