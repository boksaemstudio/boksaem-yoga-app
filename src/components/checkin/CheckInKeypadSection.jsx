import { memo } from 'react';
import Keypad from '../Keypad';
import { useLanguageStore } from '../../stores/useLanguageStore';
const CheckInKeypadSection = memo(({
  pin,
  loading,
  isReady,
  loadingMessage,
  keypadLocked,
  showSelectionModal,
  message,
  handleKeyPress,
  handleClear,
  handleSubmit
}) => {
    return <div className="checkin-keypad-section" style={{
    position: 'relative',
    background: 'transparent',
    boxShadow: 'none',
    border: 'none'
  }}>
            {/* [UX] Loading Overlay */}
            {loading && <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)',
      borderRadius: '24px',
      zIndex: 100,
      padding: '20px',
      textAlign: 'center'
    }}>
                    <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255,215,0,0.3)',
        borderTop: '3px solid var(--primary-gold)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }} />
                    <p style={{
        color: 'var(--primary-gold)',
        fontSize: '1.2rem',
        fontWeight: 600,
        margin: 0
      }}>
                        {loadingMessage || t('kiosk_keypad_verifying') || t("g_a03db7") || "\uCD9C\uC11D \uD655\uC778 \uC911..."}
                    </p>
                    <p style={{
        color: 'rgba(255,255,255,0.7)',
        fontSize: '0.9rem',
        marginTop: '8px'
      }}>{t('kiosk_keypad_please_wait') || t("g_9eb41e") || "\uC7A0\uC2DC\uB9CC \uAE30\uB2E4\uB824\uC8FC\uC138\uC694"}</p>
                </div>}

            {/* [PERF] Warm-up Overlay */}
            {!isReady && <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
      borderRadius: '24px',
      zIndex: 100
    }}>
                    <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid rgba(255,215,0,0.3)',
        borderTop: '4px solid var(--primary-gold)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
                    <p style={{
        marginTop: '20px',
        color: 'var(--primary-gold)',
        fontSize: '1.2rem',
        fontWeight: 600
      }}>
                        {t('kiosk_keypad_system_readying') || t("g_43650b") || "\uCD9C\uC11D \uC2DC\uC2A4\uD15C \uC900\uBE44 \uC911..."}
                    </p>
                </div>}

            {pin.length === 0 && !message && isReady && <div className="keypad-floating-instruction">
                    {t('kiosk_keypad_instruction') || t("g_89d974") || "\uC804\uD654\uBC88\uD638 \uB4A4 4\uC790\uB9AC\uB97C \uB20C\uB7EC\uC8FC\uC138\uC694"}
                </div>}

            <Keypad onKeyPress={handleKeyPress} onClear={handleClear} onSubmit={handleSubmit} disabled={loading || keypadLocked || !!message || showSelectionModal || !isReady} />
        </div>;
});
CheckInKeypadSection.displayName = 'CheckInKeypadSection';
export default CheckInKeypadSection;