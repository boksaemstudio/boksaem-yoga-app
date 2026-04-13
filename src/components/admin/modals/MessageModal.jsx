import { useState } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { ChatCircleText } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

const MessageModal = ({ isOpen, onClose, member }) => {
    const t = useLanguageStore(s => s.t);
    const [messageText, setMessageText] = useState('');

    if (!isOpen || !member) return null;

    const handleSendMessage = async () => {
        if (!messageText) return;
        
        const isDemoSite = window.location.hostname.includes('passflow-demo') || localStorage.getItem('lastStudioId') === 'demo-yoga';
        if (isDemoSite) {
            alert('데모 환경에서는 메시지 발송 기능이 제한되어 있습니다.');
            return;
        }

        try {
            await storageService.addMessage(member.id, messageText);
            alert(`${member.name}님에게 메시지를 전송했습니다.`);
            setMessageText('');
            onClose();
        } catch (error) {
            console.error('[MessageModal] Failed to send message:', error);
            alert('메시지 전송에 실패했습니다.');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="modal-title">{member.name}님에게 메시지 전송</h2>
                <p style={{ marginBottom: '15px', fontSize: '0.9rem', opacity: 0.7 }}>
                    {t('메시지를 전송하면 해당 회원의 앱으로 푸시 알림이 발송됩니다.')}
                </p>
                <textarea
                    className="form-input"
                    style={{ height: '150px', resize: 'none', marginBottom: '20px' }}
                    placeholder={t('전송할 내용을 입력하세요...')}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                />
                <div className="modal-actions">
                    <button onClick={onClose} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>{t('취소')}</button>
                    <button onClick={handleSendMessage} className="action-btn primary">
                        <ChatCircleText size={18} style={{ marginRight: '6px' }} /> {t('메시지 보내기')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageModal;
