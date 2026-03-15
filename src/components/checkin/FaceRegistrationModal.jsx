import React, { useState, useRef, useEffect, useCallback } from 'react';
import { extractFaceDescriptor, loadFacialModels } from '../../services/facialService';
import { memberService } from '../../services/memberService';

/**
 * 안면인식 등록 모달
 * 1. 수치화 안내 → 2. 핸드폰 뒷4자리 본인 확인 → 3. 얼굴 촬영 → 4. 임베딩 저장
 */
const FaceRegistrationModal = ({ isOpen, onClose, videoRef }) => {
    const [step, setStep] = useState(1); // 1: intro, 2: pin, 3: capture, 4: done
    const [pin, setPin] = useState('');
    const [matchedMember, setMatchedMember] = useState(null);
    const [countdown, setCountdown] = useState(3);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const countdownRef = useRef(null);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setPin('');
            setMatchedMember(null);
            setCountdown(3);
            setError('');
            setSaving(false);
        }
        return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    }, [isOpen]);

    const handlePinSubmit = useCallback(async () => {
        if (pin.length !== 4) return;
        setError('');
        
        try {
            const members = await memberService.findMembersByPhone(pin);
            if (members.length === 0) {
                setError('등록된 회원이 없어요. 번호를 확인해주세요.');
                return;
            }
            if (members.length > 1) {
                // Multiple members with same last 4 — pick the first active one
                const active = members.find(m => m.status === 'active') || members[0];
                setMatchedMember(active);
            } else {
                setMatchedMember(members[0]);
            }
            setStep(3);
            startCountdown();
        } catch (e) {
            setError('회원 조회 중 문제가 생겼어요. 다시 시도해주세요.');
        }
    }, [pin]);

    const startCountdown = useCallback(() => {
        setCountdown(3);
        if (countdownRef.current) clearInterval(countdownRef.current);
        
        let count = 3;
        countdownRef.current = setInterval(() => {
            count -= 1;
            setCountdown(count);
            if (count <= 0) {
                clearInterval(countdownRef.current);
                captureAndSave();
            }
        }, 1000);
    }, []);

    const captureAndSave = useCallback(async () => {
        setSaving(true);
        setError('');
        
        try {
            await loadFacialModels();
            
            if (!videoRef?.current) {
                throw new Error('카메라를 찾을 수 없어요.');
            }

            const descriptor = await extractFaceDescriptor(videoRef.current, true);
            
            if (!descriptor) {
                setError('얼굴을 인식하지 못했어요. 카메라를 정면으로 바라봐주세요.');
                setSaving(false);
                setStep(3);
                setCountdown(3);
                return;
            }

            const result = await memberService.updateFaceDescriptor(matchedMember.id, descriptor);
            
            if (result.success) {
                setStep(4);
            } else {
                throw new Error('저장에 실패했어요.');
            }
        } catch (e) {
            console.error('[FaceReg] Save failed:', e);
            setError(e.message || '등록 중 문제가 생겼어요. 다시 시도해주세요.');
            setStep(3);
            setCountdown(3);
        } finally {
            setSaving(false);
        }
    }, [matchedMember, videoRef]);

    const handlePinKeyPress = useCallback((num) => {
        setPin(prev => {
            const next = prev + num;
            return next.length <= 4 ? next : prev;
        });
    }, []);

    if (!isOpen) return null;

    const overlayStyle = {
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.3s ease-out'
    };

    const cardStyle = {
        background: 'linear-gradient(145deg, rgba(30,30,35,0.98), rgba(20,20,25,0.98))',
        borderRadius: '24px', padding: 'clamp(24px, 4vh, 40px)',
        maxWidth: '420px', width: '90%',
        border: '1px solid rgba(212,175,55,0.2)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        textAlign: 'center', color: 'white'
    };

    return (
        <div style={overlayStyle} onClick={step === 4 ? onClose : undefined}>
            <div style={cardStyle} onClick={e => e.stopPropagation()}>
                
                {/* Step 1: 안내 */}
                {step === 1 && (
                    <div style={{ animation: 'slideUp 0.4s ease-out' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔐</div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--primary-gold)' }}>
                            얼굴로 출석하기
                        </h2>
                        <div style={{
                            background: 'rgba(212,175,55,0.08)', borderRadius: '16px',
                            padding: '20px', marginBottom: '24px', textAlign: 'left',
                            border: '1px solid rgba(212,175,55,0.15)', lineHeight: 1.7
                        }}>
                            <p style={{ fontSize: '1.05rem', marginBottom: '12px', fontWeight: 600 }}>
                                🔐 사진은 저장하지 않아요!
                            </p>
                            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)' }}>
                                사진은 저장하지 않고 <strong style={{ color: 'var(--primary-gold)' }}>암호화되어 128개 숫자로만</strong> 기억해요.
                                이 숫자로는 얼굴을 다시 만들 수 없어요. (불가역적)
                            </p>
                            <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
                                등록하면 다음부터 <strong style={{ color: '#10B981' }}>카메라 앞에 서기만 하면</strong> 자동으로 출석이 됩니다!
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={onClose} style={{
                                flex: 1, padding: '14px', borderRadius: '12px', fontSize: '1rem',
                                background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer'
                            }}>다음에 할게요</button>
                            <button onClick={() => setStep(2)} style={{
                                flex: 1, padding: '14px', borderRadius: '12px', fontSize: '1rem',
                                background: 'var(--primary-gold)', color: '#000', fontWeight: 'bold', border: 'none',
                                cursor: 'pointer'
                            }}>등록할게요!</button>
                        </div>
                    </div>
                )}

                {/* Step 2: 본인 확인 (핸드폰 뒷4자리) */}
                {step === 2 && (
                    <div style={{ animation: 'slideUp 0.4s ease-out' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📱</div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '8px' }}>
                            본인 확인
                        </h2>
                        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
                            핸드폰 번호 뒷 4자리를 눌러주세요
                        </p>

                        {/* PIN Display */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                            {[0,1,2,3].map(i => (
                                <div key={i} style={{
                                    width: '52px', height: '52px', borderRadius: '12px',
                                    background: i < pin.length ? 'var(--primary-gold)' : 'rgba(255,255,255,0.08)',
                                    border: `2px solid ${i < pin.length ? 'var(--primary-gold)' : 'rgba(255,255,255,0.15)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.5rem', fontWeight: 'bold',
                                    color: i < pin.length ? '#000' : 'rgba(255,255,255,0.3)',
                                    transition: 'all 0.2s'
                                }}>
                                    {i < pin.length ? '●' : ''}
                                </div>
                            ))}
                        </div>

                        {/* Mini Keypad */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxWidth: '260px', margin: '0 auto 16px' }}>
                            {[1,2,3,4,5,6,7,8,9].map(n => (
                                <button key={n} onClick={() => handlePinKeyPress(String(n))} style={{
                                    padding: '14px', borderRadius: '12px', fontSize: '1.3rem', fontWeight: 'bold',
                                    background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'pointer'
                                }}>{n}</button>
                            ))}
                            <button onClick={() => setPin('')} style={{
                                padding: '14px', borderRadius: '12px', fontSize: '0.9rem',
                                background: 'rgba(255,100,100,0.1)', color: '#ff6666', border: '1px solid rgba(255,100,100,0.2)',
                                cursor: 'pointer'
                            }}>지우기</button>
                            <button onClick={() => handlePinKeyPress('0')} style={{
                                padding: '14px', borderRadius: '12px', fontSize: '1.3rem', fontWeight: 'bold',
                                background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer'
                            }}>0</button>
                            <button onClick={handlePinSubmit} disabled={pin.length !== 4} style={{
                                padding: '14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 'bold',
                                background: pin.length === 4 ? 'var(--primary-gold)' : 'rgba(255,255,255,0.04)',
                                color: pin.length === 4 ? '#000' : 'rgba(255,255,255,0.3)',
                                border: 'none', cursor: pin.length === 4 ? 'pointer' : 'default'
                            }}>확인</button>
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '12px', padding: '12px', color: '#ff8888', fontSize: '0.9rem'
                            }}>{error}</div>
                        )}

                        <button onClick={onClose} style={{
                            marginTop: '12px', background: 'none', border: 'none',
                            color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', cursor: 'pointer'
                        }}>취소</button>
                    </div>
                )}

                {/* Step 3: 얼굴 촬영 */}
                {step === 3 && (
                    <div style={{ animation: 'slideUp 0.4s ease-out' }}>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--primary-gold)' }}>
                            {matchedMember?.name}님, 카메라를 봐주세요!
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>
                            정면을 바라보고 잠시만 기다려주세요
                        </p>

                        {/* Circular Camera Guide */}
                        <div style={{
                            width: '180px', height: '180px', margin: '0 auto 20px',
                            borderRadius: '50%', overflow: 'hidden',
                            border: saving ? '4px solid var(--primary-gold)' : '4px solid rgba(255,255,255,0.3)',
                            position: 'relative',
                            boxShadow: saving ? '0 0 30px rgba(212,175,55,0.3)' : 'none',
                            animation: saving ? 'pulse 1s infinite' : 'none'
                        }}>
                            {videoRef?.current && (
                                <video
                                    ref={el => { if (el && videoRef.current?.srcObject) el.srcObject = videoRef.current.srcObject; }}
                                    autoPlay playsInline muted
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                                />
                            )}
                            {countdown > 0 && !saving && (
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(0,0,0,0.4)',
                                    fontSize: '4rem', fontWeight: 'bold', color: 'var(--primary-gold)'
                                }}>{countdown}</div>
                            )}
                            {saving && (
                                <div style={{
                                    position: 'absolute', inset: 0, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(0,0,0,0.5)'
                                }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--primary-gold)', fontWeight: 'bold' }}>
                                        분석 중...
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '12px', padding: '12px', color: '#ff8888', fontSize: '0.9rem', marginBottom: '12px'
                            }}>
                                {error}
                                <button onClick={startCountdown} style={{
                                    display: 'block', margin: '10px auto 0', padding: '8px 20px',
                                    borderRadius: '8px', background: 'var(--primary-gold)', color: '#000',
                                    fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9rem'
                                }}>다시 시도</button>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: 완료 */}
                {step === 4 && (
                    <div style={{ animation: 'slideUp 0.4s ease-out' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>✅</div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '12px', color: '#10B981' }}>
                            등록 완료!
                        </h2>
                        <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>
                            <strong>{matchedMember?.name}</strong>님의 얼굴이 등록되었어요.
                        </p>
                        <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
                            다음부터 카메라 앞에 서면 자동으로 출석됩니다 🎉
                        </p>
                        <button onClick={onClose} style={{
                            padding: '14px 40px', borderRadius: '12px', fontSize: '1.1rem',
                            background: 'var(--primary-gold)', color: '#000', fontWeight: 'bold', border: 'none',
                            cursor: 'pointer'
                        }}>확인</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaceRegistrationModal;
