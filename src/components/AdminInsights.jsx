import CollapsibleCard from './admin/CollapsibleCard';

const AdminInsights = ({ briefing }) => {

    return (
        <div className="fade-in" style={{ marginBottom: '20px' }}>
            <CollapsibleCard 
                id="admin-ai-briefing" 
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🧙‍♂️</span>
                        <h4 style={{ margin: 0, color: 'var(--primary-gold)', fontSize: '1rem' }}>AI 원장님의 브리핑</h4>
                        <div className="tooltip-container" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                            <div style={{
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: 'rgba(var(--primary-rgb), 0.2)', color: 'var(--primary-gold)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '10px', fontWeight: 'bold'
                            }}>i</div>
                            <div className="tooltip-text" style={{ width: '250px' }}>
                                <strong>AI 브리핑 생성 로직</strong><br />
                                현재 선택된 지점의 총 회원수, 활성 회원수, 오늘 등록 현황(신규/재등록), 출석수, 임박/만료 회원수 및 인기 수업 등 전체 운영 데이터를 종합하여 경영 전략 관점에서 평가합니다.
                            </div>
                        </div>
                    </div>
                } 
                defaultOpen={true}
                customStyle={{ borderColor: 'var(--primary-gold)' }}
            >
                <div style={{
                    background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.15) 0%, rgba(0,0,0,0) 100%)',
                    borderRadius: '8px',
                    padding: '16px'
                }}>
                    <p style={{ margin: 0, color: '#e4e4e7', whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: '0.95rem' }}>
                        {briefing}
                    </p>
                </div>
            </CollapsibleCard>
        </div>
    );
};

export default AdminInsights;
