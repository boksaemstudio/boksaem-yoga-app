import { PlusCircle, SignOut, ToggleLeft, ToggleRight } from '@phosphor-icons/react';
import { useLanguageStore } from '../../stores/useLanguageStore';
import LanguageSelector from '../LanguageSelector';
const AdminHeader = ({
  config,
  handleForceUpdate,
  handleInstallClick,
  handleLogout,
  refreshData,
  loadingInsight,
  aiUsage,
  pushEnabled,
  pushLoading,
  handleSubscribePush,
  themeContrastText,
  activeTab,
  currentBranch,
  handleBranchChange,
  isAllExpanded,
  handleToggleAllCards
}) => {
    const language = useLanguageStore(s => s.language);
    const t = useLanguageStore(s => s.t);

  // [i18n] Studio name: use NAME_ENGLISH for non-ko languages, fallback to NAME
  const studioDisplayName = language !== 'ko' && config.IDENTITY?.NAME_ENGLISH ? config.IDENTITY.NAME_ENGLISH : config.IDENTITY?.NAME || '';
  return <header className="admin-header" style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px'
  }}>
            <div className="admin-title" style={{
      gap: '8px',
      fontSize: '0.95rem',
      display: 'flex',
      alignItems: 'center'
    }}>
                {config.IDENTITY?.LOGO_URL || config.ASSETS?.LOGO?.SQUARE ? <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
                        <img src={config.IDENTITY?.LOGO_URL || config.ASSETS?.LOGO?.SQUARE} alt="Logo" style={{
          maxHeight: '24px',
          maxWidth: '100px',
          objectFit: 'contain',
          background: 'rgba(255, 255, 255, 0.5)',
          padding: '1px',
          borderRadius: '6px'
        }} />
                    </div> : <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        borderRadius: '4px',
        background: 'var(--primary-gold)',
        color: '#000',
        fontSize: '14px',
        fontWeight: '900',
        boxShadow: '0 0 8px rgba(var(--primary-rgb), 0.4)'
      }}>
                        {config.IDENTITY?.NAME?.[0] || 'S'}
                    </div>}
                <span style={{
        whiteSpace: 'nowrap',
        fontWeight: '800'
      }}>
                    {studioDisplayName ? `${studioDisplayName} ${t('management')}` : t('management')}
                </span>
                
                <button onClick={handleInstallClick} style={{
        marginLeft: '8px',
        background: 'rgba(var(--primary-rgb), 0.1)',
        border: '1px solid rgba(var(--primary-rgb), 0.3)',
        color: 'var(--primary-gold)',
        cursor: 'pointer',
        padding: '0 8px',
        height: '28px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold'
      }} title={t('addToHomeScreen')}>
                    <PlusCircle size={16} weight="bold" />
                    <span className="mobile-compact">{t('addToHomeShort')}</span>
                </button>
                <button onClick={handleLogout} style={{
        marginLeft: '4px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s'
      }} title={t('logout')} onMouseEnter={e => e.currentTarget.style.color = '#F43F5E'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                    <SignOut size={16} />
                </button>
                <div style={{ marginLeft: '4px' }}>
                    <LanguageSelector variant="minimal" />
                </div>
            </div>
            
            <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
                {isAllExpanded !== undefined && <div style={{
        display: 'inline-flex'
      }}>
                        <button onClick={handleToggleAllCards} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 12px',
          borderRadius: '8px',
          height: '34px',
          border: isAllExpanded ? '1px solid rgba(var(--primary-rgb), 0.4)' : '1px solid rgba(255,255,255,0.15)',
          background: isAllExpanded ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.05)',
          color: isAllExpanded ? 'var(--primary-gold)' : 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontSize: '0.75rem',
          fontWeight: 'bold'
        }}>
                            {isAllExpanded ? <ToggleRight size={18} weight="fill" /> : <ToggleLeft size={18} />}
                            <span className="mobile-compact">{isAllExpanded ? t('collapseAll') : t('expandAll')}</span>
                        </button>
                    </div>}

                <div className="tooltip-container" style={{
        display: 'inline-flex'
      }}>
                    <button onClick={() => {
          if (confirm(t('aiRefreshConfirm'))) {
            refreshData();
          }
        }} style={{
          padding: '0 12px',
          height: '34px',
          borderRadius: '8px',
          background: 'rgba(var(--primary-rgb), 0.1)',
          border: '1px solid rgba(var(--primary-rgb), 0.3)',
          color: 'var(--primary-theme-color)',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)'}>
                        <span>✨ {t('aiAnalysisShort')}</span>
                        {loadingInsight ? <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            border: '1px solid var(--primary-gold)',
            borderTopColor: 'transparent',
            animation: 'spin 0.6s linear infinite'
          }} /> : <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#4CD964',
            boxShadow: '0 0 5px #4CD964'
          }}></span>}
                        <span style={{
            fontSize: '0.65rem',
            opacity: 0.8,
            marginLeft: '2px',
            paddingLeft: '6px',
            borderLeft: '1px solid rgba(var(--primary-rgb), 0.3)'
          }} className="mobile-compact">
                            {aiUsage.count}/{aiUsage.limit}
                        </span>
                    </button>
                    <div className="tooltip-text" style={{
          width: '220px',
          left: 'auto',
          right: '50%',
          transform: 'translateX(50%)',
          top: '130%',
          zIndex: 10
        }}>
                        <strong>{t('aiRefreshTitle')}</strong><br />
                        {t('aiRefreshDesc')}<br />
                        <span style={{
            fontSize: '0.7rem',
            color: 'var(--primary-theme-color)'
          }}>* {t('aiRemainingToday', {
              count: String(aiUsage.limit - aiUsage.count)
            })}</span>
                    </div>
                </div>

                <div className="tooltip-container" style={{
        display: 'inline-flex'
      }}>
                    <button onClick={handleSubscribePush} disabled={pushLoading} style={{
          padding: '0 12px',
          height: '34px',
          minWidth: '80px',
          background: pushLoading ? 'rgba(var(--primary-rgb), 0.15)' : pushEnabled ? 'rgba(var(--primary-theme-rgb, 16, 185, 129), 0.15)' : 'rgba(255,255,255,0.05)',
          border: pushEnabled ? '1px solid rgba(var(--primary-theme-rgb, 16, 185, 129), 0.4)' : '1px solid rgba(255,255,255,0.15)',
          color: pushEnabled ? 'var(--primary-theme-color, #10B981)' : 'var(--text-secondary)',
          fontWeight: 'bold',
          fontSize: '0.75rem',
          borderRadius: '8px',
          opacity: pushLoading ? 0.7 : 1,
          cursor: pushLoading ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'all 0.2s'
        }}>
                        {pushLoading ? <>
                                <div style={{
              width: '10px',
              height: '10px',
              border: '2px solid rgba(255,255,255,0.2)',
              borderTop: '2px solid currentColor',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite'
            }} />
                                {t('settingUp')}
                            </> : pushEnabled ? t('notificationsOn') : t('notificationsOff')}
                    </button>
                    <div className="tooltip-text" style={{
          width: '240px',
          left: 'auto',
          right: '0',
          transform: 'translateX(0)',
          top: '130%',
          zIndex: 10
        }}>
                        <strong>{t('pushNotificationTitle')}</strong><br />
                        {t('pushNotificationDesc')}
                    </div>
                </div>

                {(activeTab === 'members' || activeTab === 'revenue') && config.BRANCHES?.length > 1 && <select className="styled-select" value={currentBranch} onChange={handleBranchChange} style={{
        padding: '0 25px 0 10px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        borderRadius: '8px',
        width: 'auto',
        minWidth: '70px',
        height: '34px',
        background: 'rgba(255,255,255,0.05) url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23a1a1aa%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat right 8px center',
        backgroundSize: '10px',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'white',
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none',
        MozAppearance: 'none',
        WebkitAppearance: 'none'
      }}>
                        <option value="all">{t('allBranches')}</option>
                        {(config.BRANCHES || []).map(b => <option key={b.id} value={b.id}>{b.name.replace(t("g_17a7da") || "\uC810", '')}</option>)}
                    </select>}
            </div>
        </header>;
};
export default AdminHeader;