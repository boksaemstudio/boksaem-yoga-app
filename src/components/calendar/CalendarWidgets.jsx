import { memo } from 'react';
import { getTagColor } from '../../utils/colors';
import { getTranslatedClass } from '../../utils/classMapping';

export const StatsSection = memo(({ stats, t }) => (
    <div style={{ marginTop: '24px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--primary-gold)' }}>{t('stats_title')}</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([subject, count]) => {
                const colors = getTagColor(subject);
                const translatedSubject = getTranslatedClass(subject, t);
                return (
                    <div key={subject} style={{ padding: '6px 12px', borderRadius: '20px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, fontSize: '0.9rem', color: colors.text }}>
                        {translatedSubject} <span style={{ fontWeight: 'bold' }}>{count}{t('times')}</span>
                    </div>
                );
            })}
            {Object.keys(stats).length === 0 && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{t('stats_empty')}</span>}
        </div>
    </div>
));
StatsSection.displayName = 'StatsSection';

export const ColorLegend = memo(({ t, allowBooking }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(255, 255, 255, 1)', border: '1px solid #dcdcdc' }}></div> {t('legend_regular')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(196, 252, 239, 0.9)', border: '1px solid rgba(129, 236, 236, 1)' }}></div> {t('legend_pregnancy')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(255, 190, 118, 0.9)', border: '1px solid rgba(255, 190, 118, 1)' }}></div> {t('legend_intensive')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(224, 86, 253, 0.7)', border: '1px solid rgba(224, 86, 253, 0.9)' }}></div> {t('legend_saturday')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid #3498db' }}></div> {t('legend_my_practice')}
        </div>
        {allowBooking && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid var(--primary-gold)', background: 'rgba(var(--primary-rgb), 0.15)' }}></div>{t("g_1dbb24") || "My Bookings"}
        </div>}
    </div>
));
ColorLegend.displayName = 'ColorLegend';
