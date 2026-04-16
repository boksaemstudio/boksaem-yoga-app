import { useState, useMemo, useEffect, useRef, memo } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import CollapsibleCard from '../CollapsibleCard';
import { BellRinging, Check, Info, Plus, NotePencil, PaperPlaneTilt, UserFocus, CaretDown, CaretUp } from '@phosphor-icons/react';
import { useStudioConfig } from '../../../contexts/StudioContext';
import ChurnReportPanel, { getChurnRisk } from '../ChurnReportPanel';
import { getChurnAnalysis } from '../../../services/aiService';
const MembersTab = ({
  members,
  filteredMembers,
  summary,
  searchTerm,
  setSearchTerm,
  filterType,
  handleToggleFilter,
  selectExpiringMembers,
  selectedMemberIds,
  toggleMemberSelection,
  selectFilteredMembers,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  handleOpenEdit,
  setShowAddModal,
  setShowBulkMessageModal,
  pushTokens,
  getDormantSegments,
  setBulkMessageInitialText,
  setActiveTab,
  onNoteClick,
  todayReRegMemberIds,
  sales
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const branches = config.BRANCHES || [];
  const getBranchName = id => branches.find(b => b.id === id)?.name || id;
  const getBranchColor = id => branches.find(b => b.id === id)?.color || 'var(--primary-gold)';
  const getBranchThemeColor = id => branches.find(b => b.id === id)?.color || 'var(--primary-gold)';
  const [localSort, setLocalSort] = useState('default');
  const [churnAiMessage, setChurnAiMessage] = useState(null);
  const [churnAiLoading, setChurnAiLoading] = useState(false);
  const churnAiCalledRef = useRef(false);

  // [New] Collapse State for Cards
  const [expandedCards, setExpandedCards] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('memberCardsCollapseState') || '{}');
      return {
        reg: stored.reg ?? false,
        churn: stored.churn ?? false,
        push: stored.push ?? false
      };
    } catch {
      return {
        reg: false,
        churn: false,
        push: false
      };
    }
  });
  useEffect(() => {
    setExpandedCards(prev => {
      const next = {
        ...prev
      };
      let changed = false;
      if (next.reg === undefined) {
        next.reg = false;
        changed = true;
      }
      if (next.churn === undefined) {
        next.churn = false;
        changed = true;
      }
      if (next.push === undefined) {
        next.push = false;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);
  const toggleCard = (e, key) => {
    e.stopPropagation();
    setExpandedCards(prev => {
      const next = {
        ...prev,
        [key]: !prev[key]
      };
      localStorage.setItem('memberCardsCollapseState', JSON.stringify(next));
      return next;
    });
  };

  // [FIX] 전체접기/전체보기 이벤트에 MembersTab 내부 카드도 연동
  useEffect(() => {
    const handler = e => {
      const shouldExpand = e.detail;
      const next = {
        reg: shouldExpand,
        churn: shouldExpand,
        push: shouldExpand
      };
      setExpandedCards(next);
      localStorage.setItem('memberCardsCollapseState', JSON.stringify(next));
    };
    window.addEventListener('toggleAllCards', handler);
    return () => window.removeEventListener('toggleAllCards', handler);
  }, []);

  // [FIX] 자정 넘김 시 날짜 자동 갱신 — dateKey가 변경되면 todayKstStr/todayStartMs도 재계산
  const [dateKey, setDateKey] = useState(() => new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Seoul'
  }));
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Seoul'
      });
      if (now !== dateKey) setDateKey(now);
    }, 60000); // 매 1분 체크
    return () => clearInterval(interval);
  }, [dateKey]);
  const todayKstStr = useMemo(() => dateKey, [dateKey]);
  const todayStartMs = useMemo(() => {
    return new Date(dateKey).getTime();
  }, [dateKey]);

  // [churn] ChurnReportPanel용 — 검색 필터 무시, 전체 dormant
  const allDormantMembers = useMemo(() => {
    if (filterType !== 'churn' || !getDormantSegments) return [];
    const segments = getDormantSegments(members);
    return segments['all'] || [];
  }, [filterType, members, getDormantSegments]);
  const finalFiltered = useMemo(() => {
    let result = filteredMembers;
    if ((filterType === 'dormant' || filterType === 'churn') && getDormantSegments) {
      const segments = getDormantSegments(filteredMembers);
      result = segments['all'] || [];
    }

    // Apply local sorting
    if (localSort === 'credits_asc') {
      result = [...result].sort((a, b) => (a.credits || 0) - (b.credits || 0));
    } else if (localSort === 'credits_desc') {
      result = [...result].sort((a, b) => (b.credits || 0) - (a.credits || 0));
    } else if (localSort === 'enddate_asc') {
      result = [...result].sort((a, b) => {
        if (!a.endDate || a.endDate === 'unlimited' || a.endDate === 'TBD') return 1;
        if (!b.endDate || b.endDate === 'unlimited' || b.endDate === 'TBD') return -1;
        return new Date(a.endDate) - new Date(b.endDate);
      });
    } else if (localSort === 'enddate_desc') {
      result = [...result].sort((a, b) => {
        if (!a.endDate || a.endDate === 'unlimited' || a.endDate === 'TBD') return -1;
        if (!b.endDate || b.endDate === 'unlimited' || b.endDate === 'TBD') return 1;
        return new Date(b.endDate) - new Date(a.endDate);
      });
    }
    return result;
  }, [filteredMembers, filterType, getDormantSegments, localSort]);
  if (!summary || !filteredMembers) return <div style={{
    padding: '20px',
    textAlign: 'center',
    color: 'var(--text-secondary)'
  }}>{t('admin_members_loading') || (t("g_c5bd7c") || "\uB370\uC774\uD130 \uB85C\uB529 \uC911...")}</div>;
  return <div className="members-tab-container">

            <div style={{
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'center'
    }}>
                <button onClick={() => setShowAddModal(true)} className="action-btn primary" style={{
        flex: 'none',
        width: 'auto',
        minWidth: '350px',
        height: '54px',
        fontSize: '1.2rem',
        borderRadius: '12px',
        boxShadow: '0 8px 24px var(--primary-gold-glow)',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
                    <Plus size={24} weight="bold" /> {t('admin_members_btn_add') || (t("g_1b019f") || "\uC2E0\uADDC \uD68C\uC6D0 \uB4F1\uB85D\uD558\uAE30")}
                </button>
            </div>



            {/* Summary Grid */}
            <div className={`stats-grid`} style={{
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '12px'
    }}>
                        {/* 1. 활성 회원 (핵심 자산) */}
                        <div className={`dashboard-card interactive ${filterType === 'active' ? 'highlight' : ''}`} onClick={() => handleToggleFilter('active')} style={{
        padding: '16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
                            <div style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          marginBottom: '4px'
        }}>{t('admin_members_stat_active') || (t("g_ed2992") || "\uD65C\uB3D9\uC911\uC778 \uD68C\uC6D0")}</div>
                            <div style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          color: 'var(--primary-theme-color)'
        }}>{summary.activeMembers}{t('단위_명') || t("g_5a62fd") || "명"}</div>
                        </div>

                <div className={`dashboard-card interactive ${filterType === 'registration' ? 'highlight' : ''}`} onClick={() => handleToggleFilter('registration')}>
                    <div className="card-label" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px'
        }}>
                        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
                            {t('admin_members_today_total') || (t("g_824501") || "\uC624\uB298 \uC804\uCCB4 \uB4F1\uB85D")}
                            <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                                <Info size={14} style={{
                opacity: 0.7
              }} />
                                <span className="tooltip-text">
                                    {t('admin_members_today_desc1') || (t("g_8f1334") || "\uC624\uB298 \uC0C8\uB85C \uB4F1\uB85D\uD558\uAC70\uB098")}<br />{t('admin_members_today_desc2') || (t("g_c024d9") || "\uC218\uAC15\uAD8C\uC744 \uC7AC\uACB0\uC81C\uD55C \uD68C\uC6D0")}
                                </span>
                            </div>
                        </div>
                        <button onClick={e => toggleCard(e, 'reg')} style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '3px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            color: 'var(--text-secondary)',
            fontSize: '0.7rem',
            fontWeight: '600',
            transition: 'all 0.2s',
            flexShrink: 0
          }}>
                            {expandedCards.reg ? <><CaretUp size={12} weight="bold" /> {t('admin_btn_collapse') || (t("g_365ca4") || "\uC811\uAE30")}</> : <><CaretDown size={12} weight="bold" /> {t('admin_btn_expand') || (t("g_bc6eea") || "\uD3BC\uCE58\uAE30")}</>}
                        </button>
                    </div>
                    <div className="card-value success" style={{
          fontSize: '1.8rem'
        }}>
                        {summary.todayRegistration}{t('단위_명') || t("g_5a62fd") || "명"}
                    </div>

                    <div style={{
          maxHeight: expandedCards.reg ? '500px' : '0px',
          opacity: expandedCards.reg ? 1 : 0,
          overflow: 'hidden',
          transition: expandedCards.reg ? 'max-height 0.4s ease-in, opacity 0.3s ease-in 0.1s' : 'max-height 0.3s ease-out, opacity 0.15s ease-out',
          marginTop: expandedCards.reg ? '4px' : '0px'
        }}>
                        <div style={{
            fontSize: '0.85rem',
            color: '#86efac',
            display: 'flex',
            gap: '8px',
            fontWeight: 'bold'
          }}>
                            <span>{t('admin_tab_new') || t("g_884009") || "신규"} {summary.todayNewCount || 0}</span>
                            <span style={{
              opacity: 0.4
            }}>|</span>
                            <span>{t('admin_tab_rereg') || t("g_fc669b") || "재등록"} {summary.todayReRegCount || 0}</span>
                        </div>

                    {/* 재등록률 */}
                    <div style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255,255,255,0.08)'
          }}>
                        <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
                            <span style={{
                fontSize: '0.85rem',
                color: '#a1a1aa'
              }}>{t('admin_tab_rereg_rate') || (t("g_7e95d6") || "\uB204\uC801 \uC7AC\uB4F1\uB85D\uB960")}</span>
                            <span style={{
                fontSize: '1.1rem',
                fontWeight: '800',
                color: (summary.reRegistrationRate || 0) >= 50 ? '#10b981' : (summary.reRegistrationRate || 0) >= 30 ? '#f59e0b' : '#ef4444'
              }}>
                                {summary.reRegistrationRate || 0}%
                            </span>
                        </div>
                        <div style={{
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden'
            }}>
                            <div style={{
                width: `${Math.min(summary.reRegistrationRate || 0, 100)}%`,
                height: '100%',
                borderRadius: '3px',
                transition: 'width 0.5s ease',
                background: (summary.reRegistrationRate || 0) >= 50 ? '#10b981' : (summary.reRegistrationRate || 0) >= 30 ? '#f59e0b' : '#ef4444'
              }} />
                        </div>
                        <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '4px',
              fontSize: '0.8rem',
              color: '#71717a'
            }}>
                            <span>{t('admin_tab_rereg') || t("g_fc669b") || "재등록"} {summary.membersReRegistered || 0}{t('명')} / {t('admin_tab_paid_members') || t("g_0f90ca") || "결제 회원"} {summary.membersWithSales || 0}{t('명')}</span>
                            <span>{t('admin_tab_recent_3m') || t("g_d18483") || "최근3개월"} {summary.recentReRegRate || 0}% ({summary.recentReRegisteredCount || 0}/{summary.recentExpiredCount || 0})</span>
                        </div>
                    </div>
                 </div>
                </div>
                {/* AI 이탈예측 카드 (만료/잠든 카드 통합) */}
                <div className={`dashboard-card interactive ${filterType === 'churn' ? 'highlight' : ''}`} onClick={() => handleToggleFilter('churn')} style={{
        transition: 'all 0.3s ease',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        background: 'rgba(239, 68, 68, 0.03)'
      }}>
                    <div className="card-label" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px'
        }}>
                        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
                            {t('admin_tab_ai_churn') || (t("g_0e2213") || "\uD83E\uDDE0 AI \uC774\uD0C8 \uC608\uCE21")}
                            <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                                <Info size={14} style={{
                opacity: 0.7
              }} />
                                <span className="tooltip-text" style={{
                width: '260px'
              }}>
                                    <strong>{t('admin_tab_churn_what') || (t("g_111824") || "AI \uC774\uD0C8 \uC608\uCE21\uC774\uB780?")}</strong><br />
                                    {t('admin_tab_churn_desc1') || (t("g_a863cf") || "\uD65C\uC131 \uD68C\uC6D0 \uC911 \uCD5C\uADFC \uCD9C\uC11D\uC774 \uC5C6\uB294")}<br />{t('admin_tab_churn_desc2') || (t("g_bb86ad") || "\uD68C\uC6D0\uC744 \uC704\uD5D8\uB3C4\uBCC4\uB85C \uBD84\uB958\uD569\uB2C8\uB2E4.")}<br /><br />
                                    <strong>{t('admin_tab_churn_critical') || (t("g_d31e5c") || "\u26A0 \uC704\uD5D8")}</strong>{t('admin_tab_churn_critical_desc1') || (t("g_caf382") || ": 30\uC77C+ \uBBF8\uCD9C\uC11D \uB610\uB294")}<br />{t('admin_tab_churn_critical_desc2') || (t("g_48b6ef") || "\uC794\uC5EC 1\uD68C \uC774\uD558 + 14\uC77C+ \uBBF8\uCD9C\uC11D")}<br />
                                    <strong>{t('admin_tab_churn_high') || (t("g_3c19bc") || "\uD83D\uDD36 \uC8FC\uC758")}</strong>{t('admin_tab_churn_high_desc') || (t("g_3078c2") || ": 21~29\uC77C \uBBF8\uCD9C\uC11D")}<br />
                                    <strong>{t('admin_tab_churn_medium') || (t("g_532784") || "\uD83D\uDCA4 \uAD00\uCC30")}</strong>{t('admin_tab_churn_medium_desc') || (t("g_867880") || ": 14~20\uC77C \uBBF8\uCD9C\uC11D")}<br /><br />
                                    {t('admin_tab_churn_tip1') || (t("g_1ac9ea") || "\uCE74\uB4DC\uB97C \uD130\uCE58\uD558\uBA74 \uC0C1\uC138 \uBAA9\uB85D\uACFC")}<br />{t('admin_tab_churn_tip2') || (t("g_069718") || "\uB9DE\uCDA4 \uC548\uBD80 \uBA54\uC2DC\uC9C0 \uC804\uC1A1 \uAE30\uB2A5\uC744")}<br />{t('admin_tab_churn_tip3') || (t("g_17ca61") || "\uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.")}
                                </span>
                            </div>
                        </div>
                        <button onClick={e => toggleCard(e, 'churn')} style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '3px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            color: 'var(--text-secondary)',
            fontSize: '0.7rem',
            fontWeight: '600',
            transition: 'all 0.2s',
            flexShrink: 0
          }}>
                            {expandedCards.churn ? <><CaretUp size={12} weight="bold" /> {t('admin_btn_collapse') || (t("g_365ca4") || "\uC811\uAE30")}</> : <><CaretDown size={12} weight="bold" /> {t('admin_btn_expand') || (t("g_bc6eea") || "\uD3BC\uCE58\uAE30")}</>}
                        </button>
                    </div>
                    {(() => {
          let criticalCount = 0,
            highCount = 0,
            mediumCount = 0;
          const riskMembers = [];
          if (getDormantSegments) {
            const segments = getDormantSegments(members);
            const dormant = segments['all'] || [];
            dormant.forEach(m => {
              const risk = getChurnRisk(m);
              if (risk.level === 'critical') criticalCount++;else if (risk.level === 'high') highCount++;else mediumCount++;
              riskMembers.push({
                name: m.name,
                daysSince: risk.daysSince,
                credits: Number(m.credits || 0),
                subject: m.subject || t("g_aef1a1") || "일반",
                level: risk.level === 'critical' ? t("g_504b38") || "위험" : risk.level === 'high' ? t("g_33f311") || "주의" : t("g_d7c2ad") || "관찰"
              });
            });
          }
          const totalCount = criticalCount + highCount + mediumCount;

          // AI 분석 호출 (최초 1회)
          if (totalCount > 0 && !churnAiCalledRef.current && !churnAiMessage && !churnAiLoading) {
            churnAiCalledRef.current = true;
            setChurnAiLoading(true);
            getChurnAnalysis({
              branch: t("g_934dd2") || "전체",
              activeCount: summary.activeMembers || 0,
              totalMembers: summary.totalMembers || 0,
              criticalCount,
              highCount,
              mediumCount,
              riskMembers: riskMembers.slice(0, 30)
            }).then(result => {
              setChurnAiMessage(result?.message || null);
            }).catch(() => {
              setChurnAiMessage(null);
            }).finally(() => {
              setChurnAiLoading(false);
            });
          }
          return <>
                                <div className="card-value error">{totalCount}{t('단위_명') || t("g_5a62fd") || "명"}</div>
                                <div style={{
              maxHeight: expandedCards.churn ? '500px' : '0px',
              opacity: expandedCards.churn ? 1 : 0,
              overflow: 'hidden',
              transition: expandedCards.churn ? 'max-height 0.4s ease-in, opacity 0.3s ease-in 0.1s' : 'max-height 0.3s ease-out, opacity 0.15s ease-out',
              marginTop: expandedCards.churn ? '6px' : '0px'
            }}>
                                    <div style={{
                display: 'flex',
                gap: '6px'
              }}>
                                        <span style={{
                  fontSize: '0.8rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(239,68,68,0.15)',
                  color: '#EF4444',
                  fontWeight: '700'
                }}>
                                            {t('admin_tab_churn_critical') || (t("g_d31e5c") || "\u26A0 \uC704\uD5D8")} {criticalCount}
                                        </span>
                                        <span style={{
                  fontSize: '0.8rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(245,158,11,0.15)',
                  color: '#F59E0B',
                  fontWeight: '700'
                }}>{t("g_691170") || "🔶 주의"}{highCount}
                                        </span>
                                        <span style={{
                  fontSize: '0.8rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(96,165,250,0.15)',
                  color: '#60A5FA',
                  fontWeight: '700'
                }}>
                                            {t('admin_tab_churn_medium') || (t("g_532784") || "\uD83D\uDCA4 \uAD00\uCC30")} {mediumCount}
                                        </span>
                                    </div>
                                    <div style={{
                marginTop: '10px',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px dashed rgba(255,255,255,0.1)',
                fontSize: '0.78rem',
                color: '#d4d4d8',
                lineHeight: '1.5',
                minHeight: '20px'
              }}>
                                        {churnAiLoading ? <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" style={{
                    animation: 'spin 2s ease-in-out infinite'
                  }}>
                                                    <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="2" />
                                                    <path d="M12 2 a10 10 0 0 1 10 10" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
                                                </svg>
                                                <span style={{
                    color: '#A855F7',
                    fontSize: '0.78rem'
                  }}>{t('admin_tab_churn_analyzing') || (t("g_cdda9e") || "AI\uAC00 \uD68C\uC6D0 \uB370\uC774\uD130\uB97C \uBD84\uC11D\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4...")}</span>
                                            </div> : churnAiMessage ? <span>{churnAiMessage}</span> : totalCount === 0 ? <span>{t('admin_tab_churn_all_good') || (t("g_58f536") || "\u2728 \uBAA8\uB4E0 \uD68C\uC6D0\uC774 \uAFB8\uC900\uD788 \uCD9C\uC11D \uC911\uC785\uB2C8\uB2E4.")}</span> : <span>📊 {t('admin_tab_churn_risk_members') || (t("g_5e568d") || "\uC774\uD0C8 \uC704\uD5D8 \uD68C\uC6D0")} {totalCount}{t('admin_tab_churn_detected') || t("g_76b802") || "명 감지됨"}</span>}
                                    </div>
                                </div>
                            </>;
        })()}
                </div>
                {/* [NEW] App Usage & Push Stats (Redesigned) */}
                <div className={`dashboard-card interactive ${filterType === 'installed' ? 'highlight' : ''}`} onClick={() => handleToggleFilter('installed')}>
                    <div className="card-label" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px'
        }}>
                        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
                            <BellRinging size={16} weight="fill" /> {t('admin_tab_push_enabled') || (t("g_8029c1") || "\uC54C\uB9BC \uC218\uC2E0 \uAC00\uB2A5")}
                            <div className="tooltip-container">
                                <Info size={14} style={{
                opacity: 0.7
              }} />
                                <span className="tooltip-text">
                                    {t('admin_tab_push_desc1') || (t("g_9cba72") || "\uC571 \uC124\uCE58 + \uC54C\uB9BC \uCF1C\uC9D0 \uC0C1\uD0DC\uB85C")}<br />{t('admin_tab_push_desc2') || (t("g_5b6e04") || "\uBA54\uC2DC\uC9C0\uB97C \uBC1B\uC744 \uC218 \uC788\uB294 \uC778\uC6D0")}
                                </span>
                            </div>
                        </div>
                        <button onClick={e => toggleCard(e, 'push')} style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '3px 8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            color: 'var(--text-secondary)',
            fontSize: '0.7rem',
            fontWeight: '600',
            transition: 'all 0.2s',
            flexShrink: 0
          }}>
                            {expandedCards.push ? <><CaretUp size={12} weight="bold" /> {t('admin_btn_collapse') || (t("g_365ca4") || "\uC811\uAE30")}</> : <><CaretDown size={12} weight="bold" /> {t('admin_btn_expand') || (t("g_bc6eea") || "\uD3BC\uCE58\uAE30")}</>}
                        </button>
                    </div>
                    <div style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: '4px'
        }}>
                        <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px'
          }}>
                            <span style={{
              fontSize: '0.9rem',
              color: '#A7F3D0',
              fontWeight: 'bold'
            }}>{t('admin_label_member') || t("g_dae3ed") || "회원"}</span>
                            <div className="card-value success" style={{
              fontSize: '1.4rem'
            }}>
                                {summary.pushEnabledCount}{t('단위_명') || t("g_5a62fd") || "명"}
                            </div>
                            <span style={{
              fontSize: '0.85rem',
              color: '#6EE7B7',
              fontWeight: 'bold'
            }}>
                                ({summary.reachableRatio}%)
                            </span>
                            <span style={{
              margin: '0 6px',
              opacity: 0.3,
              color: 'white'
            }}>|</span>
                            <span style={{
              fontSize: '0.9rem',
              color: '#FDE047',
              fontWeight: 'bold'
            }}>{t('admin_label_instructor') || t("g_620be2") || "선생님"}</span>
                            <div className="card-value gold" style={{
              fontSize: '1.4rem'
            }}>
                                {summary.instructorPushCount || 0}{t('단위_명') || t("g_5a62fd") || "명"}
                            </div>
                        </div>
                        <div style={{
            maxHeight: expandedCards.push ? '500px' : '0px',
            opacity: expandedCards.push ? 1 : 0,
            overflow: 'hidden',
            transition: expandedCards.push ? 'max-height 0.4s ease-in, opacity 0.3s ease-in 0.1s' : 'max-height 0.3s ease-out, opacity 0.15s ease-out'
          }}>
                            <div style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: `1px solid rgba(255,255,255,0.1)`
            }}>
                                <span style={{
                color: '#93C5FD',
                fontSize: '0.85rem'
              }}>{t('admin_tab_push_installed') || t('admin_tab_installed_member' || t("g_0d3e15") || "\uC571 \uC124\uCE58 \uD68C\uC6D0")} {summary.installedCount}{t('명')} ({summary.installRatio}%)</span>
                                <span style={{
                margin: '0 4px',
                opacity: 0.3
              }}>|</span>
                                 {t('오늘')} +{summary.todayInstalledCount}
                            </div>
                        </div>
                    </div>
                </div>
                {/* [NEW] Facial Data Status Card -> Interactive Filter */}
                <div className={`dashboard-card interactive ${filterType === 'bio_missing' ? 'highlight' : ''}`} onClick={() => handleToggleFilter('bio_missing')} style={{
        border: '1px solid rgba(59, 130, 246, 0.3)',
        background: 'rgba(59, 130, 246, 0.05)'
      }}>
                    <div className="card-label" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
                        <UserFocus size={16} weight="fill" color="#60A5FA" /> {t('admin_tab_bio_missing') || (t("g_9ba4ab") || "\uC548\uBA74 \uBBF8\uB4F1\uB85D \uD68C\uC6D0")}
                        <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                            <Info size={14} style={{
              opacity: 0.7
            }} />
                            <span className="tooltip-text">
                                {t('admin_tab_bio_desc1') || (t("g_d5bdf4") || "\uD0A4\uC624\uC2A4\uD06C \uC5BC\uAD74\uC778\uC2DD \uCD9C\uC11D\uC744")}<br />{t('admin_tab_bio_desc2') || (t("g_b85aeb") || "\uC704\uD574 \uC5BC\uAD74 \uB4F1\uB85D\uC774 \uC544\uC9C1")}<br />{t('admin_tab_bio_desc3') || (t("g_91674a") || "\uC548 \uB41C \uD65C\uC131 \uD68C\uC6D0 \uC218")}
                            </span>
                        </div>
                    </div>
                    <div className="card-value info" style={{
          color: '#60A5FA'
        }}>
                        {summary.bioMissingCount || 0}{t('명')}
                        <span style={{
            fontSize: '1rem',
            marginLeft: '6px',
            opacity: 0.6
          }}>/ {summary.activeMembers}</span>
                    </div>
                    <div style={{
          marginTop: '8px',
          height: '6px',
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
                        <div style={{
            width: `${100 - (summary.facialDataRatio || 0)}%`,
            height: '100%',
            background: '#60A5FA',
            transition: 'width 0.5s ease'
          }}></div>
                    </div>
                </div>
            </div>
        {/* Revenue Card (Visual Bar Chart Simulated) — 접기/펼치기 적용 */}
            {(() => {
      const now = new Date(new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Seoul'
      }));
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const progressPct = Math.round(day / daysInMonth * 100);
      return <CollapsibleCard id="members-revenue" title={`💰 ${month}${t('admin_tab_monthly_revenue') || t("g_c70a4a") || "월 매출 현황"}`} titleExtra={`${summary.monthlyRevenue.toLocaleString()}${t('단위_원') || t("g_21ba07") || "원"}`} defaultOpen={false} className="interactive animated-show" style={{
        marginBottom: '24px',
        cursor: 'pointer'
      }} onClick={() => setActiveTab('revenue')}>
                        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '10px'
        }}>
                            <div>
                                <span className="card-label outfit-font" style={{
              letterSpacing: '0.1em',
              fontSize: '0.8rem'
            }}>
                                    {month}/{day} {t('admin_tab_current_revenue') || (t("g_d70827") || "\uD604\uC7AC \uB9E4\uCD9C")}
                                </span>
                                <div className="outfit-font" style={{
              fontSize: '1.6rem',
              fontWeight: '800',
              color: 'var(--primary-gold)',
              textShadow: '0 0 20px var(--primary-gold-glow)'
            }}>
                                    {summary.monthlyRevenue.toLocaleString()}{t('단위_원') || t("g_21ba07") || "원"}
                                </div>
                            </div>
                            <div style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary)'
          }}>
                                {t('오늘')}: {summary.totalRevenueToday.toLocaleString()}{t('단위_원') || t("g_21ba07") || "원"}
                            </div>
                        </div>
                        <div style={{
          marginTop: '4px'
        }}>
                            <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '6px'
          }}>
                                <span style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              fontWeight: '600'
            }}>{day}{t('admin_tab_days_passed') || t("g_f69b8a") || "일 경과"}</span>
                                <span style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              fontWeight: '600'
            }}>{t('admin_tab_days_left') || t("g_599737") || "잔여"} {daysInMonth - day}{t('단위_일') || t("g_06cf3e") || "일"}</span>
                            </div>
                            <div style={{
            position: 'relative',
            height: '14px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '7px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
                                <div style={{
              width: `${progressPct}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #b8860b, var(--primary-gold), #ffd700)',
              borderRadius: '7px',
              transition: 'width 0.8s ease',
              boxShadow: '0 0 8px rgba(255, 215, 0, 0.3)'
            }} />
                            </div>
                            <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '8px',
            gap: '4px'
          }}>
                                <span style={{
              fontSize: '0.9rem',
              fontWeight: '800',
              color: 'var(--primary-gold)'
            }}>{month}/{day}</span>
                                <span style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)'
            }}>/ {daysInMonth}</span>
                            </div>
                        </div>
                    </CollapsibleCard>;
    })()}

            {/* 월별 재등록 추이 (매출 카드 아래, 검색 위) — 접기/펼치기 적용 */}
            {filterType === 'registration' && summary.monthlyReRegTrend && <CollapsibleCard id="members-rereg-trend" title={t('admin_tab_monthly_rereg_trend') || (t("g_23b8f6") || "\uD83D\uDCCA \uC6D4\uBCC4 \uC7AC\uB4F1\uB85D \uCD94\uC774 (\uCD5C\uADFC 6\uAC1C\uC6D4)")} titleExtra={`재등록률 ${summary.reRegistrationRate || 0}%`} defaultOpen={false} className="animated-show" style={{
      marginBottom: '24px',
      overflow: 'visible'
    }}>
                    <div style={{
        display: 'flex',
        gap: '4px',
        alignItems: 'flex-end',
        height: '140px',
        marginBottom: '10px',
        paddingTop: '20px'
      }}>
                        {summary.monthlyReRegTrend.map((m, i) => {
          const maxTotal = Math.max(...summary.monthlyReRegTrend.map(item => item.total), 1);
          const hasData = m.total > 0;
          const totalH = hasData ? Math.max(m.total / maxTotal * 70, 6) : 0;
          const reRegH = hasData ? m.reReg / m.total * totalH : 0;
          const rate = m.rate;
          return <div key={i} style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            minWidth: 0
          }}>
                                    <span style={{
              fontSize: '0.75rem',
              color: !hasData ? '#52525b' : rate >= 50 ? '#10b981' : rate >= 30 ? '#f59e0b' : '#ef4444',
              fontWeight: '700',
              lineHeight: 1,
              whiteSpace: 'nowrap'
            }}>
                                        {hasData ? `${rate}%` : '—'}
                                    </span>
                                    {hasData ? <div style={{
              position: 'relative',
              width: '70%',
              maxWidth: '36px',
              height: `${totalH}px`,
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.08)'
            }}>
                                            <div style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                height: `${reRegH}px`,
                borderRadius: '4px',
                background: rate >= 50 ? 'linear-gradient(180deg, #10b981, #059669)' : rate >= 30 ? 'linear-gradient(180deg, #f59e0b, #d97706)' : 'linear-gradient(180deg, #ef4444, #dc2626)',
                transition: 'height 0.5s ease'
              }} />
                                        </div> : <div style={{
              width: '70%',
              maxWidth: '36px',
              height: '6px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.04)'
            }} />}
                                    <span style={{
              fontSize: '0.9rem',
              color: '#a1a1aa',
              fontWeight: '600',
              lineHeight: 1,
              marginTop: '4px'
            }}>{m.month}</span>
                                    <span style={{
              fontSize: '0.8rem',
              color: '#8b8b99',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              marginTop: '2px'
            }}>{hasData ? `${m.reReg}/${m.total}명` : '—'}</span>
                                </div>;
        })}
                    </div>
                    <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        paddingTop: '10px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        fontSize: '0.9rem',
        color: '#a1a1aa'
      }}>
                        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}><span style={{
            width: '8px',
            height: '8px',
            borderRadius: '2px',
            background: '#10b981',
            display: 'inline-block'
          }} /> {t('admin_tab_rereg') || t("g_fc669b") || "재등록"}</span>
                        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}><span style={{
            width: '8px',
            height: '8px',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.08)',
            display: 'inline-block'
          }} /> {t('admin_tab_expired_member') || (t("g_8ffb9b") || "\uB9CC\uB8CC \uD68C\uC6D0")}</span>
                    </div>
                </CollapsibleCard>}

            {/* AI Churn Report — churn 필터 시 3등급 분류 패널 (매출 바로 아래) */}
            {filterType === 'churn' && allDormantMembers.length > 0 && <ChurnReportPanel dormantMembers={allDormantMembers} sales={sales} />}
    
            {/* Search & Bulk Actions */}
            <div className="search-row" style={{
      display: 'flex',
      gap: '10px',
      marginBottom: '16px',
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
                <div style={{
        position: 'relative',
        flex: 1,
        minWidth: '200px'
      }}>
                    <input type="text" className="search-input" placeholder={t('admin_tab_search_ph') || (t("g_a96ec1") || "\uD83D\uDD0D \uC774\uB984 \uB610\uB294 \uC804\uD654\uBC88\uD638 \uAC80\uC0C9...")} value={searchTerm} onChange={e => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }} style={{
          margin: 0
        }} lang="ko-KR" spellCheck="false" autoCorrect="off" autoCapitalize="off" />
                </div>
            </div>

            {/* List Criteria Display & Local Sorting */}
            <div style={{
      padding: '0 4px',
      marginBottom: '10px',
      fontSize: '0.9rem',
      color: 'var(--text-tertiary)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '10px'
    }}>
                <div>
                    {t('admin_tab_curr') || (t("g_e7755c") || "\uD604\uC7AC")} <strong style={{
          color: 'var(--primary-gold)'
        }}>
                        {filterType === 'all' && (t('admin_tab_all_member') || t("g_e8c706") || "전체 회원")}
                        {filterType === 'active' && (t('admin_tab_active_member') || t("g_b0c1d1") || "활성 회원")}
                        {filterType === 'attendance' && (t('admin_tab_today_att_member') || t("g_c1fec4") || "오늘 출석 회원")}
                        {filterType === 'registration' && (t('admin_tab_today_reg_member') || t("g_8cd435") || "오늘 등록 회원")}
                        {filterType === 'expiring' && (t('admin_tab_expiring_member') || t("g_41f035") || "만료/횟수 임박 회원")}
                        {filterType === 'dormant' && (t('admin_tab_dormant_member') || t("g_27c16f") || "잠든 회원")}
                        {filterType === 'churn' && (t('admin_tab_ai_risk_member') || t("g_6d831d") || "AI 이탈 예측 회원")}
                        {filterType === 'installed' && (t('admin_tab_push_installed') || t('admin_tab_installed_member') || t("g_5b52c7") || "앱 설치 회원")}
                        {filterType === 'bio_missing' && (t('admin_tab_bio_missing') || t("g_0c92ba") || "안면 미등록 회원")}
                    </strong>{t("g_4539db") || "목록을"}{' '}
                    <strong style={{
          color: 'var(--text-secondary)'
        }}>
                        {localSort === 'default' ? filterType === 'attendance' ? t('admin_tab_sort_latest_att') || t("g_ec3ece") || "최신 출석 순" : filterType === 'installed' ? t('admin_tab_sort_latest_inst') || t("g_ec6fb1") || "최신 설치 순" : filterType === 'registration' ? t('admin_tab_sort_latest_reg') || t("g_f6338a") || "최신 등록순" : t('admin_tab_sort_name') || t("g_be1417") || "이름을 가나다순" : localSort === 'credits_asc' ? t('admin_tab_sort_credit_asc') || t("g_720a92") || "잔여 횟수 적은 순" : localSort === 'credits_desc' ? t('admin_tab_sort_credit_desc') || t("g_3a13da") || "잔여 횟수 많은 순" : localSort === 'enddate_asc' ? t('admin_tab_sort_end_asc') || t("g_ac65bd") || "마감일 임박 순" : t('admin_tab_sort_end_desc') || t("g_68762e") || "마감일 여유 순"}
                    </strong>{t('admin_tab_viewing_msg') || (t("g_dda7cf") || "\uC73C\uB85C \uBCF4\uACE0 \uACC4\uC2ED\uB2C8\uB2E4.")}
                </div>

                {/* Legend removed per user request */}

                <select value={localSort} onChange={e => {
        setLocalSort(e.target.value);
        setCurrentPage(1);
      }} style={{
        padding: '6px 12px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'white',
        fontSize: '0.85rem',
        cursor: 'pointer'
      }}>
                    <option value="default" style={{
          color: 'white',
          background: '#333'
        }}>{t('admin_tab_sort_default') || (t("g_1cfe63") || "\uAE30\uBCF8 \uC815\uB82C")}</option>
                    <option value="credits_asc" style={{
          color: 'white',
          background: '#333'
        }}>{t('admin_tab_sort_credit_asc') || (t("g_2a5309") || "\uC794\uC5EC \uD69F\uC218 \uC801\uC740 \uC21C")}</option>
                    <option value="credits_desc" style={{
          color: 'white',
          background: '#333'
        }}>{t('admin_tab_sort_credit_desc') || (t("g_3671b4") || "\uC794\uC5EC \uD69F\uC218 \uB9CE\uC740 \uC21C")}</option>
                    <option value="enddate_asc" style={{
          color: 'white',
          background: '#333'
        }}>{t('admin_tab_sort_end_asc') || (t("g_11abf7") || "\uB9C8\uAC10\uC77C \uC784\uBC15 \uC21C")}</option>
                    <option value="enddate_desc" style={{
          color: 'white',
          background: '#333'
        }}>{t('admin_tab_sort_end_desc') || (t("g_ab4449") || "\uB9C8\uAC10\uC77C \uC5EC\uC720 \uC21C")}</option>
                </select>
            </div>


            {/* Member List */}
            <div className="card-list">
                {(() => {
        const totalPages = Math.ceil(finalFiltered.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginated = finalFiltered.slice(startIndex, startIndex + itemsPerPage);
        return <>
                            <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 4px 8px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
                                <div onClick={() => selectFilteredMembers(finalFiltered)} style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
                                    <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: finalFiltered.length > 0 && finalFiltered.every(m => selectedMemberIds.includes(m.id)) ? 'var(--primary-gold)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                                        {finalFiltered.length > 0 && finalFiltered.every(m => selectedMemberIds.includes(m.id)) && <Check size={10} color="#000" weight="bold" />}
                                    </div>
                                    {t('admin_tab_select_all') || t("g_0aa04a") || "전체 선택"} ({finalFiltered.length}{t('단위_명') || t("g_5a62fd") || "명"})
                                </div>
                                
                                {/* [NEW] Bulk Action Button */}
                                {selectedMemberIds.length > 0 && <button onClick={() => setShowBulkMessageModal(true)} style={{
              background: 'var(--primary-gold)',
              color: 'var(--text-on-primary)',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
                                        <PaperPlaneTilt weight="fill" />
                                        {t('admin_tab_btn_send_msg') || t("g_96a8bc") || "메시지 보내기"} ({selectedMemberIds.length})
                                    </button>}

                                <div>{t('admin_tab_page') || t("g_512376") || "페이지"} {currentPage} / {totalPages || 1}</div>
                            </div>

                            {paginated.length === 0 ? <div style={{
            textAlign: 'center',
            padding: '60px 0',
            opacity: 0.5
          }}>
                                    {t('admin_tab_empty_result') || (t("g_9ec1ed") || "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uAC70\uB098 \uD68C\uC6D0\uC744 \uB4F1\uB85D\uD574\uC8FC\uC138\uC694.")}
                                </div> : paginated.map(member => <div key={member.logId || member.id} className="member-list-item" onClick={() => handleOpenEdit(member)} style={{
            cursor: 'pointer'
          }}>
                                        <div style={{
              padding: '0 10px'
            }} onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" checked={selectedMemberIds.includes(member.id)} onChange={() => toggleMemberSelection(member.id)} />
                                        </div>
                                        <div style={{
              flex: 1,
              marginLeft: '10px',
              width: '100%'
            }}>
                                                <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}>
                                                    <strong style={{
                  fontSize: '1.1rem',
                  fontWeight: 800
                }}>{member.name}</strong>
                                                    {member.hasFaceDescriptor && <span className="badge" style={{
                  fontSize: '0.65rem',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#818CF8',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  padding: '1px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                                                            {t('admin_badge_bio') || (t("g_d233b5") || "\uD83E\uDDE0 \uC548\uBA74\uC778\uC2DD")}
                                                        </span>}
                                                    {filterType === 'installed' && <span className="badge" style={{
                  fontSize: '0.7rem',
                  background: member.role === 'instructor' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: member.role === 'instructor' ? '#FBBF24' : '#34D399',
                  border: member.role === 'instructor' ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '2px 6px'
                }}>
                                                            {member.role === 'instructor' ? t('admin_label_instructor') || t("g_620be2") || "선생님" : t('admin_label_member') || t("g_dae3ed") || "회원"}
                                                        </span>}
                                                    <span style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>{member.phone}</span>
                                                    {member.role !== 'instructor' && <button onClick={e => {
                  e.stopPropagation();
                  onNoteClick && onNoteClick(member);
                }} style={{
                  background: 'none',
                  border: 'none',
                  color: member.notes ? 'var(--primary-gold)' : '#52525b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  marginLeft: 'auto'
                }} title={t('admin_tt_memo') || (t("g_4de4b6") || "\uBA54\uBAA8 \uC791\uC131/\uC218\uC815")}>
                                                        <NotePencil size={18} weight={member.notes ? "fill" : "regular"} />
                                                    </button>}
                                                </div>
                                            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '4px',
                flexWrap: 'wrap'
              }}>
                                                {/* [NEW] Explicit Membership Status Badge */}
                                                {(() => {
                  const isUpcomingActive = member.upcomingMembership && member.upcomingMembership.startDate !== 'TBD' && new Date(member.upcomingMembership.startDate).getTime() <= todayStartMs;
                  if (isUpcomingActive) {
                    return <span className="badge" style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34D399',
                      border: '1px solid rgba(16, 185, 129, 0.4)'
                    }}>{t('admin_badge_active') || (t("g_0b92a7") || "\uD65C\uB3D9\uC911")}</span>;
                  }
                  const isCurrentExhausted = member.credits <= 0 || member.endDate && member.endDate !== 'TBD' && member.endDate !== 'unlimited' && new Date(member.endDate).getTime() < todayStartMs;
                  if (isCurrentExhausted && member.upcomingMembership && member.upcomingMembership.startDate === 'TBD') {
                    return <span className="badge" style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)'
                    }}>{t('admin_badge_pending_start') || (t("g_51d234") || "\uC2DC\uC791 \uB300\uAE30\uC911")}</span>;
                  }
                  if (!member.endDate || member.endDate === 'TBD' || member.endDate === 'unlimited') {
                    if (member.credits > 0 || member.credits === 9999) {
                      return <span className="badge" style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#34D399',
                        border: '1px solid rgba(16, 185, 129, 0.4)'
                      }}>{t('admin_badge_active') || (t("g_0b92a7") || "\uD65C\uB3D9\uC911")}</span>;
                    }
                    if (isCurrentExhausted && !member.upcomingMembership) {
                      return <span className="badge" style={{
                        background: 'rgba(255, 59, 48, 0.15)',
                        color: '#FF3B30',
                        border: '1px solid rgba(255, 59, 48, 0.3)'
                      }}>{t('admin_badge_expired') || (t("g_e8351c") || "\uB9CC\uB8CC/\uC18C\uC9C4")}</span>;
                    }
                    return null;
                  }
                  const endMs = new Date(member.endDate).getTime();
                  const diff = (endMs - todayStartMs) / (1000 * 60 * 60 * 24);
                  if (diff < 0 || member.credits <= 0) {
                    return <span className="badge" style={{
                      background: 'rgba(255, 59, 48, 0.15)',
                      color: '#FF3B30',
                      border: '1px solid rgba(255, 59, 48, 0.3)'
                    }}>{t('admin_badge_expired') || (t("g_e8351c") || "\uB9CC\uB8CC/\uC18C\uC9C4")}</span>;
                  } else if (diff <= 7 || member.credits <= 2) {
                    return <span className="badge" style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      color: '#FBBF24',
                      border: '1px solid rgba(245, 158, 11, 0.4)'
                    }}>{t(undefined)}</span>;
                  } else {
                    return <span className="badge" style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34D399',
                      border: '1px solid rgba(16, 185, 129, 0.4)'
                    }}>{t('admin_badge_active') || (t("g_0b92a7") || "\uD65C\uB3D9\uC911")}</span>;
                  }
                })()}

                                                {/* [NEW] Advance Registration Badge */}
                                                {member.upcomingMembership && !(member.upcomingMembership.startDate !== 'TBD' && new Date(member.upcomingMembership.startDate).getTime() <= todayStartMs) && <span className="badge" style={{
                  background: 'rgba(168, 85, 247, 0.2)',
                  color: '#C084FC',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  fontWeight: 'bold'
                }}>
                                                        {t('admin_badge_pre_reg') || (t("g_d445d7") || "\uC120\uB4F1\uB85D \uB300\uAE30\uC911")}
                                                    </span>}

                                                {/* [NEW] Hold Status Badge */}
                                                {member.holdStatus === 'holding' && <span className="badge" style={{
                  background: 'rgba(251, 146, 60, 0.2)',
                  color: '#fb923c',
                  border: '1px solid rgba(251, 146, 60, 0.4)',
                  fontWeight: 'bold',
                  animation: 'pulse 2s infinite'
                }}>
                                                        {t('admin_badge_holding') || (t("g_1aeeda") || "\u23F8\uFE0F \uD640\uB529 \uC911")}
                                                    </span>}
                                                
                                                {/* [NEW] Today Registration Badges */}
                                                {member.regDate === todayKstStr && <span className="badge" style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                                                        {t('admin_tab_new') || t("g_884009") || "신규"}
                                                    </span>}
                                                {/* Note: In MembersTab, we might not have todayReRegMemberIds prop yet. 
                                                    Let's use summary or pass it down. 
                                                    Ideally, we should rely on props. Assuming 'todayReRegMemberIds' is passed or available via context?
                                                    Actually, I should check if I can access it. 
                                                    Since I cannot easily add a prop to the component signature without changing AdminDashboard first (which I did not do fully),
                                                    I will assume AdminDashboard will pass it. 
                                                    Wait, I haven't added `todayReRegMemberIds` to MembersTab props in AdminDashboard yet.
                                                    I will do that in the NEXT step. For now, I'll use optional chaining if possible or safe access.
                                                 */}
                                                 {summary.todayReRegMemberIds && summary.todayReRegMemberIds.includes(member.id) && <span className="badge" style={{
                  background: 'rgba(59, 130, 246, 0.25)',
                  color: '#60A5FA',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  fontWeight: 'bold'
                }}>
                                                {t('admin_tab_rereg') || t("g_fc669b") || "재등록"}
                                            </span>}
                                        {summary.multiAttendedMemberIds && summary.multiAttendedMemberIds.includes(member.id) && <span className="badge" style={{
                  background: 'rgba(245, 158, 11, 0.25)',
                  color: '#FBBF24',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  fontWeight: 'bold'
                }}>{t("g_2bdce5") || "오늘"}{summary?.attendanceCountMap?.[member.id] || 2}{t("g_4934bf") || "회 출석 🔥"}</span>}
                                                {/* Status Context Badges */}
                                                {filterType === 'dormant' && (() => {
                  let lastDateMs = member.lastAttendance ? new Date(member.lastAttendance).getTime() : member.regDate ? new Date(member.regDate).getTime() : null;
                  if (!lastDateMs) return <span className="badge" style={{
                    background: 'var(--gray-700)',
                    color: '#bbb'
                  }}>{t('기록 없음')}</span>;
                  const diffTime = Math.abs(Date.now() - lastDateMs);
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return <span className="badge" style={{
                    background: 'rgba(255, 59, 48, 0.15)',
                    color: '#FF3B30',
                    border: '1px solid rgba(255, 59, 48, 0.3)',
                    fontSize: '0.75rem'
                  }}>
                                                            {diffDays}{t("g_5a292f") || "일째 미출석"}</span>;
                })()}
                                                {/* [NEW] Install Date Badge (Show only when filtered by installed) */}
                                                {filterType === 'installed' && member.installedAt && (() => {
                  const installDateStr = new Date(member.installedAt).toLocaleDateString('sv-SE', {
                    timeZone: 'Asia/Seoul'
                  });
                  const isToday = installDateStr === todayKstStr;
                  return <span className="badge" style={{
                    background: isToday ? 'rgba(76, 217, 100, 0.2)' : 'rgba(96, 165, 250, 0.15)',
                    color: isToday ? '#4CD964' : '#60A5FA',
                    border: isToday ? '1px solid rgba(76, 217, 100, 0.4)' : '1px solid rgba(96, 165, 250, 0.3)'
                  }}>
                                                            {isToday ? t("g_1af066") || "오늘 설치" : `${installDateStr.slice(2)} 설치`}
                                                        </span>;
                })()}

                                                <span style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>{member.phone}</span>
                                                <span className="badge" style={{
                  fontSize: '0.7rem',
                  // [UI] Neutralize branch color in member list as requested
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-secondary)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontWeight: 'normal'
                }}>
                                                    {getBranchName(member.homeBranch)}
                                                </span>
                                                {member.pushEnabled !== false && pushTokens.some(tk => tk.memberId === member.id) ? <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(52, 211, 153, 0.1)',
                  color: '#34D399',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  border: '1px solid rgba(52, 211, 153, 0.2)'
                }}>
                                                        <BellRinging size={12} weight="fill" /> {t('푸시 ON')}
                                                    </div> : filterType === 'installed' && <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(156, 163, 175, 0.1)',
                  color: '#9CA3AF',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  border: '1px solid rgba(156, 163, 175, 0.2)'
                }}>
                                                            <BellRinging size={12} weight="regular" /> {t('알림 꺼짐')}
                                                        </div>}
                                                {member.attendanceTime && (member.attendanceStatus === 'denied' ? <span style={{
                  fontSize: '0.75rem',
                  color: '#ff4d4f',
                  background: 'rgba(255, 77, 79, 0.15)',
                  border: '1px solid rgba(255, 77, 79, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>{t("g_8e3bf1") || "⛔ 출석거부 ("}{member.denialReason === 'expired' ? t("g_262233") || "기간" : t("g_3ac452") || "횟수"})
                                                        </span> : <span style={{
                  fontSize: '0.75rem',
                  color: 'rgba(0,0,0,0.85)',
                  background: 'var(--primary-gold)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: '700'
                }}>
                                                            {member.originalLog?.branchId && `[${getBranchName(member.originalLog.branchId)}] `}
                                                            {member.attendanceClass} ({member.attendanceTime})
                                                        </span>)}
                                            </div>
                                            {/* [FIX] 선생님(instructor)에게는 수강정보(일반/잔여/종료일) 표시하지 않음 */}
                                            {member.role !== 'instructor' && <div style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center'
              }}>
                                                <span>{member.subject || t("g_aef1a1") || "일반"}</span>
                                                <span style={{
                  opacity: 0.3
                }}>|</span>
                                                {(() => {
                  const isCurrentExhausted = member.credits <= 0 || member.endDate && member.endDate !== 'TBD' && member.endDate !== 'unlimited' && new Date(member.endDate).getTime() < todayStartMs;
                  if (isCurrentExhausted && member.upcomingMembership) {
                    const up = member.upcomingMembership;
                    return <>
                                                                <span style={{
                        color: 'var(--text-primary)',
                        fontWeight: 'bold'
                      }}>{t("g_c4a07e") || "선결제 잔여"}{up.credits === 9999 ? t("g_98a1bf") || "무제한" : `${up.credits}회`}
                                                                </span>
                                                                <span style={{
                        opacity: 0.3
                      }}>|</span>
                                                                <span style={{
                        color: 'var(--text-tertiary)',
                        fontSize: '0.85rem'
                      }}>{t("g_6d4ec1") || "종료일:"}{up.startDate === 'TBD' || up.endDate === 'TBD' ? t("g_c2838e") || "첫 출석 시 확정" : up.endDate || t("g_98a1bf") || "무제한"}
                                                                </span>
                                                            </>;
                  }
                  return <>
                                                            <span style={{
                      color: member.credits <= 0 ? 'var(--accent-error)' : member.credits <= 2 ? '#f59e0b' : 'var(--text-primary)',
                      fontWeight: 'bold'
                    }}>{t("g_599737") || "잔여"}{member.credits}{t("g_2fc05c") || "회"}</span>
                                                            <span style={{
                      opacity: 0.3
                    }}>|</span>
                                                            <span style={{
                      color: (() => {
                        if (!member.endDate || member.endDate === 'TBD' || member.endDate === 'unlimited') return 'var(--text-tertiary)';
                        const endMs = new Date(member.endDate).getTime();
                        const diff = (endMs - todayStartMs) / (1000 * 60 * 60 * 24);
                        if (diff < 0) return 'var(--accent-error)';
                        if (diff <= 7) return '#f59e0b';
                        return 'var(--text-tertiary)';
                      })(),
                      fontSize: '0.85rem'
                    }}>{t("g_6d4ec1") || "종료일:"}{member.endDate === 'TBD' ? t("g_c2838e") || "첫 출석 시 확정" : member.endDate || t("g_98a1bf") || "무제한"}
                                                            </span>
                                                        </>;
                })()}
                                            </div>}
                                            {member.notes && <div onClick={e => {
                e.stopPropagation();
                onNoteClick && onNoteClick(member);
              }} style={{
                marginTop: '8px',
                padding: '8px',
                background: 'rgba(var(--primary-rgb), 0.1)',
                borderRadius: '4px',
                fontSize: '0.8rem',
                color: 'var(--primary-gold)',
                cursor: 'pointer',
                border: '1px dashed rgba(var(--primary-rgb), 0.3)'
              }}>
                                                    <NotePencil size={12} style={{
                  marginRight: '4px'
                }} /> {member.notes}
                                                </div>}
                                        </div>
                                    </div>)}

                            <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '20px'
          }}>
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'white',
              opacity: currentPage === 1 ? 0.3 : 1
            }}>
                                    &lt;
                                </button>

                                {(() => {
              const MAX_VISIBLE_PAGES = 5;
              let startPage = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
              let endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);
              if (endPage - startPage + 1 < MAX_VISIBLE_PAGES) {
                startPage = Math.max(1, endPage - MAX_VISIBLE_PAGES + 1);
              }
              const pages = [];
              if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) pages.push('...');
              }
              for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
              }
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) pages.push('...');
                pages.push(totalPages);
              }
              return pages.map((page, idx) => <button key={idx} onClick={() => typeof page === 'number' && setCurrentPage(page)} disabled={page === '...'} style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: currentPage === page ? 'var(--primary-gold)' : 'var(--bg-surface)',
                color: currentPage === page ? '#000' : 'var(--text-secondary)',
                fontWeight: 'bold',
                border: '1px solid var(--border-color)',
                cursor: page === '...' ? 'default' : 'pointer',
                opacity: page === '...' ? 0.5 : 1
              }}>
                                            {page}
                                        </button>);
            })()}

                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'white',
              opacity: currentPage === totalPages ? 0.3 : 1
            }}>
                                    &gt;
                                </button>
                            </div>
                        </>;
      })()}
            </div>
        </div>;
};
export default memo(MembersTab);