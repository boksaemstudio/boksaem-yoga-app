import { useLanguageStore } from '../stores/useLanguageStore';
import { useNavigate } from 'react-router-dom';
import { useStudioConfig } from '../contexts/StudioContext';
import { CaretLeft } from '@phosphor-icons/react';
const PrivacyPolicyPage = () => {
  const t = useLanguageStore(s => s.t);
  const navigate = useNavigate();
  const {
    config
  } = useStudioConfig();
  const studioName = config?.IDENTITY?.NAME || t("g_95623d") || "\uBCF8 \uC11C\uBE44\uC2A4";
  const primaryColor = config?.THEME?.PRIMARY_COLOR || 'var(--primary-gold)';
  const sectionStyle = {
    marginBottom: '28px'
  };
  const h2Style = {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: primaryColor,
    marginBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    paddingBottom: '8px'
  };
  const pStyle = {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.7',
    marginBottom: '8px'
  };
  const ulStyle = {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.8',
    paddingLeft: '20px',
    marginBottom: '8px'
  };
  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  return <div style={{
    minHeight: '100vh',
    background: 'var(--bg-primary, #0a0a0f)',
    color: 'var(--text-primary, #e5e5e5)',
    padding: '0 16px 60px'
  }}>
            {/* Header */}
            <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: 'var(--bg-primary, #0a0a0f)',
      padding: '16px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
                <button onClick={() => navigate(-1)} style={{
        background: 'none',
        border: 'none',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center'
      }}>
                    <CaretLeft size={24} weight="bold" />
                </button>
                <h1 style={{
        fontSize: '1.15rem',
        fontWeight: '800',
        margin: 0
      }}>{t("g_5381fd") || "\uAC1C\uC778\uC815\uBCF4\uCC98\uB9AC\uBC29\uCE68"}</h1>
            </div>

            <div style={{
      maxWidth: '720px',
      margin: '0 auto',
      paddingTop: '24px'
    }}>
                <div style={sectionStyle}>
                    <p style={{
          ...pStyle,
          fontWeight: '600',
          color: 'var(--text-primary)'
        }}>
                        {studioName}{t("g_b99c6e") || "(\uC774\uD558 \"\uD68C\uC0AC\")\uC740(\uB294) \u300C\uAC1C\uC778\uC815\uBCF4 \uBCF4\uD638\uBC95\u300D \uC81C30\uC870\uC5D0 \uB530\uB77C \uC815\uBCF4\uC8FC\uCCB4\uC758 \uAC1C\uC778\uC815\uBCF4\uB97C \uBCF4\uD638\uD558\uACE0 \uC774\uC640 \uAD00\uB828\uD55C \uACE0\uCDA9\uC744 \uC2E0\uC18D\uD558\uACE0 \uC6D0\uD65C\uD558\uAC8C \uCC98\uB9AC\uD560 \uC218 \uC788\uB3C4\uB85D \uD558\uAE30 \uC704\uD558\uC5EC \uB2E4\uC74C\uACFC \uAC19\uC774 \uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC\uBC29\uCE68\uC744 \uC218\uB9BD\xB7\uACF5\uAC1C\uD569\uB2C8\uB2E4."}</p>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>{t("g_e5baa9") || "\uC81C1\uC870 (\uAC1C\uC778\uC815\uBCF4\uC758 \uCC98\uB9AC \uBAA9\uC801)"}</h2>
                    <p style={pStyle}>{t("g_3b93c2") || "\uD68C\uC0AC\uB294 \uB2E4\uC74C\uC758 \uBAA9\uC801\uC744 \uC704\uD558\uC5EC \uAC1C\uC778\uC815\uBCF4\uB97C \uCC98\uB9AC\uD569\uB2C8\uB2E4. \uCC98\uB9AC\uD558\uACE0 \uC788\uB294 \uAC1C\uC778\uC815\uBCF4\uB294 \uB2E4\uC74C\uC758 \uBAA9\uC801 \uC774\uC678\uC758 \uC6A9\uB3C4\uB85C\uB294 \uC774\uC6A9\uB418\uC9C0 \uC54A\uC73C\uBA70, \uC774\uC6A9 \uBAA9\uC801\uC774 \uBCC0\uACBD\uB418\uB294 \uACBD\uC6B0\uC5D0\uB294 \uBCC4\uB3C4\uC758 \uB3D9\uC758\uB97C \uBC1B\uB294 \uB4F1 \uD544\uC694\uD55C \uC870\uCE58\uB97C \uC774\uD589\uD560 \uC608\uC815\uC785\uB2C8\uB2E4."}</p>
                    <ul style={ulStyle}>
                        <li>{t("g_708618") || "\uD68C\uC6D0 \uB4F1\uB85D \uBC0F \uAD00\uB9AC: \uD68C\uC6D0 \uAC00\uC785 \uC758\uC0AC \uD655\uC778, \uD68C\uC6D0\uC81C \uC11C\uBE44\uC2A4 \uC81C\uACF5\uC5D0 \uB530\uB978 \uBCF8\uC778 \uC2DD\uBCC4\xB7\uC778\uC99D, \uD68C\uC6D0\uC790\uACA9 \uC720\uC9C0\xB7\uAD00\uB9AC"}</li>
                        <li>{t("g_1e1e93") || "\uC218\uC5C5 \uCD9C\uC11D \uAD00\uB9AC: \uC218\uC5C5 \uCD9C\uC11D \uD655\uC778 \uBC0F \uC774\uB825 \uAD00\uB9AC, \uC794\uC5EC \uC218\uAC15 \uD69F\uC218 \uAD00\uB9AC"}</li>
                        <li>{t("g_07c561") || "\uC548\uBA74 \uC778\uC2DD \uCD9C\uC11D: \uBE44\uB300\uBA74 \uCD9C\uC11D\uC744 \uC704\uD55C \uC548\uBA74 \uD2B9\uC9D5 \uB370\uC774\uD130 \uC218\uC9D1\xB7\uCC98\uB9AC (\uB3D9\uC758 \uC2DC)"}</li>
                        <li>{t("g_c11d37") || "\uC11C\uBE44\uC2A4 \uAC1C\uC120: \uC11C\uBE44\uC2A4 \uC774\uC6A9 \uD1B5\uACC4 \uBD84\uC11D \uBC0F \uC11C\uBE44\uC2A4 \uD488\uC9C8 \uAC1C\uC120"}</li>
                        <li>{t("g_881717") || "\uACE0\uC9C0\xB7\uC548\uB0B4: \uC218\uC5C5 \uC77C\uC815 \uBCC0\uACBD, \uD734\uAD00\uC77C \uC548\uB0B4 \uB4F1 \uD544\uC218 \uC54C\uB9BC \uBC1C\uC1A1"}</li>
                    </ul>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>{t("g_09d2fa") || "\uC81C2\uC870 (\uCC98\uB9AC\uD558\uB294 \uAC1C\uC778\uC815\uBCF4 \uD56D\uBAA9)"}</h2>
                    <p style={pStyle}>{t("g_3d1ae0") || "\uD68C\uC0AC\uB294 \uB2E4\uC74C\uC758 \uAC1C\uC778\uC815\uBCF4 \uD56D\uBAA9\uC744 \uCC98\uB9AC\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4."}</p>
                    <ul style={ulStyle}>
                        <li><strong>{t("g_fd926e") || "\uD544\uC218\uD56D\uBAA9:"}</strong>{t("g_3d27d1") || "\uC774\uB984, \uC5F0\uB77D\uCC98(\uC804\uD654\uBC88\uD638), \uC218\uAC15\uAD8C \uACB0\uC81C \uBC0F \uC774\uC6A9 \uAE30\uB85D(\uACB0\uC81C\uC218\uB2E8, \uAE08\uC561 \uB4F1)"}</li>
                        <li><strong>{t("g_52de11") || "\uC120\uD0DD\uD56D\uBAA9:"}</strong>{t("g_6d0f11") || "\uC0DD\uB144\uC6D4\uC77C, \uC131\uBCC4, \uCDE8\uC57D \uBD80\uC704 \uB4F1 \uBA54\uBAA8"}</li>
                        <li><strong>{t("g_b40930") || "\uC790\uB3D9\uC218\uC9D1\uD56D\uBAA9:"}</strong>{t("g_936ae9") || "\uCD9C\uC11D \uC77C\uC2DC, \uC608\uC57D \uBC0F \uC218\uAC15 \uC774\uB825, \uC11C\uBE44\uC2A4 \uC774\uC6A9 \uAE30\uB85D"}</li>
                        <li><strong>{t("g_7842c1") || "\uC548\uBA74\uC778\uC2DD \uB3D9\uC758 \uC2DC:"}</strong>{t("g_a0ea7f") || "\uC548\uBA74 \uD2B9\uC9D5 \uBCA1\uD130(\uC218\uCE58 \uB370\uC774\uD130) \u2014 \uC6D0\uBCF8 \uC0AC\uC9C4\uC740 \uC800\uC7A5\uD558\uC9C0 \uC54A\uC73C\uBA70, \uC218\uCE58 \uB370\uC774\uD130\uB85C \uC6D0\uBCF8 \uBCF5\uC6D0\uC774 \uAE30\uC220\uC801\uC73C\uB85C \uBD88\uAC00\uB2A5\uD569\uB2C8\uB2E4"}</li>
                        <li><strong>{t("g_3b4b2d") || "\uC544\uB3D9 \uAC1C\uC778\uC815\uBCF4 \uD2B9\uCE59:"}</strong>{t("g_ee2957") || "\uB9CC 14\uC138 \uBBF8\uB9CC \uC544\uB3D9\uC758 \uD68C\uC6D0 \uAC00\uC785 \uC2DC \uBC95\uC815\uB300\uB9AC\uC778\uC758 \uB3D9\uC758 \uC808\uCC28\uB97C \uAC70\uCE58\uAE30 \uC704\uD574 \uBD80\uBAA8 \uB4F1 \uBC95\uC815\uB300\uB9AC\uC778\uC758 \uC131\uBA85 \uBC0F \uC5F0\uB77D\uCC98\uB97C \uCD94\uAC00 \uC218\uC9D1\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</li>
                    </ul>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>{t("g_3d6396") || "\uC81C3\uC870 (\uAC1C\uC778\uC815\uBCF4\uC758 \uCC98\uB9AC \uBC0F \uBCF4\uC720 \uAE30\uAC04)"}</h2>
                    <p style={pStyle}>{t("g_dd8f0d") || "\uD68C\uC0AC\uB294 \uBC95\uB839\uC5D0 \uB530\uB978 \uAC1C\uC778\uC815\uBCF4 \uBCF4\uC720\xB7\uC774\uC6A9 \uAE30\uAC04 \uB610\uB294 \uC815\uBCF4\uC8FC\uCCB4\uB85C\uBD80\uD130 \uAC1C\uC778\uC815\uBCF4\uB97C \uC218\uC9D1 \uC2DC\uC5D0 \uB3D9\uC758\uBC1B\uC740 \uAC1C\uC778\uC815\uBCF4 \uBCF4\uC720\xB7\uC774\uC6A9 \uAE30\uAC04 \uB0B4\uC5D0\uC11C \uAC1C\uC778\uC815\uBCF4\uB97C \uCC98\uB9AC\xB7\uBCF4\uC720\uD569\uB2C8\uB2E4."}</p>
                    <ul style={ulStyle}>
                        <li>{t("g_e4b30f") || "\uD68C\uC6D0 \uB4F1\uB85D \uC815\uBCF4:"}<strong>{t("g_a25750") || "\uD68C\uC6D0 \uD0C8\uD1F4 \uC2DC\uAE4C\uC9C0"}</strong>{t("g_9ed7b1") || "(\uD0C8\uD1F4 \uD6C4 \uC9C0\uCCB4 \uC5C6\uC774 \uD30C\uAE30)"}</li>
                        <li>{t("g_dd126d") || "\uCD9C\uC11D \uBC0F \uC218\uAC15 \uC774\uB825:"}<strong>{t("g_b4c53b") || "\uCD5C\uC885 \uC774\uC6A9\uC77C\uB85C\uBD80\uD130 1\uB144"}</strong></li>
                        <li>{t("g_105402") || "\uC548\uBA74 \uD2B9\uC9D5 \uB370\uC774\uD130:"}<strong>{t("g_e2713b") || "\uD68C\uC6D0 \uD0C8\uD1F4 \uC2DC \uC989\uC2DC \uD30C\uAE30"}</strong></li>
                    </ul>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>{t("g_970bac") || "\uC81C4\uC870 (\uAC1C\uC778\uC815\uBCF4\uC758 \uC81C3\uC790 \uC81C\uACF5)"}</h2>
                    <p style={pStyle}>{t("g_cf1c56") || "\uD68C\uC0AC\uB294 \uC815\uBCF4\uC8FC\uCCB4\uC758 \uAC1C\uC778\uC815\uBCF4\uB97C \uC81C1\uC870\uC5D0\uC11C \uBA85\uC2DC\uD55C \uBC94\uC704 \uB0B4\uC5D0\uC11C\uB9CC \uCC98\uB9AC\uD558\uBA70, \uC815\uBCF4\uC8FC\uCCB4\uC758 \uB3D9\uC758, \uBC95\uB960\uC758 \uD2B9\uBCC4\uD55C \uADDC\uC815 \uB4F1\uC758 \uACBD\uC6B0\uB97C \uC81C\uC678\uD558\uACE0\uB294 \uAC1C\uC778\uC815\uBCF4\uB97C \uC81C3\uC790\uC5D0\uAC8C \uC81C\uACF5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."}</p>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>{t("g_3b33b8") || "\uC81C5\uC870 (\uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC \uC5C5\uBB34\uC758 \uC704\uD0C1)"}</h2>
                    <p style={pStyle}>{t("g_89e745") || "\uD68C\uC0AC\uB294 \uC6D0\uD65C\uD558\uACE0 \uD5A5\uC0C1\uB41C \uC11C\uBE44\uC2A4 \uC81C\uACF5\uC744 \uC704\uD558\uC5EC \uB2E4\uC74C\uACFC \uAC19\uC774 \uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC \uC5C5\uBB34\uB97C \uC678\uBD80 \uC804\uBB38\uC5C5\uCCB4\uC5D0 \uC704\uD0C1\uD558\uC5EC \uC6B4\uC601\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4. \uC704\uD0C1\uACC4\uC57D \uC2DC \uAC1C\uC778\uC815\uBCF4 \uBCF4\uD638 \uAD00\uB828 \uC9C0\uCE68 \uC900\uC218 \uBC0F \uBC95\uC801 \uCC45\uC784\uC744 \uBA85\uD655\uD788 \uADDC\uC815\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4."}</p>
                    <ul style={ulStyle}>
                        <li><strong>{t("g_0f8315") || "\uC2DC\uC2A4\uD15C \uC720\uC9C0\uBCF4\uC218 \uBC0F \uC11C\uBC84 \uC6B4\uC601:"}</strong> PassFlow Ai, Google Cloud(Firebase)</li>
                        <li><strong>{t("g_986c6e") || "\uC54C\uB9BC \uBA54\uC2DC\uC9C0 \uBC1C\uC1A1:"}</strong>{t("g_edfee2") || "\uC54C\uB9BC\uD1A1 \uBC0F SMS \uBC1C\uC1A1 \uB300\uD589\uC0AC"}</li>
                        <li><strong>{t("g_4f8dd4") || "\uC804\uC790\uACB0\uC81C \uCC98\uB9AC:"}</strong>{t("g_445e6f") || "\uC804\uC790\uACB0\uC81C\uB300\uD589\uC0AC(PG\uC0AC \uBC0F \uCE74\uB4DC\uC0AC)"}</li>
                    </ul>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>{t("g_d54207") || "\uC81C6\uC870 (\uAC1C\uC778\uC815\uBCF4 \uC790\uB3D9 \uC218\uC9D1 \uC7A5\uCE58\uC758 \uC124\uCE58\xB7\uC6B4\uC601 \uBC0F \uAC70\uBD80)"}</h2>
                    <p style={pStyle}>{t("g_203560") || "\uD68C\uC0AC\uB294 \uC774\uC6A9\uC790\uC5D0\uAC8C \uD3B8\uB9AC\uD55C \uC811\uC18D \uD658\uACBD(\uAC04\uD3B8 \uB85C\uADF8\uC778 \uC720\uC9C0 \uB4F1)\uC744 \uC81C\uACF5\uD558\uAE30 \uC704\uD574 \uC774\uC6A9\uC815\uBCF4\uB97C \uC800\uC7A5\uD558\uACE0 \uC218\uC2DC\uB85C \uBD88\uB7EC\uC624\uB294 '\uCFE0\uD0A4(Cookie)' \uB610\uB294 '\uB85C\uCEEC\uC2A4\uD1A0\uB9AC\uC9C0(LocalStorage)' \uB4F1\uC744 \uC0AC\uC6A9\uD569\uB2C8\uB2E4."}</p>
                    <ul style={ulStyle}>
                        <li><strong>{t("g_a1316d") || "\uC124\uCE58\xB7\uC6B4\uC601 \uAC70\uBD80:"}</strong>{t("g_30cce7") || "\uAE30\uAE30 \uB610\uB294 \uBE0C\uB77C\uC6B0\uC800\uC758 \uC124\uC815\uC5D0\uC11C \uB370\uC774\uD130 \uC800\uC7A5\uC744 \uCC28\uB2E8\uD560 \uC218 \uC788\uC73C\uB098, \uC774 \uACBD\uC6B0 \uC790\uB3D9 \uB85C\uADF8\uC778 \uB4F1 \uAC1C\uC778\uD654\uB41C \uC11C\uBE44\uC2A4 \uC774\uC6A9\uC774 \uBD88\uAC00\uB2A5\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</li>
                    </ul>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>{t("g_2b17de") || "\uC81C7\uC870 (\uAC1C\uC778\uC815\uBCF4\uC758 \uC548\uC804\uC131 \uD655\uBCF4 \uC870\uCE58)"}</h2>
                    <p style={pStyle}>{t("g_b30778") || "\uD68C\uC0AC\uB294 \uAC1C\uC778\uC815\uBCF4\uC758 \uC548\uC804\uC131 \uD655\uBCF4\uB97C \uC704\uD574 \uB2E4\uC74C\uACFC \uAC19\uC740 \uC870\uCE58\uB97C \uCDE8\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4."}</p>
                    <ul style={ulStyle}>
                        <li><strong>{t("g_45d284") || "\uB370\uC774\uD130 \uC554\uD638\uD654:"}</strong>{t("g_dee1c0") || "\uAC1C\uC778\uC815\uBCF4\uB294 AES-256 \uC554\uD638\uD654\uB41C \uC0C1\uD0DC\uB85C \uC800\uC7A5\uB418\uBA70, SSL/TLS\uB97C \uD1B5\uD574 \uC554\uD638\uD654\uB418\uC5B4 \uC804\uC1A1\uB429\uB2C8\uB2E4"}</li>
                        <li><strong>{t("g_6a3e30") || "\uC811\uADFC\uD1B5\uC81C:"}</strong>{t("g_153e4a") || "\uAC1C\uC778\uC815\uBCF4\uC5D0 \uB300\uD55C \uC811\uADFC\uC744 \uAD00\uB9AC\uC790 \uC778\uC99D(\uBE44\uBC00\uBC88\uD638)\uC744 \uD1B5\uD574 \uD1B5\uC81C\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4"}</li>
                        <li><strong>{t("g_534e94") || "\uD074\uB77C\uC6B0\uB4DC \uBCF4\uC548:"}</strong>{t("g_4f2420") || "Google Cloud Platform(Firebase) \uAE30\uBC18\uC758 \uC778\uD504\uB77C\uB97C \uC0AC\uC6A9\uD558\uBA70, Google\uC758 \uBCF4\uC548 \uD45C\uC900\uC5D0 \uB530\uB77C \uB370\uC774\uD130\uAC00 \uBCF4\uD638\uB429\uB2C8\uB2E4"}</li>
                        <li><strong>{t("g_f054d2") || "\uCD5C\uC18C \uC218\uC9D1 \uC6D0\uCE59:"}</strong>{t("g_78aa20") || "\uC11C\uBE44\uC2A4\uC5D0 \uD544\uC694\uD55C \uCD5C\uC18C\uD55C\uC758 \uAC1C\uC778\uC815\uBCF4\uB9CC \uC218\uC9D1\uD569\uB2C8\uB2E4"}</li>
                    </ul>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>{t("g_16cd6c") || "\uC81C8\uC870 (\uC815\uBCF4\uC8FC\uCCB4\uC758 \uAD8C\uB9AC\xB7\uC758\uBB34 \uBC0F \uD589\uC0AC\uBC29\uBC95)"}</h2>
                    <p style={pStyle}>{t("g_e98c08") || "\uC815\uBCF4\uC8FC\uCCB4\uB294 \uD68C\uC0AC\uC5D0 \uB300\uD574 \uC5B8\uC81C\uB4E0\uC9C0 \uB2E4\uC74C \uAC01 \uD638\uC758 \uAC1C\uC778\uC815\uBCF4 \uBCF4\uD638 \uAD00\uB828 \uAD8C\uB9AC\uB97C \uD589\uC0AC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</p>
                    <ul style={ulStyle}>
                        <li>{t("g_1fda95") || "\uAC1C\uC778\uC815\uBCF4 \uC5F4\uB78C \uC694\uAD6C"}</li>
                        <li>{t("g_e93cd0") || "\uC624\uB958 \uB4F1\uC774 \uC788\uC744 \uACBD\uC6B0 \uC815\uC815 \uC694\uAD6C"}</li>
                        <li>{t("g_044778") || "\uC0AD\uC81C \uC694\uAD6C"}</li>
                        <li>{t("g_64f267") || "\uCC98\uB9AC\uC815\uC9C0 \uC694\uAD6C"}</li>
                    </ul>
                    <p style={pStyle}>{t("g_00a42f") || "\uC704 \uAD8C\uB9AC \uD589\uC0AC\uB294 \uD68C\uC0AC\uC5D0 \uC11C\uBA74, \uC804\uD654, \uD1B5\uC2E0\uB9DD \uB4F1\uC758 \uBC29\uBC95\uC73C\uB85C \uD558\uC2E4 \uC218 \uC788\uC73C\uBA70, \uD68C\uC0AC\uB294 \uC774\uC5D0 \uB300\uD574 \uC9C0\uCCB4 \uC5C6\uC774 \uC870\uCE58\uD558\uACA0\uC2B5\uB2C8\uB2E4."}</p>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>{t("g_e74250") || "\uC81C9\uC870 (\uC548\uBA74\uC778\uC2DD \uB370\uC774\uD130\uC5D0 \uAD00\uD55C \uD2B9\uCE59)"}</h2>
                    <ul style={ulStyle}>
                        <li>{t("g_a394ec") || "\uC548\uBA74\uC778\uC2DD \uCD9C\uC11D \uAE30\uB2A5\uC740"}<strong>{t("g_17ed83") || "\uD68C\uC6D0\uC758 \uBCC4\uB3C4 \uB3D9\uC758"}</strong>{t("g_089a79") || "\uD558\uC5D0 \uC81C\uACF5\uB429\uB2C8\uB2E4"}</li>
                        <li>{t("g_34b7a4") || "\uC218\uC9D1\uB418\uB294 \uB370\uC774\uD130\uB294"}<strong>{t("g_bbdc61") || "\uC548\uBA74 \uD2B9\uC9D5 \uBCA1\uD130(\uC218\uCE58 \uBC30\uC5F4)"}</strong>{t("g_0c3a24") || "\uB85C, \uC6D0\uBCF8 \uC0AC\uC9C4\uC744 \uD30C\uC77C\uB85C \uC800\uC7A5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4"}</li>
                        <li>{t("g_5a3918") || "\uD574\uB2F9 \uC218\uCE58 \uB370\uC774\uD130\uB85C \uC6D0\uBCF8 \uC5BC\uAD74 \uC774\uBBF8\uC9C0\uB97C 100% \uD2B9\uC131 \uBCF5\uC6D0\uD558\uB294 \uAC83\uC740"}<strong>{t("g_b8ee7b") || "\uAE30\uC220\uC801\uC73C\uB85C \uBD88\uAC00\uB2A5"}</strong>{t("g_67e25f") || "\uD569\uB2C8\uB2E4"}</li>
                        <li>{t("g_c41e7e") || "\uD574\uB2F9 \uB370\uC774\uD130\uB294 \uCD9C\uC11D \uD655\uC778 \uBAA9\uC801\uC73C\uB85C\uB9CC \uC0AC\uC6A9\uB418\uBA70, \uD68C\uC6D0 \uD0C8\uD1F4 \uC2DC"}<strong>{t("g_d78f7a") || "\uC989\uC2DC \uBE44\uAC00\uC5ED\uC801\uC73C\uB85C \uC0AD\uC81C"}</strong>{t("g_5c5d7c") || "\uB429\uB2C8\uB2E4"}</li>
                        <li>{t("g_88580c") || "\uC548\uBA74\uC778\uC2DD\uC744 \uC6D0\uD558\uC9C0 \uC54A\uB294 \uD68C\uC6D0\uC740 \uC2DC\uC2A4\uD15C\uC0C1\uC758 \uB2E4\uB978 \uC218\uB3D9 \uCD9C\uC11D \uBC29\uC2DD\uC744 \uC790\uC720\uB86D\uAC8C \uC774\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4"}</li>
                    </ul>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>{t("g_56e280") || "\uC81C10\uC870 (\uAC1C\uC778\uC815\uBCF4 \uBCF4\uD638\uCC45\uC784\uC790)"}</h2>
                    <p style={pStyle}>{t("g_1d9b6d") || "\uD68C\uC0AC\uB294 \uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC\uC5D0 \uAD00\uD55C \uC5C5\uBB34\uB97C \uCD1D\uAD04\uD574\uC11C \uCC45\uC784\uC9C0\uACE0, \uAC1C\uC778\uC815\uBCF4\uC640 \uAD00\uB828\uD55C \uC815\uBCF4\uC8FC\uCCB4\uC758 \uBD88\uB9CC\uCC98\uB9AC \uBC0F \uD53C\uD574\uAD6C\uC81C \uB4F1\uC744 \uC704\uD558\uC5EC \uC544\uB798\uC640 \uAC19\uC774 \uAC1C\uC778\uC815\uBCF4 \uBCF4\uD638\uCC45\uC784\uC790\uB97C \uC9C0\uC815\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4."}</p>
                    <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          lineHeight: '1.8'
        }}>
                        <div><strong style={{
              color: 'var(--text-primary)'
            }}>{t("g_b56067") || "\uAC1C\uC778\uC815\uBCF4 \uBCF4\uD638\uCC45\uC784\uC790"}</strong></div>
                        <div>{t("g_ae30a3") || "\uC18C\uC18D:"}{studioName}</div>
                        <div>{t("g_72b6be") || "\uC9C1\uCC45: \uB300\uD45C"}</div>
                        <div>{t("g_8e3319") || "\uC5F0\uB77D\uCC98: \uD574\uB2F9 \uC2A4\uD29C\uB514\uC624 \uCC44\uB110 \uB610\uB294 \uB370\uC2A4\uD06C\uB85C \uBB38\uC758"}</div>
                    </div>
                </div>

                <div style={sectionStyle}>
                    <h2 style={h2Style}>{t("g_9984b8") || "\uC81C11\uC870 (\uAC1C\uC778\uC815\uBCF4\uCC98\uB9AC\uBC29\uCE68\uC758 \uBCC0\uACBD)"}</h2>
                    <p style={pStyle}>{t("g_e389bb") || "\uC774 \uAC1C\uC778\uC815\uBCF4\uCC98\uB9AC\uBC29\uCE68\uC740 \uC2DC\uD589\uC77C\uB85C\uBD80\uD130 \uC801\uC6A9\uB418\uBA70, \uBC95\uB839 \uBC0F \uBC29\uCE68\uC5D0 \uB530\uB978 \uBCC0\uACBD \uB0B4\uC6A9\uC758 \uCD94\uAC00, \uC0AD\uC81C \uBC0F \uC815\uC815\uC774 \uC788\uB294 \uACBD\uC6B0\uC5D0\uB294 \uBCC0\uACBD\uC0AC\uD56D\uC758 \uC2DC\uD589 7\uC77C \uC804\uBD80\uD130 \uACF5\uC9C0\uC0AC\uD56D\uC744 \uD1B5\uD558\uC5EC \uACE0\uC9C0\uD560 \uAC83\uC785\uB2C8\uB2E4."}</p>
                </div>

                <div style={{
        textAlign: 'center',
        padding: '20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '0.85rem',
        color: '#71717a'
      }}>
                    <p>{t("g_47d1cf") || "\uBCF8 \uBC29\uCE68\uC740"}<strong>{today}</strong>{t("g_da8e28") || "\uBD80\uD130 \uC2DC\uD589\uB429\uB2C8\uB2E4."}</p>
                    <p style={{
          marginTop: '4px'
        }}>© {new Date().getFullYear()} {studioName}. All rights reserved.</p>
                </div>
            </div>
        </div>;
};
export default PrivacyPolicyPage;