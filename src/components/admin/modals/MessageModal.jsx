import { useState } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { ChatCircleText } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
const MessageModal = ({
  isOpen,
  onClose,
  member
}) => {
  const t = useLanguageStore(s => s.t);
  const [messageText, setMessageText] = useState('');
  if (!isOpen || !member) return null;
  const handleSendMessage = async () => {
    if (!messageText) return;
    const isDemoSite = window.location.hostname.includes('passflow-demo') || localStorage.getItem('lastStudioId') === 'demo-yoga';
    if (isDemoSite) {
      alert(t("g_233984") || "\uB370\uBAA8 \uD658\uACBD\uC5D0\uC11C\uB294 \uBA54\uC2DC\uC9C0 \uBC1C\uC1A1 \uAE30\uB2A5\uC774 \uC81C\uD55C\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.");
      return;
    }
    try {
      await storageService.addMessage(member.id, messageText);
      alert(`${member.name}님에게 메시지를 전송했습니다.`);
      setMessageText('');
      onClose();
    } catch (error) {
      console.error('[MessageModal] Failed to send message:', error);
      alert(t("g_83d946") || "\uBA54\uC2DC\uC9C0 \uC804\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    }
  };
  return <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="modal-title">{member.name}{t("g_7c65db") || "\uB2D8\uC5D0\uAC8C \uBA54\uC2DC\uC9C0 \uC804\uC1A1"}</h2>
                <p style={{
        marginBottom: '15px',
        fontSize: '0.9rem',
        opacity: 0.7
      }}>
                    {t('메시지를 전송하면 해당 회원의 앱으로 푸시 알림이 발송됩니다.')}
                </p>
                <textarea className="form-input" style={{
        height: '150px',
        resize: 'none',
        marginBottom: '20px'
      }} placeholder={t('전송할 내용을 입력하세요...')} value={messageText} onChange={e => setMessageText(e.target.value)} />
                <div className="modal-actions">
                    <button onClick={onClose} style={{
          padding: '10px 20px',
          color: 'var(--text-secondary)'
        }}>{t('취소')}</button>
                    <button onClick={handleSendMessage} className="action-btn primary">
                        <ChatCircleText size={18} style={{
            marginRight: '6px'
          }} /> {t('메시지 보내기')}
                    </button>
                </div>
            </div>
        </div>;
};
export default MessageModal;