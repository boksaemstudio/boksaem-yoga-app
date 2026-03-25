import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Buildings, EnvelopeSimple, Crown, CheckCircle, ShieldCheck, ArrowRight, ArrowLeft, Spinner } from '@phosphor-icons/react';
import { studioRegistryService } from '../services/studioRegistryService';

const OnboardingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0); // 0: Landing, 1: Name, 2: Email, 3: Plan, 4: Success
    const [formData, setFormData] = useState({
        name: '',
        nameEnglish: '',
        ownerEmail: '',
        plan: 'basic'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNext = () => setStep(s => Math.min(s + 1, 4));
    const handlePrev = () => setStep(s => Math.max(s - 1, 0));

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const result = await studioRegistryService.requestOnboarding(formData);
        setIsSubmitting(false);
        if (result.success) {
            setStep(4);
        } else {
            alert('신청 중 오류가 발생했습니다: ' + result.message);
        }
    };

    // 공통 스타일 블록
    const containerStyle = {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Pretendard', sans-serif"
    };

    const cardStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '40px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        overflow: 'hidden'
    };

    const inputStyle = {
        width: '100%',
        padding: '16px',
        background: 'rgba(0,0,0,0.2)',
        border: '2px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: 'white',
        fontSize: '1.1rem',
        outline: 'none',
        transition: 'border-color 0.2s',
        marginBottom: '20px',
        boxSizing: 'border-box'
    };

    const buttonStyle = {
        width: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '1.2rem',
        fontWeight: '700',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'transform 0.1s, opacity 0.2s',
        marginTop: '20px'
    };

    const navButtonStyle = {
        background: 'transparent',
        border: 'none',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        padding: '0',
        marginBottom: '24px'
    };

    // 랜딩 뷰
    if (step === 0) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <Crown size={40} color="white" weight="fill" />
                        </div>
                        <h1 style={{ fontSize: '2rem', margin: '0 0 12px 0', fontWeight: '800' }}>복샘요가 플랫폼</h1>
                        <p style={{ color: '#94a3b8', fontSize: '1.1rem', margin: 0, lineHeight: '1.5' }}>
                            원장님을 위한 완벽한 학원 관리 플랫폼,<br/>지금 바로 무료로 시작해보세요.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                            <Buildings size={32} color="#60a5fa" weight="duotone" />
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>안전한 전용 관제탑</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>타 학원과 완벽히 분리된 원장님만의 관리자 화면을 제공합니다.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                            <ShieldCheck size={32} color="#34d399" weight="duotone" />
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>데이터 안심 보안</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>구글(Google) 최고 수준의 서버에 데이터가 분산 암호화되어 보관됩니다.</p>
                            </div>
                        </div>
                    </div>

                    <button style={buttonStyle} onClick={handleNext}>
                        시작하기 <ArrowRight size={20} weight="bold" />
                    </button>
                    <button onClick={() => navigate('/')} style={{ ...navButtonStyle, justifyContent: 'center', width: '100%', marginTop: '20px', marginBottom: 0 }}>
                        메인으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    // 이름 입력
    if (step === 1) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <button style={navButtonStyle} onClick={handlePrev}><ArrowLeft size={16} /> 이전</button>
                    <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>우리 학원의 이름은 무엇인가요?</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '32px' }}>회원들에게 보여질 요가원/필라테스 학원의 이름입니다.</p>

                    <input 
                        style={inputStyle}
                        placeholder="예: 쌍문요가" 
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        autoFocus
                    />
                    
                    <button 
                        style={{ ...buttonStyle, opacity: formData.name.trim() ? 1 : 0.5 }} 
                        onClick={() => formData.name.trim() && handleNext()}
                    >
                        다음 <ArrowRight size={20} weight="bold" />
                    </button>
                </div>
            </div>
        );
    }

    // 이메일 입력
    if (step === 2) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <button style={navButtonStyle} onClick={handlePrev}><ArrowLeft size={16} /> 이전</button>
                    <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>원장님의 이메일을 알려주세요</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '32px' }}>관리자 계정을 만들어 드리기 위해 필요해요.</p>

                    <input 
                        type="email"
                        style={inputStyle}
                        placeholder="예: admin@yoga.com" 
                        value={formData.ownerEmail}
                        onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                        autoFocus
                    />

                    <button 
                        style={{ ...buttonStyle, opacity: formData.ownerEmail.includes('@') ? 1 : 0.5 }} 
                        onClick={() => formData.ownerEmail.includes('@') && handleNext()}
                    >
                        다음 <ArrowRight size={20} weight="bold" />
                    </button>
                </div>
            </div>
        );
    }

    // 요금제(형태) 선택 및 완료
    if (step === 3) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <button style={navButtonStyle} onClick={handlePrev}><ArrowLeft size={16} /> 이전</button>
                    <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>어떤 형태로 운영하실 계획인가요?</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '32px' }}>앱 설정의 뼈대를 만들기 위한 질문입니다.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                        {[
                            { id: 'free', title: '무료 체험', desc: '도입 전 시스템만 둘러보고 싶어요.' },
                            { id: 'basic', title: '베이직', desc: '동네 요가/필라테스 운영에 딱 맞아요.' },
                            { id: 'pro', title: '프로페셔널', desc: '강사 여러 명과 지점을 운영할 거예요.' }
                        ].map(p => (
                            <div 
                                key={p.id}
                                onClick={() => setFormData({ ...formData, plan: p.id })}
                                style={{ 
                                    padding: '20px', 
                                    border: formData.plan === p.id ? '2px solid #60a5fa' : '2px solid rgba(255,255,255,0.1)', 
                                    borderRadius: '16px', 
                                    cursor: 'pointer',
                                    background: formData.plan === p.id ? 'rgba(96, 165, 250, 0.1)' : 'rgba(0,0,0,0.2)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '4px', color: formData.plan === p.id ? '#60a5fa' : 'white' }}>{p.title}</div>
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{p.desc}</div>
                            </div>
                        ))}
                    </div>

                    <button 
                        style={buttonStyle} 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Spinner size={24} className="spin" /> : <><CheckCircle size={20} weight="bold" /> 신청서 제출하기</>}
                    </button>
                </div>
            </div>
        );
    }

    // 완료 뷰
    if (step === 4) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '80px', height: '80px', background: 'rgba(52, 211, 153, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <CheckCircle size={48} color="#34d399" weight="fill" />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', margin: '0 0 16px 0' }}>신청이 완료되었습니다! 🎉</h2>
                        <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '32px' }}>
                            슈퍼어드민이 승인하는 즉시,<br/>
                            <strong style={{ color: 'white' }}>{formData.ownerEmail}</strong> 주소로<br/>
                            초기 비밀번호와 접속 링크를 보내드립니다.
                        </p>
                        <button style={{ ...buttonStyle, background: 'rgba(255,255,255,0.1)' }} onClick={() => navigate('/')}>
                            홈으로 돌아가기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default OnboardingPage;
