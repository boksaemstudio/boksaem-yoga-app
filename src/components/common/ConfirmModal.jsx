import { useEffect } from 'react';
import { WarningCircle } from '@phosphor-icons/react';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = '확인',
    message,
    confirmText = '확인',
    cancelText = '취소',
    isDestructive = false
}) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 9999, animation: 'fadeIn 0.2s ease-out'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px', padding: '24px',
                width: '90%', maxWidth: '400px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    {isDestructive && <WarningCircle size={28} color="#ff4757" weight="fill" />}
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{title}</h3>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
                    {message}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                    <button style={{
                        padding: '10px 16px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s ease', border: 'none',
                        background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-primary)'
                    }} onClick={onClose}>{cancelText}</button>
                    <button style={{
                        padding: '10px 16px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.2s ease',
                        background: isDestructive ? 'rgba(255, 71, 87, 0.15)' : 'var(--primary-theme-color)',
                        color: isDestructive ? '#ff4757' : 'black',
                        border: isDestructive ? '1px solid #ff4757' : 'none'
                    }} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
