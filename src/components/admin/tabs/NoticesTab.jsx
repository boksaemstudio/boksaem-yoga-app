import { Plus, Megaphone, Trash } from '@phosphor-icons/react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { storageService } from '../../../services/storage';
import { useStudioConfig } from '../../../contexts/StudioContext';
const NoticesTab = ({
  notices,
  setShowNoticeModal,
  refreshData
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const handleDeleteNotice = async id => {
    if (window.confirm(t("g_8fbdb2") || "\uC774 \uACF5\uC9C0\uC0AC\uD56D\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) {
      try {
        await storageService.deleteNotice(id);
        refreshData();
      } catch (error) {
        console.error('[NoticesTab] Failed to delete notice:', error);
        alert(t("g_a436e2") || "\uACF5\uC9C0 \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
      }
    }
  };
  return <div className="dashboard-card shadow-lg" style={{
    background: 'rgba(25,25,25,0.7)',
    border: '1px solid rgba(255,255,255,0.05)'
  }}>
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      paddingBottom: '20px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      flexWrap: 'wrap',
      gap: '20px'
    }}>
                <div style={{
        flex: '1 1 300px'
      }}>
                    <h3 className="outfit-font" style={{
          fontSize: '1.4rem',
          fontWeight: 700,
          margin: 0
        }}>{t('소식 및 공지 관리')}</h3>
                    <p style={{
          margin: '5px 0 0 0',
          opacity: 0.5,
          fontSize: '0.85rem'
        }}>{t('회원용 앱의 메인 화면에 표시되는 공지사항입니다.')}</p>
                </div>
                <button onClick={() => setShowNoticeModal(true)} className="action-btn" style={{
        width: 'auto',
        padding: '10px 24px',
        // Slightly reduced padding
        flexShrink: 0,
        // Prevent shrinking
        background: `linear-gradient(135deg, var(--primary-gold) 0%, ${config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'} 100%)`,
        color: 'var(--text-on-primary)',
        // Black text for contrast
        fontWeight: 'bold',
        fontSize: '0.95rem',
        border: 'none',
        boxShadow: '0 4px 15px rgba(var(--primary-rgb), 0.4)',
        // Gold Glow
        borderRadius: '30px',
        // More rounded
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }} onMouseOver={e => {
        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(var(--primary-rgb), 0.6)';
      }} onMouseOut={e => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(var(--primary-rgb), 0.4)';
      }}>
                    <Plus size={20} weight="black" /> 
                    {t('공지 작성하기')}
                </button>
            </div>
            <div className="card-list">
                {notices.length === 0 ? <div style={{
        textAlign: 'center',
        padding: '60px 0',
        opacity: 0.5
      }}>
                        <Megaphone size={48} style={{
          marginBottom: '15px'
        }} />
                        <p>{t('등록된 공지사항이 없습니다.')}</p>
                    </div> : [...notices].sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0)).map(notice => <div key={notice.id} className="glass-panel" style={{
        marginBottom: '20px',
        padding: '24px',
        border: `1px solid ${config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'}40`,
        background: 'linear-gradient(145deg, rgba(35,35,35,0.7), rgba(25,25,25,0.8))',
        position: 'relative'
      }}>
                            <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '15px'
        }}>
                                <div>
                                    <div style={{
              fontWeight: 800,
              fontSize: '1.2rem',
              color: config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)',
              marginBottom: '4px'
            }}>
                                        {notice.title}
                                    </div>
                                    <div style={{
              fontSize: '0.8rem',
              opacity: 0.5
            }}>
                                        {notice.date || (notice.timestamp ? new Date(notice.timestamp).toLocaleDateString('ko-KR', {
                timeZone: 'Asia/Seoul'
              }) : t("g_8fec39") || "\uB0A0\uC9DC \uC815\uBCF4 \uC5C6\uC74C")}{t("g_212496") || "\uB4F1\uB85D"}</div>
                                </div>
                                <button onClick={() => handleDeleteNotice(notice.id)} className="action-btn" style={{
            flex: 'none',
            width: 'auto',
            minWidth: 'auto',
            padding: '8px',
            color: 'rgba(255,107,107,0.7)',
            backgroundColor: 'transparent'
          }} title={t('공지 삭제')}>
                                    <Trash size={20} />
                                </button>
                            </div>
                            <div style={{
          fontSize: '1rem',
          opacity: 0.9,
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          color: 'var(--text-primary)',
          padding: '15px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px'
        }}>
                                {(notice.images && notice.images.length > 0 || notice.image) && <div style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '10px',
            marginBottom: '15px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}>
                                        {notice.images && notice.images.length > 0 ? notice.images.map((img, idx) => <img key={idx} src={img} alt={`notice-img-${idx}`} style={{
              minWidth: '280px',
              maxWidth: '100%',
              height: 'auto',
              maxHeight: '300px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              scrollSnapAlign: 'start'
            }} />) : <img src={notice.image} alt={t('공지 이미지')} style={{
              width: '100%',
              borderRadius: '8px',
              maxHeight: '400px',
              objectFit: 'cover'
            }} />}
                                    </div>}
                                {notice.content}
                            </div>
                        </div>)}
            </div>
        </div>;
};
export default NoticesTab;