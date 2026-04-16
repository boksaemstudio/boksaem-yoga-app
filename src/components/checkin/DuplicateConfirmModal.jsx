import { useState } from 'react';
import { useStudioConfig } from '../../contexts/StudioContext';
import { useLanguageStore } from '../../stores/useLanguageStore';
const DuplicateConfirmModal = ({
  show,
  duplicateTimer,
  onCancel,
  onConfirm
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const [initialTimer] = useState(duplicateTimer);

  if (!show) return null;
  return <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.2s ease-out'
  }}>
            <div style={{
      background: 'rgba(30,30,30,0.98)',
      backdropFilter: 'blur(30px)',
      border: '2px solid rgba(255,80,80,0.5)',
      borderRadius: '28px',
      padding: '30px 40px',
      maxWidth: '750px',
      width: '95%',
      textAlign: 'center',
      boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
      position: 'relative',
      overflow: 'hidden'
    }}>
                <style>
                    {`
                    @keyframes franticShake {
                        0% { transform: rotate(0deg); }
                        25% { transform: rotate(-3deg) scale(1.02); }
                        50% { transform: rotate(3deg) scale(1.02); }
                        75% { transform: rotate(-3deg) scale(1.02); }
                        100% { transform: rotate(0deg) scale(1); }
                    }
                    @keyframes shrinkWidth {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                    `}
                </style>
                {/* Countdown Progress Bar */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                    background: 'rgba(255,255,255,0.05)'
                }}>
                    <div style={{
                        height: '100%', background: 'linear-gradient(90deg, #FF6B6B, #f5d76e)',
                        animation: `shrinkWidth ${initialTimer}s linear forwards`
                    }} />
                </div>

                <div style={{
        fontSize: '3rem',
        marginBottom: '10px',
        marginTop: '10px'
      }}>⚠️</div>
                <h3 style={{
        color: '#ff6b6b',
        fontSize: '2rem',
        fontWeight: 800,
        marginBottom: '12px',
        textShadow: '0 2px 10px rgba(255,107,107,0.3)'
      }}>{t('kiosk_dup_title') || t("g_f09d30") || "\uC7A0\uAE50\uB9CC\uC694! \uBC29\uAE08 \uCD9C\uC11D\uD558\uC168\uC5B4\uC694"}</h3>

                <p style={{
        color: 'white',
        fontSize: '1.3rem',
        lineHeight: 1.4,
        marginBottom: '6px',
        fontWeight: 600
      }}>
                    {t('kiosk_dup_subtitle1_part1') || t("g_deade2") || "\uD639\uC2DC "}<span style={{
          color: '#ffd700'
        }}>{t('kiosk_dup_subtitle1_highlight') || t("g_f8b91f") || "\uAC00\uC871/\uCE5C\uAD6C\uBD84"}</span>{t('kiosk_dup_subtitle1_part2') || t("g_c1961e") || "\uACFC \uD568\uAED8 \uC624\uC168\uB098\uC694?"}
                </p>
                <p style={{
        color: 'rgba(255,255,255,0.7)',
        fontSize: '1.1rem',
        marginBottom: '25px'
      }}>
                    {t('kiosk_dup_subtitle2_part1') || t("g_79ee03") || "\uC544\uB2C8\uB77C\uBA74, \uC544\uB798 "}<span style={{
          color: '#ff6b6b',
          textDecoration: 'underline'
        }}>{t('kiosk_dup_subtitle2_highlight') || t("g_cd2c50") || "\uBE68\uAC04 \uBC84\uD2BC"}</span>{t('kiosk_dup_subtitle2_part2') || t("g_4d85bd") || "\uC744 \uB20C\uB7EC\uC8FC\uC138\uC694!"}
                </p>

                <div style={{
        display: 'flex',
        gap: '30px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
                    <button onClick={e => {
          e.stopPropagation();
          onCancel();
        }} onTouchEnd={e => {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }} style={{
          flex: '1 1 280px',
          padding: '30px 20px',
          borderRadius: '24px',
          border: '4px solid #ff6b6b',
          background: 'rgba(255,107,107,0.15)',
          color: '#ff6b6b',
          fontSize: '1.7rem',
          fontWeight: 900,
          cursor: 'pointer',
          boxShadow: '0 10px 40px rgba(255,107,107,0.3)',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '120px',
          justifyContent: 'center',
          gap: '8px',
          animation: 'franticShake 0.4s ease-in-out 0.2s 1'
        }}>
                        <span>{t('kiosk_dup_cancel_btn') || t("g_89a5df") || "\uD83D\uDE31 \uC544\uCC28, \uC798\uBABB \uB20C\uB800\uC5B4\uC694!"}</span>
                        <span style={{
            fontSize: '1rem',
            fontWeight: 600,
            opacity: 0.9,
            background: '#ff6b6b',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '12px',
            marginTop: '6px'
          }}>{t('kiosk_dup_cancel_desc') || t("g_8c1d37") || "(\uCD9C\uC11D \uCDE8\uC18C\uD558\uAE30)"}</span>
                    </button>

                    <button onClick={e => {
          e.stopPropagation();
          onConfirm();
        }} onTouchEnd={e => {
          e.preventDefault();
          e.stopPropagation();
          onConfirm();
        }} style={{
          flex: '1 1 280px',
          padding: '24px 15px',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '1.4rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '120px',
          justifyContent: 'center',
          gap: '8px'
        }}>
                        <span style={{
            opacity: 0.8
          }}>{t('kiosk_dup_confirm_btn') || t("g_2145a5") || "\uD83D\uDE46\u200D\u2640\uFE0F \uB124, \uB450\uBA85 \uB9DE\uC544\uC694"}</span>
                        <div style={{
            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                             <span style={{
                 fontSize: '0.9rem',
                 color: '#f5d76e'
               }}>{t('kiosk_dup_confirm_desc') || t("g_0c569e") || "(\uB3D9\uBC18 \uCD9C\uC11D)"}</span>
                             <span style={{
                                 display: 'inline-flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 width: '26px',
                                 height: '26px',
                                 borderRadius: '50%',
                                 background: 'rgba(255,255,255,0.15)',
                                 fontSize: '0.9rem',
                                 fontWeight: '800',
                                 fontFamily: 'var(--font-mono, monospace)',
                                 color: '#f5d76e'
                             }}>{duplicateTimer}</span>
                        </div>
                    </button>
                </div>

                <div style={{
        marginTop: '24px',
        opacity: 0.6,
        fontSize: '1.05rem',
        fontWeight: 500
      }}>
                    {t('kiosk_dup_footer_text') || t("g_4bf474") || "\uC544\uBB34\uAC83\uB3C4 \uC548 \uB204\uB974\uBA74..."} <span style={{color: '#ffd700'}}>{duplicateTimer}</span>{t('kiosk_dup_footer_timer_part1') || t("g_38f886") || "\uCD08 \uB4A4 \uC790\uB3D9\uC73C\uB85C "}<span style={{ textDecoration: 'underline' }}>{t('kiosk_dup_footer_timer_highlight') || t("g_d03d76") || "\uCD9C\uC11D \uCC98\uB9AC"}</span>{t('kiosk_dup_footer_timer_part2') || t("g_5c5d7c") || "\uB429\uB2C8\uB2E4"}
                </div>
            </div>
        </div>;
};
export default DuplicateConfirmModal;