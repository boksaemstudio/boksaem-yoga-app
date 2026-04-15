import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore } from '../stores/useLanguageStore';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { CaretLeft, CheckCircle, Handshake, TrendUp, Cpu, MagicWand, Buildings, UsersThree, ChatCircleText } from '@phosphor-icons/react';
import '../styles/landing.css';

export default function FeaturesPage() {
    const t = useLanguageStore(s => s.t);
    const lang = useLanguageStore(s => s.language) || 'ko';
    const navigate = useNavigate();

    const [inquiryOpen, setInquiryOpen] = useState(false);
    const [inquiryForm, setInquiryForm] = useState({ name: '', phone: '', email: '', message: '' });
    const [inquirySent, setInquirySent] = useState(false);

    // [i18n] 언어별 페이지 타이틀
    useEffect(() => {
        const titles = {
            ko: '상세 기능 안내 - PassFlow AI',
            en: 'Features - PassFlow AI',
            ja: '機能詳細 - PassFlow AI',
            zh: '功能详情 - PassFlow AI',
        };
        document.title = titles[lang] || titles.en;
        document.documentElement.lang = lang;
    }, [lang]);

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
            alert(t('mkt_inquiry_fail') || 'Message sending failed.');
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
                                <h3>{t('feat_inquiry_success') || 'Your request has been submitted.'}</h3>
                                <p>{t('feat_inquiry_followup') || 'Our solutions team will be in touch within 1 business day.'}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleInquirySubmit} className="inquiry-form">
                                <h3>{t('feat_inquiry_title') || 'Custom Feature Consultation'}</h3>
                                <p>{t('feat_inquiry_desc') || 'Whatever you envision, we tailor the platform to fit your studio\'s exact workflow. Explore our premium customization plans.'}</p>
                                
                                <div className="i-group">
                                    <label>{t('feat_inquiry_studio') || 'Studio / Business Name'}</label>
                                    <input type="text" required value={inquiryForm.name} onChange={e => setInquiryForm({...inquiryForm, name: e.target.value})} />
                                </div>
                                <div className="i-group">
                                    <label>{t('mkt_inquiry_email') || 'Email'}</label>
                                    <input type="email" required value={inquiryForm.email} onChange={e => setInquiryForm({...inquiryForm, email: e.target.value})} />
                                </div>
                                <div className="i-group">
                                    <label>{t('feat_inquiry_feature_label') || 'Features & Integrations Needed'}</label>
                                    <textarea required rows="4" placeholder={t('feat_inquiry_feature_ph') || 'e.g. We need a private 1-on-1 session calendar alongside group schedules.'} value={inquiryForm.message} onChange={e => setInquiryForm({...inquiryForm, message: e.target.value})}></textarea>
                                </div>
                                <button type="submit" className="i-submit">{t('feat_inquiry_submit') || 'Request a Custom Build'}</button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <nav className="landing-nav glass-nav">
                <div className="nav-logo" style={{cursor:'pointer'}} onClick={() => navigate('/')}>
                    <CaretLeft size={24} weight="bold" />
                    <span>{t('feat_nav_title') || 'PassFlow Features'}</span>
                </div>
                <div className="nav-links">
                    <button onClick={handleContactClick} className="nav-link outline">{t('feat_nav_consult') || 'Custom Development'}</button>
                </div>
            </nav>

            <header className="features-hero">
                <div className="hero-content">
                    <h1 className="hero-title" style={{fontSize: '3rem'}} dangerouslySetInnerHTML={{ __html: t('feat_hero_title') || 'Don\'t adapt your studio to software.<br /><span class="text-gold">Let SaaS adapt to you.</span>' }} />
                    <p className="hero-subtitle" dangerouslySetInnerHTML={{ __html: t('feat_hero_sub') || 'PassFlow never says "we don\'t support that." We fit the most powerful AI-driven platform 100% to your unique operational philosophy and management style.' }} />
                </div>
            </header>

            <section className="features-detail-section">
                <div className="feat-row">
                    <div className="f-text">
                        <Handshake size={48} className="text-gold mb-3" />
                        <h2>{t('feat_squad_title') || 'Dedicated Development Squad'}</h2>
                        <p>{t('feat_squad_desc') || 'This isn\'t a one-size-fits-all subscription. Have unique group class rules or revenue models? Through dedicated consulting, we custom-design and build every feature to fit your exact needs. That\'s what sets us apart from generic apps.'}</p>
                        <ul className="f-list">
                            <li><CheckCircle weight="fill"/> {t('feat_squad_check1') || 'Custom data architecture per studio'}</li>
                            <li><CheckCircle weight="fill"/> {t('feat_squad_check2') || 'Bespoke payment gateway & marketing tool integrations'}</li>
                            <li><CheckCircle weight="fill"/> {t('feat_squad_check3') || 'Private member onboarding flow design'}</li>
                        </ul>
                    </div>
                    <div className="f-img-box outline-card">
                        <h3>{t('feat_dashboard_preview') || 'Custom Dashboard Configuration Preview'}</h3>
                        <div className="skeleton-graph"></div>
                        <div className="skeleton-bar"></div>
                        <div className="skeleton-bar short"></div>
                    </div>
                </div>

                <div className="feat-row reverse">
                    <div className="f-text">
                        <Cpu size={48} className="text-gold mb-3" />
                        <h2>{t('feat_edge_ai_title') || 'World-Class On-Device Edge AI'}</h2>
                        <p>{t('feat_edge_ai_desc') || 'No expensive server-side AI calls. By pushing your iPad or smartphone\'s built-in browser NPU to its limits, our on-device facial recognition identifies members in 0.1 seconds — even offline. Run the most sophisticated tech at the lowest maintenance cost.'}</p>
                    </div>
                    <div className="f-img-box outline-card">
                        <MagicWand size={64} className="text-gold" style={{opacity:0.3}} />
                        <p style={{marginTop: '20px', color: '#888'}}>{t('feat_ai_rendering') || 'Real-time AI model rendering optimization'}</p>
                    </div>
                </div>

                <div className="feat-row">
                    <div className="f-text">
                        <Buildings size={48} className="text-gold mb-3" />
                        <h2>{t('feat_multi_tenant_title') || 'Multi-Tenant, Instant Scalability'}</h2>
                        <p>{t('feat_multi_tenant_desc') || 'Running one location today, dreaming of a franchise tomorrow? A single click spins up your next branded branch with unified server infrastructure. Manage revenue and attendance across every location from one Super Admin account.'}</p>
                        <ul className="f-list">
                            <li><CheckCircle weight="fill"/> {t('feat_tenant_check1') || 'Cross-location membership support'}</li>
                            <li><CheckCircle weight="fill"/> {t('feat_tenant_check2') || 'Automated payroll for rotating instructors'}</li>
                        </ul>
                    </div>
                    <div className="f-img-box outline-card">
                        <UsersThree size={64} className="text-gold" style={{opacity:0.3}} />
                    </div>
                </div>
            </section>

            <div className="cta-bottom text-center">
                <h2 style={{color: '#fff', marginBottom: '20px'}}>{t('feat_cta_title') || 'Talk to Our Solutions Team Today'}</h2>
                <button onClick={handleContactClick} className="cta-primary l-margin">
                    <ChatCircleText weight="fill" /> {t('feat_cta_btn') || 'Schedule Your Custom Consultation'}
                </button>
            </div>
        </div>
    );
}
