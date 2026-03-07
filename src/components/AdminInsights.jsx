import { useMemo } from 'react';

const AdminInsights = ({ briefing }) => {


    return (
        <div className="fade-in" style={{ marginBottom: '20px' }}>
            {/* AI Briefing Card */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(0,0,0,0) 100%)',
                border: '1px solid var(--primary-gold)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'start',
                gap: '15px'
            }}>
                <div style={{ fontSize: '1.5rem' }}>🧙‍♂️</div>
                <div>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary-gold)', fontSize: '1rem' }}>AI 원장님의 브리핑</h4>
                    <p style={{ margin: 0, color: '#e4e4e7', whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: '0.95rem' }}>
                        {briefing}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminInsights;
