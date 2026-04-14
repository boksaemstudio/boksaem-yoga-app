import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore } from '../stores/useLanguageStore';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { GlobeHemisphereWest, CheckCircle, ChatCircleText, CaretRight, ShieldCheck, Browser, ChalkboardTeacher } from '@phosphor-icons/react';
import '../styles/landing.css';

export default function LandingPage() {
    const t = useLanguageStore(s => s.t);
    const lang = useLanguageStore(s => s.lang) || 'ko';
    const setLanguage = useLanguageStore(s => s.setLanguage);
    const navigate = useNavigate();

    const [inquiryOpen, setInquiryOpen] = useState(false);
    const [inquiryForm, setInquiryForm] = useState({ name: '', phone: '', email: '', message: '' });
    const [inquirySent, setInquirySent] = useState(false);

    useEffect(() => {
        document.title = 'PassFlow AI - 글로벌 스튜디오 관리운영 시스템';
    }, []);

    const handleDemoClick = (e) => {
        e.preventDefault();
        const tenantMap = { ko: 'demo-yoga', en: 'demo-yoga-en', ja: 'demo-yoga-ja', zh: 'demo-yoga-zh' };
        const tenantId = tenantMap[lang] || 'demo-yoga-en';
        localStorage.setItem('lastStudioId', tenantId);
        window.location.href = '/?tenant=' + tenantId;
    };

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
        <div className="landing-page-root">
            {/* INQUIRY MODAL */}
            {inquiryOpen && (
                <div className="inquiry-modal-overlay" onClick={() => setInquiryOpen(false)}>
                    <div className="inquiry-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="inquiry-close" onClick={() => setInquiryOpen(false)}>×</button>
                        {inquirySent ? (
                            <div className="inquiry-success">
                                <h3>성공적으로 전송되었습니다!</h3>
                                <p>담당자가 곧 연락드리겠습니다.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleInquirySubmit} className="inquiry-form">
                                <h3>플랫폼 도입 및 1:1 커스텀 상담</h3>
                                <p>원장님의 스튜디오에 완벽히 맞춘 1:1 맞춤형 SaaS 기능 디자인을 지원합니다. 언제든 편히 문의해 주세요.</p>
                                
                                <div className="i-group">
                                    <label>성함 (또는 스튜디오명)</label>
                                    <input type="text" required value={inquiryForm.name} onChange={e => setInquiryForm({...inquiryForm, name: e.target.value})} />
                                </div>
                                <div className="i-group">
                                    <label>연락처</label>
                                    <input type="text" value={inquiryForm.phone} onChange={e => setInquiryForm({...inquiryForm, phone: e.target.value})} />
                                </div>
                                <div className="i-group">
                                    <label>이메일</label>
                                    <input type="email" required value={inquiryForm.email} onChange={e => setInquiryForm({...inquiryForm, email: e.target.value})} />
                                </div>
                                <div className="i-group">
                                    <label>문의 및 요청사항</label>
                                    <textarea required rows="4" placeholder="운영 중인 지점 수, 필요한 커스텀 기능 등을 편하게 적어주세요." value={inquiryForm.message} onChange={e => setInquiryForm({...inquiryForm, message: e.target.value})}></textarea>
                                </div>
                                <button type="submit" className="i-submit">상담 메시지 보내기</button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* NAV */}
            <nav className="landing-nav glass-nav">
                <div className="nav-logo">
                    <img src="/assets/passflow_square_logo.png" alt="PassFlow Logo" />
                    <span>PassFlow AI</span>
                </div>
                <div className="nav-links">
                    <button onClick={() => navigate('/features')} className="nav-link">상세기능 보기</button>
                    <button onClick={handleContactClick} className="nav-link">도입 문의</button>
                    <button onClick={() => window.open('https://admin.passflow.kr', '_blank')} className="nav-link outline">관리자 로그인</button>
                    
                    <div className="lang-selector">
                        <GlobeHemisphereWest size={18} />
                        <select value={lang} onChange={(e) => setLanguage(e.target.value)}>
                            <option value="ko">한국어</option>
                            <option value="en">English</option>
                            <option value="ja">日本語</option>
                            <option value="zh">中文</option>
                        </select>
                    </div>
                </div>
            </nav>

            {/* HERO */}
            <header className="landing-hero">
                <div className="hero-content">
                    <div className="badge">{t('mkt_badge') || '세계 1등 비전 AI 안면인식 시스템'}</div>
                    <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: t('mkt_title_main') || '체육시설 무인화의 궁극적 완성,<br /><span className=\"text-gold\">단 하나의 플랫폼</span>으로 끝냅니다.' }} />
                    <p className="hero-subtitle" dangerouslySetInnerHTML={{ __html: t('mkt_title_sub') || '안면인식 출석부터 다지점 회원 통합 관리, 수업 클래스 스케줄링, 자동 급여 정산까지. 오직 피트니스와 요가 스튜디오만을 위해 설계된 글로벌 SaaS.' }} />
                    <div className="hero-cta-group">
                        <button onClick={handleDemoClick} className="cta-primary">
                            {t('mkt_btn_demo') || '관리자/회원 데모 체험하기'} <CaretRight weight="bold" />
                        </button>
                        <button onClick={handleContactClick} className="cta-secondary">
                            <ChatCircleText weight="fill" /> {t('mkt_btn_consult') || '맞춤 도입 상담'}
                        </button>
                    </div>
                </div>
                <div className="hero-image-wrapper">
                    <img src="/assets/hero_features_ai_meeting_bg.webp" alt="PassFlow Dashboard" className="hero-dashboard-img" />
                </div>
            </header>

            {/* FEATURES SUMMARY */}
            <section className="landing-features">
                <h2 className="section-title" dangerouslySetInnerHTML={{ __html: t('mkt_feat_title') || '스튜디오 운영을 압도적으로 바꿉니다' }} />
                <div className="features-grid">
                    <div className="feature-card">
                        <Browser size={40} className="f-icon" />
                        <h3>{t('mkt_feat1_title') || 'AI 안면 출석 자동화'}</h3>
                        <p>{t('mkt_feat1_desc') || '오직 얼굴 카메라 하나로 신규 회원과 기존 회원을 0.2초만에 구분합니다. 대리 출석 방지는 물론 인사말까지 건네줍니다.'}</p>
                    </div>
                    <div className="feature-card">
                        <ShieldCheck size={40} className="f-icon" />
                        <h3>클라우드 다국어 데이터 동기화</h3>
                        <p>해외 어느 로케이션에 지점을 내셔도 완벽합니다. 전 세계 어디서든 언어 장벽 없이 스튜디오를 100% 원격 관리하십시오.</p>
                    </div>
                    <div className="feature-card">
                        <ChalkboardTeacher size={40} className="f-icon" />
                        <h3>강사 앱 & 급여 자동화</h3>
                        <p>강사는 본인 휴대폰에서 스케줄과 출석부를 확인하고, 원장님은 강사를 위한 맞춤 권한과 급여 명세서를 평생 자동으로 산출합니다.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
