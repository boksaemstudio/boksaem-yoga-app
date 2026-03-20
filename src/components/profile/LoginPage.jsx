import { useState, useEffect } from 'react';
import LanguageSelector from '../LanguageSelector';
import { profileStyles } from './profileStyles';

/**
 * LoginPage — 회원 로그인 화면
 * MemberProfile.jsx에서 추출 (~100줄)
 */
const LoginPage = ({ config, t, onLogin, loading }) => {
    const { authInput: authInputStyle, authButton: authButtonStyle } = profileStyles;
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [langLabelIndex, setLangLabelIndex] = useState(0);
    const langLabels = ["언어", "Language", "Язык", "语言", "言語"];

    useEffect(() => {
        const interval = setInterval(() => {
            setLangLabelIndex((prev) => (prev + 1) % langLabels.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [langLabels.length]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedName = name.trim();
        const trimmedPhone = phone.trim();

        if (!trimmedName || trimmedPhone.length < 4) {
            setError(t('inputError'));
            return;
        }

        const result = await onLogin(trimmedName, trimmedPhone);
        if (!result.success) {
            setError(result.message);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', position: 'relative', overflowX: 'hidden', overflowY: 'auto',
            background: '#000000', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url(${config.ASSETS?.MEMBER_BG || ''})`,
                backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 1
            }} />
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.1)', zIndex: 4, pointerEvents: 'none' }} />

            <div style={{
                position: 'relative', zIndex: 10, animation: 'slideUp 0.8s ease-out',
                textAlign: 'center', width: '100%', maxWidth: '360px'
            }}>
                <div style={{ marginBottom: '40px' }}>
                    <img src={config.ASSETS?.LOGO?.WIDE} alt={config.IDENTITY?.NAME || 'Studio'}
                        style={{ width: '85px', height: 'auto', opacity: 0.9, filter: 'brightness(0) invert(1) drop-shadow(0 0 15px rgba(255, 255, 255, 0.4))', marginBottom: '25px' }} />
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '10px', color: 'var(--primary-gold)' }}>{t('loginTitle')}</h2>
                    <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', wordBreak: 'keep-all' }}>
                        {t('loginWelcome')}<br />
                        {t('loginSub')}
                    </p>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px' }}>
                            <span key={langLabelIndex} style={{
                                fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)',
                                marginRight: '8px', marginLeft: '4px', minWidth: '40px',
                                textAlign: 'right', animation: 'fadeIn 0.5s ease-out'
                            }}>{langLabels[langLabelIndex]}</span>
                            <div style={{ minWidth: '80px' }}>
                                <LanguageSelector variant="minimal" />
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'left', marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginLeft: '12px' }}>{t('nameLabel')}</label>
                        <input style={{ ...authInputStyle, marginTop: '4px' }} placeholder={t('namePlaceholder')}
                            value={name} onChange={e => setName(e.target.value)}
                            lang="ko" type="text" inputMode="text" autoComplete="name" spellCheck="false" enterKeyHint="next" />
                    </div>
                    <div style={{ textAlign: 'left', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginLeft: '12px' }}>{t('phoneLabel')}</label>
                        <input style={{ ...authInputStyle, marginTop: '4px' }} placeholder={t('phonePlaceholder')}
                            value={phone} onChange={e => setPhone(e.target.value)}
                            maxLength={4} type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="tel-local-suffix" enterKeyHint="go" />
                    </div>
                    {error && <p style={{ color: 'var(--accent-error)', fontSize: '0.9rem', marginBottom: '10px' }}>{error}</p>}
                    <button type="submit" disabled={loading} style={{ ...authButtonStyle, marginTop: '10px' }}>{t('checkRecordBtn')}</button>
                </form>
                <p style={{ marginTop: '30px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                    {t('loginFooter')}
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
