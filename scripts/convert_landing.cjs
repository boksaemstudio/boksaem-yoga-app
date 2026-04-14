const fs = require('fs');
const path = require('path');

// 1. Read home.html
const htmlPath = path.join(__dirname, '../public/home.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// 2. Extract embedded <style>
const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
let embeddedStyle = styleMatch ? styleMatch[1] : '';

// 3. Extract body
let bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
let body = bodyMatch ? bodyMatch[1] : html;

// 4. Remove scripts
body = body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

// Remove comment tags that React hates
body = body.replace(/<!--[\s\S]*?-->/g, '');

// Convert common HTML attributes to React JSX attributes
body = body.replace(/class=/g, 'className=')
           .replace(/for=/g, 'htmlFor=')
           .replace(/tabindex=/g, 'tabIndex=')
           .replace(/onclick=/g, 'onClick=')
           .replace(/onchange=/g, 'onChange=')
           .replace(/onsubmit=/g, 'onSubmit=')
           .replace(/placeholder=/g, 'placeholder=');

// Self close void elements (img, input, hr, br, source)
body = body.replace(/<(img|input|hr|br|source)([^>]*?)(?!\/)> /g, '<$1$2 />');
body = body.replace(/<(img|input|hr|br|source)([^>]*?)(?!\/)>([^<]*)/gi, function(match, tag, attr, trailing) {
    if (attr.trim().endsWith('/')) return match; 
    return `<${tag}${attr} />${trailing}`;
});
// A more robust void element closer:
body = body.replace(/<(img|input|br|hr|source)([^>]*?)(?<!\/)>/g, '<$1$2 />');

// Clean inline styles (very basic, usually better to remove or convert to object)
// Since there's margin-bottom:10px etc.
body = body.replace(/style="([^"]+)"/g, (match, styleString) => {
    const rules = styleString.split(';').filter(r => r.trim());
    let obj = '{';
    rules.forEach(r => {
        let [k, v] = r.split(':');
        if(!k || !v) return;
        k = k.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        obj += `${k}: '${v.trim()}', `;
    });
    obj += '}';
    return `style={{${obj.replace(', }', '}')}}}`;
});

// React component template
const jsxTemplate = `import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore } from '../stores/useLanguageStore';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import '../styles/landing.css';

export default function LandingPage() {
    const t = useLanguageStore(s => s.t);
    const lang = useLanguageStore(s => s.language);
    const setLanguage = useLanguageStore(s => s.setLanguage);
    const navigate = useNavigate();

    const [inquiryOpen, setInquiryOpen] = useState(false);
    const [inquiryForm, setInquiryForm] = useState({ name: '', phone: '', email: '', message: '' });
    const [inquirySent, setInquirySent] = useState(false);

    // [SEO] 동적 타이틀 및 메타태그 변경 (SaaS 고급화)
    useEffect(() => {
        document.title = t('landing_seo_title') || 'PassFlow AI - Premium Studio Management';
    }, [lang, t]);

    const handleDemoClick = (e) => {
        e.preventDefault();
        // 언어별 데모 라우팅 (Option B Architecture)
        const tenantMap = {
            ko: 'demo-yoga',
            en: 'demo-yoga-en',
            ja: 'demo-yoga-ja',
            zh: 'demo-yoga-zh'
        };
        const tenantId = tenantMap[lang] || 'demo-yoga-en';
        localStorage.setItem('lastStudioId', tenantId);
        window.location.href = '/?tenant=' + tenantId;
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
            alert(t('error_sending_msg') || 'Failed to send message.');
        }
    };

    // 연락하기 버튼 클릭 분기처리
    const handleContactClick = (e) => {
        e.preventDefault();
        if (lang === 'ko') {
            window.open('http://pf.kakao.com/_txnxnyG/chat', '_blank');
        } else {
            setInquiryOpen(true);
        }
    };

    return (
        <div className="landing-page-root">
            {inquiryOpen && (
                <div className="inquiry-modal-overlay" onClick={() => setInquiryOpen(false)}>
                    <div className="inquiry-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="inquiry-close" onClick={() => setInquiryOpen(false)}>×</button>
                        {inquirySent ? (
                            <div className="inquiry-success">
                                <h3>{t('inquiry_success_title') || 'Message Sent!'}</h3>
                                <p>{t('inquiry_success_desc') || 'We will get back to you shortly.'}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleInquirySubmit} className="inquiry-form">
                                <h3>{t('inquiry_form_title') || 'Contact Super Admin'}</h3>
                                <p>{t('inquiry_form_subtitle') || 'Request a 1:1 custom feature setup or consulting.'}</p>
                                
                                <div className="i-group">
                                    <label>{t('inquiry_name') || 'Name'}</label>
                                    <input type="text" required value={inquiryForm.name} onChange={e => setInquiryForm({...inquiryForm, name: e.target.value})} />
                                </div>
                                <div className="i-group">
                                    <label>{t('inquiry_email') || 'Email'}</label>
                                    <input type="email" required value={inquiryForm.email} onChange={e => setInquiryForm({...inquiryForm, email: e.target.value})} />
                                </div>
                                <div className="i-group">
                                    <label>{t('inquiry_msg') || 'Message'}</label>
                                    <textarea required rows="4" value={inquiryForm.message} onChange={e => setInquiryForm({...inquiryForm, message: e.target.value})}></textarea>
                                </div>
                                <button type="submit" className="i-submit">{t('inquiry_submit') || 'Send Message'}</button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Language Selector Injection */}
            <div className="floating-lang-selector" style={{position:'fixed', top:'20px', right:'20px', zIndex: 9999}}>
                <select value={lang} onChange={(e) => setLanguage(e.target.value)} style={{background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #777', padding: '5px 10px', borderRadius: '5px'}}>
                    <option value="ko">🇰🇷 한국어</option>
                    <option value="en">🇺🇸 English</option>
                    <option value="ja">🇯🇵 日本語</option>
                    <option value="zh">🇨🇳 中文</option>
                </select>
            </div>

            ${body.replace(/href="mailto:[^"]+"/g, 'href="#" onClick={handleContactClick}').replace(/href="http:\/\/pf\.kakao\.com[^"]+"/g, 'href="#" onClick={handleContactClick}').replace(/href="\/(\?tenant=demo-yoga|checkin)"/g, 'href="#" onClick={handleDemoClick}')}
        </div>
    );
}
`;

fs.mkdirSync(path.join(__dirname, '../src/styles'), { recursive: true });
let cssContent = '';
if (fs.existsSync(path.join(__dirname, '../public/style.css'))) {
    cssContent += fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8') + '\n\n';
}
cssContent += embeddedStyle;

// Additional global CSS for inquiry modal
cssContent += `
/* Inquiry Modal */
.inquiry-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
.inquiry-modal-content { background: #111; border: 1px solid #333; padding: 40px; border-radius: 16px; width: 90%; max-width: 500px; position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
.inquiry-close { position: absolute; top: 20px; right: 20px; background: none; border: none; color: #888; font-size: 24px; cursor: pointer; }
.inquiry-form h3 { color: #fff; font-size: 1.5rem; margin-bottom: 10px; }
.inquiry-form p { color: #888; font-size: 0.9rem; margin-bottom: 25px; line-height: 1.5; }
.i-group { margin-bottom: 15px; }
.i-group label { display: block; color: #ccc; margin-bottom: 8px; font-size: 0.9rem; }
.i-group input, .i-group textarea { width: 100%; padding: 12px; background: #000; border: 1px solid #333; border-radius: 8px; color: #fff; font-size: 1rem; }
.i-group input:focus, .i-group textarea:focus { outline: none; border-color: var(--primary-gold, #FBB117); }
.i-submit { width: 100%; padding: 15px; background: var(--primary-gold, #FBB117); color: #000; border: none; border-radius: 8px; font-weight: 700; font-size: 1rem; cursor: pointer; margin-top: 10px; }
`;

fs.writeFileSync(path.join(__dirname, '../src/styles/landing.css'), cssContent);
fs.writeFileSync(path.join(__dirname, '../src/pages/LandingPage.jsx'), jsxTemplate);
console.log('✅ Converted home.html to src/pages/LandingPage.jsx and Extracted CSS');
