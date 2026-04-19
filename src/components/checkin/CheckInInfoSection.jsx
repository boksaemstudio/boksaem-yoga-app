import React, { memo, useRef, useEffect } from 'react';
import { useStudioConfig } from '../../contexts/StudioContext';
import { useLanguageStore } from '../../stores/useLanguageStore';
const CheckInInfoSection = memo(({
  pin,
  loading,
  aiExperience,
  aiEnhancedMsg,
  aiLoading,
  kioskLogos = [],
  qrCodeUrl,
  handleQRInteraction,
  onCameraTouch,
  faceRecognitionEnabled,
  isScanning,
  cameraVideoRef,
  cameraStream,
  attendanceVideoRef
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const studioName = config.IDENTITY?.NAME || 'Studio';
  const showCamera = config.POLICIES?.SHOW_CAMERA_PREVIEW !== false && (config.POLICIES?.SHOW_CAMERA_PREVIEW === true || faceRecognitionEnabled);
  const cameraSize = config.POLICIES?.CAMERA_SIZE || 'large';
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Kiosk settings를 가져와서 근접 자동 복귀가 켜져있는지 확인
  const [isProximityEnabled, setIsProximityEnabled] = React.useState(false);
  useEffect(() => {
    import('../../services/storage').then(({
      storageService
    }) => {
      storageService.getKioskSettings(config.IDENTITY?.BRANCH_ID).then(settings => {
        if (settings && settings.proximityReturn) setIsProximityEnabled(true);
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
  return <div className="checkin-info-section">
            <header className="info-header" style={{
      marginBottom: 'clamp(10px, 2vh, 25px)',
      flexShrink: 0
    }}>
                <div className="logo-container" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '35px',
        justifyContent: 'center'
      }}>
                    {/* [SaaS] 키오스크 로고: 관리자가 키오스크 탭에서 등록한 이미지들 */}
                    {kioskLogos.length > 0 ? kioskLogos.map((logoUrl, idx) => {
          const bgs = config.KIOSK?.LOGO_BGS || [];
          const opacities = config.KIOSK?.LOGO_OPACITIES || [];
          const inverts = config.KIOSK?.LOGO_INVERTS || [];
          const isInverted = !!inverts[idx];
          const currentBg = bgs[idx] || 'transparent';
          const opacity = typeof opacities[idx] === 'number' ? opacities[idx] : 1.0;
          const bgRgb = currentBg === 'white' ? '255,255,255' : currentBg === 'black' ? '0,0,0' : null;
          const bgStyle = bgRgb ? `rgba(${bgRgb}, ${opacity})` : 'transparent';

          // 여백(padding) 등 강제로 들어갔던 부분 완전히 삭제 후, 지정된 색상 배경만 추가
          return <img key={idx} src={logoUrl} alt={`Kiosk Logo ${idx + 1}`} style={{
            height: 'clamp(56px, 12.5vh, 125px)',
            width: 'auto',
            maxWidth: kioskLogos.length > 1 ? '45%' : '80%',
            objectFit: 'contain',
            background: bgStyle,
            borderRadius: currentBg === 'transparent' ? '0' : '8px', // 배경색이 있을 때만 미세한 라운드 처리 (여백 없음)
            filter: isInverted ? 'invert(1)' : 'none',
            transition: 'filter 0.3s ease'
          }} onError={e => {
            e.target.style.display = 'none';
          }} />;
        }) : <h1 style={{
          color: 'white',
          fontSize: 'clamp(2rem, 5vh, 3rem)',
          margin: 0,
          fontWeight: 900,
          letterSpacing: '-1px'
        }}>{studioName}</h1>}
                </div>
            </header>



            {/* ━━━ PIN 표시 (키 입력 중일 때 카메라 대신 표시) ━━━ */}
            {pin.length > 0 && <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 'clamp(5px, 1vh, 12px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
                    <div className="pin-display">
                        {pin.padEnd(4, '•').split('').map((c, i) => <span key={i} className={i < pin.length ? 'pin-active' : 'pin-inactive'}>{c}</span>)}
                    </div>
                </div>}

            <div className="info-body" style={{
      justifyContent: 'center',
      alignItems: 'center'
    }}>
                {/* ━━━ Large 카메라 프리뷰 (info-body 내부 — 로고와 AI메시지 사이 중앙) ━━━ */}
                {showCamera && cameraSize === 'large' && isIdle && <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        flex: '0 0 auto',
        marginBottom: 'clamp(8px, 1.5vh, 16px)'
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
        }} onClick={onCameraTouch}>
                            <video ref={el => {
            videoRef.current = el;
            if (el && cameraVideoRef) cameraVideoRef.current = el;
            if (el && streamRef.current && !el.srcObject) {
              el.srcObject = streamRef.current;
              el.play().catch(() => {});
            }
          }} autoPlay playsInline muted style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)'
          }} />
                            {isScanning && <div style={{
            position: 'absolute',
            inset: 0,
            border: '3px solid var(--primary-gold)',
            borderRadius: '14px',
            animation: 'pulse 1.5s ease-in-out infinite',
            pointerEvents: 'none'
          }} />}
                            {faceRecognitionEnabled && !isScanning && <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)',
            color: 'var(--primary-gold)',
            background: 'rgba(0,0,0,0.75)',
            padding: '4px 14px',
            borderRadius: '16px',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(4px)',
            fontWeight: 600,
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>{t('kiosk_info_auto_checkin') || t("g_bed297") || "📸 얼굴을 비추면 자동 출석"}</div>}
                            {!faceRecognitionEnabled && <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 'clamp(0.6rem, 1vw, 0.8rem)',
            color: 'rgba(255,255,255,0.7)',
            background: 'rgba(0,0,0,0.75)',
            padding: '4px 12px',
            borderRadius: '16px',
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(4px)',
            fontWeight: 500,
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>{t('kiosk_info_touch_to_register') || t("g_dda3b3") || "📸 터치하여 얼굴 등록"}</div>}
                        </div>
                        <div style={{
          fontSize: 'clamp(0.5rem, 0.8vw, 0.65rem)',
          color: 'rgba(255,255,255,0.25)',
          textAlign: 'center',
          lineHeight: 1.3
        }}>
                            {t('kiosk_info_privacy_mini') || t("g_53d1a3") || "🔐 사진 미저장 · 암호화 128숫자 변환 · 불가역적"}
                        </div>
                    </div>}

                <div style={{ flex: 1, minHeight: '2vh' }} /> {/* Top Spacer for Perfect Centering */}
                
                <div className="message-container" style={{
        flex: '0 0 auto',
        background: 'rgba(30, 20, 5, 0.85)',
        padding: 'clamp(12px, 2vh, 20px) clamp(16px, 3vw, 30px)',
        borderRadius: '24px',
        border: '2px solid rgba(255, 215, 0, 0.4)'
      }}>
                    <div className={`instruction-text ${loading ? 'loading' : ''}`}>
                        {aiExperience ? <div>
                                {aiEnhancedMsg && !loading && <div style={{
              animation: 'slideUp 0.6s ease-out',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
                                        <span style={{
                fontSize: '1.2rem',
                flexShrink: 0,
                marginTop: '2px'
              }}>✨</span>
                                        <span style={{
                fontSize: 'clamp(1.2rem, 3vh, 1.8rem)',
                color: 'rgba(255,255,255,0.95)',
                lineHeight: 1.5,
                fontWeight: 600,
                wordBreak: 'keep-all'
              }}>
                                            {aiEnhancedMsg}
                                        </span>
                                    </div>}
                                {!aiEnhancedMsg && aiLoading && !loading && <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              animation: 'fadeIn 0.5s ease-out'
            }}>
                                        <div className="ai-thinking-icon">
                                            <svg width="20" height="20" viewBox="0 0 256 256" fill="var(--primary-gold)">
                                                <path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32,32,0,0,0,24,80v96a32,32,0,0,0,32,32h80v32a8,8,0,0,0,16,0V208h48a32,32,0,0,0,32-32V80A32,32,0,0,0,200,48ZM172,168H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Zm0-48H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Z" />
                                            </svg>
                                        </div>
                                        <span style={{
                color: 'rgba(var(--primary-rgb), 0.85)',
                fontSize: '0.95rem',
                fontWeight: 500,
                animation: 'pulse 1.5s ease-in-out infinite'
              }}>
                                            {t('kiosk_info_ai_preparing') || t("g_80a6d7") || "AI가 오늘의 메시지를 준비하고 있어요"}
                                        </span>
                                        <div style={{
                display: 'flex',
                gap: '4px'
              }}>
                                            {[0, 1, 2].map(i => <div key={i} style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--primary-gold)',
                  opacity: 0.7,
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                }} />)}
                                        </div>
                                    </div>}
                                {!aiEnhancedMsg && !aiLoading && <span className="outfit-font" style={{
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
                                    </span>}
                                {loading && <div className="mini-loader" style={{
              fontSize: '1.1rem',
              color: 'var(--primary-gold)',
              fontWeight: 'bold',
              marginTop: '10px'
            }}>
                                        {t('kiosk_info_checking') || t("g_f63fa3") || "수련 정보를 확인하고 있습니다..."}
                                    </div>}
                            </div> : <div style={{
            opacity: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
                                <div className="ai-thinking-icon">
                                    <svg width="20" height="20" viewBox="0 0 256 256" fill="var(--primary-gold)">
                                        <path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32,32,0,0,0,24,80v96a32,32,0,0,0,32,32h80v32a8,8,0,0,0,16,0V208h48a32,32,0,0,0,32-32V80A32,32,0,0,0,200,48ZM172,168H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Zm0-48H84a12,12,0,0,1,0-24h88a12,12,0,0,1,0,24Z" />
                                    </svg>
                                </div>
                                <span style={{
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>{t('kiosk_info_connecting_energy', {
                studioName
              }) || `${studioName}의 에너지를 연결하고 있습니다...`}</span>
                            </div>}
                    </div>
                </div>
                
                <div style={{ flex: 1, minHeight: '2vh' }} /> {/* Bottom Spacer for Perfect Centering */}
            </div>

            {/* QR코드 영역 + small 카메라 */}
            <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: '12px',
      flexShrink: 0,
      marginBottom: 0
    }}>
                {/* small 카메라 — QR 왼쪽 */}
                {showCamera && cameraSize === 'small' && <div style={{
        visibility: isIdle ? 'visible' : 'hidden',
        width: isIdle ? 'clamp(100px, 14vh, 160px)' : '0',
        overflow: 'hidden',
        flexShrink: 0,
        transition: 'width 0.2s',
        alignSelf: 'flex-end'
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
        }} onClick={onCameraTouch}>
                            <video ref={el => {
            videoRef.current = el;
            if (el && cameraVideoRef) cameraVideoRef.current = el;
          }} autoPlay playsInline muted style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)'
          }} />
                            {isScanning && <div style={{
            position: 'absolute',
            inset: 0,
            border: '3px solid var(--primary-gold)',
            borderRadius: '14px',
            animation: 'pulse 1.5s ease-in-out infinite',
            pointerEvents: 'none'
          }} />}
                            {faceRecognitionEnabled && !isScanning && <div style={{
            position: 'absolute',
            bottom: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.6rem',
            color: 'var(--primary-gold)',
            background: 'rgba(0,0,0,0.8)',
            padding: '2px 8px',
            borderRadius: '10px',
            whiteSpace: 'nowrap',
            fontWeight: 600
          }}>{t('kiosk_info_auto_checkin_short') || t("g_068637") || "📸 자동 출석"}</div>}
                            {!faceRecognitionEnabled && <div style={{
            position: 'absolute',
            bottom: '4px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.55rem',
            color: 'rgba(255,255,255,0.7)',
            background: 'rgba(0,0,0,0.8)',
            padding: '2px 8px',
            borderRadius: '10px',
            whiteSpace: 'nowrap',
            fontWeight: 500
          }}>{t('kiosk_info_touch_to_register_short') || t("g_f0cdf8") || "📸 얼굴 등록"}</div>}
                        </div>
                    </div>}
                <div className="qr-box" style={{
        background: 'rgba(0,0,0,0.6)',
        borderRadius: '20px',
        padding: 'clamp(10px, 2vh, 20px) clamp(12px, 2vw, 30px)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(8px, 1.5vw, 25px)',
        border: '1px solid rgba(255, 215, 0, 0.4)',
        touchAction: 'none',
        marginBottom: 0
      }} onTouchStart={handleQRInteraction} onMouseDown={e => {
        if (e.button === 0) handleQRInteraction(e);
      }}>
                    <div className="qr-img-wrapper" style={{
          background: 'white',
          padding: 'clamp(6px, 1.5vh, 12px)',
          borderRadius: '16px',
          flexShrink: 0
        }}>
                        <img src={qrCodeUrl} alt="QR" style={{
            width: 'clamp(65px, 12vh, 130px)',
            height: 'clamp(65px, 12vh, 130px)',
            display: 'block'
          }} />
                    </div>
                    <div className="qr-text" style={{
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          marginTop: '-5px'
        }}>
                        <h3 style={{
            fontSize: 'clamp(1.15rem, 2.5vh, 1.9rem)',
            color: 'var(--primary-gold)',
            marginBottom: 'clamp(4px, 1vh, 16px)',
            fontWeight: 900,
            lineHeight: 1
          }}>
                            {t('kiosk_info_my_studio', {
              studioName
            }) || `내 ${studioName}`}
                        </h3>
                        <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(2px, 0.5vh, 5px)'
          }}>
                            <li style={{
              fontSize: 'clamp(1.0rem, 2vh, 1.2rem)',
              color: 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              lineHeight: 1.1
            }}>{t('kiosk_info_check_credits') || t("g_dd1e5b") || "✓ 잔여 횟수 확인"}</li>
                            <li style={{
              fontSize: 'clamp(1.0rem, 2vh, 1.2rem)',
              color: 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              lineHeight: 1.1
            }}>{t('kiosk_info_view_schedule') || t("g_fd3c41") || "✓ 수업 일정 보기"}</li>
                            <li style={{
              fontSize: 'clamp(1.0rem, 2vh, 1.2rem)',
              color: 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              lineHeight: 1.1
            }}>{t('kiosk_info_get_notifications') || t("g_4bc4df") || "✓ 맞춤 알림 받기"}</li>
                        </ul>
                    </div>
                </div>
            </div>
            {/* 만약 카메라가 숨김 모드(showCamera === false)이지만 백그라운드 카메라가 필요한 경우 */}
            {!showCamera && (faceRecognitionEnabled || isProximityEnabled) && (
              <HiddenFaceVideo ref={el => {
                if (cameraVideoRef) cameraVideoRef.current = el;
                if (el && cameraStream && !el.srcObject) {
                  el.srcObject = cameraStream;
                  el.play().catch(() => {});
                }
              }} />
            )}
        </div>;
});

// 근접감지용 숨겨진 비디오 — faceVideoRef 연결
const HiddenFaceVideo = React.forwardRef((props, ref) => <video ref={ref} autoPlay playsInline muted style={{
  position: 'fixed',
  left: '-9999px',
  width: '1px',
  height: '1px',
  opacity: 0.01,
  pointerEvents: 'none'
}} />);
CheckInInfoSection.displayName = 'CheckInInfoSection';
export default CheckInInfoSection;