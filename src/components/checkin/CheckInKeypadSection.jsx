import React, { memo, useRef, useEffect } from 'react';
import Keypad from '../Keypad';
import { useStudioConfig } from '../../contexts/StudioContext';

const CheckInKeypadSection = memo(({
    pin,
    loading,
    isReady,
    loadingMessage,
    keypadLocked,
    showSelectionModal,
    message,
    handleKeyPress,
    handleClear,
    handleSubmit,
    // 카메라 관련 props
    onCameraTouch,
    faceRecognitionEnabled,
    isScanning,
    cameraVideoRef
}) => {
    const { config } = useStudioConfig();
    const showCamera = config.POLICIES?.SHOW_CAMERA_PREVIEW || false;
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // 카메라 스트림 초기화
    useEffect(() => {
        if (!showCamera) return;
        let cancelled = false;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
                });
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                // 안면인식용 외부 ref에도 연결
                if (cameraVideoRef?.current && !cameraVideoRef.current.srcObject) {
                    cameraVideoRef.current.srcObject = stream;
                }
            } catch (e) {
                console.log('[Camera Preview] 카메라 접근 불가:', e.message);
            }
        };

        startCamera();
        return () => {
            cancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        };
    }, [showCamera]);

    const isIdle = pin.length === 0 && !loading && !message;
    const showCameraView = showCamera && isIdle && isReady;

    return (
        <div className="checkin-keypad-section" style={{ position: 'relative', background: 'transparent', boxShadow: 'none', border: 'none' }}>
            {/* Loading Overlay */}
            {loading && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.85)', borderRadius: '24px', zIndex: 100, padding: '20px', textAlign: 'center'
                }}>
                    <div style={{
                        width: '40px', height: '40px', border: '3px solid rgba(255,215,0,0.3)',
                        borderTop: '3px solid var(--primary-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px'
                    }} />
                    <p style={{ color: 'var(--primary-gold)', fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
                        {loadingMessage || '출석 확인 중...'}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '8px' }}>잠시만 기다려주세요</p>
                </div>
            )}

            {/* Warm-up Overlay */}
            {!isReady && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.7)', borderRadius: '24px', zIndex: 100
                }}>
                    <div style={{
                        width: '50px', height: '50px', border: '4px solid rgba(255,215,0,0.3)',
                        borderTop: '4px solid var(--primary-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ marginTop: '20px', color: 'var(--primary-gold)', fontSize: '1.2rem', fontWeight: 600 }}>
                        출석 시스템 준비 중...
                    </p>
                </div>
            )}

            {/* ━━━ 카메라 프리뷰 (유휴 상태일 때 키패드 영역에 표시) ━━━ */}
            {showCameraView ? (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    width: '100%', height: '100%', gap: 'clamp(8px, 1.5vh, 16px)',
                    animation: 'fadeIn 0.4s ease-out'
                }}>
                    <div style={{
                        width: '100%', maxWidth: '480px',
                        aspectRatio: '4/3',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        border: isScanning ? '3px solid var(--primary-gold)' : '2px solid rgba(255, 215, 0, 0.2)',
                        background: 'rgba(0,0,0,0.5)',
                        cursor: faceRecognitionEnabled ? 'pointer' : 'default',
                        position: 'relative',
                        transition: 'border 0.3s',
                        boxShadow: isScanning ? '0 0 25px rgba(var(--primary-rgb), 0.3)' : '0 4px 20px rgba(0,0,0,0.4)'
                    }}
                        onClick={faceRecognitionEnabled ? onCameraTouch : undefined}
                    >
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                        />
                        {isScanning && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                border: '3px solid var(--primary-gold)',
                                borderRadius: '18px',
                                animation: 'pulse 1.5s ease-in-out infinite',
                                pointerEvents: 'none'
                            }} />
                        )}
                        {/* 안면인식 안내 텍스트 */}
                        {faceRecognitionEnabled && !isScanning && (
                            <div style={{
                                position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                                fontSize: '0.9rem', color: 'var(--primary-gold)', background: 'rgba(0,0,0,0.75)',
                                padding: '6px 16px', borderRadius: '20px', whiteSpace: 'nowrap',
                                backdropFilter: 'blur(4px)', fontWeight: 600,
                                border: '1px solid rgba(255, 215, 0, 0.3)'
                            }}>📸 얼굴을 비추면 자동 출석</div>
                        )}
                    </div>
                    {/* 하단 안내 텍스트 */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
                    }}>
                        <div style={{
                            fontSize: 'clamp(1rem, 2vh, 1.3rem)',
                            color: 'rgba(255,255,255,0.7)',
                            textAlign: 'center',
                            fontWeight: 500
                        }}>
                            또는 전화번호 뒤 4자리를 눌러주세요
                        </div>
                        <div style={{
                            fontSize: 'clamp(0.6rem, 1vh, 0.75rem)',
                            color: 'rgba(255,255,255,0.25)',
                            textAlign: 'center',
                            lineHeight: 1.3
                        }}>
                            🔐 사진 미저장 · 암호화 128숫자 변환 · 불가역적 · 재구성 불가
                        </div>
                    </div>
                </div>
            ) : (
                /* ━━━ 기본 키패드 + PIN 표시 (입력 중) ━━━ */
                <>
                    {pin.length === 0 && !message && isReady && !showCamera && (
                        <div className="keypad-floating-instruction">
                            전화번호 뒤 4자리를 눌러주세요
                        </div>
                    )}

                    <Keypad
                        onKeyPress={handleKeyPress}
                        onClear={handleClear}
                        onSubmit={handleSubmit}
                        disabled={loading || keypadLocked || !!message || showSelectionModal || !isReady}
                    />
                </>
            )}
        </div>
    );
});

CheckInKeypadSection.displayName = 'CheckInKeypadSection';
export default CheckInKeypadSection;
