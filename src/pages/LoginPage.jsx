import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storage';
import InteractiveParticles from '../components/InteractiveParticles';
import memberBg from '../assets/zen_yoga_bg.png';
import logo from '../assets/logo.png';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await storageService.loginAdmin(email, password);

        if (result.success) {
            navigate('/admin');
        } else {
            setError(result.message);
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
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
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.85)), url(${memberBg})`,
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
                backgroundColor: 'rgba(20, 20, 20, 0.85)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                textAlign: 'center',
                animation: 'slideUp 0.6s ease-out'
            }}>
                <img src={logo} alt="Logo" style={{ width: '70px', height: 'auto', marginBottom: '20px', filter: 'brightness(0) invert(1) drop-shadow(0 0 10px rgba(212, 175, 55, 0.5))' }} />
                <h1 style={{ marginBottom: '30px', fontSize: '1.6rem', color: 'var(--primary-gold)', fontWeight: 'bold' }}>관리자 로그인</h1>

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
                            color: 'black',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '10px',
                            transition: 'transform 0.2s',
                            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)'
                        }}
                    >
                        {loading ? '인증 중...' : '접속하기'}
                    </button>
                </form>
            </div>
            <p style={{ position: 'relative', zIndex: 10, marginTop: '30px', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                © {new Date().getFullYear()} Boksaem Yoga. All rights reserved.
            </p>
        </div>
    );
};

export default LoginPage;
