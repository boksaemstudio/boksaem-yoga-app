import React, { useState } from 'react';
import { FloppyDisk } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

const MemberNoteModal = ({ isOpen, onClose, member, onSuccess }) => {
    // Initialize state from props. Parent should use key={member.id} to reset state on change.
    const [noteText, setNoteText] = useState(member?.notes || '');

    if (!isOpen || !member) return null;

    const handleSaveNote = async () => {
        await storageService.updateMember(member.id, { notes: noteText });
        if (onSuccess) onSuccess();
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="modal-title">{member.name}님 메모</h2>
                <textarea
                    className="form-input"
                    style={{ height: '200px', resize: 'none', marginBottom: '20px' }}
                    placeholder="회원에 대한 메모를 입력하세요 (예: 허리 디스크, 오전반 선호 등)"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                />
                <div className="modal-actions">
                    <button onClick={onClose} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                    <button onClick={handleSaveNote} className="action-btn primary">
                        <FloppyDisk size={18} style={{ marginRight: '6px' }} /> 저장하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MemberNoteModal;
