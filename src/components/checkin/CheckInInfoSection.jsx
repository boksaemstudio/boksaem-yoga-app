import React, { memo, useRef, useEffect } from 'react';
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
    handleQRInteraction,
    onCameraTouch,
    faceRecognitionEnabled,
    isScanning,
    cameraVideoRef,
    cameraStream,
    attendanceVideoRef
}) => {
    const { config } = useStudioConfig();
    const studioName = config.IDENTITY?.NAME || 'Studio';
    const showCamera = config.POLICIES?.SHOW_CAMERA_PREVIEW !== false && (config.POLICIES?.SHOW_CAMERA_PREVIEW === true || faceRecognitionEnabled);
    const cameraSize = config.POLICIES?.CAMERA_SIZE || 'large';
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Kiosk settings를 가져와서 근접 자동 복귀가 켜져있는지 확인
    const [isProximityEnabled, setIsProximityEnabled] = React.useState(false);
    useEffect(() => {
        import('../../services/storage').then(({ storageService }) => {
            storageService.getKioskSettings(config.IDENTITY?.BRANCH_ID).then(settings => {
                if(settings && settings.proximityReturn) setIsProximityEnabled(true);
            });
        });
    }, [config.IDENTITY?.BRANCH_ID]);

    useEffect(() => {
        // 프리뷰를 켜거나, 근접 감지가 켜져있거나, 얼굴 스캔이 켜져있으면 카메라가 필요함.
        if (!showCamera && !isProximityEnabled && !faceRecognitionEnabled) return;
        if (!cameraStream) return;

        // Parent가 넘겨준 stream을 그대로 사용
        streamRef.current = cameraStream;
        
        if (videoRef.current && videoRef.current.srcObject !== cameraStream) {
            videoRef.current.srcObject = cameraStream;
            videoRef.current.play().catch(() => {});
        }
        if (cameraVideoRef?.current && cameraVideoRef.current.srcObject !== cameraStream) {
            cameraVideoRef.current.srcObject = cameraStream;
            cameraVideoRef.current.play().catch(() => {});
        }
        
    }, [cameraStream, showCamera, cameraSize, faceRecognitionEnabled, isProximityEnabled, cameraVideoRef]);

    const isIdle = pin.length === 0 && !loading;

    return (
        <div className="checkin-info-section">
            <header className="info-header" style={{ marginBottom: 'clamp(10px, 2vh, 25px)', flexShrink: 0 }}>
                <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '35px', justifyContent: 'center' }}>
                    {/* RYS200 로고 (설정되어 있을 때만) */}
                    {rys200Logo && (
                        <img src={rys200Logo} alt="RYS200" style={{ height: 'clamp(32px, 7vh, 65px)', width: 'auto', objectFit: 'contain' }} />
                    )}
                    {/* 스튜디오 메인 로고 */}
                    {config.IDENTITY?.LOGO_URL ? (
                        <img src={config.IDENTITY.LOGO_URL} alt="Studio Logo" style={{ height: 'clamp(40px, 8vh, 80px)', width: 'auto', objectFit: 'contain' }} />
                    ) : logoWide ? (
                        <img src={logoWide} alt="Studio Logo" style={{ height: 'clamp(38px, 8vh, 78px)', width: 'auto' }} />
                    ) : (
                        <h1 style={{ color: 'white', fontSize: 'clamp(2rem, 5vh, 3rem)', margin: 0, fontWeight: 900, letterSpacing: '-1px' }}>{studioName}</h1>
                    )}
                </div>
            </header>



            {/* ━━━ PIN 표시 (키 입력 중일 때 카메라 대신 표시) ━━━ */}
            {pin.length > 0 && (
                <div style={{
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    marginBottom: 'clamp(5px, 1vh, 12px)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="pin-display">
                        {pin.padEnd(4, '•').split('').map((c, i) => (
                            <span key={i} className={i < pin.length ? 'pin-active' : 'pin-inactive'}>{c}</span>
                        ))}
                    </div>
                </div>
            )}

            <div className="info-body" style={{ justifyContent: 'center', alignItems: 'center' }}>
                {/* ━━━ Large 카메라 프리뷰 (info-body 내부 — 로고와 AI메시지 사이 중앙) ━━━ */}
                {showCamera && cameraSize === 'large' && isIdle && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '6px',
                        flex: '0 0 auto',
                        marginBottom: 'clamp(8px, 1.5vh, 16px)',
                    }}>
                        <div style={{
                            width: 'clamp(112px, 19.5vw, 225px)',
                            aspectRatio: '4/3',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            border: isScanning ? '3px solid var(--primary-gold)' : '2px solid rgba(255, 215, 0, 0.2)',
                            background: 'rgba(0,0,0,0.5)',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'border 0.3s',
                            boxShadow: isScanning ? '0 0 20px rgba(var(--primary-rgb), 0.3)' : '0 4px 15px rgba(0,0,0,0.4)'
                        }}
                            onClick={onCameraTouch}
                        >
                            <video
                                ref={(el) => {
                                    videoRef.current = el;
                                    if (attendanceVideoRef) attendanceVideoRef.current = el;
                                    if (el && streamRef.current && !el.srcObject) {
                                        el.srcObject = streamRef.current;
                                        el.play().catch(() => {});
                                    }
                                }}
                                autoPlay
                                playsInline
                                muted
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                            />
                            {isScanning && (
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    border: '3px solid var(--primary-gold)',
                                    borderRadius: '14px',
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                    pointerEvents: 'none'
                                }} />
                            )}
                            {faceRecognitionEnabled && !isScanning && (
                                <div style={{
                                    position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
                                    fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)', color: 'var(--primary-gold)', background: 'rgba(0,0,0,0.75)',
                                    padding: '4px 14px', borderRadius: '16px', whiteSpace: 'nowrap',
                                    backdropFilter: 'blur(4px)', fontWeight: 600,
                                    border: '1px solid rgba(255, 215, 0, 0.3)'
                                }}>📸 얼굴을 비추면 자동 출석</div>
                            )}
                            {!faceRecognitionEnabled && (
                                <div style={{
                                    position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
                                    fontSize: 'clamp(0.6rem, 1vw, 0.8rem)', color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.75)',
                                    padding: '4px 12px', borderRadius: '16px', whiteSpace: 'nowrap',
                                    backdropFilter: 'blur(4px)', fontWeight: 500,
                                    border: '1px solid rgba(255, 255, 255, 0.15)'
                                }}>📸 터치하여 얼굴 등록</div>
                            )}
                        </div>
                        <div style={{
                            fontSize: 'clamp(0.5rem, 0.8vw, 0.65rem)',
                            color: 'rgba(255,255,255,0.25)',
                            textAlign: 'center',
                            lineHeight: 1.3
                        }}>
                            🔐 사진 미저장 · 암호화 128숫자 변환 · 불가역적
                        </div>
                    </div>
                )}

                <div className="message-container" style={{ flex: '0 0 auto' }}>
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

            {/* QR코드 영역 + small 카메라 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', flexShrink: 0, marginBottom: 0 }}>
                {/* small 카메라 — QR 왼쪽 */}
                {showCamera && cameraSize === 'small' && (
                    <div style={{
                        visibility: isIdle ? 'visible' : 'hidden',
                        width: isIdle ? 'clamp(100px, 14vh, 160px)' : '0',
                        overflow: 'hidden',
                        flexShrink: 0,
                        transition: 'width 0.2s',
                        alignSelf: 'flex-end',
                    }}>
                        <div style={{
                            width: '100%',
                            aspectRatio: '3/4',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            border: isScanning ? '3px solid var(--primary-gold)' : '2px solid rgba(255, 215, 0, 0.2)',
                            background: 'rgba(0,0,0,0.5)',
                            cursor: 'pointer',
                            position: 'relative',
                            boxShadow: isScanning ? '0 0 15px rgba(var(--primary-rgb), 0.3)' : '0 4px 12px rgba(0,0,0,0.4)'
                        }}
                            onClick={onCameraTouch}
                        >
                            <video
                                ref={(el) => {
                                    videoRef.current = el;
                                    if (attendanceVideoRef) attendanceVideoRef.current = el;
                                }}
                                autoPlay playsInline muted
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                            />
                            {isScanning && (
                                <div style={{ position: 'absolute', inset: 0, border: '3px solid var(--primary-gold)', borderRadius: '14px', animation: 'pulse 1.5s ease-in-out infinite', pointerEvents: 'none' }} />
                            )}
                            {faceRecognitionEnabled && !isScanning && (
                                <div style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.6rem', color: 'var(--primary-gold)', background: 'rgba(0,0,0,0.8)', padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap', fontWeight: 600 }}>📸 자동 출석</div>
                            )}
                            {!faceRecognitionEnabled && (
                                <div style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.55rem', color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.8)', padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap', fontWeight: 500 }}>📸 얼굴 등록</div>
                            )}
                        </div>
                    </div>
                )}
                <div
                    className="qr-box"
                    style={{
                        background: 'rgba(0,0,0,0.6)', borderRadius: '20px', padding: 'clamp(10px, 2vh, 20px) clamp(12px, 2vw, 30px)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 'clamp(8px, 1.5vw, 25px)', border: '1px solid rgba(255, 215, 0, 0.4)', touchAction: 'none',
                        marginBottom: 0
                    }}
                    onTouchStart={handleQRInteraction}
                    onMouseDown={(e) => { if (e.button === 0) handleQRInteraction(e); }}
                >
                    <div className="qr-img-wrapper" style={{ background: 'white', padding: 'clamp(6px, 1.5vh, 12px)', borderRadius: '16px', flexShrink: 0 }}>
                        <img src={qrCodeUrl} alt="QR" style={{ width: 'clamp(65px, 12vh, 130px)', height: 'clamp(65px, 12vh, 130px)', display: 'block' }} />
                    </div>
                    <div className="qr-text" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: '-5px' }}>
                        <h3 style={{ fontSize: 'clamp(1.15rem, 2.5vh, 1.9rem)', color: 'var(--primary-gold)', marginBottom: 'clamp(4px, 1vh, 16px)', fontWeight: 900, lineHeight: 1 }}>
                            {`내 ${studioName}`}
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

// 근접감지용 숨겨진 비디오 — faceVideoRef 연결
const HiddenFaceVideo = React.forwardRef((props, ref) => (
    <video
        ref={ref}
        autoPlay playsInline muted
        style={{ position: 'fixed', left: '-9999px', width: '1px', height: '1px', opacity: 0.01, pointerEvents: 'none' }}
    />
));

CheckInInfoSection.displayName = 'CheckInInfoSection';
export default CheckInInfoSection;
