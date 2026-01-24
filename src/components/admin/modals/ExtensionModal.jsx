import React, { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

const ExtensionModal = ({ isOpen, onClose, member, onSuccess }) => {
    const [extendDuration, setExtendDuration] = useState(1);
    const [extendPayment, setExtendPayment] = useState('card');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !member) return null;

    const handleExtendMember = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await storageService.extendMember(member.id, extendDuration * 30, extendPayment);
            alert('수강권이 연장되었습니다.');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Error extending member:', err);
            alert('연장 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">수강권 연장</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>
                <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>{member.name} 회원님</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                        현재 종료일: {member.endDate || '정보없음'}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">연장 기간</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        {[1, 3, 6].map(m => (
                            <button
                                key={m}
                                className={`action-btn ${extendDuration === m ? 'primary' : ''}`}
                                style={{ opacity: extendDuration === m ? 1 : 0.5 }}
                                onClick={() => setExtendDuration(m)}
                            >
                                {m}개월
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">결제 방식</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {['card', 'cash', 'transfer'].map(p => (
                            <button
                                key={p}
                                className={`action-btn ${extendPayment === p ? 'primary' : ''}`}
                                style={{ flex: 1, opacity: extendPayment === p ? 1 : 0.5 }}
                                onClick={() => setExtendPayment(p)}
                            >
                                {p === 'card' ? '카드' : p === 'cash' ? '현금' : '이체'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="modal-actions">
                    <button onClick={onClose} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                    <button onClick={handleExtendMember} className="action-btn primary" disabled={isSubmitting}>
                        {isSubmitting ? '처리 중...' : '연장하기'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExtensionModal;
