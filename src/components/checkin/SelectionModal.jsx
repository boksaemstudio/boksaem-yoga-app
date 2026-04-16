import { useState, useEffect, memo } from 'react';
import { useStudioConfig } from '../../contexts/StudioContext';
import { CHECKIN_CONFIG } from '../../constants/CheckInConfig';
import { useLanguageStore } from '../../stores/useLanguageStore';
const SelectionModal = memo(({
  show,
  duplicateMembers,
  loading,
  onClose,
  onSelect
}) => {
  const t = useLanguageStore(s => s.t);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const {
    config
  } = useStudioConfig();
  const [timeLeft, setTimeLeft] = useState(CHECKIN_CONFIG.TIMEOUTS.AUTO_CLOSE_MODAL / 1000);
  useEffect(() => {
    if (!show) {
      setSelectedMemberId(null);
      setTimeLeft(CHECKIN_CONFIG.TIMEOUTS.AUTO_CLOSE_MODAL / 1000);
      return;
    }
    if (loading) return; // 로딩 중에는 타이머 정지

    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [show, loading, onClose]);
  if (!show) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeMembers = [];
  const inactiveMembers = [];
  duplicateMembers.forEach(m => {
    const credits = m.credits || 0;
    const endDateStr = m.endDate;

    // 1. Check Credits
    const hasCredits = credits > 0 || credits === Infinity;

    // 2. Check Date
    let hasValidDate = true;
    if (endDateStr && endDateStr !== 'unlimited' && endDateStr !== 'TBD') {
      const parsedStr = typeof endDateStr === 'string' ? endDateStr.replace(/-/g, '/') : endDateStr;
      const endDate = new Date(parsedStr);
      endDate.setHours(23, 59, 59, 999);
      if (endDate < today) {
        hasValidDate = false;
      }
    }
    if (hasCredits && hasValidDate) {
      activeMembers.push(m);
    } else {
      inactiveMembers.push(m);
    }
  });
  const handleConfirm = e => {
    if (loading || !selectedMemberId) return;
    e.stopPropagation();
    onSelect(selectedMemberId);
  };
  return <div className="modal-overlay" onClick={e => e.stopPropagation()} onTouchStart={e => {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
  }} style={{
    zIndex: 3000,
    touchAction: 'none'
  }}>
            <div className="modal-content glass-panel" style={{
      width: '95%',
      maxWidth: '1100px',
      maxHeight: '90vh',
      padding: '25px 30px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      overflow: 'hidden'
    }}>
                <h2 style={{
        fontSize: '2rem',
        marginBottom: '5px',
        textAlign: 'center'
      }}>{t('kiosk_select_title') || t("g_a33420") || "회원 선택"}</h2>
                <p style={{
        textAlign: 'center',
        opacity: 0.7,
        marginBottom: '10px',
        fontSize: '0.95rem'
      }}>
                    {t('kiosk_select_desc') || t("g_dd7f6a") || "해당하는 회원님을 선택해주세요"}
                    <span style={{
          marginLeft: '10px',
          fontSize: '0.85em',
          color: '#ff6b6b'
        }}>
                        {t('kiosk_select_timeout', {
            timeLeft
          }) || `(${timeLeft}초 후 자동 취소)`}
                    </span>
                </p>

                <div style={{
        display: 'flex',
        gap: '20px',
        flex: 1,
        minHeight: '280px'
      }}>
                    <div style={{
          flex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
                        <h3 style={{
            fontSize: '1.2rem',
            color: 'var(--primary-gold)',
            borderBottom: '1px solid rgba(var(--primary-rgb), 0.3)',
            paddingBottom: '8px'
          }}>
                            {t('kiosk_select_active_members') || t("g_5a90d0") || "✨ 이용 가능 회원"}
                        </h3>
                        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '15px',
            flex: 1,
            overflowY: 'auto',
            alignContent: 'start',
            padding: '15px'
          }}>
                            {activeMembers.length > 0 ? activeMembers.map(m => {
              const isSelected = selectedMemberId === m.id;
              return <button key={m.id} onClick={e => {
                if (loading) return;
                e.stopPropagation();
                setSelectedMemberId(m.id);
              }} className={`member-card active-member-card ${isSelected ? 'selected' : ''}`} style={{
                flex: '1 1 calc(50% - 15px)',
                minWidth: '220px',
                padding: '20px',
                borderRadius: '16px',
                background: isSelected ? 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.15), rgba(var(--primary-rgb), 0.05))' : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
                color: 'white',
                border: isSelected ? '2px solid var(--primary-gold)' : '2px solid rgba(255,255,255,0.2)',
                boxShadow: isSelected ? '0 0 20px rgba(var(--primary-rgb), 0.3)' : '0 4px 15px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                minHeight: '140px'
              }}>
                                        <span style={{
                  fontSize: '1.9rem',
                  fontWeight: '800',
                  color: isSelected ? 'var(--primary-gold)' : 'white'
                }}>{m.name}</span>
                                        <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  justifyContent: 'center'
                }}>
                                            <span style={{
                    fontSize: '0.9rem',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '5px 12px',
                    borderRadius: '50px'
                  }}>
                                                {config.BRANCHES?.find(b => b.id === m.homeBranch)?.name || m.homeBranch}
                                            </span>
                                            <span style={{
                    fontSize: '0.9rem',
                    background: isSelected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.1)',
                    padding: '5px 12px',
                    borderRadius: '50px',
                    color: isSelected ? '#a5d6a7' : 'rgba(255,255,255,0.8)'
                  }}>
                                                {m.credits > 900 ? t('kiosk_select_unlimited') || t("g_98a1bf") || "무제한" : t('kiosk_select_sessions_count', {
                      credits: m.credits
                    }) || `${m.credits}회`}
                                            </span>
                                        </div>
                                    </button>;
            }) : <div style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.5,
              fontSize: '1.2rem',
              padding: '30px'
            }}>
                                    {t('kiosk_select_no_active_members') || t("g_9257d3") || "활성 회원이 없습니다."}
                                </div>}
                        </div>
                    </div>

                    <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          paddingLeft: '20px',
          maxWidth: '300px'
        }}>
                        <h3 style={{
            fontSize: '1rem',
            color: 'rgba(255,255,255,0.4)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: '6px'
          }}>
                            {t('kiosk_select_inactive_title') || t("g_82b492") || "💤 만료/비활성"}
                        </h3>
                        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto'
          }}>
                            {inactiveMembers.length > 0 ? inactiveMembers.map(m => {
              const isSelected = selectedMemberId === m.id;
              return <div key={m.id} onClick={e => {
                if (loading) return;
                e.stopPropagation();
                setSelectedMemberId(m.id);
              }} className={`member-card inactive-member-card ${isSelected ? 'selected' : ''}`} style={{
                padding: '10px 15px',
                borderRadius: '8px',
                background: isSelected ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(0,0,0,0.3)',
                color: isSelected ? 'var(--primary-gold)' : 'rgba(255,255,255,0.4)',
                border: isSelected ? '1px solid var(--primary-gold)' : '1px dashed rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
                cursor: 'pointer',
                opacity: isSelected ? 1 : 0.7,
                transform: isSelected ? 'scale(1.02)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}>
                                        <div>
                                            <div style={{
                    fontSize: '1.05rem',
                    fontWeight: isSelected ? '800' : '600'
                  }}>{m.name}</div>
                                            <div style={{
                    fontSize: '0.75rem',
                    opacity: isSelected ? 0.9 : 0.6
                  }}>{config.BRANCHES?.find(b => b.id === m.homeBranch)?.name || m.homeBranch}</div>
                                        </div>
                                        <div style={{
                  fontSize: '0.8rem',
                  color: '#ff6b6b'
                }}>{t('kiosk_select_inactive_badge') || t("g_39c372") || "만료/비활성"}</div>
                                    </div>;
            }) : <div style={{
              opacity: 0.3,
              textAlign: 'center',
              padding: '15px',
              fontSize: '0.85rem'
            }}>
                                    {t('kiosk_select_none') || t("g_f1a3a9") || "해당 없음"}
                                </div>}
                        </div>
                    </div>
                </div>

                <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        marginTop: '20px'
      }}>
                    <button onClick={e => {
          e.stopPropagation();
          onClose();
        }} style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.6)',
          padding: '16px 30px',
          borderRadius: '50px',
          fontSize: '1.1rem',
          fontWeight: '500',
          cursor: 'pointer'
        }}>
                        {t('kiosk_select_cancel') || t("g_4dc5dd") || "취소 (닫기)"}
                    </button>
                    
                    <button onClick={handleConfirm} disabled={!selectedMemberId || loading} style={{
          background: selectedMemberId ? 'var(--primary-gold)' : 'rgba(255,255,255,0.1)',
          border: 'none',
          color: selectedMemberId ? '#000' : 'rgba(255,255,255,0.3)',
          padding: '16px 40px',
          borderRadius: '50px',
          fontSize: '1.2rem',
          fontWeight: '700',
          cursor: selectedMemberId ? 'pointer' : 'not-allowed',
          boxShadow: selectedMemberId ? '0 4px 15px rgba(var(--primary-rgb), 0.3)' : 'none'
        }}>
                        {selectedMemberId ? t('kiosk_select_confirm') || t("g_4cfaa4") || "선택한 회원으로 출석하기" : t('kiosk_select_disabled') || t("g_b23634") || "회원을 먼저 선택해주세요"}
                    </button>
                </div>
            </div>
        </div>;
});
SelectionModal.displayName = 'SelectionModal';
export default SelectionModal;