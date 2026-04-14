import { useState } from 'react';
import { X, Share, DotsThreeVertical, PlusSquare } from '@phosphor-icons/react';
import { useStudioConfig } from '../../contexts/StudioContext';
import { useLanguageStore } from '../../stores/useLanguageStore';
const KioskInstallGuideModal = ({
  isOpen,
  onClose
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const [tab, setTab] = useState(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod|macintosh/.test(ua) && 'ontouchend' in document ? 'ios' : 'android';
  });
  if (!isOpen) return null;

  // CheckInPage Native Style (Low Spec, Solid Colors, No Blur)
  const bgColor = '#18181b'; // Dark gray, matches typical CheckIn app bg
  const goldColor = config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)';
  return <div onClick={e => {
    e.stopPropagation();
  }} style={{
    position: 'fixed',
    inset: 0,
    zIndex: 4000,
    background: 'rgba(0,0,0,0.85)',
    // Simple solid dimming, no backdrop-filter
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
            <div onClick={e => e.stopPropagation()} style={{
      width: '90%',
      maxWidth: '850px',
      height: '85vh',
      maxHeight: '620px',
      background: bgColor,
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden',
      border: `2px solid ${goldColor}`,
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    }}>
                {/* Left Column: Tabs & Header (30%) */}
                <div style={{
        width: '320px',
        background: '#202024',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        padding: '30px'
      }}>
                    <h2 style={{
          fontSize: '1.6rem',
          color: goldColor,
          margin: '0 0 10px 0',
          fontWeight: 'bold'
        }}>
                        {t('kiosk_guide_title') || t("g_fb0b11") || "\uD83D\uDCF2 \uC571 \uC124\uCE58 \uC548\uB0B4"}
                    </h2>
                    <p style={{
          color: '#aaa',
          fontSize: '1rem',
          lineHeight: 1.5,
          margin: '0 0 40px 0',
          wordBreak: 'keep-all'
        }}>
                        {t('kiosk_guide_desc') || t("g_a2bcc5") || "\uD648 \uD654\uBA74\uC5D0 \uC571\uC744 \uCD94\uAC00\uD574\uB450\uACE0 \uC5B8\uC81C\uB4E0 \uBC14\uB85C \uC2E4\uD589\uD558\uC138\uC694."}
                    </p>

                    <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
                        <DeviceTabBtn active={tab === 'android'} label="Android / Galaxy" icon="🤖" activeColor="#a4c639" onClick={() => setTab('android')} />
                        <DeviceTabBtn active={tab === 'ios'} label="iPhone / iPad / iOS" icon="🍎" activeColor="#007aff" onClick={() => setTab('ios')} />
                    </div>
                </div>

                {/* Right Column: Content (70%) */}
                <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
                    {/* Close Btn Header */}
                    <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '20px'
        }}>
                        <button onClick={onClose} style={{
            background: '#333',
            border: 'none',
            color: '#fff',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
                            <X size={24} weight="bold" />
                        </button>
                    </div>

                    {/* Scrollable Guide Content */}
                    <div style={{
          flex: 1,
          padding: '0 40px 40px 40px',
          overflowY: 'auto',
          color: config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'
        }}>
                        {tab === 'android' ? <TabletAndroidGuide /> : <TabletIOSGuide />}
                    </div>
                </div>
            </div>
        </div>;
};
const DeviceTabBtn = ({
  active,
  label,
  icon,
  activeColor,
  onClick
}) => <button onClick={onClick} style={{
  padding: '20px',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  background: active ? '#2a2a30' : 'transparent',
  color: active ? activeColor : '#666',
  border: `2px solid ${active ? activeColor : '#444'}`,
  borderRadius: '12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  textAlign: 'left',
  transition: 'background 0.2s'
}}>
        <span style={{
    fontSize: '1.5rem'
  }}>{icon}</span>
        {label}
    </button>;
const TabletStep = ({
  number,
  icon,
  title,
  desc,
  color
}) => <div style={{
  display: 'flex',
  gap: '24px',
  alignItems: 'flex-start',
  marginBottom: '35px'
}}>
        <div style={{
    width: '60px',
    height: '60px',
    borderRadius: '16px',
    background: '#2a2a30',
    border: `2px solid ${color}`,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    flexShrink: 0
  }}>
            {number}
        </div>
        <div style={{
    paddingTop: '5px'
  }}>
            <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '8px'
    }}>
                <span style={{
        color: color
      }}>{icon}</span>
                <h3 style={{
        margin: 0,
        fontSize: '1.4rem',
        color: '#fff'
      }}>{title}</h3>
            </div>
            <p style={{
      margin: 0,
      fontSize: '1.1rem',
      color: '#bbb',
      lineHeight: 1.5,
      wordBreak: 'keep-all'
    }}>
                {desc}
            </p>
        </div>
    </div>;
const TabletAndroidGuide = () => {
  const t = useLanguageStore(s => s.t);
  return <div>
        <div style={{
      background: '#2a3a1f',
      color: '#c5e884',
      padding: '14px 20px',
      borderRadius: '12px',
      marginBottom: '20px',
      fontSize: '1.05rem',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
            💡 <b>{t('kiosk_guide_android_browser_req') || t("g_c668fe") || "Chrome(\uD06C\uB86C) \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uC9C4\uD589\uC744 \uAD8C\uC7A5\uD569\uB2C8\uB2E4."}</b>
        </div>

        <TabletStep number="1" icon={<DotsThreeVertical size={32} weight="bold" />} title={t('kiosk_guide_android_step1_title') || t("g_674c35") || "\uBA54\uB274 \uBC84\uD2BC \uD130\uCE58"} desc={t('kiosk_guide_android_step1_desc') || t("g_06b657") || "Chrome \uBE0C\uB77C\uC6B0\uC800 \uC6B0\uCE21 \uC0C1\uB2E8\uC758 \uC810 3\uAC1C(\u22EE) \uBA54\uB274\uB97C \uB204\uB974\uC138\uC694."} color="#a4c639" />
        <TabletStep number="2" icon={<PlusSquare size={32} weight="bold" />} title={t('kiosk_guide_step2_title') || t("g_103566") || "'\uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00' \uC120\uD0DD"} desc={t('kiosk_guide_android_step2_desc') || t("g_88ea49") || "\uBAA9\uB85D\uC5D0\uC11C '\uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00' \uB610\uB294 '\uC571 \uC124\uCE58'\uB97C \uCC3E\uC544 \uC120\uD0DD\uD558\uC138\uC694."} color="#a4c639" />
        <TabletStep number="3" icon={<span style={{
      fontSize: '1.2rem',
      fontWeight: 800
    }}>{t('kiosk_guide_install_btn') || t("g_f6c3e5") || "\uC124\uCE58"}</span>} title={t('kiosk_guide_step3_title') || t("g_ec5dae") || "\uBC14\uD0D5\uD654\uBA74 \uD655\uC778"} desc={t('kiosk_guide_android_step3_desc') || t("g_996887") || "\uD654\uBA74\uC5D0 \uB098\uC624\uB294 \uC124\uCE58 \uBC84\uD2BC\uC744 \uB204\uB974\uBA74, \uD648 \uD654\uBA74\uC5D0 \uC571 \uC544\uC774\uCF58\uC774 \uC0DD\uC131\uB429\uB2C8\uB2E4."} color="#a4c639" />
    </div>;
};
const TabletIOSGuide = () => {
  const t = useLanguageStore(s => s.t);
  return <div>
        <div style={{
      background: '#1c3454',
      color: '#8cb9f2',
      padding: '14px 20px',
      borderRadius: '12px',
      marginBottom: '20px',
      fontSize: '1.05rem',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
            💡 <b>{t('kiosk_guide_ios_browser_req') || t("g_41b4db") || "Safari(\uC0AC\uD30C\uB9AC) \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C\uB9CC \uAC00\uB2A5\uD569\uB2C8\uB2E4."}</b>
        </div>

        <TabletStep number="1" icon={<Share size={32} weight="bold" />} title={t('kiosk_guide_ios_step1_title') || t("g_6c2f0c") || "\uACF5\uC720 \uBC84\uD2BC \uD130\uCE58"} desc={t('kiosk_guide_ios_step1_desc') || t("g_f105d0") || "Safari \uC0C1\uB2E8(\uB610\uB294 \uC6B0\uCE21 \uC0C1\uB2E8)\uC758 \uACF5\uC720 \uC544\uC774\uCF58(\u2191 \uB124\uBAA8)\uC744 \uB204\uB974\uC138\uC694."} color="#007aff" />
        <TabletStep number="2" icon={<PlusSquare size={32} weight="bold" />} title={t('kiosk_guide_step2_title') || t("g_103566") || "'\uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00' \uC120\uD0DD"} desc={t('kiosk_guide_ios_step2_desc') || t("g_d7c24e") || "\uBA54\uB274\uB97C \uC704\uB85C \uB04C\uC5B4\uC62C\uB824 '\uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00' \uD56D\uBAA9\uC744 \uC120\uD0DD\uD558\uC138\uC694."} color="#007aff" />
        <TabletStep number="3" icon={<span style={{
      fontSize: '1.2rem',
      fontWeight: 800
    }}>{t('kiosk_guide_add_btn') || t("g_ebe4aa") || "\uCD94\uAC00"}</span>} title={t('kiosk_guide_step3_title') || t("g_ec5dae") || "\uBC14\uD0D5\uD654\uBA74 \uD655\uC778"} desc={t('kiosk_guide_ios_step3_desc') || t("g_a9ed4a") || "\uC6B0\uCE21 \uC0C1\uB2E8\uC758 '\uCD94\uAC00'\uB97C \uB204\uB974\uBA74, \uD648 \uD654\uBA74\uC5D0 \uC571 \uC544\uC774\uCF58\uC774 \uC0DD\uC131\uB429\uB2C8\uB2E4."} color="#007aff" />
    </div>;
};
export default KioskInstallGuideModal;