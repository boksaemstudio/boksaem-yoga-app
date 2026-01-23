import React from 'react';
import { getTranslatedClass } from '../../utils/classMapping';

const RecentAttendance = ({ logs, language, t, setActiveTab }) => {
    if (!logs || logs.length === 0) return null;

    const lastLog = logs[0];
    const date = new Date(lastLog.timestamp);

    return (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(24, 24, 27, 0.9)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-gold)', margin: 0 }}>{t('recentAttendance')}</h3>
                <button onClick={() => setActiveTab('history')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{t('viewAll')} {'>'}</button>
            </div>
            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary-gold)' }}>
                        {new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP'))), { month: 'long', day: 'numeric', weekday: 'short' }).format(date)}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'white' }}>
                        {lastLog.className ? getTranslatedClass(lastLog.className, t) : t('selfPractice')} {lastLog.instructor && `(${lastLog.instructor})`}
                    </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'white', opacity: 0.7 }}>{t('sessionOrder', { n: logs.length })}</div>
            </div>
        </div>
    );
};

export default RecentAttendance;
