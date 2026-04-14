import { useLanguageStore } from '../stores/useLanguageStore';
import { X, QrCode } from '@phosphor-icons/react';
import { QRCodeSVG } from 'qrcode.react';
const InstructorQRModal = ({
  isOpen,
  onClose
}) => {
  const t = useLanguageStore(s => s.t);
  if (!isOpen) return null;

  // Get the instructor app URL
  const instructorUrl = `${window.location.origin}/instructor`;
  return <div style={{
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
  }} onClick={onClose}>
            <div style={{
      background: 'linear-gradient(145deg, #1a1a20, #0d0d12)',
      borderRadius: '24px',
      padding: '40px',
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center',
      border: '1px solid rgba(var(--primary-rgb), 0.3)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
    }} onClick={e => e.stopPropagation()}>
                {/* Close Button */}
                <button onClick={onClose} style={{
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
      }}>
                    <X size={20} />
                </button>

                {/* Header */}
                <div style={{
        marginBottom: '24px'
      }}>
                    <QrCode size={48} color="var(--primary-gold)" weight="duotone" />
                    <h2 style={{
          color: 'var(--primary-gold)',
          margin: '12px 0 8px',
          fontSize: '1.8rem'
        }}>{t("g_7c4e80") || "\uC120\uC0DD\uB2D8 \uC804\uC6A9"}</h2>
                </div>

                {/* QR Code */}
                <div style={{
        background: 'white',
        padding: '15px',
        borderRadius: '16px',
        display: 'inline-block',
        marginBottom: '24px'
      }}>
                    <QRCodeSVG value={instructorUrl} size={250} fgColor="#000000" bgColor="#ffffff" level="M" />
                </div>

                {/* Instructions */}
                <div style={{
        fontSize: '1.2rem',
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 1.5,
        fontWeight: 500
      }}>{t("g_2e3374") || "QR \uCF54\uB4DC\uB97C \uC2A4\uCE94\uD558\uC2E0 \uD6C4"}<br />
                    <span style={{
          color: 'var(--primary-gold)',
          fontWeight: 700
        }}>{t("g_c6d12b") || "\uC804\uD654\uBC88\uD638 \uB4B7 4\uC790\uB9AC"}</span>{t("g_6f02fe") || "\uB97C \uC785\uB825\uD558\uC138\uC694"}</div>
            </div>
        </div>;
};
export default InstructorQRModal;