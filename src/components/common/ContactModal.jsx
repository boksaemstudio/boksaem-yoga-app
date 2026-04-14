import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import '../../styles/landing.css';

export default function ContactModal({ isOpen, onClose }) {
    const lang = useLanguageStore(s => s.lang) || 'ko';
    const [inquiryForm, setInquiryForm] = useState({ name: '', phone: '', email: '', message: '' });
    const [inquirySent, setInquirySent] = useState(false);

    if (!isOpen) return null;

    const handleInquirySubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'platform_inquiries'), {
                ...inquiryForm,
                lang,
                source: 'contact_modal',
                createdAt: new Date().toISOString()
            });
            setInquirySent(true);
            setTimeout(() => {
                onClose();
                setInquirySent(false);
                setInquiryForm({ name: '', phone: '', email: '', message: '' });
            }, 3000);
        } catch (error) {
            console.error('Inquiry submission failed:', error);
            alert('Failed to send message.');
        }
    };

    return (
        <div className="inquiry-modal-overlay" onClick={onClose}>
            <div className="inquiry-modal-content" onClick={e => e.stopPropagation()}>
                <button className="inquiry-close" onClick={onClose}>×</button>
                {inquirySent ? (
                    <div className="inquiry-success">
                        <h3>{lang === 'ko' ? '성공적으로 접수되었습니다.' : 'Request Submitted Successfully.'}</h3>
                        <p>{lang === 'ko' ? '전담팀에서 영업일 기준 1일 내에 연락드리겠습니다.' : 'Our team will contact you within 1 business day.'}</p>
                    </div>
                ) : (
                    <form onSubmit={handleInquirySubmit} className="inquiry-form">
                        <h3>{lang === 'ko' ? '플랫폼 도입 및 커스텀 상담' : 'Platform Setup & Customization'}</h3>
                        <p>{lang === 'ko' ? '원장님의 스튜디오에 완벽히 맞춘 1:1 맞춤형 SaaS 기능 가이드를 지원합니다.' : 'We provide 1:1 tailored feature setup designed perfectly for your workflow.'}</p>
                        
                        <div className="i-group">
                            <label>{lang === 'ko' ? '초기 세팅 이름 (스튜디오명)' : 'Name / Studio Name'}</label>
                            <input type="text" required value={inquiryForm.name} onChange={e => setInquiryForm({...inquiryForm, name: e.target.value})} />
                        </div>
                        <div className="i-group">
                            <label>{lang === 'ko' ? '연락처 (선택)' : 'Phone (Optional)'}</label>
                            <input type="text" value={inquiryForm.phone} onChange={e => setInquiryForm({...inquiryForm, phone: e.target.value})} />
                        </div>
                        <div className="i-group">
                            <label>{lang === 'ko' ? '답변받을 이메일' : 'Email Address'}</label>
                            <input type="email" required value={inquiryForm.email} onChange={e => setInquiryForm({...inquiryForm, email: e.target.value})} />
                        </div>
                        <div className="i-group">
                            <label>{lang === 'ko' ? '도입 목적 및 문의사항' : 'Message / Requirements'}</label>
                            <textarea required rows="4" placeholder={lang==='ko' ? '필요하신 스케줄이나 특별한 요구사항을 적어주세요.' : 'Please describe any specific scheduling or operations needs.'} value={inquiryForm.message} onChange={e => setInquiryForm({...inquiryForm, message: e.target.value})}></textarea>
                        </div>
                        <button type="submit" className="i-submit">{lang === 'ko' ? '상담 요청하기' : 'Request Consultation'}</button>
                    </form>
                )}
            </div>
        </div>
    );
}
