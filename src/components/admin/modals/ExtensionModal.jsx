import { useState } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { X } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
const ExtensionModal = ({
  isOpen,
  onClose,
  member,
  onSuccess
}) => {
  const t = useLanguageStore(s => s.t);
  const [extendDuration, setExtendDuration] = useState(1);
  const [extendPayment, setExtendPayment] = useState('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!isOpen || !member) return null;
  const handleExtendMember = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await storageService.extendMember(member.id, extendDuration * 30, extendPayment);
      alert(t("g_776966") || "\uC218\uAC15\uAD8C\uC774 \uC5F0\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error extending member:', err);
      alert(t("g_f2363e") || "\uC5F0\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: 'var(--modal-padding, 24px)',
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
      borderRadius: 'min(24px, 5vw)'
    }}>
                <div className="modal-header">
                    <h2 className="modal-title">{t("g_9d720a")}</h2>
                    <button onClick={onClose} style={{
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
                        <X size={24} weight="bold" />
                    </button>
                </div>
                <div style={{
        marginBottom: '20px',
        padding: '15px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px'
      }}>
                    <div style={{
          fontWeight: 'bold',
          fontSize: '1.1rem',
          marginBottom: '5px'
        }}>{member.name}{t("g_49ca50") || "\uD68C\uC6D0\uB2D8"}</div>
                    <div style={{
          fontSize: '0.9rem',
          opacity: 0.7
        }}>{t("g_10e39e") || "\uD604\uC7AC \uC885\uB8CC\uC77C:"}{member.endDate || t("g_ff8542") || "\uC815\uBCF4\uC5C6\uC74C"}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">{t("g_0cdbe9")}</label>
                    <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '10px'
        }}>
                        {[1, 3, 6].map(m => <button key={m} className={`action-btn ${extendDuration === m ? 'primary' : ''}`} style={{
            opacity: extendDuration === m ? 1 : 0.5
          }} onClick={() => setExtendDuration(m)}>
                                {m}{t("g_f667f2") || "\uAC1C\uC6D4"}</button>)}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">{t("g_41f75e")}</label>
                    <div style={{
          display: 'flex',
          gap: '10px'
        }}>
                        {['card', 'cash', 'transfer'].map(p => <button key={p} className={`action-btn ${extendPayment === p ? 'primary' : ''}`} style={{
            flex: 1,
            opacity: extendPayment === p ? 1 : 0.5
          }} onClick={() => setExtendPayment(p)}>
                                {p === 'card' ? t("g_7e9cf3") || "\uCE74\uB4DC" : p === 'cash' ? t("g_948cb2") || "\uD604\uAE08" : t("g_0b2312") || "\uC774\uCCB4"}
                            </button>)}
                    </div>
                </div>

                <div className="modal-actions">
                    <button onClick={onClose} style={{
          padding: '10px 20px',
          color: 'var(--text-secondary)'
        }}>{t("g_d9de21")}</button>
                    <button onClick={handleExtendMember} className="action-btn primary" disabled={isSubmitting}>
                        {isSubmitting ? t("g_a8d064") || "\uCC98\uB9AC \uC911..." : t("g_8e70d0") || "\uC5F0\uC7A5\uD558\uAE30"}
                    </button>
                </div>
            </div>
        </div>;
};
export default ExtensionModal;