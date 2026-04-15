import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore } from '../stores/useLanguageStore';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { GlobeHemisphereWest, CheckCircle, ChatCircleText, CaretRight, ShieldCheck, Browser, ChalkboardTeacher } from '@phosphor-icons/react';
import '../styles/landing.css';

export default function LandingPage() {
    const t = useLanguageStore(s => s.t);
    const lang = useLanguageStore(s => s.language) || 'ko';
    const setLanguage = useLanguageStore(s => s.setLanguage);
    const navigate = useNavigate();

    const [inquiryOpen, setInquiryOpen] = useState(false);
    const [inquiryForm, setInquiryForm] = useState({ name: '', phone: '', email: '', message: '' });
    const [inquirySent, setInquirySent] = useState(false);

    // [i18n] document.title을 언어에 맞춰 동적으로 설정
    useEffect(() => {
        const titles = {
            ko: 'PassFlow AI - 글로벌 스튜디오 관리운영 시스템',
            en: 'PassFlow AI - Global Studio Management Platform',
            ja: 'PassFlow AI - グローバルスタジオ管理プラットフォーム',
            zh: 'PassFlow AI - 全球工作室管理平台',
        };
        document.title = titles[lang] || titles.en;
        // [i18n] html lang 속성도 동적 업데이트
        document.documentElement.lang = lang;
    }, [lang]);

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
            alert(t('mkt_inquiry_fail') || 'Message sending failed.');
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
                                <h3>{t('mkt_inquiry_success') || 'Successfully sent!'}</h3>
                                <p>{t('mkt_inquiry_followup') || 'We will contact you shortly.'}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleInquirySubmit} className="inquiry-form">
                                <h3>{t('mkt_inquiry_title') || 'Platform Consultation'}</h3>
                                <p>{t('mkt_inquiry_desc') || 'We provide custom SaaS feature design tailored to your studio. Feel free to reach out anytime.'}</p>
                                
                                <div className="i-group">
                                    <label>{t('mkt_inquiry_name') || 'Name (or Studio Name)'}</label>
                                    <input type="text" required value={inquiryForm.name} onChange={e => setInquiryForm({...inquiryForm, name: e.target.value})} />
                                </div>
                                <div className="i-group">
                                    <label>{t('mkt_inquiry_phone') || 'Phone'}</label>
                                    <input type="text" value={inquiryForm.phone} onChange={e => setInquiryForm({...inquiryForm, phone: e.target.value})} />
                                </div>
                                <div className="i-group">
                                    <label>{t('mkt_inquiry_email') || 'Email'}</label>
                                    <input type="email" required value={inquiryForm.email} onChange={e => setInquiryForm({...inquiryForm, email: e.target.value})} />
                                </div>
                                <div className="i-group">
                                    <label>{t('mkt_inquiry_message') || 'Inquiry & Requests'}</label>
                                    <textarea required rows="4" placeholder={t('mkt_inquiry_placeholder') || 'Number of branches, custom features needed, etc.'} value={inquiryForm.message} onChange={e => setInquiryForm({...inquiryForm, message: e.target.value})}></textarea>
                                </div>
                                <button type="submit" className="i-submit">{t('mkt_inquiry_submit') || 'Send Inquiry'}</button>
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
                    <button onClick={() => navigate('/features')} className="nav-link">{t('mkt_nav_features') || 'Features'}</button>
                    <button onClick={handleContactClick} className="nav-link">{t('mkt_nav_contact') || 'Contact'}</button>
                    <button onClick={() => window.open('https://admin.passflow.kr', '_blank')} className="nav-link outline">{t('mkt_nav_admin_login') || 'Admin Login'}</button>
                    
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
                    <div className="badge">{t('mkt_badge') || 'World\'s #1 Vision AI Facial Recognition'}</div>
                    <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: t('mkt_title_main') || 'The Ultimate Unmanned Studio Solution,<br /><span class="text-gold">Powered by PassFlow AI.</span>' }} />
                    <p className="hero-subtitle" dangerouslySetInnerHTML={{ __html: t('mkt_title_sub') || 'From facial recognition check-in to multi-location member management, class scheduling, and automated payroll. The only platform built exclusively for fitness, yoga, and pilates studios.' }} />
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
                        <h3>{t('mkt_feat2_title') || '클라우드 다국어 데이터 동기화'}</h3>
                        <p>{t('mkt_feat2_desc') || '해외 어느 로케이션에 지점을 내셔도 완벽합니다. 전 세계 어디서든 언어 장벽 없이 스튜디오를 100% 원격 관리하십시오.'}</p>
                    </div>
                    <div className="feature-card">
                        <ChalkboardTeacher size={40} className="f-icon" />
                        <h3>{t('mkt_feat3_title') || '강사 앱 & 급여 자동화'}</h3>
                        <p>{t('mkt_feat3_desc') || '강사는 본인 휴대폰에서 스케줄과 출석부를 확인하고, 원장님은 강사를 위한 맞춤 권한과 급여 명세서를 평생 자동으로 산출합니다.'}</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
