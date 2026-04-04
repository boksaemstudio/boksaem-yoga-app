import { memo } from 'react';
import { getDaysRemaining } from '../../utils/dates';

/**
 * [ULTR-MODULAR] SuccessDetails Component
 * Handles the detailed visualization of member status after a successful check-in.
 */
const SuccessDetails = memo(({ member, onClose }) => {
    if (!member) return null;

    const credits = member.credits ?? 0;
    
    // Convert '2025-06-30' to '25.06.30'
    const formatEndDate = (dateStr) => {
        if (!dateStr || dateStr.length < 10) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `(${parts[0].slice(2)}.${parts[1]}.${parts[2]})`;
    };
    
    const renderDaysRemaining = () => {
        if (!member.endDate || member.endDate === 'TBD') {
            return <div style={{ fontSize: '2.4rem', marginTop: '10px' }}>확정 전</div>;
        }
        if (member.endDate === 'unlimited') {
            return <div style={{ fontSize: '2.4rem', marginTop: '10px' }}>무제한</div>;
        }
        
        const days = getDaysRemaining(member.endDate);
        if (days === null) return <div style={{ fontSize: '2.4rem', marginTop: '10px' }}>확정 전</div>;
        if (days < 0) return <div style={{ color: '#FF5252', marginTop: '10px' }}>만료</div>;
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div>D-{days}</div>
                <div style={{ fontSize: '3.0rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: '6px', letterSpacing: '2px' }}>
                    {formatEndDate(member.endDate)}
                </div>
            </div>
        );
    };

    return (
        <div className="attendance-info" style={{
            marginTop: '40px',
            padding: '40px 50px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '30px',
            border: '1px solid rgba(255,255,255,0.1)',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', opacity: 0.6, marginBottom: '10px' }}>잔여 횟수</div>
                    <div style={{ fontSize: '3.6rem', fontWeight: 800, color: 'var(--primary-gold)' }}>
                        {credits}회
                    </div>
                </div>
                
                <div style={{ width: '2px', height: '70px', background: 'rgba(255,255,255,0.1)' }} />

                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', opacity: 0.6, marginBottom: '10px' }}>잔여 일수</div>
                    <div style={{ fontSize: '3.6rem', fontWeight: 800, color: '#4CAF50', lineHeight: 1 }}>
                        {renderDaysRemaining()}
                    </div>
                </div>

                <div style={{ width: '2px', height: '70px', background: 'rgba(255,255,255,0.1)', marginLeft: '10px' }} />
                
                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                    className="interactive"
                    style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: '3px solid rgba(255,255,255,0.25)',
                        color: 'white',
                        padding: '20px 45px',
                        borderRadius: '24px',
                        fontSize: '1.6rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        boxShadow: '0 8px 30px var(--primary-gold-glow)',
                        minWidth: '150px',
                        marginLeft: '15px'
                    }}
                >
                    확인
                </button>
            </div>
        </div>
    );
});

SuccessDetails.displayName = 'SuccessDetails';

export default SuccessDetails;
