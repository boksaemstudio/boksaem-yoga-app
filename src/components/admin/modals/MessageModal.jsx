import React, { useState } from 'react';
import { ChatCircleText } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

const MessageModal = ({ isOpen, onClose, member }) => {
    const [messageText, setMessageText] = useState('');

    if (!isOpen || !member) return null;

    const handleSendMessage = async () => {
        if (!messageText) return;
        await storageService.addMessage(member.id, messageText);
        alert(`${member.name}님에게 메시지를 전송했습니다.`);
        setMessageText('');
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="modal-title">{member.name}님에게 메시지 전송</h2>
                <p style={{ marginBottom: '15px', fontSize: '0.9rem', opacity: 0.7 }}>
                    메시지를 전송하면 해당 회원의 앱으로 푸시 알림이 발송됩니다.
                </p>
                <textarea
                    className="form-input"
                    style={{ height: '150px', resize: 'none', marginBottom: '20px' }}
                    placeholder="전송할 내용을 입력하세요..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                />
                <div className="modal-actions">
                    <button onClick={onClose} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                    <button onClick={handleSendMessage} className="action-btn primary">
                        <ChatCircleText size={18} style={{ marginRight: '6px' }} /> 메시지 보내기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageModal;
