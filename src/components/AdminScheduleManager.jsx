import { useState, memo } from 'react';
import { CaretLeft, CaretRight, Plus, Trash, X, Gear, ClockCounterClockwise, Warning } from '@phosphor-icons/react';
import { getHolidayName } from '../utils/holidays';
import { ScheduleClassEditor, SettingsModal } from './ScheduleHelpers';
import { getTagColor } from '../utils/colors';
import { useLanguageStore } from '../stores/useLanguageStore';
import { useStudioConfig } from '../contexts/StudioContext';
import * as bookingService from '../services/bookingService';
import { useScheduleData } from '../hooks/useScheduleData';
const ColorLegend = memo(({
  branchId
}) => {
  const {
    config
  } = useStudioConfig();
  const t = useLanguageStore(s => s.t);
  const items = config.SCHEDULE_LEGEND || [{
    label: t("g_aef1a1") || "일반",
    color: '#FFFFFF',
    border: '#DDDDDD',
    branches: (config.BRANCHES || []).map(b => b.id)
  }, {
    label: t("g_ff51fe") || "특별/심화",
    color: 'rgba(255, 190, 118, 0.9)',
    border: 'rgba(255, 190, 118, 1)',
    branches: (config.BRANCHES || []).map(b => b.id)
  }];
  const filteredItems = branchId ? items.filter(item => !item.branches || item.branches.includes(branchId)) : items;
  return <div style={{
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
    justifyContent: 'flex-end'
  }}>
            {filteredItems.map(item => <div key={item.label} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '0.75rem',
      color: 'var(--text-secondary)'
    }}>
                    <div style={{
        width: '10px',
        height: '10px',
        borderRadius: '3px',
        background: item.color,
        border: `1px solid ${item.border}`
      }}></div>
                    <span style={{
        fontWeight: '500'
      }}>{item.label}</span>
                </div>)}
        </div>;
});
ColorLegend.displayName = 'ColorLegend';
const AdminScheduleManager = ({
  branchId
}) => {
  const {
    config
  } = useStudioConfig();
  const {
    t
  } = useLanguageStore();
  const allowBooking = config?.POLICIES?.ALLOW_BOOKING;
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dayClasses, setDayClasses] = useState([]);
  const {
    year,
    month,
    loading,
    monthlyClasses,
    scheduleStatus,
    images,
    instructors,
    setInstructors,
    classTypes,
    setClassTypes,
    classLevels,
    setClassLevels,
    monthlyBookings,
    handlePrevMonth,
    handleNextMonth,
    handleCreateStandard,
    handleCopyPrevMonth,
    handleReset,
    confirmReset,
    handleOpenRestore,
    handleRestoreBackup,
    saveDayClasses,
    backupList,
    showResetConfirm,
    setShowResetConfirm,
    showRestoreModal,
    setShowRestoreModal
  } = useScheduleData(branchId, config);
  const handleDateClick = dateStr => {
    setSelectedDate(dateStr);
    setDayClasses(monthlyClasses[dateStr] ? [...monthlyClasses[dateStr]] : []);
    setShowEditModal(true);
  };
  const handleSave = async (applyToAll = false) => {
    const success = await saveDayClasses(selectedDate, dayClasses, applyToAll);
    if (success) setShowEditModal(false);
  };

  // ── Calendar Grid ──
  const renderCalendar = () => {
    const startDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const dates = [];
    for (let i = 0; i < startDay; i++) dates.push(null);
    for (let i = 1; i <= daysInMonth; i++) dates.push(new Date(year, month - 1, i));
    return <div style={{
      overflowX: 'auto',
      paddingBottom: '12px'
    }}>
                <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '4px',
        minWidth: '800px'
      }}>
                    {[t("g_06cf3e") || "일", t("g_754486") || "월", t("g_adb4a2") || "화", t("g_c04eb2") || "수", t("g_5664a6") || "목", t("g_cf5632") || "금", t("g_b9e406") || "토"].map(d => <div key={d} style={{
          textAlign: 'center',
          fontWeight: 'bold',
          padding: '8px',
          color: 'var(--text-secondary)'
        }}>{d}</div>)}
                    {dates.map((date, i) => {
          const dateStr = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : `empty-${i}`;
          const classes = date ? monthlyClasses[dateStr] || [] : [];
          const isToday = date && date.toDateString() === new Date().toDateString();
          const holidayName = date ? getHolidayName(dateStr) : null;
          const isSunday = date && date.getDay() === 0;
          return <div key={dateStr} onClick={() => date && handleDateClick(dateStr)} style={{
            minHeight: '100px',
            backgroundColor: date ? isToday ? 'rgba(var(--primary-rgb), 0.08)' : 'var(--bg-card)' : 'transparent',
            border: date ? isToday ? '2px solid var(--primary-gold)' : '1px solid var(--border-color)' : 'none',
            boxShadow: isToday ? '0 0 15px rgba(var(--primary-rgb), 0.2)' : 'none',
            borderRadius: '8px',
            padding: '6px',
            cursor: date ? 'pointer' : 'default',
            position: 'relative',
            zIndex: isToday ? 2 : 1
          }}>
                                {date && <>
                                    <div style={{
                fontSize: '0.9rem',
                fontWeight: 'bold',
                marginBottom: '4px',
                color: holidayName || isSunday ? '#ff4757' : 'var(--text-primary)'
              }}>
                                        {date.getDate()}
                                    </div>
                                    {holidayName && <div style={{
                fontSize: '0.65rem',
                color: '#ff4757',
                marginBottom: '4px',
                fontWeight: 'bold'
              }}>🎉 {t(holidayName)}</div>}
                                    <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                                        {classes.map((cls, idx) => {
                  const colors = getTagColor(cls.title, dateStr, cls.instructor);
                  const isCancelled = cls.status === 'cancelled';
                  return <div key={idx} style={{
                    fontSize: '0.8rem',
                    padding: '4px 6px',
                    borderRadius: '6px',
                    backgroundColor: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    fontWeight: '500',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    marginTop: '2px',
                    position: 'relative',
                    overflow: 'hidden',
                    ...(isCancelled && {
                      background: `linear-gradient(to top right, transparent calc(50% - 1.5px), #ff4757 calc(50% - 1.5px), #ff4757 calc(50% + 1.5px), transparent calc(50% + 1.5px)), linear-gradient(to top left, transparent calc(50% - 1.5px), #ff4757 calc(50% - 1.5px), #ff4757 calc(50% + 1.5px), transparent calc(50% + 1.5px)), ${colors.bg}`,
                      opacity: 0.7
                    })
                  }}>
                                                    <span style={{
                      fontWeight: 'bold'
                    }}>{cls.time} {cls.title}</span>
                                                    {(cls.instructor || cls.level) && <span style={{
                      fontSize: '0.85em',
                      opacity: 0.95,
                      display: 'block'
                    }}>
                                                            {cls.level ? `Lv.${cls.level} ` : ''}{cls.instructor}
                                                        </span>}
                                                    {allowBooking && (() => {
                      const dateBookings = monthlyBookings[dateStr] || [];
                      const clsBookings = dateBookings.filter(b => b.classIndex === idx && b.status !== 'cancelled');
                      const bookedCount = clsBookings.filter(b => b.status === 'booked').length;
                      const capacity = bookingService.getClassCapacity(cls, branchId, config);
                      if (bookedCount === 0) return null;
                      return <span style={{
                        fontSize: '0.7em',
                        fontWeight: 'bold',
                        color: bookedCount >= capacity ? '#ff4757' : '#3B82F6',
                        display: 'block'
                      }}>
                                                                📋 {bookedCount}/{capacity}{t("g_5a62fd") || "명"}</span>;
                    })()}
                                                </div>;
                })}
                                    </div>
                                </>}
                            </div>;
        })}
                </div>
            </div>;
  };

  // ── Undefined (Empty) View ──
  const renderUndefinedView = () => <div style={{
    padding: '0px'
  }}>
            <div style={{
      marginBottom: '20px',
      padding: '24px',
      backgroundColor: 'rgba(59, 130, 246, 0.05)',
      borderRadius: '12px',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      textAlign: 'center'
    }}>
                <div>
                    <h3 style={{
          fontSize: '1.2rem',
          color: '#60A5FA',
          margin: '0 0 8px 0'
        }}>{t("g_year_month_format", { year, month }) || `${year}년 ${month}월`} {t("g_schedule_empty") || "일정이 비어 있습니다."}</h3>
                    <p style={{
          color: 'var(--text-secondary)',
          margin: 0,
          fontSize: '0.95rem'
        }}>{t("g_ca9937") || "일일이 등록할 필요 없이, 지난 달 일정을 그대로 복사해서 편하게 시작하세요."}</p>
                </div>
                <button onClick={handleCopyPrevMonth} style={{
        padding: '14px 32px',
        fontSize: '1.05rem',
        backgroundColor: '#3B82F6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
        transition: 'all 0.2s'
      }}>{t("g_e2b9a9") || "📥 지난달 스케줄 그대로 복사하기"}</button>
            </div>
            {renderCalendar()}
        </div>;

  // ── Main Render ──
  return <div style={{
    padding: '20px',
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px'
  }}>
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '10px'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
                    <button onClick={handlePrevMonth} className="nav-btn-circle" aria-label={t("g_bdd9af") || "이전 월"}><CaretLeft /></button>
                    <h2 style={{
          margin: 0,
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
                        {t("g_year_month_format", { year, month }) || `${year}년 ${month}월`}{scheduleStatus === 'saved' ? <span style={{
            fontSize: '0.8rem',
            padding: '4px 10px',
            borderRadius: '20px',
            backgroundColor: '#10B981',
            color: 'white'
          }}>{t("g_b8a987") || "확정됨"}</span> : <span style={{
            fontSize: '0.8rem',
            padding: '4px 10px',
            borderRadius: '20px',
            backgroundColor: '#F59E0B',
            color: 'white'
          }}>{t("g_2ddd21") || "미정"}</span>}
                    </h2>
                    <button onClick={handleNextMonth} className="nav-btn-circle" aria-label={t("g_fbb7c8") || "다음 월"}><CaretRight /></button>
                </div>
                <div style={{
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
                    <button onClick={handleOpenRestore} className="action-btn-gold" style={{
          backgroundColor: '#6366F1',
          opacity: 0.9
        }}>
                        <ClockCounterClockwise size={18} />{t("g_956383") || "백업 복원"}</button>
                    <button onClick={() => setShowSettings(true)} className="action-btn-gold" style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)'
        }}>
                        <Gear size={18} />{t("g_c14a56") || "설정"}</button>
                    {scheduleStatus === 'saved' && <button onClick={handleReset} className="action-btn-gold" style={{
          backgroundColor: '#EF4444',
          opacity: 0.8
        }}>
                            <Trash size={18} />{t("g_ff75b4") || "초기화"}</button>}
                </div>
            </div>

            <div style={{
      marginBottom: '15px'
    }}><ColorLegend branchId={branchId} /></div>

            {loading ? <div style={{
      textAlign: 'center',
      padding: '40px'
    }}>{t("g_1c8f5d") || "데이터 처리 중..."}</div> : scheduleStatus === 'saved' ? renderCalendar() : renderUndefinedView()}

            {/* ── 수업 편집 모달 ── */}
            {showEditModal && <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t("g_924234") || "수업 관리"}>
                    <div className="modal-content">
                        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
                            <h3 style={{
            margin: 0
          }}>{selectedDate}{t("g_924234") || "수업 관리"}</h3>
                            <button onClick={() => setShowEditModal(false)} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)'
          }}><X size={24} /></button>
                        </div>
                        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          paddingRight: '10px'
        }}>
                            {dayClasses.length === 0 && <p style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            padding: '20px'
          }}>{t("g_0ff641") || "배정된 수업이 없습니다."}</p>}
                            {dayClasses.map((cls, idx) => <ScheduleClassEditor key={idx} cls={cls} idx={idx} dayClasses={dayClasses} setDayClasses={setDayClasses} instructors={instructors} classTypes={classTypes} classLevels={classLevels} />)}
                            <button onClick={() => setDayClasses([...dayClasses, {
            time: '10:00',
            title: classTypes[0] || t("g_550350") || "수업",
            instructor: instructors[0] || '',
            status: 'normal',
            duration: 60,
            level: ''
          }])} className="action-btn-gold" style={{
            width: '100%',
            marginTop: '8px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px dashed var(--border-color)',
            color: 'var(--text-secondary)'
          }}>
                                <Plus size={18} />{t("g_ccc98d") || "수업 추가"}</button>
                        </div>
                        <div style={{
          display: 'flex',
          gap: '10px',
          marginTop: '24px',
          justifyContent: 'flex-end',
          flexWrap: 'wrap'
        }}>
                            <button onClick={() => setShowEditModal(false)} className="action-btn-gold" style={{
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}>{t("g_19b2d1") || "취소"}</button>
                            <button onClick={() => handleSave(true)} className="action-btn-gold" style={{
            backgroundColor: '#8B5CF6'
          }}>{t("g_b2a40d") || "📅 이 달의 모든"}{new Date(selectedDate).toLocaleString('ko-KR', {
              weekday: 'short'
            })}{t("g_c6cb8a") || "요일 수정"}</button>
                            <button onClick={() => handleSave(false)} className="action-btn-gold">{t("g_1f1712") || "저장"}</button>
                        </div>
                    </div>
                </div>}

            {/* ── 초기화 확인 모달 ── */}
            {showResetConfirm && <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t("g_ff5126") || "스케줄 초기화 확인"}>
                    <div className="modal-content" style={{
        maxWidth: '400px',
        textAlign: 'center'
      }}>
                        <Warning size={48} color="#EF4444" style={{
          marginBottom: '16px'
        }} />
                        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '1.3rem'
        }}>{t("g_8d1fa4") || "스케줄 초기화"}</h3>
                        <p style={{
          color: 'var(--text-secondary)',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>{t("g_67ea42") || "정말로 "}{t("g_year_month_format", { year, month }) || `${year}년 ${month}월`} {t("g_reset_schedule_prompt") || "스케줄을 초기화하시겠습니까?"}<br /><br />{t("g_08f8d3") || "모든 수업 데이터가 삭제되며, 상태가 [미정]으로 돌아갑니다."}<br />
                            <span style={{
            fontSize: '0.85rem',
            color: '#6366F1',
            marginTop: '8px',
            display: 'block'
          }}>{t("g_4ad95a") || "(초기화 직전 상태는 임시 백업됩니다)"}</span>
                        </p>
                        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
                            <button onClick={() => setShowResetConfirm(false)} className="action-btn-gold" style={{
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            flex: 1
          }}>{t("g_19b2d1") || "취소"}</button>
                            <button onClick={confirmReset} className="action-btn-gold" style={{
            backgroundColor: '#EF4444',
            flex: 1
          }}>{t("g_15c268") || "네, 초기화합니다"}</button>
                        </div>
                    </div>
                </div>}

            {/* ── 백업 복원 모달 ── */}
            {showRestoreModal && <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t("g_956383") || "백업 복원"}>
                    <div className="modal-content" style={{
        maxWidth: '500px'
      }}>
                        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
                            <h3 style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
                                <ClockCounterClockwise size={24} color="#6366F1" />{t("g_47fc8e") || "백업에서 복원하기"}</h3>
                            <button onClick={() => setShowRestoreModal(false)} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)'
          }}><X size={24} /></button>
                        </div>
                        <p style={{
          color: 'var(--text-secondary)',
          marginBottom: '16px',
          fontSize: '0.9rem'
        }}>{t("g_7d1309") || "스케줄을 초기화할 때마다 가장 최근 2개의 스케줄이 자동으로 백업됩니다. 이전 상태로 되돌리려면 아래 목록에서 선택하세요."}</p>
                        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
                            {backupList.length === 0 ? <div style={{
            textAlign: 'center',
            padding: '30px',
            backgroundColor: 'var(--bg-input)',
            borderRadius: '8px',
            color: 'var(--text-secondary)'
          }}>{t("g_eb60af") || "사용 가능한 백업이 없습니다."}</div> : backupList.map((backup, idx) => {
            const date = new Date(backup.timestamp);
            let clsCount = 0;
            if (backup.classes) Object.values(backup.classes).forEach(day => clsCount += day.classes?.length || 0);
            return <div key={backup.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px',
              backgroundColor: 'var(--bg-input)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
                                            <div>
                                                <div style={{
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>{date.toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}{t("g_c771f7") || "에 백업됨"}</div>
                                                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>{t("g_10d96e") || "총"}{clsCount}{t("g_20c52c") || "개의 수업 데이터 포함"}{idx === 0 && <span style={{
                    marginLeft: '8px',
                    color: '#10B981',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)'
                  }}>{t("g_67d4b4") || "가장 최근"}</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => handleRestoreBackup(backup.id)} className="action-btn-gold" style={{
                backgroundColor: '#6366F1',
                padding: '8px 16px',
                fontSize: '0.9rem'
              }}>{t("g_3ad441") || "이 지점으로 복원"}</button>
                                        </div>;
          })}
                        </div>
                    </div>
                </div>}

            <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} instructors={instructors} setInstructors={setInstructors} classTypes={classTypes} setClassTypes={setClassTypes} classLevels={classLevels} setClassLevels={setClassLevels} />
        </div>;
};
export default AdminScheduleManager;