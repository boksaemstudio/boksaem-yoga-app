import { Icons } from '../CommonIcons';

const MessagesTab = ({ messages, t, setActiveTab }) => {
    return (
        <div className="fade-in" style={{ padding: '0 5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                <div style={{
                    padding: '12px',
                    borderRadius: '15px',
                    background: 'rgba(212, 175, 55, 0.15)',
                    color: 'var(--primary-gold)'
                }}>
                    <Icons.Chat size={24} weight="fill" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'white', margin: 0 }}>
                        {t('messagesTitle')}
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                        수신된 전체 알림 내역입니다.
                    </p>
                </div>
            </div>

            {messages.length === 0 ? (
                <div style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '24px',
                    border: '1px dashed rgba(255,255,255,0.1)'
                }}>
                    <Icons.Ghost size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.95rem' }}>
                        {t('noMessages')}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {messages.map((msg) => {
                        const isNotice = msg.type === 'notice';
                        
                        return (
                            <div
                                key={msg.id}
                                onClick={() => {
                                    if (isNotice && setActiveTab) {
                                        console.log('[MessagesTab] Notice clicked, navigating to notices tab with ID:', msg.noticeId || msg.id);
                                        setActiveTab('notices', msg.noticeId || msg.id);
                                    }
                                }}
                                style={{
                                    padding: '20px',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: isNotice ? 'pointer' : 'default',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (isNotice) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (isNotice) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        color: 'var(--primary-gold)',
                                        textTransform: 'uppercase',
                                        padding: '4px 8px',
                                        background: 'rgba(212, 175, 55, 0.1)',
                                        borderRadius: '8px'
                                    }}>
                                        {msg.type === 'admin_individual' ? '개별' : '공지'}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                                        {msg.timestamp || msg.createdAt ? new Date(msg.timestamp || msg.createdAt).toLocaleDateString() : ''}
                                    </span>
                                </div>
                                <p style={{
                                    margin: 0,
                                    fontSize: '1rem',
                                    color: 'rgba(255,255,255,0.95)',
                                    lineHeight: '1.6',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {msg.content}
                                </p>
                                {isNotice && (
                                    <div style={{
                                        marginTop: '12px',
                                        fontSize: '0.8rem',
                                        color: 'var(--primary-gold)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        opacity: 0.8
                                    }}>
                                        <Icons.ArrowRight size={14} />
                                        <span>소식 보기</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div style={{ height: '100px' }} />
        </div>
    );
};

export default MessagesTab;
