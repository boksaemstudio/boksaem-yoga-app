import { useLanguageStore } from '../stores/useLanguageStore';
import CollapsibleCard from './admin/CollapsibleCard';
const AdminInsights = ({
  briefing
}) => {
  const t = useLanguageStore(s => s.t);
  return <div className="fade-in" style={{
    marginBottom: '20px'
  }}>
            <CollapsibleCard id="admin-ai-briefing" title={<div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
                        <span style={{
        fontSize: '1.2rem'
      }}>🧙‍♂️</span>
                        <h4 style={{
        margin: 0,
        color: 'var(--primary-gold)',
        fontSize: '1rem'
      }}>{t("g_c9d6b7") || "AI \uC6D0\uC7A5\uB2D8\uC758 \uBE0C\uB9AC\uD551"}</h4>
                        <div className="tooltip-container" style={{
        display: 'inline-flex',
        cursor: 'pointer'
      }}>
                            <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: 'rgba(var(--primary-rgb), 0.2)',
          color: 'var(--primary-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 'bold'
        }}>i</div>
                            <div className="tooltip-text" style={{
          width: '250px'
        }}>
                                <strong>{t("g_416913") || "AI \uBE0C\uB9AC\uD551 \uC0DD\uC131 \uB85C\uC9C1"}</strong><br />{t("g_f49db8") || "\uD604\uC7AC \uC120\uD0DD\uB41C \uC9C0\uC810\uC758 \uCD1D \uD68C\uC6D0\uC218, \uD65C\uC131 \uD68C\uC6D0\uC218, \uC624\uB298 \uB4F1\uB85D \uD604\uD669(\uC2E0\uADDC/\uC7AC\uB4F1\uB85D), \uCD9C\uC11D\uC218, \uC784\uBC15/\uB9CC\uB8CC \uD68C\uC6D0\uC218 \uBC0F \uC778\uAE30 \uC218\uC5C5 \uB4F1 \uC804\uCCB4 \uC6B4\uC601 \uB370\uC774\uD130\uB97C \uC885\uD569\uD558\uC5EC \uACBD\uC601 \uC804\uB7B5 \uAD00\uC810\uC5D0\uC11C \uD3C9\uAC00\uD569\uB2C8\uB2E4."}</div>
                        </div>
                    </div>} defaultOpen={true} customStyle={{
      borderColor: 'var(--primary-gold)'
    }}>
                <div style={{
        background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.15) 0%, rgba(0,0,0,0) 100%)',
        borderRadius: '8px',
        padding: '16px'
      }}>
                    <p style={{
          margin: 0,
          color: '#e4e4e7',
          whiteSpace: 'pre-line',
          lineHeight: '1.6',
          fontSize: '0.95rem'
        }}>
                        {briefing}
                    </p>
                </div>
            </CollapsibleCard>
        </div>;
};
export default AdminInsights;