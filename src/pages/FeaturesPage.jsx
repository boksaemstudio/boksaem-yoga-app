import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore } from '../stores/useLanguageStore';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { CaretLeft, CheckCircle, Handshake, TrendUp, Cpu, MagicWand, Buildings, UsersThree } from '@phosphor-icons/react';
import '../styles/landing.css';

export default function FeaturesPage() {
    const t = useLanguageStore(s => s.t);
    const lang = useLanguageStore(s => s.lang) || 'ko';
    const navigate = useNavigate();

    const [inquiryOpen, setInquiryOpen] = useState(false);
    const [inquiryForm, setInquiryForm] = useState({ name: '', phone: '', email: '', message: '' });
    const [inquirySent, setInquirySent] = useState(false);

    useEffect(() => {
        document.title = 'Features - PassFlow AI';
    }, []);

    const handleContactClick = (e) => {
        e.preventDefault();
        if (lang === 'ko') {
            window.open('http://pf.kakao.com/_txnxnyG/chat', '_blank');
        } else {
            setInquiryOpen(true);
        }
    };

    const handleInquirySubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'platform_inquiries'), {
                ...inquiryForm,
                lang,
                type: 'feature_customization',
                createdAt: new Date().toISOString()
            });
            setInquirySent(true);
            setTimeout(() => {
                setInquiryOpen(false);
                setInquirySent(false);
                setInquiryForm({ name: '', phone: '', email: '', message: '' });
            }, 3000);
        } catch (error) {
            console.error('Inquiry submission failed:', error);
            alert('메시지 전송에 실패했습니다.');
        }
    };

    return (
        <div className="landing-page-root features-view">
            {/* INQUIRY MODAL */}
            {inquiryOpen && (
                <div className="inquiry-modal-overlay" onClick={() => setInquiryOpen(false)}>
                    <div className="inquiry-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="inquiry-close" onClick={() => setInquiryOpen(false)}>×</button>
                        {inquirySent ? (
                            <div className="inquiry-success">
                                <h3>성공적으로 접수되었습니다.</h3>
                                <p>비즈니스 파트너 전담팀에서 1영업일 이내 연락드리겠습니다.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleInquirySubmit} className="inquiry-form">
                                <h3>1:1 맞춤형 커스텀 문의</h3>
                                <p>원하시는 어떤 기능이든, 스튜디오 프로세스에 맞추어 플랫폼을 1:1로 조정해 드리는 프리미엄 플랜을 상담받아 보세요.</p>
                                
                                <div className="i-group">
                                    <label>스튜디오 / 기업명</label>
                                    <input type="text" required value={inquiryForm.name} onChange={e => setInquiryForm({...inquiryForm, name: e.target.value})} />
                                </div>
                                <div className="i-group">
                                    <label>이메일</label>
                                    <input type="email" required value={inquiryForm.email} onChange={e => setInquiryForm({...inquiryForm, email: e.target.value})} />
                                </div>
                                <div className="i-group">
                                    <label>원하시는 맞춤 기능 / 연동 내용</label>
                                    <textarea required rows="4" placeholder="예: 저희는 그룹 스케줄 외에 개인 PT 특화된 달력이 필요합니다." value={inquiryForm.message} onChange={e => setInquiryForm({...inquiryForm, message: e.target.value})}></textarea>
                                </div>
                                <button type="submit" className="i-submit">개발 컨설팅 요청하기</button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <nav className="landing-nav glass-nav">
                <div className="nav-logo" style={{cursor:'pointer'}} onClick={() => navigate('/')}>
                    <CaretLeft size={24} weight="bold" />
                    <span>PassFlow 기능 안내</span>
                </div>
                <div className="nav-links">
                    <button onClick={handleContactClick} className="nav-link outline">1:1 커스텀 개발 상담</button>
                </div>
            </nav>

            <header className="features-hero">
                <div className="hero-content">
                    <h1 className="hero-title" style={{fontSize: '3rem'}} dangerouslySetInnerHTML={{ __html: t('mkt_feat_page_title') || '소프트웨어에 스튜디오를 맞추지 마세요.<br /><span className=\"text-gold\">SaaS가 원장님께 맞춥니다.</span>' }} />
                    <p className="hero-subtitle" dangerouslySetInnerHTML={{ __html: t('mkt_feat_page_sub') || 'PassFlow는 \"저희는 이런 기능 안 됩니다\" 라고 말하지 않습니다. 현존하는 가장 강력한 AI 기반 기능을 100% 원장님의 고유 운영 철학과 관리 방식에 1:1로 피팅(Fitting)해 드립니다.' }} />
                </div>
            </header>

            <section className="features-detail-section">
                <div className="feat-row">
                    <div className="f-text">
                        <Handshake size={48} className="text-gold mb-3" />
                        <h2>1:1 맞춤형 개발 스쿼드 지원</h2>
                        <p>단순히 월 구독료를 내고 쓰는 시스템이 아닙니다. 스튜디오의 독특한 그룹 수업 룰이나 매출 정산 방식이 있으신가요? 전담 컨설팅을 통해 <strong>모든 니즈에 1대1로 대응하여 기능을 커스텀 디자인 및 추가</strong>해 드립니다. 이것이 다른 찍어내는 앱들과의 가장 큰 차이입니다.</p>
                        <ul className="f-list">
                            <li><CheckCircle weight="fill"/> 스튜디오별 고유 맞춤 데이터 테이블 신설</li>
                            <li><CheckCircle weight="fill"/> 특수 목적 결제 PG 및 마케팅 툴 단독 連動(연동) 연계</li>
                            <li><CheckCircle weight="fill"/> 프라이빗 회원 가입 플로우 디자인</li>
                        </ul>
                    </div>
                    <div className="f-img-box outline-card">
                        <h3>원장님 전용 대시보드 맞춤 구성 예시</h3>
                        <div className="skeleton-graph"></div>
                        <div className="skeleton-bar"></div>
                        <div className="skeleton-bar short"></div>
                    </div>
                </div>

                <div className="feat-row reverse">
                    <div className="f-text">
                        <Cpu size={48} className="text-gold mb-3" />
                        <h2>세계 최고 수준의 On-Device Edge AI</h2>
                        <p>비용이 비싼 서버 AI 통신이 아닙니다. 아이패드나 스마트폰의 <strong>자체 브라우저 NPU</strong>를 극한까지 활용하는 On-Device 안면인식을 통해, 인터넷이 끊기는 상황에서도 0.1초만에 회원을 판별하고 출석을 승인합니다. 가장 정교한 기술을 가장 저렴한 유지비용으로 운영하세요.</p>
                    </div>
                    <div className="f-img-box outline-card">
                        <MagicWand size={64} className="text-gold" style={{opacity:0.3}} />
                        <p style={{marginTop: '20px', color: '#888'}}>AI 모델 실시간 렌더링 최적화 탑재</p>
                    </div>
                </div>

                <div className="feat-row">
                    <div className="f-text">
                        <Buildings size={48} className="text-gold mb-3" />
                        <h2>멀티-테넌트(Multi-Tenant) 다이렉트 확장성</h2>
                        <p>지금은 지점이 1개지만, 프랜차이즈화를 꿈꾸시나요? 단 한 번의 버튼 클릭으로 동일한 브랜딩이 적용된 <strong>제 2, 제 3의 지점 통합 서버 공간</strong>이 생성됩니다. 전 지점의 매출과 출석을 하나의 슈퍼 어드민 계정으로 완벽히 통제할 수 있습니다.</p>
                        <ul className="f-list">
                            <li><CheckCircle weight="fill"/> 전 지점 크로스 회원권(Cross-Membership) 지원</li>
                            <li><CheckCircle weight="fill"/> 강사별 로테이션 출강 자동 급여 계산</li>
                        </ul>
                    </div>
                    <div className="f-img-box outline-card">
                        <UsersThree size={64} className="text-gold" style={{opacity:0.3}} />
                    </div>
                </div>
            </section>

            <div className="cta-bottom text-center">
                <h2 style={{color: '#fff', marginBottom: '20px'}}>지금 바로 전문가 조직과 상담하세요</h2>
                <button onClick={handleContactClick} className="cta-primary l-margin">
                    <ChatCircleText weight="fill" /> {t('mkt_consult_btn') || '1:1 맞춤 스튜디오 컨설팅 즉시 신청'}
                </button>
            </div>
        </div>
    );
}
