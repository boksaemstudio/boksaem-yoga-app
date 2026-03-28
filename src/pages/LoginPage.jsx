import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudioConfig } from '../contexts/StudioContext';
import { storageService } from '../services/storage';
import { logger } from '../utils/logger';
import { auth } from '../firebase';

const LoginPage = () => {
    const { config } = useStudioConfig();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const logoUrl = config.ASSETS?.LOGO?.WIDE;

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await storageService.loginAdmin(email.trim(), password.trim());

            if (result.success) {
                try {
                    const tokenResult = await auth.currentUser.getIdTokenResult();
                    if (tokenResult.claims.role === 'superadmin') {
                        navigate('/super-admin');
                        return;
                    }
                } catch (e) {
                    console.error('[LoginPage] Claims check failed:', e);
                }
                navigate('/admin');
            } else {
                setError(result.message);
                setLoading(false);
                logger.error('Login Failed', result.message, { email: email.trim() });
            }
        } catch (err) {
            console.error('[LoginPage] Login error:', err);
            setError('로그인 처리 중 오류가 발생했습니다.');
            setLoading(false);
            logger.error('Login Error', err.message, { email: email.trim() });
        }
    };

    const primaryColor = config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)';
    const studioName = config.IDENTITY?.NAME || 'Studio';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100dvh',
            position: 'relative',
            background: '#000000',
            overflow: 'hidden',
            padding: '20px'
        }}>
            {/* Background layers identical to other pages */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.85)), url(${config.ASSETS?.MEMBER_BG || ''})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    zIndex: 1
                }}
            />

            <div style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                maxWidth: '400px',
                padding: '40px',
                backgroundColor: 'rgba(20, 20, 20, 0.9)',
                borderRadius: '24px',
                border: `1px solid ${primaryColor}33`,
                boxShadow: `0 20px 50px ${primaryColor}33`,
                textAlign: 'center',
            }}>
                <div className="login-header" style={{ textAlign: 'center', marginBottom: '4vh' }}>
                {logoUrl ? (
                    <img src={logoUrl} alt={studioName} style={{ width: '220px', marginBottom: '2vh', filter: `drop-shadow(0 0 10px ${primaryColor}4D)` }} />
                ) : (
                    <h2 style={{ color: 'white', marginBottom: '2vh' }}>{studioName}</h2>
                )}
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: primaryColor, marginBottom: '1vh', letterSpacing: '-0.02em' }}>{config.IDENTITY?.SLOGAN || ''}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', opacity: 0.8 }}>{studioName} 관리자 시스템</p>
            </div>

                {error && (
                    <div style={{
                        backgroundColor: 'rgba(255, 69, 58, 0.15)',
                        color: '#FF6B6B',
                        padding: '12px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        fontSize: '0.9rem',
                        border: '1px solid rgba(255, 69, 58, 0.3)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginLeft: '12px', marginBottom: '5px', display: 'block' }}>이메일</label>
                        <input
                            type="email"
                            placeholder="example@test.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                            required
                        />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginLeft: '12px', marginBottom: '5px', display: 'block' }}>비밀번호</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                color: 'white',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: 'var(--primary-gold)',
                            color: 'var(--text-on-primary)',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '10px',
                            transition: 'transform 0.2s',
                            boxShadow: '0 4px 15px rgba(var(--primary-rgb), 0.4)'
                        }}
                    >
                        {loading ? '인증 중...' : '접속하기'}
                    </button>
                </form>
            </div>
            <p style={{ position: 'relative', zIndex: 10, marginTop: '30px', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                © {new Date().getFullYear()} {studioName}. All rights reserved.
            </p>
        </div>
    );
};

export default LoginPage;
