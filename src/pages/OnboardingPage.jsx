import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Buildings, Crown, CheckCircle, ShieldCheck, ArrowRight, ArrowLeft, Spinner, Upload, MagicWand, Image as ImageIcon, CalendarBlank, ArrowsClockwise } from '@phosphor-icons/react';
import { studioRegistryService } from '../services/studioRegistryService';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const OnboardingPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    // 0: Landing, 1: Name, 2: Logo Option, 3: Email, 4: Plan, 5: Success
    const [formData, setFormData] = useState({
        name: '',
        nameEnglish: '',
        ownerEmail: '',
        plan: 'basic',
        logoOption: 'ai', // 'ai' | 'upload' | 'later'
        logoFile: null,
        logoPreviewUrl: null,
        scheduleFiles: []
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [aiColor, setAiColor] = useState('60a5fa');
    
    // AI 로고 새로고침 (랜덤 배경색)
    const handleRegenerateAiLogo = (e) => {
        if (e) e.stopPropagation();
        setAiColor(Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'));
    };

    const handleNext = () => setStep(s => Math.min(s + 1, 5));
    const handlePrev = () => setStep(s => Math.max(s - 1, 0));

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setFormData({ ...formData, logoFile: file, logoPreviewUrl: url, logoOption: 'upload' });
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        let finalLogoUrl = null;

        if (formData.logoOption === 'upload' && formData.logoFile) {
            try {
                const fileName = `onboarding_${Date.now()}_${formData.logoFile.name}`;
                const logoRef = ref(storage, `platform/onboarding_logos/${fileName}`);
                await uploadBytes(logoRef, formData.logoFile);
                finalLogoUrl = await getDownloadURL(logoRef);
            } catch (e) {
                console.error("Logo upload failed", e);
            }
        } else if (formData.logoOption === 'ai') {
            finalLogoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || '요가')}&background=${aiColor}&color=fff&size=512&rounded=true&font-size=0.4&bold=true`;
        }

        let finalScheduleUrls = [];
        if (formData.scheduleFiles && formData.scheduleFiles.length > 0) {
            for (let i = 0; i < formData.scheduleFiles.length; i++) {
                const f = formData.scheduleFiles[i];
                try {
                    const fileName = `onboarding_${Date.now()}_schedule_${i}_${f.name}`;
                    const scheduleRef = ref(storage, `platform/onboarding_schedules/${fileName}`);
                    await uploadBytes(scheduleRef, f);
                    const url = await getDownloadURL(scheduleRef);
                    finalScheduleUrls.push(url);
                } catch (e) {
                    console.error("Schedule upload failed", e);
                }
            }
        }

        const submitData = { ...formData };
        delete submitData.logoFile;
        delete submitData.logoPreviewUrl;
        delete submitData.scheduleFiles;
        if (finalLogoUrl) {
            submitData.logoUrl = finalLogoUrl;
        }
        if (finalScheduleUrls.length > 0) {
            submitData.scheduleUrls = finalScheduleUrls;
        }

        const result = await studioRegistryService.requestOnboarding(submitData);
        setIsSubmitting(false);
        if (result.success) {
            setStep(5);
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

    const optionCardStyle = (isSelected) => ({
        padding: '20px',
        border: isSelected ? '2px solid #60a5fa' : '2px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        cursor: 'pointer',
        background: isSelected ? 'rgba(96, 165, 250, 0.1)' : 'rgba(0,0,0,0.2)',
        transition: 'all 0.2s'
    });

    // Step indicator
    const StepIndicator = () => {
        const totalSteps = 4; // Name, Logo, Email, Plan
        const currentIdx = step - 1; // step 0 is landing
        if (step === 0 || step === 5) return null;
        return (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} style={{
                        width: i === currentIdx ? '32px' : '8px', height: '8px',
                        borderRadius: '4px',
                        background: i <= currentIdx ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.15)',
                        transition: 'all 0.3s'
                    }} />
                ))}
            </div>
        );
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
                        <h1 style={{ fontSize: '2rem', margin: '0 0 12px 0', fontWeight: '800' }}>패스플로우 Ai (PassFlow Ai)</h1>
                        <p style={{ color: '#94a3b8', fontSize: '1.1rem', margin: 0, lineHeight: '1.5' }}>
                            원장님을 위한 완벽한 스튜디오 관리 플랫폼,<br/>지금 바로 무료로 시작해보세요.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                            <Buildings size={32} color="#60a5fa" weight="duotone" />
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>쉽고 편한 통합 관리</h3>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>복잡한 회원 관리부터 출석, 수강권, 매출까지 하나의 화면에서 해결하세요.</p>
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

                    <a 
                        href="http://pf.kakao.com/_zDxiMX/chat" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                            ...buttonStyle,
                            background: '#FEE500',
                            color: '#191919',
                            marginTop: '12px',
                            boxShadow: '0 4px 15px rgba(254, 229, 0, 0.2)'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3c-5.52 0-10 3.58-10 8 0 2.85 1.83 5.34 4.54 6.8-.3 1.14-1.14 4.28-1.17 4.41-.03.11.04.22.14.22.06 0 .13-.02.18-.06 1.48-1.07 5.17-3.71 5.4-3.87.3.04.6.06.91.06 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                        </svg>
                        카카오톡으로 1:1 도입 문의
                    </a>

                    <button onClick={() => navigate('/')} style={{ ...navButtonStyle, justifyContent: 'center', width: '100%', marginTop: '20px', marginBottom: 0 }}>
                        메인으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    // Step 1: 이름 입력
    if (step === 1) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <button style={navButtonStyle} onClick={handlePrev}><ArrowLeft size={16} /> 이전</button>
                    <StepIndicator />
                    <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>우리 스튜디오의 이름은 무엇인가요?</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '32px' }}>회원들에게 보여질 요가원/필라테스 스튜디오의 이름입니다.</p>

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

    // Step 2: 로고 옵션 (AI 생성 / 업로드 / 나중에)
    if (step === 2) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <button style={navButtonStyle} onClick={handlePrev}><ArrowLeft size={16} /> 이전</button>
                    <StepIndicator />
                    <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>
                        <span style={{ color: '#60a5fa' }}>{formData.name}</span>의 로고
                    </h2>
                    <p style={{ color: '#94a3b8', marginBottom: '32px' }}>로고가 없으시면 AI가 스튜디오 이름에 맞는 로고를 만들어 드립니다.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                        {/* AI 생성 옵션 */}
                        <div 
                            onClick={() => setFormData({ ...formData, logoOption: 'ai' })}
                            style={optionCardStyle(formData.logoOption === 'ai')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <MagicWand size={28} color={formData.logoOption === 'ai' ? '#60a5fa' : '#94a3b8'} weight="duotone" />
                                <div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: formData.logoOption === 'ai' ? '#60a5fa' : 'white' }}>AI 로고 자동 생성</div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>"{formData.name}" 이름에 맞는 로고를 AI가 만들어 드립니다</div>
                                </div>
                            </div>
                            
                            {/* AI 로고 미리보기 (선택된 경우만) */}
                            {formData.logoOption === 'ai' && formData.name && (
                                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }} onClick={e => e.stopPropagation()}>
                                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=${aiColor}&color=fff&size=256&rounded=true&font-size=0.4&bold=true`} alt="AI Logo Preview" style={{ width: '80px', height: '80px', borderRadius: '50%', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }} />
                                    <button onClick={handleRegenerateAiLogo} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }}>
                                        <ArrowsClockwise size={16} /> 다른 색상 뽑기
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 직접 업로드 옵션 */}
                        <div 
                            onClick={() => document.getElementById('logo-upload-input')?.click()}
                            style={optionCardStyle(formData.logoOption === 'upload')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <Upload size={28} color={formData.logoOption === 'upload' ? '#60a5fa' : '#94a3b8'} weight="duotone" />
                                <div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: formData.logoOption === 'upload' ? '#60a5fa' : 'white' }}>내 로고 업로드</div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>이미 로고가 있다면 이미지 파일을 올려주세요</div>
                                </div>
                            </div>
                            {formData.logoPreviewUrl && (
                                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                                    <img src={formData.logoPreviewUrl} alt="로고 미리보기" style={{ maxHeight: '60px', borderRadius: '8px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }} />
                                </div>
                            )}
                            <input
                                id="logo-upload-input"
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleLogoUpload}
                            />
                        </div>

                        {/* 나중에 옵션 */}
                        <div 
                            onClick={() => setFormData({ ...formData, logoOption: 'later' })}
                            style={optionCardStyle(formData.logoOption === 'later')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <ImageIcon size={28} color={formData.logoOption === 'later' ? '#60a5fa' : '#94a3b8'} weight="duotone" />
                                <div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: formData.logoOption === 'later' ? '#60a5fa' : 'white' }}>나중에 설정하기</div>
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>설정 후 관리자 화면에서 변경 가능합니다</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 시간표·가격표 안내 및 첨부 */}
                    <div style={{ 
                        padding: '16px 20px', borderRadius: '14px',
                        background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.15)',
                        marginBottom: '8px'
                    }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <CalendarBlank size={22} color="#fbbf24" weight="duotone" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ width: '100%' }}>
                                <div style={{ fontSize: '0.95rem', color: '#fbbf24', fontWeight: '600', marginBottom: '4px' }}>시간표 · 가격표 파일 첨부 (선택 사항)</div>
                                <div style={{ fontSize: '0.83rem', color: '#94a3b8', lineHeight: '1.5', marginBottom: '12px' }}>
                                    운용 중이신 시간표나 가격표(워드, 엑셀, PDF, 이미지 등)를 업로드해주시면 담당자가 확인하여 초기 세팅을 도와드립니다.
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <button 
                                        onClick={() => document.getElementById('schedule-upload-input')?.click()}
                                        style={{ padding: '8px 16px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px dashed rgba(251, 191, 36, 0.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                                    >
                                        + 파일 첨부하기 (최대 4개)
                                    </button>
                                    
                                    {formData.scheduleFiles && formData.scheduleFiles.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                            {formData.scheduleFiles.map((f, idx) => (
                                                <div key={idx} style={{ fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📁 {f.name}</span>
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newFiles = [...formData.scheduleFiles];
                                                        newFiles.splice(idx, 1);
                                                        setFormData({ ...formData, scheduleFiles: newFiles });
                                                    }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', fontWeight: 'bold' }}>✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <input 
                                        id="schedule-upload-input" 
                                        type="file" 
                                        multiple
                                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const newFiles = Array.from(e.target.files);
                                            const currentFiles = formData.scheduleFiles || [];
                                            const combined = [...currentFiles, ...newFiles];
                                            if (combined.length > 4) {
                                                alert('첨부파일은 최대 4개까지만 가능합니다.');
                                            }
                                            setFormData({ ...formData, scheduleFiles: combined.slice(0, 4) });
                                            // Reset input so the same file can be selected again if needed
                                            e.target.value = '';
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button style={buttonStyle} onClick={handleNext}>
                        다음 <ArrowRight size={20} weight="bold" />
                    </button>
                </div>
            </div>
        );
    }

    // Step 3: 이메일 입력
    if (step === 3) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <button style={navButtonStyle} onClick={handlePrev}><ArrowLeft size={16} /> 이전</button>
                    <StepIndicator />
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

    // Step 4: 요금제 선택 및 완료
    if (step === 4) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <button style={navButtonStyle} onClick={handlePrev}><ArrowLeft size={16} /> 이전</button>
                    <StepIndicator />
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
                                style={optionCardStyle(formData.plan === p.id)}
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

    // Step 5: 완료 뷰
    if (step === 5) {
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

                        {formData.logoOption === 'ai' && (
                            <div style={{ 
                                padding: '16px', borderRadius: '14px', 
                                background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)',
                                marginBottom: '24px', fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.5',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
                            }}>
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=${aiColor}&color=fff&size=128&rounded=true&font-size=0.4&bold=true`} alt="AI Logo Result" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                <div style={{ textAlign: 'left' }}>
                                    <strong style={{ color: '#60a5fa' }}>AI 로고 생성 완료!</strong><br/>
                                    스튜디오 승인 시 이 로고가 자동 적용됩니다.
                                </div>
                            </div>
                        )}

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
