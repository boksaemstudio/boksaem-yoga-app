import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChatCircleDots, EnvelopeSimple, PaperPlaneTilt, X, CheckCircle } from '@phosphor-icons/react';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Smart floating contact button:
 * - Korean: KakaoTalk chat link
 * - All others: Simple message form (email + message → Firestore)
 *   Admin replies via email. No real-time chat.
 */
const KakaoFloatingButton = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    // Hide on admin dashboards
    if (location.pathname.startsWith('/super-admin') || location.pathname.startsWith('/admin')) {
        return null;
    }

    // Detect language
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    const pathLang = window.location.pathname.split('/')[1];
    const lang = urlLang || (['en','ja','in','ru','zh','es','pt','fr','de','au','ca'].includes(pathLang) ? pathLang : 'ko');
    const isKorean = lang === 'ko';

    // i18n texts
    const texts = {
        ko: { tooltip: '궁금한 점이 있으신가요?', title: '문의하기', emailPh: '답변 받으실 이메일', msgPh: '궁금한 점을 적어주세요', send: '보내기', sent: '접수되었습니다!', sentDesc: '빠른 시일 내에 이메일로 답변 드리겠습니다.' },
        ja: { tooltip: '\u304a\u554f\u3044\u5408\u308f\u305b', title: '\u304a\u554f\u3044\u5408\u308f\u305b', emailPh: '\u3054\u8fd4\u4fe1\u5148\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9', msgPh: '\u3054\u8cea\u554f\u30fb\u3054\u8981\u671b\u3092\u304a\u66f8\u304d\u304f\u3060\u3055\u3044', send: '\u9001\u4fe1', sent: '\u9001\u4fe1\u3044\u305f\u3057\u307e\u3057\u305f\uff01', sentDesc: '\u30e1\u30fc\u30eb\u306b\u3066\u3054\u8fd4\u4fe1\u3055\u305b\u3066\u3044\u305f\u3060\u304d\u307e\u3059\u3002' },
        ru: { tooltip: '\u041d\u0443\u0436\u043d\u0430 \u043f\u043e\u043c\u043e\u0449\u044c?', title: '\u041d\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u043d\u0430\u043c', emailPh: '\u0412\u0430\u0448 email \u0434\u043b\u044f \u043e\u0442\u0432\u0435\u0442\u0430', msgPh: '\u041e\u043f\u0438\u0448\u0438\u0442\u0435 \u0432\u0430\u0448 \u0432\u043e\u043f\u0440\u043e\u0441', send: '\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c', sent: '\u041e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e!', sentDesc: '\u041c\u044b \u043e\u0442\u0432\u0435\u0442\u0438\u043c \u043d\u0430 \u0432\u0430\u0448 email.' },
        es: { tooltip: '\u00bfNecesitas ayuda?', title: 'Cont\u00e1ctanos', emailPh: 'Tu email para respuesta', msgPh: '\u00bfEn qu\u00e9 podemos ayudarte?', send: 'Enviar', sent: '\u00a1Enviado!', sentDesc: 'Te responderemos por email.' },
        pt: { tooltip: 'Precisa de ajuda?', title: 'Fale Conosco', emailPh: 'Seu email para resposta', msgPh: 'Como podemos ajudar?', send: 'Enviar', sent: 'Enviado!', sentDesc: 'Responderemos por email em breve.' },
        fr: { tooltip: 'Besoin d\u2019aide\u00a0?', title: 'Nous contacter', emailPh: 'Votre email', msgPh: 'Comment pouvons-nous vous aider\u00a0?', send: 'Envoyer', sent: 'Envoy\u00e9\u00a0!', sentDesc: 'Nous vous r\u00e9pondrons par email.' },
        de: { tooltip: 'Hilfe ben\u00f6tigt?', title: 'Kontakt', emailPh: 'Ihre E-Mail f\u00fcr Antwort', msgPh: 'Wie k\u00f6nnen wir Ihnen helfen?', send: 'Senden', sent: 'Gesendet!', sentDesc: 'Wir antworten per E-Mail.' },
        zh: { tooltip: '\u9700\u8981\u5e2e\u52a9\uff1f', title: '\u8054\u7cfb\u6211\u4eec', emailPh: '\u60a8\u7684\u90ae\u7bb1', msgPh: '\u8bf7\u63cf\u8ff0\u60a8\u7684\u95ee\u9898', send: '\u53d1\u9001', sent: '\u5df2\u53d1\u9001\uff01', sentDesc: '\u6211\u4eec\u5c06\u901a\u8fc7\u90ae\u4ef6\u56de\u590d\u60a8\u3002' },
        default: { tooltip: 'Need help?', title: 'Contact Us', emailPh: 'Your email for reply', msgPh: 'How can we help you?', send: 'Send', sent: 'Message sent!', sentDesc: "We'll reply to your email shortly." }
    };
    const t = texts[lang] || texts.default;

    const handleSend = async () => {
        if (!email.trim() || !message.trim()) return;
        setSending(true);
        try {
            const db = getFirestore();
            await addDoc(collection(db, 'inquiries'), {
                email: email.trim(),
                message: message.trim(),
                lang,
                page: window.location.href,
                status: 'new',
                createdAt: serverTimestamp()
            });
            setSent(true);
            setTimeout(() => { setSent(false); setIsOpen(false); setEmail(''); setMessage(''); }, 3000);
        } catch (e) {
            console.error('Inquiry send error:', e);
            // Fallback: open mailto
            window.open(`mailto:motionpt@gmail.com?subject=PassFlow%20AI%20Inquiry&body=${encodeURIComponent(message)}`, '_blank');
        }
        setSending(false);
    };

    // Korean: KakaoTalk link
    if (isKorean) {
        return (
            <a href="http://pf.kakao.com/_zDxiMX/chat" target="_blank" rel="noopener noreferrer"
                style={{
                    position: 'fixed', bottom: '30px', right: '30px', width: '60px', height: '60px',
                    borderRadius: '30px', backgroundColor: '#FEE500', color: '#191919',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 10px 25px rgba(254, 229, 0, 0.4)', zIndex: 9999, cursor: 'pointer',
                    transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1) translateY(-5px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
                title="카카오톡으로 문의하기"
            >
                <ChatCircleDots size={34} weight="fill" />
                <div style={{
                    position: 'absolute', right: '75px', background: 'rgba(0,0,0,0.8)', color: 'white',
                    padding: '8px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600',
                    whiteSpace: 'nowrap', pointerEvents: 'none', opacity: 0.9
                }}>궁금한 점이 있으신가요?</div>
            </a>
        );
    }

    // International: Message form
    return (
        <>
            {/* Floating button */}
            <button onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed', bottom: '30px', right: '30px', width: '60px', height: '60px',
                    borderRadius: '30px', backgroundColor: isOpen ? '#ef4444' : '#6366f1', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none',
                    boxShadow: `0 10px 25px ${isOpen ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`,
                    zIndex: 10000, cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
            >
                {isOpen ? <X size={28} weight="bold" /> : <EnvelopeSimple size={30} weight="fill" />}
            </button>

            {/* Tooltip (only when closed) */}
            {!isOpen && (
                <div style={{
                    position: 'fixed', bottom: '42px', right: '100px',
                    background: 'rgba(0,0,0,0.8)', color: 'white',
                    padding: '8px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600',
                    whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10000, opacity: 0.9
                }}>{t.tooltip}</div>
            )}

            {/* Message form popup */}
            {isOpen && (
                <div style={{
                    position: 'fixed', bottom: '100px', right: '20px', width: '340px', maxWidth: 'calc(100vw - 40px)',
                    background: 'rgba(15,15,25,0.97)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(99,102,241,0.3)', borderRadius: '20px',
                    padding: '24px', zIndex: 10000,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    animation: 'fadeInUp 0.3s ease'
                }}>
                    {sent ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <CheckCircle size={48} color="#4ade80" weight="fill" />
                            <h3 style={{ color: '#fff', margin: '12px 0 8px', fontSize: '1.1rem' }}>{t.sent}</h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>{t.sentDesc}</p>
                        </div>
                    ) : (
                        <>
                            <h3 style={{ color: '#fff', margin: '0 0 16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <EnvelopeSimple size={22} color="#6366f1" weight="duotone" /> {t.title}
                            </h3>
                            <input
                                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                placeholder={t.emailPh}
                                style={{
                                    width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.9rem',
                                    marginBottom: '12px', boxSizing: 'border-box', outline: 'none'
                                }}
                            />
                            <textarea
                                value={message} onChange={(e) => setMessage(e.target.value)}
                                placeholder={t.msgPh} rows={3}
                                style={{
                                    width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.9rem',
                                    marginBottom: '16px', boxSizing: 'border-box', outline: 'none', resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                            />
                            <button onClick={handleSend} disabled={sending || !email.trim() || !message.trim()}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                                    background: (!email.trim() || !message.trim()) ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff', fontSize: '1rem', fontWeight: '700', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'all 0.2s', opacity: sending ? 0.6 : 1
                                }}
                            >
                                <PaperPlaneTilt size={20} weight="fill" />
                                {sending ? '...' : t.send}
                            </button>
                        </>
                    )}
                </div>
            )}

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
};

export default KakaoFloatingButton;
