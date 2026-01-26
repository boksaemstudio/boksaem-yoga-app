import React from 'react';
import LanguageSelector from '../LanguageSelector';
import { Icons } from '../CommonIcons';
import { STUDIO_CONFIG } from '../../studioConfig';
// import rys200Logo from '../../assets/RYS200.png';  // Unused

const ProfileHeader = ({ logo, langLabelIndex, langLabels, t, logout }) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={logo} alt="Logo" style={{ width: '30px', height: 'auto', filter: 'brightness(0) invert(1)' }} />
                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }}>{STUDIO_CONFIG.NAME}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div className="pulse-gold" style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '4px 8px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <span key={langLabelIndex} style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.7)',
                        marginRight: '8px',
                        marginLeft: '4px',
                        minWidth: '40px',
                        textAlign: 'right',
                        animation: 'fadeIn 0.5s ease-out'
                    }}>
                        {langLabels[langLabelIndex]}
                    </span>
                    <div style={{ minWidth: '80px' }}>
                        <LanguageSelector variant="minimal" />
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="icon-btn"
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        color: 'white',
                        fontSize: '0.85rem'
                    }}
                >
                    {t('logout')}
                </button>
            </div>
        </div>
    );
};

export default ProfileHeader;
