import { 
    Users, ClockCounterClockwise, Calendar, Tag, ChartBar, 
    Megaphone, BellRinging, Database, Desktop, Gear, CalendarCheck, Trash, Robot 
} from '@phosphor-icons/react';
import { useLanguageStore } from '../../stores/useLanguageStore';

const AdminNav = ({ activeTab, setActiveTab, pendingApprovals, config }) => {
    const t = useLanguageStore(s => s.t);
    return (
        <nav className="admin-nav-tabs">
            <button onClick={() => setActiveTab('logs')} className={`nav-tab-item ${activeTab === 'logs' ? 'active' : ''}`}>
                <ClockCounterClockwise size={22} weight={activeTab === 'logs' ? "fill" : "regular"} />
                <span>{t('navAttendance')}</span>
            </button>
            <button onClick={() => setActiveTab('members')} className={`nav-tab-item ${activeTab === 'members' ? 'active' : ''}`}>
                <Users size={22} weight={activeTab === 'members' ? "fill" : "regular"} />
                <span>{t('navMembers')}</span>
            </button>
            <button onClick={() => setActiveTab('revenue')} className={`nav-tab-item ${activeTab === 'revenue' ? 'active' : ''}`}>
                <ChartBar size={22} weight={activeTab === 'revenue' ? "fill" : "regular"} />
                <span>{t('navRevenue')}</span>
            </button>
            <button onClick={() => setActiveTab('schedule')} className={`nav-tab-item ${activeTab === 'schedule' ? 'active' : ''}`}>
                <Calendar size={22} weight={activeTab === 'schedule' ? "fill" : "regular"} />
                <span>{t('navSchedule')}</span>
            </button>
            {config?.POLICIES?.ALLOW_BOOKING && (
                <button onClick={() => setActiveTab('bookings')} className={`nav-tab-item ${activeTab === 'bookings' ? 'active' : ''}`}>
                    <CalendarCheck size={22} weight={activeTab === 'bookings' ? "fill" : "regular"} />
                    <span>{t('navBookings')}</span>
                </button>
            )}
            <button onClick={() => setActiveTab('notices')} className={`nav-tab-item ${activeTab === 'notices' ? 'active' : ''}`}>
                <Megaphone size={22} weight={activeTab === 'notices' ? "fill" : "regular"} />
                <span>{t('navNotices')}</span>
            </button>
            <button onClick={() => setActiveTab('push_history')} className={`nav-tab-item ${activeTab === 'push_history' ? 'active' : ''}`} style={{ position: 'relative' }}>
                <BellRinging size={22} weight={activeTab === 'push_history' ? "fill" : "regular"} />
                <span>{t('navAlertHistory')}</span>
                {pendingApprovals.length > 0 && (
                    <span style={{
                        position: 'absolute', top: '5px', right: '5px',
                        background: '#F43F5E', color: 'white',
                        fontSize: '0.6rem', padding: '2px 5px', borderRadius: '10px',
                        fontWeight: 'bold', border: '1.5px solid #121214',
                        minWidth: '18px', textAlign: 'center'
                    }}>
                        {pendingApprovals.length}
                    </span>
                )}
            </button>
            <button onClick={() => setActiveTab('kiosk')} className={`nav-tab-item ${activeTab === 'kiosk' ? 'active' : ''}`}>
                <Desktop size={22} weight={activeTab === 'kiosk' ? "fill" : "regular"} />
                <span>{t('navKiosk')}</span>
            </button>
            <button onClick={() => setActiveTab('pricing')} className={`nav-tab-item ${activeTab === 'pricing' ? 'active' : ''}`}>
                <Tag size={22} weight={activeTab === 'pricing' ? "fill" : "regular"} />
                <span>{t('navPricing')}</span>
            </button>
            {config.FEATURES?.ENABLE_DATA_MIGRATION && (
                <button onClick={() => setActiveTab('data_migration')} className={`nav-tab-item ${activeTab === 'data_migration' ? 'active' : ''}`}>
                    <Database size={22} weight={activeTab === 'data_migration' ? "fill" : "regular"} color="var(--primary-gold)" />
                    <span>{t('navData')}</span>
                </button>
            )}
            <button onClick={() => setActiveTab('trash')} className={`nav-tab-item ${activeTab === 'trash' ? 'active' : ''}`}>
                <Trash size={22} weight={activeTab === 'trash' ? "fill" : "regular"} />
                <span>{t('navTrash')}</span>
            </button>
            <button onClick={() => setActiveTab('ai_assistant')} className={`nav-tab-item ${activeTab === 'ai_assistant' ? 'active' : ''}`}>
                <Robot size={22} weight={activeTab === 'ai_assistant' ? "fill" : "regular"} />
                <span>{t('navAIAssistant')}</span>
            </button>
            <button onClick={() => setActiveTab('guide')} className={`nav-tab-item ${activeTab === 'guide' ? 'active' : ''}`}>
                <span style={{ fontSize: '22px' }}>📖</span>
                <span>{t('navGuide')}</span>
            </button>
            <button onClick={() => setActiveTab('settings')} className={`nav-tab-item ${activeTab === 'settings' ? 'active' : ''}`}>
                <Gear size={22} weight={activeTab === 'settings' ? "fill" : "regular"} />
                <span>{t('navSettings')}</span>
            </button>
        </nav>
    );
};

export default AdminNav;
