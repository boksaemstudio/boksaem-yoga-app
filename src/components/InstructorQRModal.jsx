import { X, QrCode } from '@phosphor-icons/react';
import { QRCodeSVG } from 'qrcode.react';

const InstructorQRModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    // Get the instructor app URL
    const instructorUrl = `${window.location.origin}/instructor`;

    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
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
                    <h2 style={{ color: 'var(--primary-gold)', margin: '12px 0 8px', fontSize: '1.8rem' }}>
                        강사 앱 접속
                    </h2>
                </div>

                {/* QR Code */}
                <div style={{ 
                    background: 'white', 
                    padding: '15px', 
                    borderRadius: '16px', 
                    display: 'inline-block',
                    marginBottom: '24px'
                }}>
                    <QRCodeSVG 
                        value={instructorUrl} 
                        size={250}
                        fgColor="#000000"
                        bgColor="#ffffff"
                        level="M"
                    />
                </div>

                {/* Instructions */}
                <div style={{ 
                    fontSize: '1.2rem', 
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.5,
                    fontWeight: 500
                }}>
                    QR 코드를 스캔하신 후<br/>
                    <span style={{ color: 'var(--primary-gold)', fontWeight: 700 }}>전화번호 뒷 4자리</span>를 입력하세요
                </div>
            </div>
        </div>
    );
};

export default InstructorQRModal;
