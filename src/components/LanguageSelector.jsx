import { useLanguageStore } from '../stores/useLanguageStore';
import { useLanguage } from '../hooks/useLanguage';
import { Globe } from '@phosphor-icons/react';
const LanguageSelector = ({
  variant = 'default'
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    language,
    setLanguage
  } = useLanguage();
  const languages = [{
    code: 'ko',
    label: "한국어"
  }, {
    code: 'en',
    label: 'English'
  }, {
    code: 'ja',
    label: "日本語"
  }, {
    code: 'ru',
    label: 'Русский'
  }, {
    code: 'zh',
    label: "中文"
  }, {
    code: 'es',
    label: 'Español'
  }, {
    code: 'pt',
    label: 'Português'
  }, {
    code: 'fr',
    label: 'Français'
  }, {
    code: 'de',
    label: 'Deutsch'
  }, {
    code: 'vi',
    label: 'Tiếng Việt'
  }, {
    code: 'th',
    label: 'ไทย'
  }];
  const handleChange = e => {
    setLanguage(e.target.value);
  };
  if (variant === 'minimal') {
    return <div style={{
      position: 'relative',
      display: 'inline-block'
    }}>
                <select value={language} onChange={handleChange} style={{
        appearance: 'none',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        padding: '6px 30px 6px 12px',
        color: 'white',
        fontSize: '0.8rem',
        cursor: 'pointer',
        outline: 'none',
        minWidth: '90px'
      }}>
                    {languages.map(lang => <option key={lang.code} value={lang.code} style={{
          color: '#000000',
          backgroundColor: '#ffffff'
        }}>
                            {lang.label}
                        </option>)}
                </select>
                <div style={{
        position: 'absolute',
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center'
      }}>
                    <Globe size={14} color="rgba(255,255,255,0.7)" />
                </div>
            </div>;
  }

  // Default variant (bigger, for login screen etc)
  return <div style={{
    position: 'relative',
    display: 'inline-block',
    width: '100%'
  }}>
            <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      padding: '0 12px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
                <Globe size={20} color="var(--primary-gold)" style={{
        marginRight: '8px'
      }} />
                <select value={language} onChange={handleChange} style={{
        width: '100%',
        appearance: 'none',
        background: 'transparent',
        border: 'none',
        padding: '12px 0',
        color: 'white',
        fontSize: '1rem',
        cursor: 'pointer',
        outline: 'none'
      }}>
                    {languages.map(lang => <option key={lang.code} value={lang.code} style={{
          color: '#000000',
          backgroundColor: '#ffffff'
        }}>
                            {lang.label}
                        </option>)}
                </select>
                <div style={{
        pointerEvents: 'none',
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.8rem'
      }}>
                    ▼
                </div>
            </div>
        </div>;
};
export default LanguageSelector;