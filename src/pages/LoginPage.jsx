import { useState, useEffect } from 'react';
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
    const logoUrl = config.IDENTITY?.LOGO_URL || config.ASSETS?.LOGO?.WIDE;

    const handleLogin = async (e, overrideEmail, overridePassword) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);

        const targetEmail = overrideEmail || email.trim();
        const targetPass = overridePassword || password;

        try {
            const result = await storageService.loginAdmin(targetEmail, targetPass);

            if (result.success) {
                try {
                    const tokenResult = await auth.currentUser.getIdTokenResult();
                    if (tokenResult.claims.role === 'superadmin') {
                        // [SaaS] boksaem-yoga 도메인에서는 슈퍼어드민도 일반 관리자 화면으로
                        const isBoksaemDomain = window.location.hostname.includes('boksaem-yoga');
                        navigate(isBoksaemDomain ? '/admin' : '/super-admin');
                        return;
                    }
                } catch (e) {
                    console.error('[LoginPage] Claims check failed:', e);
                }
                navigate('/admin');
            } else {
                setError(result.message);
                setLoading(false);
                logger.error('Login Failed', result.message, { email: targetEmail });
            }
        } catch (err) {
            console.error('[LoginPage] Login error:', err);
            setError('로그인 처리 중 오류가 발생했습니다.');
            setLoading(false);
            logger.error('Login Error', err.message, { email: targetEmail });
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.hostname.includes('passflow-demo')) {
            if (!sessionStorage.getItem('demoAdminLogout') && !window.demoAdminLoginTriggered) {
                window.demoAdminLoginTriggered = true;
                setEmail('demo@passflow.kr');
                setPassword('passflowdemo!');
                setTimeout(() => {
                    handleLogin(null, 'demo@passflow.kr', 'passflowdemo!');
                }, 100);
            }
        }
    }, []);

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
                    <div style={{
                        background: 'transparent',
                        padding: '16px 24px',
                        display: 'inline-flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: '3vh',
                        maxWidth: '100%'
                    }}>
                        <img 
                            src={logoUrl} 
                            alt={studioName} 
                            style={{ 
                                maxHeight: '80px', 
                                maxWidth: '100%', 
                                objectFit: 'contain',
                                display: 'block',
                                filter: 'drop-shadow(0px 0px 8px rgba(255,255,255,0.4))'
                            }} 
                        />
                    </div>
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
                    
                    {/* SaaS Admin Demo Quick Login Button */}
                    {typeof window !== 'undefined' && window.location.hostname.includes('passflow-demo') && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                setEmail('demo@passflow.kr');
                                setPassword('passflowdemo!');
                                setTimeout(() => {
                                    // Trigger form submission manually or via state change
                                    const mockEvent = { preventDefault: () => {} };
                                    handleLogin(mockEvent);
                                }, 100);
                            }}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                border: '1px solid rgba(212, 175, 55, 0.4)',
                                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                                color: 'var(--primary-gold)',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                marginTop: '4px',
                                transition: 'transform 0.2s',
                            }}
                        >
                            🚀 관리자 데모 자동 로그인
                        </button>
                    )}
                </form>
            </div>
            {/* Business Information & Kakao Support Footer */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                marginTop: '40px',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.75rem',
                textAlign: 'center',
                lineHeight: '1.6',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                paddingBottom: '20px'
            }}>
                <a 
                    href="http://pf.kakao.com/_zDxiMX/chat" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#FEE500',
                        color: '#191919',
                        padding: '10px 24px',
                        borderRadius: '24px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        boxShadow: '0 4px 12px rgba(254, 229, 0, 0.2)',
                        transition: 'transform 0.2s ease, opacity 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                        <path d="M12 3c-5.52 0-10 3.58-10 8 0 2.85 1.83 5.34 4.54 6.8-.3 1.14-1.14 4.28-1.17 4.41-.03.11.04.22.14.22.06 0 .13-.02.18-.06 1.48-1.07 5.17-3.71 5.4-3.87.3.04.6.06.91.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                    </svg>
                    카카오톡 고객센터 문의하기
                </a>

                <div style={{ marginTop: '8px', wordBreak: 'keep-all' }}>
                    <p style={{ margin: '0' }}>상호명: 패스플로우 에이아이(Passflow AI) | 대표자: 김복순</p>
                    <p style={{ margin: '0' }}>사업자등록번호: 789-66-00676</p>
                    <p style={{ margin: '0' }}>주소: 서울특별시 마포구 서강로1길 61, 201호(창전동, 삼성코러스빌라)</p>
                    <p style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.2)' }}>© {new Date().getFullYear()} PassFlow AI. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
