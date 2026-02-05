import { useState } from 'react';
import { X, QrCode, Copy, Check } from '@phosphor-icons/react';

const InstructorQRModal = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);
    
    if (!isOpen) return null;
    
    // Get the instructor app URL
    const instructorUrl = `${window.location.origin}/instructor`;
    
    // Generate QR code using QR Server API (more reliable)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(instructorUrl)}&bgcolor=ffffff&color=2c2c2c&margin=10`;
    
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(instructorUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('Copy failed:', e);
        }
    };

    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                backdropFilter: 'blur(10px)'
            }}
            onClick={onClose}
        >
            <div 
                style={{
                    background: 'linear-gradient(145deg, #1a1a20, #0d0d12)',
                    borderRadius: '24px',
                    padding: '40px',
                    maxWidth: '400px',
                    width: '90%',
                    textAlign: 'center',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white'
                    }}
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <QrCode size={48} color="var(--primary-gold)" weight="duotone" />
                    <h2 style={{ color: 'var(--primary-gold)', margin: '12px 0 8px', fontSize: '1.5rem' }}>
                        강사 앱 접속
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: 0 }}>
                        QR 코드를 스캔하거나 URL을 복사하세요
                    </p>
                </div>

                {/* QR Code */}
                <div style={{ 
                    background: 'white', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    display: 'inline-block',
                    marginBottom: '20px'
                }}>
                    <img 
                        src={qrCodeUrl} 
                        alt="강사 앱 QR 코드" 
                        style={{ width: '200px', height: '200px', display: 'block' }}
                    />
                </div>

                {/* URL Display */}
                <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px'
                }}>
                    <span style={{ 
                        flex: 1, 
                        color: 'rgba(255,255,255,0.8)', 
                        fontSize: '0.85rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {instructorUrl}
                    </span>
                    <button
                        onClick={handleCopy}
                        style={{
                            background: copied ? 'rgba(76, 175, 80, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            color: copied ? '#4CAF50' : 'var(--primary-gold)',
                            fontSize: '0.85rem'
                        }}
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? '복사됨' : '복사'}
                    </button>
                </div>

                {/* Instructions */}
                <div style={{ 
                    fontSize: '0.8rem', 
                    color: 'rgba(255,255,255,0.5)',
                    lineHeight: 1.6
                }}>
                    📱 스마트폰 카메라로 QR 코드를 스캔하세요<br/>
                    🏠 홈 화면에 추가하면 앱처럼 사용할 수 있습니다
                </div>
            </div>
        </div>
    );
};

export default InstructorQRModal;
