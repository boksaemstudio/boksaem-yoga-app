import { useState } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { FloppyDisk } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
const MemberNoteModal = ({
  isOpen,
  onClose,
  member,
  onSuccess
}) => {
  const t = useLanguageStore(s => s.t);
  // Initialize state from props. Parent should use key={member.id} to reset state on change.
  const [noteText, setNoteText] = useState(member?.notes || '');
  if (!isOpen || !member) return null;
  const handleSaveNote = async () => {
    try {
      await storageService.updateMember(member.id, {
        notes: noteText
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('[MemberNoteModal] Failed to save note:', error);
      alert(t("g_c0b2c2") || "\uBA54\uBAA8 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      onClose();
    }
  };
  return <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2 className="modal-title">{member.name}{t("g_dd9b06") || "\uB2D8 \uBA54\uBAA8"}</h2>
                <textarea className="form-input" style={{
        height: '200px',
        resize: 'none',
        marginBottom: '20px'
      }} placeholder={t('회원에 대한 메모를 입력하세요 (예: 허리 디스크, 오전반 선호 등)')} value={noteText} onChange={e => setNoteText(e.target.value)} />
                <div className="modal-actions">
                    <button onClick={onClose} style={{
          padding: '10px 20px',
          color: 'var(--text-secondary)'
        }}>{t('취소')}</button>
                    <button onClick={handleSaveNote} className="action-btn primary">
                        <FloppyDisk size={18} style={{
            marginRight: '6px'
          }} /> {t('저장하기')}
                    </button>
                </div>
            </div>
        </div>;
};
export default MemberNoteModal;