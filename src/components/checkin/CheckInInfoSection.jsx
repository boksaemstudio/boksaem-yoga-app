import React, { memo } from 'react';
import { useStudioConfig } from '../../contexts/StudioContext';

const CheckInInfoSection = memo(({
    pin,
    loading,
    aiExperience,
    aiEnhancedMsg,
    aiLoading,
    rys200Logo,
    logoWide,
    qrCodeUrl,
    handleQRInteraction
}) => {
    const { config } = useStudioConfig();
    const studioName = config.IDENTITY?.NAME || 'Studio';

    return (
        <div className="checkin-info-section">
            <header className="info-header" style={{ marginBottom: 'clamp(5px, 2vh, 40px)' }}>
                <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '35px', justifyContent: 'center' }}>
                    <img src={rys200Logo} alt="RYS200" style={{ height: 'clamp(40px, 8vh, 80px)', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.8 }} />
                    <img src={logoWide} alt="logo" style={{ height: 'clamp(38px, 8vh, 78px)', width: 'auto' }} />
                </div>
            </header>

            <div className="info-body">
                <div className="pin-display">
                    {pin.padEnd(4, '•').split('').map((c, i) => (
                        <span key={i} className={i < pin.length ? 'pin-active' : 'pin-inactive'}>{c}</span>
                    ))}
                </div>

                <div className="message-container">
                    <div className={`instruction-text ${loading ? 'loading' : ''}`}>
                        {aiExperience ? (
                            <div>
                                {aiEnhancedMsg && !loading && (
                                    <div style={{
                                        padding: '16px 20px',
                                        background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.12), rgba(var(--primary-rgb), 0.04))',
                                        border: '1px solid rgba(var(--primary-rgb), 0.25)',
                                        borderRadius: '16px',
                                        animation: 'slideUp 0.6s ease-out',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px'
                                    }}>
                                        <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: '2px' }}>✨</span>
                                        <span style={{
                                            fontSize: 'clamp(1.2rem, 3vh, 1.8rem)',
                                            color: 'rgba(255,255,255,0.95)',
                                            lineHeight: 1.5,
                                            fontWeight: 600,
                                            wordBreak: 'keep-all'
                                        }}>
                                            {aiEnhancedMsg}
                                        </span>
                                    </div>
                                )}
                                {!aiEnhancedMsg && aiLoading && !loading && (
                                    <div style={{
                                        marginTop: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        padding: '10px 16px',
                                        borderRadius: '20px',
                                        background: 'rgba(var(--primary-rgb), 0.08)',
                                        border: '1px solid rgba(var(--primary-rgb), 0.15)',
                                        animation: 'fadeIn 0.5s ease-out'
                                    }}>
                                        <div className="ai-thinking-icon">
                                            <svg width="20" height="20" viewBox="0 0 256 256" fill="var(--primary-gold)">
                                                <path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32,32,0,0,0,24,80v96a32,32,0,0,0,32,32h80v32a8,8,0,0,0,16,0V208h48a32,32,0,0,0,32-32V80A32,32,0,0,0,200,48ZM172,168H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Zm0-48H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Z"/>
                                            </svg>
                                        </div>
                                        <span style={{ color: 'rgba(var(--primary-rgb), 0.85)', fontSize: '0.95rem', fontWeight: 500, animation: 'pulse 1.5s ease-in-out infinite' }}>
                                            AI가 오늘의 메시지를 준비하고 있어요
                                        </span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {[0, 1, 2].map(i => (
                                                <div key={i} style={{
                                                    width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-gold)',
                                                    opacity: 0.7, animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                                                }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {!aiEnhancedMsg && !aiLoading && (
                                    <span className="outfit-font" style={{
                                        fontSize: 'clamp(1.4rem, 3.5vh, 2rem)',
                                        fontWeight: 600,
                                        display: 'block',
                                        color: '#FFFFFF',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                        wordBreak: 'keep-all',
                                        lineHeight: 1.3,
                                        opacity: loading ? 0.3 : 1
                                    }}>
                                        {aiExperience.message}
                                    </span>
                                )}
                                {loading && (
                                    <div className="mini-loader" style={{ fontSize: '1.1rem', color: 'var(--primary-gold)', fontWeight: 'bold', marginTop: '10px' }}>
                                        수련 정보를 확인하고 있습니다...
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <div className="ai-thinking-icon">
                                    <svg width="20" height="20" viewBox="0 0 256 256" fill="var(--primary-gold)">
                                        <path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32,32,0,0,0,24,80v96a32,32,0,0,0,32,32h80v32a8,8,0,0,0,16,0V208h48a32,32,0,0,0,32-32V80A32,32,0,0,0,200,48ZM172,168H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Zm0-48H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Z"/>
                                    </svg>
                                </div>
                                <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>{studioName}의 에너지를 연결하고 있습니다...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* QR코드 영역 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div
                    className="qr-box"
                    style={{
                        background: 'rgba(0,0,0,0.6)', borderRadius: '20px', padding: 'clamp(10px, 2vh, 20px) clamp(12px, 2vw, 30px)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 'clamp(8px, 1.5vw, 25px)', border: '1px solid rgba(255, 215, 0, 0.4)', touchAction: 'none'
                    }}
                    onTouchStart={handleQRInteraction}
                    onMouseDown={(e) => { if (e.button === 0) handleQRInteraction(e); }}
                >
                    <div className="qr-img-wrapper" style={{ background: 'white', padding: 'clamp(6px, 1.5vh, 12px)', borderRadius: '16px', flexShrink: 0 }}>
                        <img src={qrCodeUrl} alt="QR" style={{ width: 'clamp(65px, 12vh, 130px)', height: 'clamp(65px, 12vh, 130px)', display: 'block' }} />
                    </div>
                    <div className="qr-text" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: '-5px' }}>
                        <h3 style={{ fontSize: 'clamp(1.15rem, 2.5vh, 1.9rem)', color: 'var(--primary-gold)', marginBottom: 'clamp(4px, 1vh, 16px)', fontWeight: 900, lineHeight: 1 }}>
                            내 {studioName}
                        </h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.5vh, 5px)' }}>
                            <li style={{ fontSize: 'clamp(1.0rem, 2vh, 1.2rem)', color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.1 }}>✓ 잔여 횟수 확인</li>
                            <li style={{ fontSize: 'clamp(1.0rem, 2vh, 1.2rem)', color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.1 }}>✓ 수업 일정 보기</li>
                            <li style={{ fontSize: 'clamp(1.0rem, 2vh, 1.2rem)', color: 'rgba(255, 255, 255, 0.95)', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.1 }}>✓ 맞춤 알림 받기</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
});

CheckInInfoSection.displayName = 'CheckInInfoSection';
export default CheckInInfoSection;
