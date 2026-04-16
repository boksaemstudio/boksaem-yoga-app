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
        setError(result.message || t("g_3857a0") || "이름 또는 전화번호가 일치하지 않습니다");
      }
    } catch (e) {
      console.error(t("g_6fa050") || "  - 에러:", e);
      setError(t("g_8b3197") || "인증 중 오류가 발생했습니다.");
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
                            <option value="">{t("g_1d5134") || "선생님 선택"}</option>
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
          }} placeholder={t("g_ee13ad") || "전화번호 뒤 4자리"} maxLength={4} inputMode="numeric" pattern="[0-9]*" style={{
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
                    {loading ? t("g_b63929") || "로그인 중..." : t("g_e225a6") || "로그인"}
                </button>

            </div>
        </div>;
};
export default InstructorLogin;