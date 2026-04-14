import { useState, useEffect, useCallback } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { storageService } from '../../../services/storage';
import { Trash, ArrowCounterClockwise, ClockCounterClockwise, CurrencyKrw, Users, Spinner } from '@phosphor-icons/react';
const TrashTab = () => {
  const t = useLanguageStore(s => s.t);
  const [deletedSales, setDeletedSales] = useState([]);
  const [deletedAttendance, setDeletedAttendance] = useState([]);
  const [deletedMembers, setDeletedMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);
  const [activeSection, setActiveSection] = useState('all');
  const loadDeletedItems = useCallback(async () => {
    setLoading(true);
    try {
      const [sales, attendance, members] = await Promise.all([storageService.getDeletedSales(), storageService.getDeletedAttendance(), storageService.getDeletedMembers()]);
      setDeletedSales(sales || []);
      setDeletedAttendance(attendance || []);
      setDeletedMembers(members || []);
    } catch (e) {
      console.error('[TrashTab] Load failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadDeletedItems();
  }, [loadDeletedItems]);
  const handleRestoreSales = async id => {
    if (!confirm(t("g_a85bc1") || "\uC774 \uB9E4\uCD9C \uAE30\uB85D\uC744 \uBCF5\uC6D0\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;
    setRestoringId(id);
    try {
      await storageService.restoreSalesRecord(id);
      setDeletedSales(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert((t("g_5dd886") || "\uBCF5\uC6D0 \uC2E4\uD328: ") + e.message);
    } finally {
      setRestoringId(null);
    }
  };
  const handleRestoreAttendance = async id => {
    if (!confirm(t("g_2604f8") || "\uC774 \uCD9C\uC11D \uAE30\uB85D\uC744 \uBCF5\uC6D0\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n(\uD06C\uB808\uB527\uC774 \uB2E4\uC2DC \uCC28\uAC10\uB429\uB2C8\uB2E4)")) return;
    setRestoringId(id);
    try {
      await storageService.restoreAttendance(id);
      setDeletedAttendance(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      alert((t("g_5dd886") || "\uBCF5\uC6D0 \uC2E4\uD328: ") + e.message);
    } finally {
      setRestoringId(null);
    }
  };
  const handleRestoreMember = async id => {
    if (!confirm(t("g_96f93d") || "\uC774 \uD68C\uC6D0\uC744 \uBCF5\uC6D0\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\uBCF5\uC6D0\uB41C \uD68C\uC6D0\uC740 \uD68C\uC6D0 \uBAA9\uB85D\uC5D0 \uB2E4\uC2DC \uB098\uD0C0\uB0A9\uB2C8\uB2E4.")) return;
    setRestoringId(id);
    try {
      await storageService.restoreMember(id);
      setDeletedMembers(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      alert((t("g_5dd886") || "\uBCF5\uC6D0 \uC2E4\uD328: ") + e.message);
    } finally {
      setRestoringId(null);
    }
  };
  const handlePermanentDeleteSales = async id => {
    if (!confirm(t("g_5c32c2") || "\uACBD\uACE0: \uC774 \uD56D\uBAA9\uC744 \uC601\uAD6C\uC801\uC73C\uB85C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC73C\uBA70, \uBAA8\uB4E0 \uB370\uC774\uD130\uBCA0\uC774\uC2A4\uC5D0\uC11C \uC644\uC804\uD788 \uC0AD\uC81C\uB429\uB2C8\uB2E4.")) return;
    setRestoringId(id); // Use the same loading state
    try {
      await storageService.permanentDeleteSalesRecord(id);
      setDeletedSales(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert((t("g_9daa95") || "\uC601\uAD6C \uC0AD\uC81C \uC2E4\uD328: ") + e.message);
    } finally {
      setRestoringId(null);
    }
  };
  const handlePermanentDeleteAttendance = async id => {
    if (!confirm(t("g_5c32c2") || "\uACBD\uACE0: \uC774 \uD56D\uBAA9\uC744 \uC601\uAD6C\uC801\uC73C\uB85C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC73C\uBA70, \uBAA8\uB4E0 \uB370\uC774\uD130\uBCA0\uC774\uC2A4\uC5D0\uC11C \uC644\uC804\uD788 \uC0AD\uC81C\uB429\uB2C8\uB2E4.")) return;
    setRestoringId(id);
    try {
      await storageService.permanentDeleteAttendance(id);
      setDeletedAttendance(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      alert((t("g_9daa95") || "\uC601\uAD6C \uC0AD\uC81C \uC2E4\uD328: ") + e.message);
    } finally {
      setRestoringId(null);
    }
  };
  const handlePermanentDeleteMember = async id => {
    if (!confirm(t("g_e590f2") || "\uD83D\uDEA8 \uCD5C\uC885 \uACBD\uACE0: \uC774 \uD68C\uC6D0\uC744 \uC601\uAD6C\uC801\uC73C\uB85C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\uD68C\uC6D0 \uC815\uBCF4\uAC00 \uB370\uC774\uD130\uBCA0\uC774\uC2A4\uC5D0\uC11C \uD754\uC801 \uC5C6\uC774 \uC644\uC804\uD788 \uC0AD\uC81C\uB418\uBA70 \uC808\uB300 \uBCF5\uAD6C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.")) return;
    setRestoringId(id);
    try {
      await storageService.permanentDeleteMember(id);
      setDeletedMembers(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      alert((t("g_9daa95") || "\uC601\uAD6C \uC0AD\uC81C \uC2E4\uD328: ") + e.message);
    } finally {
      setRestoringId(null);
    }
  };
  const formatDate = dateStr => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const formatAmount = amount => {
    if (!amount) return '-';
    return Number(amount).toLocaleString() + (t("g_771dc3") || "\uC6D0");
  };
  const totalCount = deletedSales.length + deletedAttendance.length + deletedMembers.length;
  const filteredSales = activeSection === 'attendance' || activeSection === 'members' ? [] : deletedSales;
  const filteredAttendance = activeSection === 'sales' || activeSection === 'members' ? [] : deletedAttendance;
  const filteredMembers = activeSection === 'sales' || activeSection === 'attendance' ? [] : deletedMembers;
  if (loading) {
    return <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '80px 0',
      color: 'var(--text-secondary)'
    }}>
                <Spinner size={24} className="spin" style={{
        marginRight: '8px'
      }} />
                {t('삭제된 항목 불러오는 중...')}
            </div>;
  }
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  }}>
            {/* Header */}
            <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
                    <Trash size={24} weight="fill" style={{
          color: 'var(--text-secondary)'
        }} />
                    <h2 style={{
          margin: 0,
          fontSize: '1.2rem',
          color: 'var(--text-primary)'
        }}>{t("g_135a45") || "\uD734\uC9C0\uD1B5"}{totalCount > 0 && <span style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginLeft: '8px',
            fontWeight: 400
          }}>{totalCount}{t("g_230561") || "\uAC74"}</span>}
                    </h2>
                </div>
                <button onClick={loadDeletedItems} className="action-btn sm" style={{
        background: 'rgba(255,255,255,0.05)',
        color: 'var(--text-secondary)',
        border: 'none',
        fontSize: '0.75rem'
      }}>
                    <ArrowCounterClockwise size={14} style={{
          marginRight: '4px'
        }} />
                    {t('새로고침')}
                </button>
            </div>

            {/* Filter Tabs */}
            <div style={{
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    }}>
                {[{
        key: 'all',
        label: t("g_d1d0de") || "\uC804\uCCB4",
        count: totalCount
      }, {
        key: 'members',
        label: t("g_6745df") || "\uD68C\uC6D0",
        count: deletedMembers.length,
        icon: <Users size={14} />
      }, {
        key: 'attendance',
        label: t("g_b31acb") || "\uCD9C\uC11D",
        count: deletedAttendance.length,
        icon: <ClockCounterClockwise size={14} />
      }, {
        key: 'sales',
        label: t("g_69735f") || "\uB9E4\uCD9C",
        count: deletedSales.length,
        icon: <CurrencyKrw size={14} />
      }].map(tab => <button key={tab.key} onClick={() => setActiveSection(tab.key)} style={{
        padding: '6px 14px',
        borderRadius: '20px',
        border: activeSection === tab.key ? '1px solid var(--primary-gold)' : '1px solid var(--border-color)',
        background: activeSection === tab.key ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
        color: activeSection === tab.key ? 'var(--primary-gold)' : 'var(--text-secondary)',
        fontSize: '0.8rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s'
      }}>
                        {tab.icon} {tab.label} {tab.count > 0 && <span style={{
          opacity: 0.7
        }}>({tab.count})</span>}
                    </button>)}
            </div>

            {/* Empty State */}
            {totalCount === 0 && <div className="dashboard-card" style={{
      textAlign: 'center',
      padding: '60px 20px'
    }}>
                    <Trash size={48} style={{
        color: 'var(--border-color)',
        marginBottom: '16px'
      }} />
                    <p style={{
        color: 'var(--text-secondary)',
        fontSize: '0.95rem',
        margin: 0
      }}>{t('삭제된 항목이 없습니다')}</p>
                    <p style={{
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        marginTop: '8px'
      }}>{t('회원, 출석 또는 매출을 삭제하면 이곳에 보관됩니다')}</p>
                </div>}

            {/* Deleted Members */}
            {filteredMembers.length > 0 && <div className="dashboard-card">
                    <h3 className="card-label" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px'
      }}>
                        <Users size={18} weight="fill" style={{
          color: '#f43f5e'
        }} />{t("g_3328a4") || "\uC0AD\uC81C\uB41C \uD68C\uC6D0 ("}{deletedMembers.length}{t("g_df355c") || "\uBA85)"}</h3>
                    <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
                        {filteredMembers.map(member => <div key={member.id} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          transition: 'background 0.15s'
        }}>
                                <div style={{
            flex: 1,
            minWidth: 0
          }}>
                                    <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
                                        <span style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'white'
              }}>
                                            {member.name || t("g_7f2b08") || "\uC774\uB984\uC5C6\uC74C"}
                                        </span>
                                        {member.phone && <span style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                background: 'rgba(244,63,94,0.1)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                                                {member.phone}
                                            </span>}
                                        {member.membershipType && <span style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.05)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                                                {member.membershipType}
                                            </span>}
                                    </div>
                                    <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: '4px'
            }}>{t("g_34c1e0") || "\uC794\uC5EC"}{member.credits || 0}{t("g_c31d4c") || "\uD68C \xB7 \uCD9C\uC11D"}{member.attendanceCount || 0}{t("g_a0d062") || "\uD68C \xB7 \uC0AD\uC81C:"}{formatDate(member.deletedAt)}
                                    </div>
                                </div>
                                <div style={{
            display: 'flex',
            gap: '8px'
          }}>
                                    <button onClick={() => handleRestoreMember(member.id)} disabled={restoringId === member.id} style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(244,63,94,0.3)',
              background: 'rgba(244,63,94,0.08)',
              color: '#f43f5e',
              fontSize: '0.75rem',
              cursor: restoringId === member.id ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: restoringId === member.id ? 0.5 : 1,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}>
                                        {restoringId === member.id ? <Spinner size={12} className="spin" /> : <ArrowCounterClockwise size={12} />}{t("g_a45357") || "\uBCF5\uC6D0"}</button>
                                    <button onClick={() => handlePermanentDeleteMember(member.id)} disabled={restoringId === member.id} style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              cursor: restoringId === member.id ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: restoringId === member.id ? 0.5 : 1,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }} onMouseOver={e => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
            }} onMouseOut={e => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}>
                                        {t('완전 삭제')}
                                    </button>
                                </div>
                            </div>)}
                    </div>
                </div>}

            {/* Deleted Attendance */}
            {filteredAttendance.length > 0 && <div className="dashboard-card">
                    <h3 className="card-label" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px'
      }}>
                        <ClockCounterClockwise size={18} weight="fill" style={{
          color: '#60a5fa'
        }} />{t("g_2c0aac") || "\uC0AD\uC81C\uB41C \uCD9C\uC11D ("}{deletedAttendance.length}{t("g_bcbcd4") || "\uAC74)"}</h3>
                    <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
                        {filteredAttendance.map(log => <div key={log.id} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          transition: 'background 0.15s'
        }}>
                                <div style={{
            flex: 1,
            minWidth: 0
          }}>
                                    <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
                                        <span style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                                            {log.memberName || t("g_6745df") || "\uD68C\uC6D0"}
                                        </span>
                                        <span style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                background: 'rgba(96,165,250,0.1)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                                            {log.className || t("g_8209e5") || "\uC77C\uBC18"}
                                        </span>
                                        {log.branchId && <span style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)'
              }}>{log.branchId}</span>}
                                    </div>
                                    <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: '4px'
            }}>{t("g_ffe5ed") || "\uCD9C\uC11D\uC77C:"}{log.date || '-'}{t("g_6b107c") || "\xB7 \uC0AD\uC81C:"}{formatDate(log.deletedAt)}
                                    </div>
                                </div>
                                <div style={{
            display: 'flex',
            gap: '8px'
          }}>
                                    <button onClick={() => handleRestoreAttendance(log.id)} disabled={restoringId === log.id} style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(var(--primary-rgb),0.3)',
              background: 'rgba(var(--primary-rgb),0.08)',
              color: 'var(--primary-gold)',
              fontSize: '0.75rem',
              cursor: restoringId === log.id ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: restoringId === log.id ? 0.5 : 1,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}>
                                        {restoringId === log.id ? <Spinner size={12} className="spin" /> : <ArrowCounterClockwise size={12} />}{t("g_a45357") || "\uBCF5\uC6D0"}</button>
                                    <button onClick={() => handlePermanentDeleteAttendance(log.id)} disabled={restoringId === log.id} style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              cursor: restoringId === log.id ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: restoringId === log.id ? 0.5 : 1,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }} onMouseOver={e => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
            }} onMouseOut={e => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}>
                                        {t('완전 삭제')}
                                    </button>
                                </div>
                            </div>)}
                    </div>
                </div>}

            {/* Deleted Sales */}
            {filteredSales.length > 0 && <div className="dashboard-card">
                    <h3 className="card-label" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px'
      }}>
                        <CurrencyKrw size={18} weight="fill" style={{
          color: '#d4af37'
        }} />{t("g_9d4f1b") || "\uC0AD\uC81C\uB41C \uB9E4\uCD9C ("}{deletedSales.length}{t("g_bcbcd4") || "\uAC74)"}</h3>
                    <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
                        {filteredSales.map(sale => <div key={sale.id} style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          transition: 'background 0.15s'
        }}>
                                <div style={{
            flex: 1,
            minWidth: 0
          }}>
                                    <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
                                        <span style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                                            {sale.memberName || t("g_6745df") || "\uD68C\uC6D0"}
                                        </span>
                                        <span style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                background: 'rgba(212,175,55,0.1)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                                            {sale.planLabel || sale.type || t("g_974537") || "\uD68C\uC6D0\uAD8C"}
                                        </span>
                                        <span style={{
                fontSize: '0.9rem',
                color: '#d4af37',
                fontWeight: 'bold'
              }}>
                                            {formatAmount(sale.amount)}
                                        </span>
                                    </div>
                                    <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: '4px'
            }}>{t("g_be0577") || "\uACB0\uC81C\uC77C:"}{formatDate(sale.date || sale.timestamp)}{t("g_6b107c") || "\xB7 \uC0AD\uC81C:"}{formatDate(sale.deletedAt)}
                                    </div>
                                </div>
                                <div style={{
            display: 'flex',
            gap: '8px'
          }}>
                                    <button onClick={() => handleRestoreSales(sale.id)} disabled={restoringId === sale.id} style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(var(--primary-rgb),0.3)',
              background: 'rgba(var(--primary-rgb),0.08)',
              color: 'var(--primary-gold)',
              fontSize: '0.75rem',
              cursor: restoringId === sale.id ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: restoringId === sale.id ? 0.5 : 1,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}>
                                        {restoringId === sale.id ? <Spinner size={12} className="spin" /> : <ArrowCounterClockwise size={12} />}{t("g_a45357") || "\uBCF5\uC6D0"}</button>
                                    <button onClick={() => handlePermanentDeleteSales(sale.id)} disabled={restoringId === sale.id} style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              cursor: restoringId === sale.id ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: restoringId === sale.id ? 0.5 : 1,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }} onMouseOver={e => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
            }} onMouseOut={e => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}>
                                        {t('완전 삭제')}
                                    </button>
                                </div>
                            </div>)}
                    </div>
                </div>}
        </div>;
};
export default TrashTab;