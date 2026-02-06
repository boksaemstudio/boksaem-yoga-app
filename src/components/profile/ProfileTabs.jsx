import { cloneElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../CommonIcons';

const NavItem = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} style={{
        background: 'none',
        border: 'none',
        color: active ? 'var(--primary-gold)' : 'rgba(255,255,255,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '8px',
        borderRadius: '16px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: active ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
    }}>
        {cloneElement(icon, {
            weight: active ? 'fill' : 'regular',
            style: { filter: active ? 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))' : 'none' }
        })}
        <span style={{ fontSize: '0.65rem', fontWeight: active ? '800' : '600' }}>{label}</span>
    </button>
);

const ProfileTabs = ({ activeTab, setActiveTab, t }) => {
    const navigate = useNavigate();
    return (
        <div style={{
            position: 'fixed',
            bottom: 'calc(20px + env(safe-area-inset-bottom))',
            left: '20px',
            right: '20px',
            height: '75px',
            background: 'rgba(20, 20, 23, 0.95)',
            borderRadius: '25px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '0 15px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
            zIndex: 1000,
            transition: 'all 0.3s ease'
        }}>
            <NavItem active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Icons.House size={26} />} label={t('tabHome')} />
            <NavItem active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Icons.Article size={26} />} label={t('tabHistory')} />
            <NavItem active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={<Icons.Calendar size={26} />} label={t('tabSchedule')} />
            
            {/* Meditation Tab - Navigates to new page (Using window.location to ensure PWA standalone maintains fullscreen) */}
            <NavItem active={false} onClick={() => {
                window.location.href = '/meditation';
            }} icon={<Icons.Flower size={26} />} label="명상" />

            <NavItem active={activeTab === 'prices'} onClick={() => setActiveTab('prices')} icon={<Icons.Ticket size={26} />} label={t('tabPrices')} />
            <NavItem active={activeTab === 'notices'} onClick={() => setActiveTab('notices')} icon={<Icons.Megaphone size={26} />} label={t('tabNotices')} />
            <NavItem active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} icon={<Icons.Chat size={26} />} label={t('tabMessages')} />
        </div>
    );
};

export default ProfileTabs;
