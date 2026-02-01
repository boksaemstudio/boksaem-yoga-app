import React, { useState } from 'react';
import { storageService } from '../../../services/storage';
import { STUDIO_CONFIG } from '../../../studioConfig';

const BulkMessageModal = ({ isOpen, onClose, selectedMemberIds, initialMessage = '' }) => {
    const [bulkMessageText, setBulkMessageText] = useState('');
    const [sendPush] = useState(true);

    // [New] Populate message when modal opens or initialMessage changes
    React.useEffect(() => {
        if (isOpen) {
            setBulkMessageText(initialMessage);
        }
    }, [isOpen, initialMessage]);

    if (!isOpen) return null;

    const handleSendBulkMessage = async () => {
        if (!bulkMessageText.trim()) return alert('내용을 입력하세요.');
        if (!selectedMemberIds || selectedMemberIds.length === 0) return alert('대상자를 선택하세요.');

        if (confirm(`${selectedMemberIds.length}명의 회원에게 메시지를 전송할까요?`)) {
            let count = 0;
            for (const id of selectedMemberIds) {
                await storageService.addMessage(id, bulkMessageText);
                count++;
            }

            if (sendPush) {
                await storageService.sendBulkPushCampaign(selectedMemberIds, STUDIO_CONFIG.NAME + " 알림", bulkMessageText);
            }

            alert(`${count}건의 메시지가 전송되었습니다.`);
            setBulkMessageText('');
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="modal-title">단체 메시지 전송</h2>
                <textarea className="form-input" style={{ height: '120px', resize: 'none', marginBottom: '20px' }}
                    value={bulkMessageText} onChange={e => setBulkMessageText(e.target.value)} />
                <div className="modal-actions">
                    <button onClick={onClose} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                    <button onClick={handleSendBulkMessage} className="action-btn primary">전송하기</button>
                </div>
            </div>
        </div>
    );
};

export default BulkMessageModal;
