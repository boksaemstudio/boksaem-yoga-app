import React, { memo } from 'react';
import { getDaysRemaining } from '../../utils/dates';

/**
 * [ULTR-MODULAR] SuccessDetails Component
 * Handles the detailed visualization of member status after a successful check-in.
 */
const SuccessDetails = memo(({ member, onClose }) => {
    if (!member) return null;

    const credits = member.credits ?? 0;
    
    const renderDaysRemaining = () => {
        if (!member.endDate || member.endDate === 'TBD') {
            return <span style={{ fontSize: '1.8rem' }}>확정 전</span>;
        }
        if (member.endDate === 'unlimited') {
            return <span style={{ fontSize: '1.8rem' }}>무제한</span>;
        }
        
        const days = getDaysRemaining(member.endDate);
        if (days === null) return <span style={{ fontSize: '1.8rem' }}>확정 전</span>;
        if (days < 0) return <span style={{ color: '#FF5252' }}>만료</span>;
        return `D-${days}`;
    };

    return (
        <div className="attendance-info" style={{
            marginTop: '30px',
            padding: '30px 40px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', opacity: 0.6, marginBottom: '6px' }}>잔여 횟수</div>
                    <div style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--primary-gold)' }}>
                        {credits}회
                    </div>
                </div>
                
                <div style={{ width: '1px', height: '50px', background: 'rgba(255,255,255,0.1)' }} />

                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', opacity: 0.6, marginBottom: '6px' }}>잔여 일수</div>
                    <div style={{ fontSize: '2.8rem', fontWeight: 800, color: '#4CAF50' }}>
                        {renderDaysRemaining()}
                    </div>
                </div>

                <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.1)', marginLeft: '10px' }} />
                
                <button 
                    onClick={onClose}
                    className="interactive"
                    style={{
                        background: 'var(--primary-gold)',
                        color: 'black',
                        border: 'none',
                        padding: '15px 35px',
                        borderRadius: '15px',
                        fontSize: '1.3rem',
                        fontWeight: '900',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        boxShadow: '0 8px 25px var(--primary-gold-glow)',
                        minWidth: '120px',
                        marginLeft: '10px'
                    }}
                >
                    닫기
                </button>
            </div>
        </div>
    );
});

SuccessDetails.displayName = 'SuccessDetails';

export default SuccessDetails;
