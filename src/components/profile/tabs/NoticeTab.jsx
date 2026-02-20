import React from 'react';
import * as Icons from '@phosphor-icons/react';

const NoticeTab = ({
    t,
    notices,
    selectedNoticeId,
    setSelectedNoticeId,
    setLightboxImage
}) => {
    return (
        <div className="fade-in">
            <div style={{ padding: '0 5px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                    <Icons.Megaphone size={28} color="var(--primary-gold)" weight="fill" />
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'white', margin: 0 }}>{t('noticesTitle')}</h2>
                </div>
                {Array.isArray(notices) && notices.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        {notices.map((notice) => {
                            const isSelected = selectedNoticeId && notice.id === selectedNoticeId;
                            return (
                                <div
                                    key={notice.id}
                                    ref={isSelected ? (el) => {
                                        if (el) {
                                            setTimeout(() => {
                                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                setSelectedNoticeId(null);
                                            }, 300);
                                        }
                                    } : null}
                                    className="glass-panel"
                                    style={{
                                        padding: 0,
                                        background: isSelected ? 'rgba(212, 175, 55, 0.2)' : 'rgba(24, 24, 27, 0.7)',
                                        border: isSelected ? '2px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '24px',
                                        overflow: 'hidden',
                                        boxShadow: isSelected ? '0 0 30px rgba(212, 175, 55, 0.3)' : '0 15px 35px rgba(0,0,0,0.3)',
                                        transition: 'all 0.3s ease'
                                    }}>
                                    {((notice.images && notice.images.length > 0) || notice.image || notice.imageUrl) ? (
                                        <div>
                                            {/* Header (Title & Date) - Now above image */}
                                            <div style={{ padding: '24px 24px 15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
                                                    <h3 style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--primary-gold)', margin: 0, lineHeight: '1.3', wordBreak: 'keep-all', userSelect: 'text', WebkitUserSelect: 'text' }}>
                                                        {notice.title}
                                                    </h3>
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        color: 'rgba(255,255,255,0.7)',
                                                        whiteSpace: 'nowrap',
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontWeight: '600',
                                                        border: '1px solid rgba(255,255,255,0.05)'
                                                    }}>
                                                        {notice.date || (notice.createdAt ? new Date(notice.createdAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : '최근')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Image - Now below title */}
                                            <div style={{
                                                display: 'flex',
                                                overflowX: 'auto',
                                                overflowY: 'hidden',
                                                scrollSnapType: 'x mandatory',
                                                gap: '0',
                                                width: '100%',
                                                WebkitOverflowScrolling: 'touch'
                                            }}>
                                                {notice.images && notice.images.length > 0 ? (
                                                    notice.images.map((img, idx) => (
                                                        <div key={idx} style={{
                                                            minWidth: '100%',
                                                            scrollSnapAlign: 'start',
                                                            position: 'relative'
                                                        }}>
                                                            <img
                                                                src={img}
                                                                alt="notice"
                                                                style={{
                                                                    width: '100%',
                                                                    height: 'auto',
                                                                    maxHeight: '500px',
                                                                    objectFit: 'contain',
                                                                    display: 'block',
                                                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                                    cursor: 'pointer',
                                                                    backgroundColor: 'rgba(0,0,0,0.2)'
                                                                }}
                                                                onClick={() => setLightboxImage(img)}
                                                            />
                                                            {notice.images.length > 1 && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    bottom: '10px',
                                                                    right: '10px',
                                                                    background: 'rgba(0,0,0,0.6)',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '12px',
                                                                    color: 'white',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 'bold'
                                                                }}>
                                                                    {idx + 1} / {notice.images.length}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <img
                                                        src={notice.image || notice.imageUrl}
                                                        alt="notice"
                                                        style={{
                                                            width: '100%',
                                                            height: 'auto',
                                                            display: 'block',
                                                            borderTop: '1px solid rgba(255,255,255,0.05)',
                                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => setLightboxImage(notice.image || notice.imageUrl)}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '24px 24px 10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '10px' }}>
                                                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary-gold)', margin: 0, lineHeight: '1.4', wordBreak: 'keep-all' }}>
                                                    {notice.title}
                                                </h3>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    color: 'rgba(255,255,255,0.5)',
                                                    whiteSpace: 'nowrap',
                                                    background: 'rgba(212, 175, 55, 0.15)',
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontWeight: '600'
                                                }}>
                                                    {notice.date || (notice.createdAt ? new Date(notice.createdAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : '최근')}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ padding: '20px 24px 30px' }}>
                                        <p style={{
                                            margin: 0,
                                            fontSize: '1.05rem',
                                            color: 'rgba(255,255,255,0.9)',
                                            lineHeight: '1.8',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all',
                                            userSelect: 'text',
                                            WebkitUserSelect: 'text'
                                        }}>
                                            {notice.content}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                        <Icons.Megaphone size={40} style={{ opacity: 0.2, marginBottom: '15px' }} />
                        <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center' }}>{t('noNewNotices')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NoticeTab;
