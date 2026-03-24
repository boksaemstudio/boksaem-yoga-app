import React from 'react';
import { 
    Users, ClockCounterClockwise, Calendar, Tag, ChartBar, 
    Megaphone, BellRinging, Database, Desktop, Gear, CalendarCheck 
} from '@phosphor-icons/react';

const AdminNav = ({ activeTab, setActiveTab, pendingApprovals, config }) => {
    return (
        <nav className="admin-nav-tabs">
            <button onClick={() => setActiveTab('logs')} className={`nav-tab-item ${activeTab === 'logs' ? 'active' : ''}`}>
                <ClockCounterClockwise size={22} weight={activeTab === 'logs' ? "fill" : "regular"} />
                <span>출석</span>
            </button>
            <button onClick={() => setActiveTab('members')} className={`nav-tab-item ${activeTab === 'members' ? 'active' : ''}`}>
                <Users size={22} weight={activeTab === 'members' ? "fill" : "regular"} />
                <span>회원</span>
            </button>
            <button onClick={() => setActiveTab('revenue')} className={`nav-tab-item ${activeTab === 'revenue' ? 'active' : ''}`}>
                <ChartBar size={22} weight={activeTab === 'revenue' ? "fill" : "regular"} />
                <span>매출</span>
            </button>
            <button onClick={() => setActiveTab('schedule')} className={`nav-tab-item ${activeTab === 'schedule' ? 'active' : ''}`}>
                <Calendar size={22} weight={activeTab === 'schedule' ? "fill" : "regular"} />
                <span>시간표</span>
            </button>
            {config?.POLICIES?.ALLOW_BOOKING && (
                <button onClick={() => setActiveTab('bookings')} className={`nav-tab-item ${activeTab === 'bookings' ? 'active' : ''}`}>
                    <CalendarCheck size={22} weight={activeTab === 'bookings' ? "fill" : "regular"} />
                    <span>예약</span>
                </button>
            )}
            <button onClick={() => setActiveTab('notices')} className={`nav-tab-item ${activeTab === 'notices' ? 'active' : ''}`}>
                <Megaphone size={22} weight={activeTab === 'notices' ? "fill" : "regular"} />
                <span>공지</span>
            </button>
            <button onClick={() => setActiveTab('push_history')} className={`nav-tab-item ${activeTab === 'push_history' ? 'active' : ''}`} style={{ position: 'relative' }}>
                <BellRinging size={22} weight={activeTab === 'push_history' ? "fill" : "regular"} />
                <span>알림기록</span>
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
                <span>키오스크</span>
            </button>
            <button onClick={() => setActiveTab('pricing')} className={`nav-tab-item ${activeTab === 'pricing' ? 'active' : ''}`}>
                <Tag size={22} weight={activeTab === 'pricing' ? "fill" : "regular"} />
                <span>가격표</span>
            </button>
            {config.FEATURES?.ENABLE_DATA_MIGRATION && (
                <button onClick={() => setActiveTab('data_migration')} className={`nav-tab-item ${activeTab === 'data_migration' ? 'active' : ''}`}>
                    <Database size={22} weight={activeTab === 'data_migration' ? "fill" : "regular"} color="var(--primary-gold)" />
                    <span>데이터</span>
                </button>
            )}
            <button onClick={() => setActiveTab('settings')} className={`nav-tab-item ${activeTab === 'settings' ? 'active' : ''}`}>
                <Gear size={22} weight={activeTab === 'settings' ? "fill" : "regular"} />
                <span>설정</span>
            </button>
        </nav>
    );
};

export default AdminNav;
