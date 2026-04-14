import { useLanguageStore } from '../../stores/useLanguageStore';
import { useState } from 'react';
import { User, Phone } from '@phosphor-icons/react';
import { useStudioConfig } from '../../contexts/StudioContext';
import { storageService } from '../../services/storage';
const InstructorLogin = ({
  onLogin,
  instructors
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const [name, setName] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // 디버깅 로그

      const result = await storageService.loginInstructor(name.trim(), phoneLast4.trim());
      if (result.success) {
        onLogin(result.name);
      } else {
        setError(result.message || t("g_8bd099") || t("g_8bd099") || t("g_8bd099") || "\uC774\uB984 \uB610\uB294 \uC804\uD654\uBC88\uD638\uAC00 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4");
      }
    } catch (e) {
      console.error(t("g_119bd3") || t("g_119bd3") || t("g_119bd3") || "  - \uC5D0\uB7EC:", e);
      setError(t("g_2305f4") || t("g_2305f4") || t("g_2305f4") || "\uC778\uC99D \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setLoading(false);
    }
  };
  return <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    position: 'relative',
    zIndex: 1
  }}>
            <div style={{
      background: 'rgba(20, 20, 25, 0.95)',
      padding: '40px',
      borderRadius: '20px',
      maxWidth: '400px',
      width: '100%',
      textAlign: 'center',
      border: '1px solid rgba(var(--primary-rgb), 0.2)'
    }}>

                <div style={{
        marginBottom: '16px'
      }}>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-input)',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '12px'
        }}>
                        <User size={20} color="var(--text-secondary)" />
                        <select value={name} onChange={e => setName(e.target.value)} style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            outline: 'none'
          }}>
                            <option value="">{t("g_d4bfea") || t("g_d4bfea") || t("g_d4bfea") || "\uC120\uC0DD\uB2D8 \uC120\uD0DD"}</option>
                            {instructors.map(inst => {
              const instName = typeof inst === 'string' ? inst : inst.name;
              return <option key={instName} value={instName}>{instName}</option>;
            })}
                        </select>
                    </div>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-input)',
          padding: '12px 16px',
          borderRadius: '10px'
        }}>
                        <Phone size={20} color="var(--text-secondary)" />
                        <input type="tel" value={phoneLast4} onChange={e => {
            const value = e.target.value.replace(/[^0-9]/g, ''); // 숫자만 허용
            setPhoneLast4(value.slice(0, 4));
          }} placeholder={t("g_36069e") || t("g_36069e") || t("g_36069e") || "\uC804\uD654\uBC88\uD638 \uB4A4 4\uC790\uB9AC"} maxLength={4} inputMode="numeric" pattern="[0-9]*" style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            outline: 'none'
          }} />
                    </div>
                </div>

                {error && <p style={{
        color: '#ff4757',
        marginBottom: '16px',
        fontSize: '0.9rem'
      }}>{error}</p>}

                <button onClick={handleLogin} disabled={!name || phoneLast4.length !== 4 || loading} style={{
        width: '100%',
        padding: '14px',
        borderRadius: '10px',
        border: 'none',
        background: name && phoneLast4.length === 4 && !loading ? 'var(--primary-gold)' : 'var(--bg-input)',
        color: name && phoneLast4.length === 4 && !loading ? 'black' : 'var(--text-secondary)',
        fontWeight: 'bold',
        fontSize: '1rem',
        cursor: 'pointer'
      }}>
                    {loading ? t("g_f238ae") || t("g_f238ae") || t("g_f238ae") || "\uB85C\uADF8\uC778 \uC911..." : t("g_2228c5") || t("g_2228c5") || t("g_2228c5") || "\uB85C\uADF8\uC778"}
                </button>

            </div>
        </div>;
};
export default InstructorLogin;