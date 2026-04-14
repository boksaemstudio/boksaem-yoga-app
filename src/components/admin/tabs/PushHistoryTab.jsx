import { useState, useEffect, useMemo } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { BellRinging, User, Users, Clock, CheckCircle, WarningCircle, CaretLeft, CaretRight, FunnelSimple } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
import { useStudioConfig } from '../../../contexts/StudioContext';
const PAGE_SIZE = 20;
const PushHistoryTab = ({
  onSelectMember,
  setActiveTab,
  pendingApprovals = [],
  onApprove,
  onReject
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const primaryColor = config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)';
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'sent' | 'failed'
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD
  const [searchText, setSearchText] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    const unsub = storageService.subscribeToPushHistory(data => {
      setHistory(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFilter, searchText]);

  // Filtered data
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Date filter
      if (dateFilter) {
        const itemDate = item.displayDate || item.createdAt;
        if (!itemDate) return false;
        const d = typeof itemDate === 'string' ? itemDate : itemDate.toDate ? itemDate.toDate().toISOString() : '';
        if (!d.startsWith(dateFilter)) return false;
      }

      // Search text (member name or body)
      if (searchText) {
        const q = searchText.toLowerCase();
        const name = (item.memberName || item.targetMemberName || '').toLowerCase();
        const body = (item.body || item.content || '').toLowerCase();
        if (!name.includes(q) && !body.includes(q)) return false;
      }
      return true;
    });
  }, [history, statusFilter, dateFilter, searchText]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const pagedHistory = filteredHistory.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  if (isLoading) {
    return <div style={{
      textAlign: 'center',
      padding: '100px 0',
      opacity: 0.5
    }}>{t('로딩 중...')}</div>;
  }
  return <div className="dashboard-card shadow-lg" style={{
    background: 'rgba(25,25,25,0.7)',
    border: '1px solid rgba(255,255,255,0.05)'
  }}>
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '1px solid rgba(255,255,255,0.05)'
    }}>
                <div>
                    <h3 className="outfit-font" style={{
          fontSize: '1.4rem',
          fontWeight: 700,
          margin: 0
        }}>{t('알림 발송 기록')}</h3>
                    <p style={{
          margin: '5px 0 0 0',
          opacity: 0.5,
          fontSize: '0.85rem'
        }}>{t('단체 및 개별 푸시 알림 발송 이력입니다.')}</p>
                </div>
                <div style={{
        textAlign: 'right'
      }}>
                    <div style={{
          fontSize: '1.1rem',
          fontWeight: 'bold',
          color: primaryColor
        }}>{filteredHistory.length}</div>
                    <div style={{
          fontSize: '0.7rem',
          opacity: 0.5
        }}>{statusFilter === 'all' ? t("g_d1d0de") || "\uC804\uCCB4" : statusFilter === 'sent' ? t("g_13e288") || "\uC131\uACF5" : t("g_086147") || "\uC2E4\uD328"}{t("g_aa0e06") || "\uAC74\uC218"}</div>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div style={{
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      marginBottom: '20px',
      padding: '14px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.06)',
      alignItems: 'center'
    }}>
                <FunnelSimple size={18} style={{
        opacity: 0.5,
        flexShrink: 0
      }} />

                {/* Status Filter */}
                <div style={{
        display: 'flex',
        gap: '4px'
      }}>
                    {[{
          id: 'all',
          label: t("g_d1d0de") || "\uC804\uCCB4",
          color: '#a1a1aa'
        }, {
          id: 'sent',
          label: t("g_13e288") || "\uC131\uACF5",
          color: '#28A745'
        }, {
          id: 'failed',
          label: t("g_086147") || "\uC2E4\uD328",
          color: '#EF4444'
        }].map(f => <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
          padding: '5px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 600,
          border: statusFilter === f.id ? `1px solid ${f.color}` : '1px solid rgba(255,255,255,0.08)',
          background: statusFilter === f.id ? `${f.color}20` : 'transparent',
          color: statusFilter === f.id ? f.color : '#a1a1aa',
          cursor: 'pointer',
          transition: 'all 0.15s'
        }}>{f.label}</button>)}
                </div>

                {/* Date Filter */}
                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} onClick={e => {
        try {
          e.target.showPicker?.();
        } catch (err) {}
      }} style={{
        padding: '5px 10px',
        borderRadius: '8px',
        fontSize: '0.8rem',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)',
        color: dateFilter ? '#fff' : '#71717a',
        cursor: 'pointer',
        fontFamily: 'var(--font-main)'
      }} />
                {dateFilter && <button onClick={() => setDateFilter('')} style={{
        padding: '4px 8px',
        borderRadius: '6px',
        fontSize: '0.7rem',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(239,68,68,0.1)',
        color: '#EF4444',
        cursor: 'pointer'
      }}>{t('날짜 초기화')}</button>}

                {/* Search */}
                <input type="text" placeholder={t('회원명/내용 검색...')} value={searchText} onChange={e => setSearchText(e.target.value)} style={{
        flex: 1,
        minWidth: '120px',
        padding: '5px 12px',
        borderRadius: '8px',
        fontSize: '0.8rem',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)',
        color: '#fff',
        outline: 'none'
      }} />
            </div>

            <div className="card-list">
                {/* Pending Approvals Section */}
                {pendingApprovals.length > 0 && <div style={{
        marginBottom: '30px'
      }}>
                        <h4 style={{
          color: '#FFC107',
          margin: '0 0 15px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
                            <WarningCircle weight="fill" />{t("g_830e7d") || "\uC2B9\uC778 \uB300\uAE30 \uBA54\uC2DC\uC9C0 ("}{pendingApprovals.length})
                        </h4>
                        {pendingApprovals.map(item => <div key={item.id} className="glass-panel" style={{
          padding: '20px',
          marginBottom: '15px',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          background: 'rgba(255, 193, 7, 0.05)',
          borderRadius: '12px'
        }}>
                                <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}>
                                    <div>
                                        <span style={{
                background: '#FFC107',
                color: 'var(--text-on-primary)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                marginRight: '8px'
              }}>
                                            {item.type === 'low_credits' ? t("g_20b5de") || "\uD06C\uB808\uB527 \uC54C\uB9BC" : item.type === 'notice' ? t("g_02a606") || "\uACF5\uC9C0 \uBC1C\uC1A1" : t("g_83e246") || "\uAE30\uD0C0 \uC54C\uB9BC"}
                                        </span>
                                        <span style={{
                fontSize: '0.9rem',
                color: '#FFF'
              }}>{item.title}</span>
                                    </div>
                                    <div style={{
              fontSize: '0.8rem',
              opacity: 0.7
            }}>
                                        {new Date(item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt).toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul'
              })}
                                    </div>
                                </div>
                                <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '15px',
            whiteSpace: 'pre-wrap',
            fontSize: '0.9rem',
            lineHeight: 1.5
          }}>
                                    {item.body}
                                </div>
                                <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
                                    <div style={{
              fontSize: '0.85rem',
              opacity: 0.7
            }}>{t("g_00bdfe") || "\uBC1C\uC1A1 \uB300\uC0C1:"}{item.targetMemberIds?.length || 0}{t("g_7b3c6e") || "\uBA85"}</div>
                                    <div style={{
              display: 'flex',
              gap: '10px'
            }}>
                                        <button onClick={() => onReject(item.id)} style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: '#FFF',
                cursor: 'pointer'
              }}>{t('삭제')}</button>
                                        <button onClick={() => onApprove(item.id, item.title)} style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#FFC107',
                color: 'var(--text-on-primary)',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>{t('승인 및 발송')}</button>
                                    </div>
                                </div>
                            </div>)}
                    </div>}

                <h4 style={{
        margin: '0 0 15px 0',
        opacity: 0.7
      }}>{t('발송 이력')}</h4>
                {pagedHistory.length === 0 ? <div style={{
        textAlign: 'center',
        padding: '60px 0',
        opacity: 0.5
      }}>
                        <BellRinging size={48} style={{
          marginBottom: '15px'
        }} />
                        <p>{history.length > 0 ? t("g_53e5a7") || "\uC870\uAC74\uC5D0 \uB9DE\uB294 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." : t("g_509764") || "\uBC1C\uC1A1 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
                    </div> : pagedHistory.map(item => {
        const isNotice = item.type === 'campaign' || item.type === 'notice';
        const isClickable = item.type === 'individual' && item.targetMemberId || isNotice;
        let label = "\uC54C \uC218 \uC5C6\uC74C";
        if (item.type === 'campaign') label = "\uC571 \uD478\uC2DC (\uB2E8\uCCB4)";else if (item.type === 'notice') label = "\uACF5\uC9C0 \uC54C\uB9BC";else if (item.type === 'individual') label = `앱 푸시 (${item.memberName || item.targetMemberName || t("g_80601c") || "\uC54C \uC218 \uC5C6\uC74C"})`;else if (item.type === 'sms_msg' || item.method === (t("g_3ca941") || "\uBB38\uC790")) label = "\uBB38\uC790 \uBC1C\uC1A1";
        const isSms = item.type === 'sms_msg' || item.method === (t("g_3ca941") || "\uBB38\uC790");
        return <div key={item.id} className="glass-panel" onClick={() => {
          if (item.type === 'individual' && item.targetMemberId && onSelectMember) {
            onSelectMember(item.targetMemberId);
          } else if (isNotice && setActiveTab) {
            setActiveTab('notices');
          }
        }} style={{
          marginBottom: '15px',
          padding: '20px',
          border: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          position: 'relative',
          transition: 'all 0.2s ease',
          cursor: isClickable ? 'pointer' : 'default'
        }} onMouseEnter={e => {
          if (isClickable) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        }} onMouseLeave={e => {
          if (isClickable) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
        }}>
                                <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '12px'
          }}>
                                    <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
                                        <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isSms ? 'rgba(74, 222, 128, 0.15)' : isNotice ? `${primaryColor}20` : 'rgba(59, 130, 246, 0.15)',
                color: isSms ? '#4ADE80' : isNotice ? primaryColor : '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                                            {isSms ? <span style={{
                  fontSize: '1.2rem'
                }}>💬</span> : isNotice ? <Users size={20} weight="fill" /> : <User size={20} weight="fill" />}
                                        </div>
                                        <div>
                                            <div style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: isSms ? '#4ADE80' : isNotice ? primaryColor : '#3B82F6'
                }}>
                                                {label}
                                            </div>
                                            <div style={{
                  fontSize: '0.75rem',
                  opacity: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                                                <Clock size={12} /> {new Date(item.displayDate).toLocaleString('ko-KR', {
                    timeZone: 'Asia/Seoul'
                  })}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
                                        {isNotice && <span style={{
                fontSize: '0.65rem',
                padding: '2px 8px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                                                {item.totalTargets > 0 ? `${item.totalTargets}명` : item.target === 'all' ? t("g_d1d0de") || "\uC804\uCCB4" : t("g_4594ab") || "\uB2E8\uCCB4"}
                                            </span>}
                                        <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.65rem',
                padding: '2px 8px',
                borderRadius: '20px',
                background: item.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : item.status === 'pending' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(40, 167, 69, 0.1)',
                color: item.status === 'failed' ? '#EF4444' : item.status === 'pending' ? '#FFC107' : '#28A745',
                border: `1px solid ${item.status === 'failed' ? 'rgba(239, 68, 68, 0.2)' : item.status === 'pending' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(40, 167, 69, 0.2)'}`
              }}>
                                            {item.status === 'failed' ? <WarningCircle size={10} /> : item.status === 'pending' ? <WarningCircle size={10} /> : <CheckCircle size={10} />}
                                            {item.status === 'failed' ? t("g_6159b7") || "\uBC1C\uC1A1 \uC2E4\uD328" : item.status === 'pending' ? t("g_8c9f6e") || "\uC804\uC1A1 \uC911" : t("g_1fb3af") || "\uBC1C\uC1A1 \uC644\uB8CC"}
                                        </span>
                                    </div>
                                </div>
                                <div style={{
            fontSize: '0.9rem',
            opacity: 0.9,
            lineHeight: 1.6,
            background: item.status === 'failed' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0,0,0,0.2)',
            border: item.status === 'failed' ? '1px dashed rgba(239, 68, 68, 0.2)' : 'none',
            padding: '12px 15px',
            borderRadius: '8px',
            color: item.status === 'failed' ? '#FCA5A5' : 'rgba(255,255,255,0.85)',
            whiteSpace: 'pre-wrap'
          }}>
                                    {item.body || item.content}
                                    {item.status === 'failed' && <div style={{
              marginTop: '8px',
              fontSize: '0.75rem',
              color: '#EF4444',
              fontWeight: 'bold'
            }}>{t("g_cb11d7") || "\uC6D0\uC778:"}{item.error || t("g_eb875a") || "\uBFCC\uB9AC\uC624 \uC5F0\uB3D9 \uC124\uC815 \uB4F1"}
                                        </div>}
                                </div>
                            </div>;
      })}

                {/* ── Pagination ── */}
                {totalPages > 1 && <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        marginTop: '20px',
        padding: '15px 0',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          border: '1px solid rgba(255,255,255,0.1)',
          background: currentPage === 1 ? 'transparent' : 'rgba(255,255,255,0.05)',
          color: currentPage === 1 ? '#52525b' : '#fff',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
        }}><CaretLeft size={14} /> {t('이전')}</button>

                        <span style={{
          fontSize: '0.85rem',
          color: '#a1a1aa'
        }}>
                            <span style={{
            color: primaryColor,
            fontWeight: 700
          }}>{currentPage}</span> / {totalPages}
                        </span>

                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          border: '1px solid rgba(255,255,255,0.1)',
          background: currentPage === totalPages ? 'transparent' : 'rgba(255,255,255,0.05)',
          color: currentPage === totalPages ? '#52525b' : '#fff',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
        }}>{t('다음')} <CaretRight size={14} /></button>
                    </div>}
            </div>
        </div>;
};
export default PushHistoryTab;