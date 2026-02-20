import { useState } from 'react';
import { User, Phone } from '@phosphor-icons/react';
import { storageService } from '../../services/storage';

const InstructorLogin = ({ onLogin, instructors }) => {
    const [name, setName] = useState('');
    const [phoneLast4, setPhoneLast4] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            // 디버깅 로그
            console.log('🔍 [강사 로그인 시도]');
            console.log('  - 선택한 이름:', name);
            console.log('  - 입력한 번호:', phoneLast4);
            console.log('  - trim 후 이름:', name.trim());
            console.log('  - trim 후 번호:', phoneLast4.trim());
            
            const result = await storageService.loginInstructor(name.trim(), phoneLast4.trim());
            
            console.log('  - 결과:', result);
            
            if (result.success) {
                onLogin(result.name);
            } else {
                setError(result.message || '이름 또는 전화번호가 일치하지 않습니다');
            }
        } catch (e) {
            console.error('  - 에러:', e);
            setError('인증 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', zIndex: 1 }}>
            <div style={{ background: 'rgba(20, 20, 25, 0.95)', padding: '40px', borderRadius: '20px', maxWidth: '400px', width: '100%', textAlign: 'center', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                {/* Logo */}
                <img 
                    src="/logo_circle.png" 
                    alt="복샘요가" 
                    style={{ width: '70px', height: '70px', marginBottom: '16px', filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.5))' }} 
                />
                <h1 style={{ color: 'var(--primary-gold)', marginBottom: '8px', fontSize: '1.8rem' }}>복샘요가 선생님</h1>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>선생님 전용 앱입니다</div>

                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-input)', padding: '12px 16px', borderRadius: '10px', marginBottom: '12px' }}>
                        <User size={20} color="var(--text-secondary)" />
                        <select
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
                        >
                            <option value="">선생님 선택</option>
                            {instructors.map(inst => {
                                const instName = typeof inst === 'string' ? inst : inst.name;
                                return <option key={instName} value={instName}>{instName}</option>;
                            })}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-input)', padding: '12px 16px', borderRadius: '10px' }}>
                        <Phone size={20} color="var(--text-secondary)" />
                        <input
                            type="tel"
                            value={phoneLast4}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, ''); // 숫자만 허용
                                setPhoneLast4(value.slice(0, 4));
                            }}
                            placeholder="전화번호 뒤 4자리"
                            maxLength={4}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
                        />
                    </div>
                </div>

                {error && <p style={{ color: '#ff4757', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</p>}

                <button
                    onClick={handleLogin}
                    disabled={!name || phoneLast4.length !== 4 || loading}
                    style={{
                        width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                        background: (name && phoneLast4.length === 4 && !loading) ? 'var(--primary-gold)' : 'var(--bg-input)',
                        color: (name && phoneLast4.length === 4 && !loading) ? 'black' : 'var(--text-secondary)',
                        fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer'
                    }}
                >
                    {loading ? '로그인 중...' : '로그인'}
                </button>

            </div>
        </div>
    );
};

export default InstructorLogin;
