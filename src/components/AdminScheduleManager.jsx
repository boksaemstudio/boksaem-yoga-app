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
    label: t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || "\uC77C\uBC18",
    color: '#FFFFFF',
    border: '#DDDDDD',
    branches: (config.BRANCHES || []).map(b => b.id)
  }, {
    label: t("g_078e49") || t("g_078e49") || t("g_078e49") || t("g_078e49") || t("g_078e49") || "\uD2B9\uBCC4/\uC2EC\uD654",
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
                    {[t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || "\uC77C", t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || "\uC6D4", t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || "\uD654", t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || "\uC218", t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || "\uBAA9", t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || "\uAE08", t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || "\uD1A0"].map(d => <div key={d} style={{
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
                                                                📋 {bookedCount}/{capacity}{t("g_7b3c6e") || t("g_7b3c6e") || t("g_7b3c6e") || t("g_7b3c6e") || t("g_7b3c6e") || "\uBA85"}</span>;
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
        }}>{year}{t("g_e29d2c") || t("g_e29d2c") || t("g_e29d2c") || t("g_e29d2c") || t("g_e29d2c") || "\uB144"}{month}{t("g_82a9c5") || t("g_82a9c5") || t("g_82a9c5") || t("g_82a9c5") || t("g_82a9c5") || "\uC6D4 \uC77C\uC815\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4."}</h3>
                    <p style={{
          color: 'var(--text-secondary)',
          margin: 0,
          fontSize: '0.95rem'
        }}>{t("g_615bd7") || t("g_615bd7") || t("g_615bd7") || t("g_615bd7") || t("g_615bd7") || "\uC77C\uC77C\uC774 \uB4F1\uB85D\uD560 \uD544\uC694 \uC5C6\uC774, \uC9C0\uB09C \uB2EC \uC77C\uC815\uC744 \uADF8\uB300\uB85C \uBCF5\uC0AC\uD574\uC11C \uD3B8\uD558\uAC8C \uC2DC\uC791\uD558\uC138\uC694."}</p>
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
      }}>{t("g_db0ba7") || t("g_db0ba7") || t("g_db0ba7") || t("g_db0ba7") || t("g_db0ba7") || "\uD83D\uDCE5 \uC9C0\uB09C\uB2EC \uC2A4\uCF00\uC904 \uADF8\uB300\uB85C \uBCF5\uC0AC\uD558\uAE30"}</button>
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
                    <button onClick={handlePrevMonth} className="nav-btn-circle" aria-label={t("g_0834d5") || t("g_0834d5") || t("g_0834d5") || t("g_0834d5") || t("g_0834d5") || "\uC774\uC804 \uC6D4"}><CaretLeft /></button>
                    <h2 style={{
          margin: 0,
          fontSize: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
                        {year}{t("g_e29d2c") || t("g_e29d2c") || t("g_e29d2c") || t("g_e29d2c") || t("g_e29d2c") || "\uB144"}{month}{t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || "\uC6D4"}{scheduleStatus === 'saved' ? <span style={{
            fontSize: '0.8rem',
            padding: '4px 10px',
            borderRadius: '20px',
            backgroundColor: '#10B981',
            color: 'white'
          }}>{t("g_bea14e") || t("g_bea14e") || t("g_bea14e") || t("g_bea14e") || t("g_bea14e") || "\uD655\uC815\uB428"}</span> : <span style={{
            fontSize: '0.8rem',
            padding: '4px 10px',
            borderRadius: '20px',
            backgroundColor: '#F59E0B',
            color: 'white'
          }}>{t("g_90d10f") || t("g_90d10f") || t("g_90d10f") || t("g_90d10f") || t("g_90d10f") || "\uBBF8\uC815"}</span>}
                    </h2>
                    <button onClick={handleNextMonth} className="nav-btn-circle" aria-label={t("g_abc273") || t("g_abc273") || t("g_abc273") || t("g_abc273") || t("g_abc273") || "\uB2E4\uC74C \uC6D4"}><CaretRight /></button>
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
                        <ClockCounterClockwise size={18} />{t("g_b74b9f") || t("g_b74b9f") || t("g_b74b9f") || t("g_b74b9f") || t("g_b74b9f") || "\uBC31\uC5C5 \uBCF5\uC6D0"}</button>
                    <button onClick={() => setShowSettings(true)} className="action-btn-gold" style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)'
        }}>
                        <Gear size={18} />{t("g_109cc0") || t("g_109cc0") || t("g_109cc0") || t("g_109cc0") || t("g_109cc0") || "\uC124\uC815"}</button>
                    {scheduleStatus === 'saved' && <button onClick={handleReset} className="action-btn-gold" style={{
          backgroundColor: '#EF4444',
          opacity: 0.8
        }}>
                            <Trash size={18} />{t("g_2d7cf9") || t("g_2d7cf9") || t("g_2d7cf9") || t("g_2d7cf9") || t("g_2d7cf9") || "\uCD08\uAE30\uD654"}</button>}
                </div>
            </div>

            <div style={{
      marginBottom: '15px'
    }}><ColorLegend branchId={branchId} /></div>

            {loading ? <div style={{
      textAlign: 'center',
      padding: '40px'
    }}>{t("g_1c8c88") || t("g_1c8c88") || t("g_1c8c88") || t("g_1c8c88") || t("g_1c8c88") || "\uB370\uC774\uD130 \uCC98\uB9AC \uC911..."}</div> : scheduleStatus === 'saved' ? renderCalendar() : renderUndefinedView()}

            {/* ── 수업 편집 모달 ── */}
            {showEditModal && <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t("g_7b690b") || t("g_7b690b") || t("g_7b690b") || t("g_7b690b") || t("g_7b690b") || "\uC218\uC5C5 \uAD00\uB9AC"}>
                    <div className="modal-content">
                        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
                            <h3 style={{
            margin: 0
          }}>{selectedDate}{t("g_7b690b") || t("g_7b690b") || t("g_7b690b") || t("g_7b690b") || t("g_7b690b") || "\uC218\uC5C5 \uAD00\uB9AC"}</h3>
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
          }}>{t("g_6662c2") || t("g_6662c2") || t("g_6662c2") || t("g_6662c2") || t("g_6662c2") || "\uBC30\uC815\uB41C \uC218\uC5C5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>}
                            {dayClasses.map((cls, idx) => <ScheduleClassEditor key={idx} cls={cls} idx={idx} dayClasses={dayClasses} setDayClasses={setDayClasses} instructors={instructors} classTypes={classTypes} classLevels={classLevels} />)}
                            <button onClick={() => setDayClasses([...dayClasses, {
            time: '10:00',
            title: classTypes[0] || t("g_774943") || t("g_774943") || t("g_774943") || t("g_774943") || t("g_774943") || "\uC218\uC5C5",
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
                                <Plus size={18} />{t("g_697f2c") || t("g_697f2c") || t("g_697f2c") || t("g_697f2c") || t("g_697f2c") || "\uC218\uC5C5 \uCD94\uAC00"}</button>
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
          }}>{t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || "\uCDE8\uC18C"}</button>
                            <button onClick={() => handleSave(true)} className="action-btn-gold" style={{
            backgroundColor: '#8B5CF6'
          }}>{t("g_a3b35f") || t("g_a3b35f") || t("g_a3b35f") || t("g_a3b35f") || t("g_a3b35f") || "\uD83D\uDCC5 \uC774 \uB2EC\uC758 \uBAA8\uB4E0"}{new Date(selectedDate).toLocaleString('ko-KR', {
              weekday: 'short'
            })}{t("g_becd85") || t("g_becd85") || t("g_becd85") || t("g_becd85") || t("g_becd85") || "\uC694\uC77C \uC218\uC815"}</button>
                            <button onClick={() => handleSave(false)} className="action-btn-gold">{t("g_9d0a47") || t("g_9d0a47") || t("g_9d0a47") || t("g_9d0a47") || t("g_9d0a47") || "\uC800\uC7A5"}</button>
                        </div>
                    </div>
                </div>}

            {/* ── 초기화 확인 모달 ── */}
            {showResetConfirm && <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t("g_5c95b4") || t("g_5c95b4") || t("g_5c95b4") || t("g_5c95b4") || t("g_5c95b4") || "\uC2A4\uCF00\uC904 \uCD08\uAE30\uD654 \uD655\uC778"}>
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
        }}>{t("g_3d3730") || t("g_3d3730") || t("g_3d3730") || t("g_3d3730") || t("g_3d3730") || "\uC2A4\uCF00\uC904 \uCD08\uAE30\uD654"}</h3>
                        <p style={{
          color: 'var(--text-secondary)',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>{t("g_1c07ed") || t("g_1c07ed") || t("g_1c07ed") || t("g_1c07ed") || t("g_1c07ed") || "\uC815\uB9D0\uB85C"}{year}{t("g_e29d2c") || t("g_e29d2c") || t("g_e29d2c") || t("g_e29d2c") || t("g_e29d2c") || "\uB144"}{month}{t("g_362e45") || t("g_362e45") || t("g_362e45") || t("g_362e45") || t("g_362e45") || "\uC6D4 \uC2A4\uCF00\uC904\uC744 \uCD08\uAE30\uD654\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?"}<br /><br />{t("g_283180") || t("g_283180") || t("g_283180") || t("g_283180") || t("g_283180") || "\uBAA8\uB4E0 \uC218\uC5C5 \uB370\uC774\uD130\uAC00 \uC0AD\uC81C\uB418\uBA70, \uC0C1\uD0DC\uAC00 [\uBBF8\uC815]\uC73C\uB85C \uB3CC\uC544\uAC11\uB2C8\uB2E4."}<br />
                            <span style={{
            fontSize: '0.85rem',
            color: '#6366F1',
            marginTop: '8px',
            display: 'block'
          }}>{t("g_6b09d2") || t("g_6b09d2") || t("g_6b09d2") || t("g_6b09d2") || t("g_6b09d2") || "(\uCD08\uAE30\uD654 \uC9C1\uC804 \uC0C1\uD0DC\uB294 \uC784\uC2DC \uBC31\uC5C5\uB429\uB2C8\uB2E4)"}</span>
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
          }}>{t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || t("g_d9de21") || "\uCDE8\uC18C"}</button>
                            <button onClick={confirmReset} className="action-btn-gold" style={{
            backgroundColor: '#EF4444',
            flex: 1
          }}>{t("g_59a7dd") || t("g_59a7dd") || t("g_59a7dd") || t("g_59a7dd") || t("g_59a7dd") || "\uB124, \uCD08\uAE30\uD654\uD569\uB2C8\uB2E4"}</button>
                        </div>
                    </div>
                </div>}

            {/* ── 백업 복원 모달 ── */}
            {showRestoreModal && <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t("g_b74b9f") || t("g_b74b9f") || t("g_b74b9f") || t("g_b74b9f") || t("g_b74b9f") || "\uBC31\uC5C5 \uBCF5\uC6D0"}>
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
                                <ClockCounterClockwise size={24} color="#6366F1" />{t("g_842c36") || t("g_842c36") || t("g_842c36") || t("g_842c36") || t("g_842c36") || "\uBC31\uC5C5\uC5D0\uC11C \uBCF5\uC6D0\uD558\uAE30"}</h3>
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
        }}>{t("g_52165d") || t("g_52165d") || t("g_52165d") || t("g_52165d") || t("g_52165d") || "\uC2A4\uCF00\uC904\uC744 \uCD08\uAE30\uD654\uD560 \uB54C\uB9C8\uB2E4 \uAC00\uC7A5 \uCD5C\uADFC 2\uAC1C\uC758 \uC2A4\uCF00\uC904\uC774 \uC790\uB3D9\uC73C\uB85C \uBC31\uC5C5\uB429\uB2C8\uB2E4. \uC774\uC804 \uC0C1\uD0DC\uB85C \uB418\uB3CC\uB9AC\uB824\uBA74 \uC544\uB798 \uBAA9\uB85D\uC5D0\uC11C \uC120\uD0DD\uD558\uC138\uC694."}</p>
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
          }}>{t("g_4d3f55") || t("g_4d3f55") || t("g_4d3f55") || t("g_4d3f55") || t("g_4d3f55") || "\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uBC31\uC5C5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}</div> : backupList.map((backup, idx) => {
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
                  })}{t("g_3b5157") || t("g_3b5157") || t("g_3b5157") || t("g_3b5157") || t("g_3b5157") || "\uC5D0 \uBC31\uC5C5\uB428"}</div>
                                                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>{t("g_97dfc6") || t("g_97dfc6") || t("g_97dfc6") || t("g_97dfc6") || t("g_97dfc6") || "\uCD1D"}{clsCount}{t("g_ebf9da") || t("g_ebf9da") || t("g_ebf9da") || t("g_ebf9da") || t("g_ebf9da") || "\uAC1C\uC758 \uC218\uC5C5 \uB370\uC774\uD130 \uD3EC\uD568"}{idx === 0 && <span style={{
                    marginLeft: '8px',
                    color: '#10B981',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)'
                  }}>{t("g_7008e7") || t("g_7008e7") || t("g_7008e7") || t("g_7008e7") || t("g_7008e7") || "\uAC00\uC7A5 \uCD5C\uADFC"}</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => handleRestoreBackup(backup.id)} className="action-btn-gold" style={{
                backgroundColor: '#6366F1',
                padding: '8px 16px',
                fontSize: '0.9rem'
              }}>{t("g_7bbcd3") || t("g_7bbcd3") || t("g_7bbcd3") || t("g_7bbcd3") || t("g_7bbcd3") || "\uC774 \uC9C0\uC810\uC73C\uB85C \uBCF5\uC6D0"}</button>
                                        </div>;
          })}
                        </div>
                    </div>
                </div>}

            <SettingsModal show={showSettings} onClose={() => setShowSettings(false)} instructors={instructors} setInstructors={setInstructors} classTypes={classTypes} setClassTypes={setClassTypes} classLevels={classLevels} setClassLevels={setClassLevels} />
        </div>;
};
export default AdminScheduleManager;