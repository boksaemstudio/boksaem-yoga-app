import { useState, useRef, useEffect, useCallback } from 'react';
import { extractFaceDescriptor, loadFacialModels } from '../../services/facialService';
import { memberService } from '../../services/memberService';
import { useLanguageStore } from '../../stores/useLanguageStore';

/**
 * 안면인식 등록 모달
 * 1. 수치화 안내 → 2. 핸드폰 뒷4자리 본인 확인 → 3. 얼굴 촬영 → 4. 임베딩 저장
 * 
 * [FIX] 모달이 자체 카메라 스트림을 독립적으로 관리합니다.
 * videoRef props가 없거나 srcObject가 없어도 자체 getUserMedia로 카메라를 획득합니다.
 */
const FaceRegistrationModal = ({
  isOpen,
  onClose,
  videoRef: externalVideoRef,
  modelsAlreadyLoaded = false
}) => {
  const t = useLanguageStore(s => s.t);
  const [step, setStep] = useState(1); // 1: intro, 2: pin, 3: capture, 4: done
  const [pin, setPin] = useState('');
  const [matchedMember, setMatchedMember] = useState(null);
  const [matchedMembersList, setMatchedMembersList] = useState([]);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const countdownRef = useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // Determine which video element to use for face extraction
  const getActiveVideo = useCallback(() => {
    // 1) 모달 자체 비디오가 활성이면 사용
    if (localVideoRef.current?.srcObject && localVideoRef.current.readyState >= 2) {
      return localVideoRef.current;
    }
    // 2) 외부 비디오 ref가 있으면 사용
    if (externalVideoRef?.current?.srcObject && externalVideoRef.current.readyState >= 2) {
      return externalVideoRef.current;
    }
    return null;
  }, [externalVideoRef]);

  // Reset on open & acquire camera for step 3
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPin('');
      setMatchedMember(null);
      setMatchedMembersList([]);
      setCountdown(3);
      setError('');
      setSaving(false);
      setCameraReady(false);
      setCameraError(false);
      setStatusMsg('');
    } else {
      // 모달 닫힐 때 자체 스트림 정리
      stopLocalCamera();
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      stopLocalCamera();
    };
  }, [isOpen]);
  const stopLocalCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
  }, []);

  // step 3 진입 시 카메라 준비
  useEffect(() => {
    if (step === 3) {
      initCamera();
    }
  }, [step]);
  const initCamera = useCallback(async () => {
    setCameraError(false);
    setCameraReady(false);
    setStatusMsg(t('facereg_camera_preparing') || t("g_63c91b") || "\uCE74\uBA54\uB77C \uC900\uBE44 \uC911...");

    // 외부 비디오 ref에 이미 스트림이 있으면 사용
    if (externalVideoRef?.current?.srcObject) {
      console.log('[FaceReg] Using external camera stream');
      setCameraReady(true);
      setStatusMsg('');
      return;
    }

    // 자체 카메라 획득 시도
    try {
      console.log('[FaceReg] Acquiring own camera stream');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: 640,
          height: 480
        }
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(() => {});
      }

      // video가 실제 프레임을 가져올 때까지 대기
      await new Promise(resolve => {
        const checkReady = () => {
          if (localVideoRef.current?.readyState >= 2) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        setTimeout(checkReady, 100);
        // 5초 타임아웃
        setTimeout(resolve, 5000);
      });
      setCameraReady(true);
      setStatusMsg('');
      console.log('[FaceReg] Camera ready');
    } catch (err) {
      console.error('[FaceReg] Camera init failed:', err);
      setCameraError(true);
      setCameraReady(false);
      setStatusMsg('');
      setError(t('facereg_camera_error_permission') || t("g_ddd653") || "\uCE74\uBA54\uB77C\uC5D0 \uC811\uADFC\uD560 \uC218 \uC5C6\uC5B4\uC694. \uCE74\uBA54\uB77C \uAD8C\uD55C\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.");
    }
  }, [externalVideoRef]);
  const handlePinSubmit = useCallback(async () => {
    if (pin.length !== 4) return;
    setError('');
    try {
      const members = await memberService.findMembersByPhone(pin);
      if (members.length === 0) {
        setError(t('facereg_member_not_found') || t("g_ec85c3") || "\uB4F1\uB85D\uB41C \uD68C\uC6D0\uC774 \uC5C6\uC5B4\uC694. \uBC88\uD638\uB97C \uD655\uC778\uD574\uC8FC\uC138\uC694.");
        return;
      }
      if (members.length > 1) {
        setMatchedMembersList(members);
        setStep(2.5); // 선택 단계로 이동
      } else {
        setMatchedMember(members[0]);
        setStep(3); // → useEffect가 initCamera 호출
      }
    } catch (e) {
      setError(t('facereg_member_lookup_error') || t("g_f68342") || "\uD68C\uC6D0 \uC870\uD68C \uC911 \uBB38\uC81C\uAC00 \uC0DD\uACBC\uC5B4\uC694. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.");
    }
  }, [pin]);
  const startCountdown = useCallback(() => {
    // [FIX] 카메라 준비 안 됐으면 카운트다운 시작하지 않음
    const video = getActiveVideo();
    if (!video && !cameraReady) {
      setError(t('facereg_camera_not_ready') || t("g_4792aa") || "\uCE74\uBA54\uB77C\uAC00 \uC900\uBE44\uB418\uC9C0 \uC54A\uC558\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.");
      initCamera(); // 재시도
      return;
    }
    setError('');
    setCountdown(3);
    if (countdownRef.current) clearInterval(countdownRef.current);
    let count = 3;
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        captureAndSave();
      }
    }, 1000);
  }, [cameraReady, getActiveVideo]);
  const captureAndSave = useCallback(async () => {
    setSaving(true);
    setError('');

    // [ROOT FIX] 모델이 이미 페이지 레벨에서 로딩되었으면 건너뛰기
    if (modelsAlreadyLoaded) {
      console.log('[FaceReg] Models already loaded by useFacialRecognition hook — skipping');
      setStatusMsg(t('facereg_analyzing_face') || t("g_956d3b") || "\uC5BC\uAD74 \uBD84\uC11D \uC911...");
    } else {
      setStatusMsg(t('facereg_loading_ai_models') || t("g_47bd8a") || "AI \uBAA8\uB378 \uB85C\uB529 \uC911...");
      try {
        await Promise.race([loadFacialModels(), new Promise((_, reject) => setTimeout(() => reject(new Error(t('facereg_ai_timeout') || t("g_d600ef") || "AI \uBAA8\uB378 \uB85C\uB529 \uC2DC\uAC04 \uCD08\uACFC. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.")), 15000))]);
        setStatusMsg(t('facereg_analyzing_face') || t("g_956d3b") || "\uC5BC\uAD74 \uBD84\uC11D \uC911...");
      } catch (e) {
        setSaving(false);
        setStatusMsg('');
        setError(e.message);
        setCountdown(3);
        return;
      }
    }
    try {
      const video = getActiveVideo();
      if (!video) {
        throw new Error(t('facereg_video_stream_error') || t("g_bf2542") || "\uCE74\uBA54\uB77C \uC601\uC0C1\uC744 \uAC00\uC838\uC62C \uC218 \uC5C6\uC5B4\uC694. \uCE74\uBA54\uB77C \uAD8C\uD55C\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.");
      }
      const descriptor = await extractFaceDescriptor(video, true);
      if (!descriptor) {
        setError(t('facereg_face_not_detected') || t("g_5aa55d") || "\uC5BC\uAD74\uC744 \uC778\uC2DD\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uCE74\uBA54\uB77C\uB97C \uC815\uBA74\uC73C\uB85C \uBC14\uB77C\uBD10\uC8FC\uC138\uC694.");
        setSaving(false);
        setStatusMsg('');
        setCountdown(3);
        return;
      }
      setStatusMsg(t('facereg_saving') || t("g_923cf9") || "\uC800\uC7A5 \uC911...");
      const result = await memberService.updateFaceDescriptor(matchedMember.id, descriptor);
      if (result.success) {
        setStep(4);
      } else {
        console.error('[FaceReg] updateFaceDescriptor failed:', result.error);
        throw new Error(result.error || t('facereg_save_failed') || t("g_66fe01") || "\uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.");
      }
    } catch (e) {
      console.error('[FaceReg] Save failed:', e);
      setError(e.message || t('facereg_registration_error') || t("g_8b9709") || "\uB4F1\uB85D \uC911 \uBB38\uC81C\uAC00 \uC0DD\uACBC\uC5B4\uC694. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.");
      setCountdown(3);
    } finally {
      setSaving(false);
      setStatusMsg('');
    }
  }, [matchedMember, getActiveVideo, modelsAlreadyLoaded]);

  // [FIX] 카메라 준비되면 자동으로 카운트다운 시작
  useEffect(() => {
    if (step === 3 && cameraReady && countdown === 3 && !saving && !error) {
      startCountdown();
    }
  }, [step, cameraReady, countdown, saving, error]);
  const handlePinKeyPress = useCallback(num => {
    setPin(prev => {
      const next = prev + num;
      return next.length <= 4 ? next : prev;
    });
  }, []);
  if (!isOpen) return null;
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9000,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.3s ease-out'
  };
  const cardStyle = {
    background: 'var(--bg-modal)',
    borderRadius: '24px',
    padding: 'clamp(24px, 4vh, 40px)',
    maxWidth: '420px',
    width: '90%',
    border: '1px solid rgba(var(--primary-rgb), 0.2)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    textAlign: 'center',
    color: 'white'
  };
  return <div style={overlayStyle} onClick={step === 4 ? onClose : undefined}>
            <div style={cardStyle} onClick={e => e.stopPropagation()}>
                
                {/* Step 1: 안내 */}
                {step === 1 && <div style={{
        animation: 'slideUp 0.4s ease-out'
      }}>
                        <div style={{
          fontSize: '3rem',
          marginBottom: '16px'
        }}>🔐</div>
                        <h2 style={{
          fontSize: '1.4rem',
          fontWeight: 'bold',
          marginBottom: '16px',
          color: 'var(--primary-gold)'
        }}>
                            {t('facereg_title')}
                        </h2>
                        <div style={{
          background: 'rgba(var(--primary-rgb), 0.08)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          textAlign: 'left',
          border: '1px solid rgba(var(--primary-rgb), 0.15)',
          lineHeight: 1.7
        }}>
                            <p style={{
            fontSize: '1.05rem',
            marginBottom: '12px',
            fontWeight: 600
          }}>
                                🔐 {t('facereg_privacy_title') || t("g_a8d7d1") || "\uC0AC\uC9C4\uC740 \uC800\uC7A5\uD558\uC9C0 \uC54A\uC544\uC694!"}
                            </p>
                            <p style={{
            fontSize: '0.95rem',
            color: 'rgba(255,255,255,0.8)'
          }}>
                                {t('facereg_privacy_desc1') || t("g_2db73f") || "\uC0AC\uC9C4\uC740 \uC800\uC7A5\uD558\uC9C0 \uC54A\uACE0 \uC554\uD638\uD654\uB418\uC5B4 128\uAC1C \uC22B\uC790\uB85C\uB9CC \uAE30\uC5B5\uD574\uC694. \uC774 \uC22B\uC790\uB85C\uB294 \uC5BC\uAD74\uC744 \uB2E4\uC2DC \uB9CC\uB4E4 \uC218 \uC5C6\uC5B4\uC694. (\uBD88\uAC00\uC5ED\uC801)"}
                            </p>
                            <p style={{
            fontSize: '0.95rem',
            color: 'rgba(255,255,255,0.8)',
            marginTop: '8px'
          }}>
                                {t('facereg_privacy_desc2') || t("g_558598") || "\uB4F1\uB85D\uD558\uBA74 \uB2E4\uC74C\uBD80\uD130 \uCE74\uBA54\uB77C \uC55E\uC5D0 \uC11C\uAE30\uB9CC \uD558\uBA74 \uC790\uB3D9\uC73C\uB85C \uCD9C\uC11D\uC774 \uB429\uB2C8\uB2E4!"}
                            </p>
                        </div>
                        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
                            <button onClick={onClose} style={{
            flex: 1,
            padding: '14px',
            borderRadius: '12px',
            fontSize: '1rem',
            background: 'rgba(255,255,255,0.08)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer'
          }}>{t('facereg_later') || t("g_51e9a2") || "\uB2E4\uC74C\uC5D0 \uD560\uAC8C\uC694"}</button>
                            <button onClick={() => setStep(2)} style={{
            flex: 1,
            padding: '14px',
            borderRadius: '12px',
            fontSize: '1rem',
            background: 'var(--primary-gold)',
            color: 'var(--text-on-primary)',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer'
          }}>{t('facereg_register') || t("g_7559ab") || "\uB4F1\uB85D\uD560\uAC8C\uC694!"}</button>
                        </div>
                    </div>}

                {/* Step 2: 본인 확인 (핸드폰 뒷4자리) */}
                {step === 2 && <div style={{
        animation: 'slideUp 0.4s ease-out'
      }}>
                        <div style={{
          fontSize: '2.5rem',
          marginBottom: '12px'
        }}>📱</div>
                        <h2 style={{
          fontSize: '1.3rem',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
                            {t('facereg_identity_verify') || t("g_89f775") || "\uBCF8\uC778 \uD655\uC778"}
                        </h2>
                        <p style={{
          fontSize: '0.95rem',
          color: 'rgba(255,255,255,0.6)',
          marginBottom: '24px'
        }}>
                            {t('facereg_enter_pin') || t("g_a5cb5f") || "\uD578\uB4DC\uD3F0 \uBC88\uD638 \uB4B7 4\uC790\uB9AC\uB97C \uB20C\uB7EC\uC8FC\uC138\uC694"}
                        </p>

                        {/* PIN Display */}
                        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
                            {[0, 1, 2, 3].map(i => <div key={i} style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: i < pin.length ? 'var(--primary-gold)' : 'rgba(255,255,255,0.08)',
            border: `2px solid ${i < pin.length ? 'var(--primary-gold)' : 'rgba(255,255,255,0.15)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: i < pin.length ? '#000' : 'rgba(255,255,255,0.3)',
            transition: 'all 0.2s'
          }}>
                                    {i < pin.length ? pin[i] : ''}
                                </div>)}
                        </div>

                        {/* Mini Keypad */}
                        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          maxWidth: '260px',
          margin: '0 auto 16px'
        }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} onClick={() => handlePinKeyPress(String(n))} style={{
            padding: '14px',
            borderRadius: '12px',
            fontSize: '1.3rem',
            fontWeight: 'bold',
            background: 'rgba(255,255,255,0.06)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer'
          }}>{n}</button>)}
                            <button onClick={() => setPin('')} style={{
            padding: '14px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            background: 'rgba(255,100,100,0.1)',
            color: '#ff6666',
            border: '1px solid rgba(255,100,100,0.2)',
            cursor: 'pointer'
          }}>{t('facereg_clear') || t("g_70fa69") || "\uC9C0\uC6B0\uAE30"}</button>
                            <button onClick={() => handlePinKeyPress('0')} style={{
            padding: '14px',
            borderRadius: '12px',
            fontSize: '1.3rem',
            fontWeight: 'bold',
            background: 'rgba(255,255,255,0.06)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer'
          }}>0</button>
                            <button onClick={handlePinSubmit} disabled={pin.length !== 4} style={{
            padding: '14px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            background: pin.length === 4 ? 'var(--primary-gold)' : 'rgba(255,255,255,0.04)',
            color: pin.length === 4 ? '#000' : 'rgba(255,255,255,0.3)',
            border: 'none',
            cursor: pin.length === 4 ? 'pointer' : 'default'
          }}>{t('facereg_confirm') || t("g_3ce813") || "\uD655\uC778"}</button>
                        </div>

                        {error && <div style={{
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px',
          padding: '12px',
          color: '#ff8888',
          fontSize: '0.9rem'
        }}>{error}</div>}

                        <button onClick={onClose} style={{
          marginTop: '12px',
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.85rem',
          cursor: 'pointer'
        }}>{t('cancel') || t("g_d9de21") || "\uCDE8\uC18C"}</button>
                    </div>}

                {/* Step 2.5: 멤버 선택 (동명이인/동일번호) */}
                {step === 2.5 && <div style={{
        animation: 'slideUp 0.4s ease-out'
      }}>
                        <div style={{
          fontSize: '2.5rem',
          marginBottom: '12px'
        }}>👥</div>
                        <h2 style={{
          fontSize: '1.3rem',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
                            {t('facereg_who_are_you') || t("g_cbf89b") || "\uC5B4\uB290 \uBD84\uC774\uC2E0\uAC00\uC694?"}
                        </h2>
                        <p style={{
          fontSize: '0.95rem',
          color: 'rgba(255,255,255,0.6)',
          marginBottom: '24px'
        }}>
                            {t('facereg_multiple_members') || t("g_8dfb3f") || "\uC785\uB825\uD558\uC2E0 \uBC88\uD638\uC640 \uC77C\uCE58\uD558\uB294 \uD68C\uC6D0\uC774 \uC5EC\uB7EC \uBA85 \uC788\uC5B4\uC694"}
                        </p>
                        
                        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '300px',
          overflowY: 'auto',
          marginBottom: '20px'
        }}>
                            {matchedMembersList.map(m => <button key={m.id} onClick={() => {
            setMatchedMember(m);
            setStep(3); // → useEffect가 initCamera 호출
          }} style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            fontSize: '1.1rem',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
                                    <span style={{
              fontWeight: 'bold'
            }}>{m.name}</span>
                                    <span style={{
              fontSize: '0.9rem',
              color: 'rgba(255,255,255,0.5)'
            }}>{t('facereg_status')}: {m.status === 'active' ? t('facereg_status_active') : m.status}</span>
                                </button>)}
                        </div>

                        <button onClick={() => {
          setStep(2);
          setPin('');
        }} style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.9rem',
          cursor: 'pointer'
        }}>{t('facereg_go_back') || t("g_42a7ca") || "\uB4A4\uB85C \uAC00\uAE30"}</button>
                    </div>}

                {/* Step 3: 얼굴 촬영 */}
                {step === 3 && <div style={{
        animation: 'slideUp 0.4s ease-out'
      }}>
                        <h2 style={{
          fontSize: '1.3rem',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: 'var(--primary-gold)'
        }}>
                            {t('facereg_look_at_camera', {
            name: matchedMember?.name
          }) || `${matchedMember?.name}님, 카메라를 봐주세요!`}
                        </h2>
                        <p style={{
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.6)',
          marginBottom: '20px'
        }}>
                            {t('facereg_look_front') || t("g_22b2e2") || "\uC815\uBA74\uC744 \uBC14\uB77C\uBCF4\uACE0 \uC7A0\uC2DC\uB9CC \uAE30\uB2E4\uB824\uC8FC\uC138\uC694"}
                        </p>

                        {/* Circular Camera Guide */}
                        <div style={{
          width: '180px',
          height: '180px',
          margin: '0 auto 20px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: saving ? '4px solid var(--primary-gold)' : cameraError ? '4px solid #ef4444' : '4px solid rgba(255,255,255,0.3)',
          position: 'relative',
          boxShadow: saving ? '0 0 30px rgba(var(--primary-rgb), 0.3)' : 'none',
          animation: saving ? 'pulse 1s infinite' : 'none',
          background: 'rgba(0,0,0,0.5)'
        }}>
                            {/* [FIX] 자체 비디오 엘리먼트 — 항상 렌더링 */}
                            <video ref={localVideoRef} autoPlay playsInline muted style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: cameraReady && !externalVideoRef?.current?.srcObject ? 'block' : 'none'
          }} />
                            {/* 외부 비디오 스트림 미러 */}
                            {externalVideoRef?.current?.srcObject && <video ref={el => {
            if (el && externalVideoRef.current?.srcObject) el.srcObject = externalVideoRef.current.srcObject;
          }} autoPlay playsInline muted style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)'
          }} />}
                            {/* 카운트다운 오버레이 */}
                            {countdown > 0 && !saving && cameraReady && <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
            fontSize: '4rem',
            fontWeight: 'bold',
            color: 'var(--primary-gold)'
          }}>{countdown}</div>}
                            {/* 카메라 로딩 중 */}
                            {!cameraReady && !cameraError && <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            background: 'rgba(0,0,0,0.7)'
          }}>
                                    <div style={{
              fontSize: '2rem',
              marginBottom: '8px',
              animation: 'pulse 1.5s infinite'
            }}>📷</div>
                                    <div style={{
              fontSize: '0.8rem',
              color: 'rgba(255,255,255,0.6)'
            }}>{t('facereg_camera_preparing') || t("g_63c91b") || "\uCE74\uBA54\uB77C \uC900\uBE44 \uC911..."}</div>
                                </div>}
                            {/* 카메라 에러 */}
                            {cameraError && <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            background: 'rgba(0,0,0,0.7)'
          }}>
                                    <div style={{
              fontSize: '2rem',
              marginBottom: '8px'
            }}>❌</div>
                                    <div style={{
              fontSize: '0.75rem',
              color: '#ff8888'
            }}>{t('facereg_camera_inaccessible') || t("g_ee1f84") || "\uCE74\uBA54\uB77C \uC811\uADFC \uBD88\uAC00"}</div>
                                </div>}
                            {/* 분석 상태 */}
                            {saving && <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            background: 'rgba(0,0,0,0.5)'
          }}>
                                    <div style={{
              fontSize: '0.9rem',
              color: 'var(--primary-gold)',
              fontWeight: 'bold'
            }}>
                                        {statusMsg || t("g_772a49") || "\uBD84\uC11D \uC911..."}
                                    </div>
                                </div>}
                        </div>

                        {/* 상태 메시지 */}
                        {statusMsg && !saving && <p style={{
          fontSize: '0.85rem',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '12px'
        }}>
                                {statusMsg}
                            </p>}

                        {error && <div style={{
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px',
          padding: '12px',
          color: '#ff8888',
          fontSize: '0.9rem',
          marginBottom: '12px'
        }}>
                                {error}
                                <button onClick={() => {
            setError('');
            if (cameraError) {
              initCamera();
            } else {
              startCountdown();
            }
          }} style={{
            display: 'block',
            margin: '10px auto 0',
            padding: '8px 20px',
            borderRadius: '8px',
            background: 'var(--primary-gold)',
            color: 'var(--text-on-primary)',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}>{t('facereg_retry') || t("g_09c041") || "\uB2E4\uC2DC \uC2DC\uB3C4"}</button>
                            </div>}

                        <button onClick={() => {
          setSaving(false);
          setStatusMsg('');
          setError('');
          setCountdown(3);
          onClose();
        }} style={{
          marginTop: '8px',
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.85rem',
          cursor: 'pointer'
        }}>{t('cancel') || t("g_d9de21") || "\uCDE8\uC18C"}</button>
                    </div>}

                {/* Step 4: 완료 */}
                {step === 4 && <div style={{
        animation: 'slideUp 0.4s ease-out'
      }}>
                        <div style={{
          fontSize: '3.5rem',
          marginBottom: '12px'
        }}>✅</div>
                        <h2 style={{
          fontSize: '1.4rem',
          fontWeight: 'bold',
          marginBottom: '12px',
          color: '#10B981'
        }}>
                            {t('facereg_done_title') || t("g_893258") || "\uB4F1\uB85D \uC644\uB8CC!"}
                        </h2>
                        <p style={{
          fontSize: '1.05rem',
          color: 'rgba(255,255,255,0.8)',
          marginBottom: '8px'
        }} dangerouslySetInnerHTML={{
          __html: t('facereg_done_desc1', {
            name: matchedMember?.name
          }) || `<strong>${matchedMember?.name}</strong>님의 얼굴이 등록되었어요.`
        }}>
                        </p>
                        <p style={{
          fontSize: '0.95rem',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '24px'
        }}>
                            {t('facereg_done_desc2') || t("g_1ba18e") || "\uB2E4\uC74C\uBD80\uD130 \uCE74\uBA54\uB77C \uC55E\uC5D0 \uC11C\uBA74 \uC790\uB3D9\uC73C\uB85C \uCD9C\uC11D\uB429\uB2C8\uB2E4 \uD83C\uDF89"}
                        </p>
                        <button onClick={onClose} style={{
          padding: '14px 40px',
          borderRadius: '12px',
          fontSize: '1.1rem',
          background: 'var(--primary-gold)',
          color: 'var(--text-on-primary)',
          fontWeight: 'bold',
          border: 'none',
          cursor: 'pointer'
        }}>{t('facereg_confirm') || t("g_3ce813") || "\uD655\uC778"}</button>
                    </div>}
            </div>
        </div>;
};
export default FaceRegistrationModal;