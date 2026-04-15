import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useLanguageStore } from '../../stores/useLanguageStore';
import '../../styles/landing.css';

export default function ContactModal({ isOpen, onClose }) {
    const t = useLanguageStore(s => s.t);
    const lang = useLanguageStore(s => s.language) || 'ko';
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
            alert(t('mkt_inquiry_fail') || 'Message sending failed.');
        }
    };

    return (
        <div className="inquiry-modal-overlay" onClick={onClose}>
            <div className="inquiry-modal-content" onClick={e => e.stopPropagation()}>
                <button className="inquiry-close" onClick={onClose}>×</button>
                {inquirySent ? (
                    <div className="inquiry-success">
                        <h3>{t('contact_success') || 'Request submitted successfully.'}</h3>
                        <p>{t('contact_followup') || 'Our team will be in touch within 1 business day.'}</p>
                    </div>
                ) : (
                    <form onSubmit={handleInquirySubmit} className="inquiry-form">
                        <h3>{t('contact_title') || 'Platform Setup & Customization'}</h3>
                        <p>{t('contact_desc') || 'We provide tailored SaaS feature design, fully adapted to your studio\'s workflow. Let us show you what\'s possible.'}</p>
                        
                        <div className="i-group">
                            <label>{t('contact_name_label') || 'Name / Studio Name'}</label>
                            <input type="text" required value={inquiryForm.name} onChange={e => setInquiryForm({...inquiryForm, name: e.target.value})} />
                        </div>
                        <div className="i-group">
                            <label>{t('contact_phone_label') || 'Phone (Optional)'}</label>
                            <input type="text" value={inquiryForm.phone} onChange={e => setInquiryForm({...inquiryForm, phone: e.target.value})} />
                        </div>
                        <div className="i-group">
                            <label>{t('contact_email_label') || 'Email Address'}</label>
                            <input type="email" required value={inquiryForm.email} onChange={e => setInquiryForm({...inquiryForm, email: e.target.value})} />
                        </div>
                        <div className="i-group">
                            <label>{t('contact_message_label') || 'Message / Requirements'}</label>
                            <textarea required rows="4" placeholder={t('contact_placeholder') || 'Describe your scheduling needs, integrations, or any special requirements.'} value={inquiryForm.message} onChange={e => setInquiryForm({...inquiryForm, message: e.target.value})}></textarea>
                        </div>
                        <button type="submit" className="i-submit">{t('contact_submit') || 'Request Consultation'}</button>
                    </form>
                )}
            </div>
        </div>
    );
}
