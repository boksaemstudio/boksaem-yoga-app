import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { ClockCounterClockwise, CaretLeft, CaretRight, CalendarBlank, TrendUp } from '@phosphor-icons/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts';
import { guessClassInfo } from '../../../utils/classUtils';
import { storageService } from '../../../services/storage';
import { useStudioConfig } from '../../../contexts/StudioContext';
import ImageLightbox from '../../common/ImageLightbox';
import LogListItem from './LogListItem';
import AttendanceTrendChart from './AttendanceTrendChart';
import CollapsibleCard from '../CollapsibleCard';

// [i18n] Day names map - shared between MiniCalendar and LogsTab
const dayNamesMap = {
  ko: ["일", "", "화", "수", "목", "금", "토"],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ja: ["日", "月", "火", "水", "木", "金", "土"],
  zh: ["日", "一", "二", "三", "四", "五", "六"],
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  pt: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
};

// ─── Mini Calendar Popup ───
const MiniCalendar = memo(({
  selectedDate,
  onSelect,
  onClose,
  config
}) => {
  const themeColor = config?.THEME?.PRIMARY_COLOR || 'var(--primary-gold)';
  const sel = new Date(selectedDate + 'T00:00:00+09:00');
  const [viewYear, setViewYear] = useState(sel.getFullYear());
  const [viewMonth, setViewMonth] = useState(sel.getMonth());
  const todayStr = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Seoul'
  });
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDay = new Date(viewYear, viewMonth, 1).getDay();
  const { t, language } = useLanguageStore();
  const dayNames = dayNamesMap[language] || dayNamesMap['en'];
  const dates = [];
  for (let i = 0; i < startDay; i++) dates.push(null);
  for (let i = 1; i <= daysInMonth; i++) dates.push(i);
  const handleSelect = day => {
    if (!day) return;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // 미래 날짜 차단
    if (dateStr > todayStr) return;
    onSelect(dateStr);
    onClose();
  };
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else setViewMonth(m => m + 1);
  };
  return <div style={{
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    marginTop: '8px'
  }}>
            {/* Backdrop */}
            <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1
    }} onClick={onClose} />
            <div style={{
      background: 'var(--bg-surface, #1a1a2e)',
      border: '1px solid rgba(var(--primary-rgb), 0.3)',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      minWidth: '280px'
    }}>
                {/* Header */}
                <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
                    <button onClick={prevMonth} className="nav-btn-circle" style={{
          width: '28px',
          height: '28px'
        }}><CaretLeft size={14} /></button>
                    <span style={{
          fontWeight: 'bold',
          fontSize: '0.95rem'
        }}>{viewYear} / {viewMonth + 1}</span>
                    <button onClick={nextMonth} className="nav-btn-circle" style={{
          width: '28px',
          height: '28px'
        }}><CaretRight size={14} /></button>
                </div>
                {/* Day names */}
                <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
        marginBottom: '4px'
      }}>
                    {dayNames.map(d => <div key={d} style={{
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'var(--text-secondary)',
          padding: '4px',
          fontWeight: 'bold'
        }}>{d}</div>)}
                </div>
                {/* Dates */}
                <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px'
      }}>
                    {dates.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const isSunday = new Date(viewYear, viewMonth, day).getDay() === 0;
          return <button key={day} onClick={() => handleSelect(day)} disabled={isFuture} style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: isToday ? '2px solid var(--primary-gold)' : 'none',
            background: isSelected ? 'var(--primary-gold)' : 'transparent',
            color: isSelected ? 'black' : isFuture ? 'rgba(255,255,255,0.15)' : isSunday ? '#ff6b6b' : 'var(--text-primary)',
            fontWeight: isSelected || isToday ? 'bold' : 'normal',
            fontSize: '0.85rem',
            cursor: isFuture ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            margin: '0 auto'
          }} onMouseEnter={e => {
            if (!isFuture && !isSelected) e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.15)';
          }} onMouseLeave={e => {
            if (!isFuture && !isSelected) e.currentTarget.style.background = 'transparent';
          }}>
                                {day}
                            </button>;
        })}
                </div>
                {/* Today shortcut */}
                <button onClick={() => {
        onSelect(todayStr);
        onClose();
      }} style={{
        marginTop: '10px',
        width: '100%',
        padding: '6px',
        background: `${themeColor}20`,
        border: `1px solid ${themeColor}40`,
        borderRadius: '6px',
        color: themeColor,
        fontWeight: 'bold',
        fontSize: '0.8rem',
        cursor: 'pointer'
      }}>{t("g_b3c05f")}</button>
            </div>
        </div>;
});
MiniCalendar.displayName = 'MiniCalendar';

// ─── Main Component ───
const LogsTab = ({
  todayClasses,
  logs,
  currentLogPage,
  setCurrentLogPage,
  members = [],
  onMemberClick,
  summary
}) => {
  const { t, language } = useLanguageStore();
  const {
    config
  } = useStudioConfig();
  const branches = config.BRANCHES || [];
  const getBranchName = id => branches.find(b => b.id === id)?.name || id;
  const getBranchColor = id => branches.find(b => b.id === id)?.color || 'var(--primary-gold)';
  const getBranchThemeColor = id => branches.find(b => b.id === id)?.color || 'var(--primary-gold)';
  const todayStr = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Seoul'
  });
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedClassKey, setSelectedClassKey] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [historicalLogs, setHistoricalLogs] = useState([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [localBranch, setLocalBranch] = useState('all');
  const isToday = selectedDate === todayStr;

  // 과거 날짜 선택 시 Firestore에서 데이터 가져오기
  const fetchHistoricalData = useCallback(async dateStr => {
    if (dateStr === todayStr) return;
    setLoadingHistorical(true);
    try {
      const data = await storageService.getAttendanceByDate(dateStr);
      setHistoricalLogs(data);
    } catch (e) {
      console.error('[LogsTab] Failed to fetch historical data:', e);
      setHistoricalLogs([]);
    } finally {
      setLoadingHistorical(false);
    }
  }, [todayStr, language]);
  useEffect(() => {
    if (!isToday) {
      fetchHistoricalData(selectedDate);
    }
    setSelectedClassKey(null);
    setCurrentLogPage(1);
  }, [selectedDate, isToday, fetchHistoricalData, setCurrentLogPage, language]);
  useEffect(() => {
    setCurrentLogPage(1);
  }, [searchTerm, localBranch, setCurrentLogPage, language]);
  const [trendData, setTrendData] = useState(null);
  const [loadingTrend, setLoadingTrend] = useState(false);

  // [NEW] Fetch past 30 days data for the selected class
  useEffect(() => {
    if (!selectedClassKey) {
      setTrendData(null);
      return;
    }
    const [tName, tInst, tBranch, tTime] = selectedClassKey.split('-');
    let isMounted = true;
    const loadTrend = async () => {
      setLoadingTrend(true);
      try {
        // 선택된 날짜의 요일을 구합니다 (같은 요일에만 반복 수업이 있으므로)
        const selectedDayObj = new Date(selectedDate + 'T00:00:00+09:00');
        const selectedDayOfWeek = selectedDayObj.getDay(); // 0=일, 1=, ...

        // 과거 21일(3주) 중 같은 요일인 날짜만 추출
        const datesToFetch = [];
        const d = new Date(selectedDate + 'T00:00:00+09:00');
        for (let i = 0; i < 21; i++) {
          const temp = new Date(d);
          temp.setDate(temp.getDate() - i);
          datesToFetch.push(temp.toLocaleDateString('sv-SE', {
            timeZone: 'Asia/Seoul'
          }));
        }

        // Fetch all dates in parallel
        const results = await Promise.all(datesToFetch.map(dateStr => storageService.getAttendanceByDate(dateStr, tBranch)));
        const rawPlotData = [];
        results.forEach((dayLogs, idx) => {
          const targetDateStr = datesToFetch[idx];
          const dObj = new Date(targetDateStr + 'T00:00:00+09:00');
          const dayOfWeek = dObj.getDay();

          // [FIX] 같은 요일인 날만 차트에 표시 (반복 수업 패턴)
          if (dayOfWeek !== selectedDayOfWeek) return;
          let count = 0;
          dayLogs.forEach(log => {
            const info = guessClassInfo(log);
            const cName = info?.className || log.className || t("g_aef1a1") || "General";
            const cInst = info?.instructor || log.instructor || t("g_620be2") || "Instructor";

            // [FIX] 수업명 + 강사명만 매칭 (시간은 무시 — 같은 수업이라도 시간대가 변경될 수 있음)
            if (log.status !== 'denied' && cName === tName && cInst === tInst) {
              count++;
            }
          });

          // [FIX] 같은 요일이면 count가 0이더라도 표시 (수업이 쉰 날 = "0명")
          rawPlotData.push({
            date: targetDateStr.slice(5).replace('-', '/'),
            // "MM/DD"
            fullDate: targetDateStr,
            timestamp: dObj.getTime(),
            count: count,
            dayName: new Intl.DateTimeFormat(({ ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', ru: 'ru-RU', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE', vi: 'vi-VN', th: 'th-TH' })[language] || 'en-US', { weekday: 'short' }).format(dObj)
          });
        });

        // Sort chronologically (oldest first)
        rawPlotData.sort((a, b) => a.timestamp - b.timestamp);
        if (isMounted) {
          setTrendData(rawPlotData);
        }
      } catch (err) {
        console.error("[LogsTab] Failed to fetch trend data:", err);
      } finally {
        if (isMounted) setLoadingTrend(false);
      }
    };
    loadTrend();
    return () => {
      isMounted = false;
    };
  }, [selectedClassKey, selectedDate, language]);

  // 현재 표시할 로그 결정
  const activeLogs = (() => {
    if (isToday) {
      return logs.filter(l => {
        // [FIX] Use stored 'date' field first for robustness (avoids client locale/timezone issues)
        if (l.date) return l.date === todayStr;

        // Fallback: Parse timestamp if date field is missing (legacy)
        if (!l.timestamp) return false;
        const logDate = new Date(l.timestamp).toLocaleDateString('sv-SE', {
          timeZone: 'Asia/Seoul'
        });
        return logDate === todayStr;
      });
    }
    return historicalLogs;
  })();

  // 수업별 요약 카드 생성 (오늘은 todayClasses prop, 과거는 활성 로그에서 집계)
  // [FIX] 당일 memberId별 출석 횟수 계산 (다회 출석 자동 감지)
  const {
    memberAttCountMap,
    memberSessionRankMap
  } = useMemo(() => {
    const countMap = {}; // memberId -> total count
    const rankMap = {}; // logId -> session rank (1회차, 2회차...)
    const memberLogsByTime = {}; // memberId -> [{logId, timestamp}]

    const logsToAnalyze = activeLogs.filter(l => l.status !== 'denied');
    logsToAnalyze.forEach(log => {
      if (!log.memberId) return;
      countMap[log.memberId] = (countMap[log.memberId] || 0) + 1;
      if (!memberLogsByTime[log.memberId]) memberLogsByTime[log.memberId] = [];
      memberLogsByTime[log.memberId].push({
        logId: log.id,
        timestamp: log.timestamp
      });
    });

    // 시간순 정렬 후 회차 부여
    Object.entries(memberLogsByTime).forEach(([memberId, entries]) => {
      if (entries.length < 2) return;
      entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      entries.forEach((e, i) => {
        rankMap[e.logId] = i + 1;
      });
    });
    return {
      memberAttCountMap: countMap,
      memberSessionRankMap: rankMap
    };
  }, [activeLogs, language]);
  const multiAttMemberIds = useMemo(() => Object.entries(memberAttCountMap).filter(([, c]) => c >= 2).map(([id]) => id), [memberAttCountMap]);
  const classCards = (() => {
    if (isToday) return todayClasses;
    const groups = {};
    activeLogs.forEach(log => {
      const info = guessClassInfo(log);
      const classTime = info?.startTime || '00:00';
      const canonicalClassName = info?.className || log.className || t("g_aef1a1") || "General";
      const canonicalInstructor = info?.instructor || log.instructor || t("g_620be2") || "Instructor";
      const key = canonicalClassName === (t("g_dd529d") || "Self Practice") ? `${canonicalClassName}-${log.branchId}` : `${canonicalClassName}-${canonicalInstructor}-${log.branchId}-${classTime}`;
      if (!groups[key]) {
        groups[key] = {
          className: canonicalClassName,
          instructor: canonicalClassName === (t("g_dd529d") || "Self Practice") ? t("g_dae3ed") || "Member" : canonicalInstructor,
          branchId: log.branchId,
          classTime: canonicalClassName === (t("g_dd529d") || "Self Practice") ? '' : classTime,
          count: 0,
          deniedCount: 0,
          memberNames: []
        };
      }
      if (log.status === 'denied') groups[key].deniedCount++;else {
        groups[key].count++;
        // [FIX] 다회 출석 Member 자동 감지 (DB 필드 불필요)
        if (log.memberName && log.memberId && multiAttMemberIds.includes(log.memberId)) {
          if (!groups[key].memberNames.includes(log.memberName)) {
            groups[key].memberNames.push(log.memberName);
          }
        }
      }
    });

    // [UX] Sort by classTime Descending (Latest First)
    return Object.values(groups).sort((a, b) => {
      if (!a.classTime) return 1;
      if (!b.classTime) return -1;
      return String(b.classTime || '').localeCompare(String(a.classTime || ''));
    });
  })();
  const handleClassClick = cls => {
    const key = cls.className === (t("g_dd529d") || "Self Practice") ? `${cls.className}-${cls.branchId}` : `${cls.className}-${cls.instructor}-${cls.branchId}-${cls.classTime || 'no-time'}`;
    // [UX] Toggle selection: if already selected, deselect (show all)
    setSelectedClassKey(prev => prev === key ? null : key);
    setCurrentLogPage(1);
  };
  const handleDateChange = dateStr => {
    setSelectedDate(dateStr);
  };
  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00+09:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul'
    }));
  };
  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00+09:00');
    d.setDate(d.getDate() + 1);
    const nextStr = d.toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul'
    });
    if (nextStr <= todayStr) setSelectedDate(nextStr);
  };

  // 날짜 포맷: "2 16일 (일)"
  const formatDisplayDate = dateStr => {
    const d = new Date(dateStr + 'T00:00:00+09:00');
    const lang = useLanguageStore.getState().language || 'ko';
    const dNames = dayNamesMap[lang] || dayNamesMap['en'];
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const dayName = dNames[d.getDay()];
    if (lang === 'ko') return `${m} ${day}일 (${dayName})`;
    if (lang === 'ja') return `${m}月 ${day}日 (${dayName})`;
    if (lang === 'zh') return `${m}月${day}日 (${dayName})`;
    return `${m}/${day} (${dayName})`;
  };

  // [UI] Custom Tooltip for Chart
  const CustomTooltip = ({
    active,
    payload,
    label
  }) => {
    const { t, language } = useLanguageStore();
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return <div style={{
        background: 'rgba(20,20,30,0.95)',
        border: '1px solid rgba(var(--primary-rgb), 0.3)',
        padding: '8px 12px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '0.85rem'
      }}>
                    <div style={{
          color: 'var(--text-secondary)',
          marginBottom: '4px'
        }}>
                        {data.fullDate} ({data.dayName})
                    </div>
                    <div style={{
          color: 'var(--primary-gold)',
          fontWeight: 'bold',
          fontSize: '1rem'
        }}>
                        {t('attendance')}: {payload[0].value}{t("g_7b3c6e")}
                    </div>
                </div>;
    }
    return null;
  };
  return <>
        <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
            {/* ─── Date Navigation ─── */}
            <div className="date-nav">
                <button onClick={handlePrevDay} className="nav-btn-circle" style={{
          width: '36px',
          height: '36px'
        }} aria-label={t("g_db55c1")}><CaretLeft size={18} weight="bold" /></button>
                <button onClick={() => setShowCalendar(v => !v)} className={`date-nav__btn ${isToday ? 'date-nav__btn--today' : ''}`} style={{
          color: isToday ? undefined : 'var(--text-primary)'
        }}>
                    <CalendarBlank size={18} />
                    {formatDisplayDate(selectedDate)}
                    {isToday && <span className="date-nav__today-tag">{t("g_e1e8a7")}</span>}
                </button>
                <button onClick={handleNextDay} disabled={selectedDate >= todayStr} className="nav-btn-circle" style={{
          width: '36px',
          height: '36px',
          opacity: selectedDate >= todayStr ? 0.3 : 1,
          cursor: selectedDate >= todayStr ? 'not-allowed' : 'pointer'
        }}><CaretRight size={18} weight="bold" /></button>

                {!isToday && <button onClick={() => setSelectedDate(todayStr)} className="date-nav__jump-today">{t("g_e1e8a7")}</button>}

                {showCalendar && <MiniCalendar selectedDate={selectedDate} onSelect={handleDateChange} onClose={() => setShowCalendar(false)} config={config} />}
            </div>

            {/* ─── Summary Section ─── */}
            <div className="summary-grid" style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
      }}>
                        <div className="dashboard-card" style={{
          padding: '16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '12px'
        }}>
                            <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>{t("g_807e10")}</div>
                            <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px'
          }}>
                                <span style={{
              fontSize: '1.6rem',
              fontWeight: '800',
              color: '#fff'
            }}>{activeLogs.filter(l => l.status !== 'denied').length}</span>
                                <span style={{
              fontSize: '0.85rem',
              opacity: 0.6
            }}>{t("g_230561")}</span>
                            </div>
                        </div>
                        <div className="dashboard-card" style={{
          padding: '16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '12px'
        }}>
                            <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            marginBottom: '8px'
          }}>{t("g_da9172")}</div>
                            <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px'
          }}>
                                <span style={{
              fontSize: '1.6rem',
              fontWeight: '800',
              color: 'var(--primary-theme-color)'
            }}>{multiAttMemberIds.length}</span>
                                <span style={{
              fontSize: '0.85rem',
              opacity: 0.6
            }}>{t("g_7b3c6e")}</span>
                            </div>
                        </div>
                        {activeLogs.filter(l => l.status === 'denied').length > 0 && <div className="dashboard-card" style={{
          padding: '16px',
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '12px'
        }}>
                                <div style={{
            fontSize: '0.8rem',
            color: '#F43F5E',
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>{t("g_b5a5db")}</div>
                                <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px'
          }}>
                                    <span style={{
              fontSize: '1.6rem',
              fontWeight: '800',
              color: '#FFF'
            }}>{activeLogs.filter(l => l.status === 'denied').length}</span>
                                    <span style={{
              fontSize: '0.85rem',
              opacity: 0.8
            }}>{t("g_15282d")}</span>
                                </div>
                            </div>}
                        {classCards.length > 0 && (() => {
          const maxClass = [...classCards].sort((a, b) => b.count - a.count)[0];
          return maxClass.count > 0 ? <div className="dashboard-card" style={{
            padding: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px'
          }}>
                                    <div style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>{t("g_d4c3b0")}</div>
                                    <div style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>{maxClass.className === 'Self Practice' ? (t('selfPractice') || t('g_dd529d') || '자율수련') : maxClass.className} <span style={{
                fontSize: '0.8rem',
                opacity: 0.6
              }}>{maxClass.classTime && `(${maxClass.classTime})`}</span></div>
                                    <div style={{
              fontSize: '0.85rem',
              color: 'var(--primary-gold)',
              marginTop: '4px'
            }}>{maxClass.count}{t("g_8ded5e")}</div>
                                </div> : null;
        })()}
            </div>

            {/* ─── Attendance Trend Analytics ─── */}
            <CollapsibleCard id="logs-trend" title={t("g_bcd933")} defaultOpen={false}>
                <AttendanceTrendChart selectedDate={selectedDate} members={members} />
            </CollapsibleCard>

            {/* ─── Loading State ─── */}
            {loadingHistorical && <div style={{
        textAlign: 'center',
        padding: '30px',
        color: 'var(--text-secondary)'
      }}>
                    <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(var(--primary-rgb), 0.2)',
          borderTop: '3px solid var(--primary-gold)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px'
        }} />
                    {t("g_f2d66b")}
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>}

            {/* ─── Class Summary Cards ─── */}
            {!loadingHistorical && classCards.length > 0 && <CollapsibleCard id="logs-class-summary" title={`📊 ${isToday ? t("g_2bdce5") || "Today" : formatDisplayDate(selectedDate)} ${t('classSummary') || t('g_class_summary') || "Class Attendance Summary"}`} titleExtra={`${classCards.length}${t('g_class_count') || t('classCount') || " classes"}`} defaultOpen={false}>
                    <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}>
                        {classCards.map((cls, idx) => {
            const key = cls.className === (t("g_dd529d") || "Self Practice") ? `${cls.className}-${cls.branchId}` : `${cls.className}-${cls.instructor}-${cls.branchId}-${cls.classTime || 'no-time'}`;
            const isSelected = selectedClassKey === key;
            return <React.Fragment key={key}>
                                <div onClick={() => handleClassClick(cls)} style={{
                padding: '12px',
                borderRadius: '10px',
                background: isSelected ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255,255,255,0.03)',
                border: isSelected ? '1px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.05)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 0 15px rgba(var(--primary-rgb), 0.2)' : 'none'
              }}>
                                    <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '4px'
                }}>
                                        <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}>
                                            {cls.classTime && <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--primary-gold)',
                      fontWeight: 'bold'
                    }}>
                                                    {cls.classTime}
                                                </div>}
                                            <div style={{
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: isSelected ? 'var(--primary-gold)' : 'inherit'
                    }}>{cls.className === 'Self Practice' ? (t('selfPractice') || t('g_dd529d') || '자율수련') : cls.className}</div>
                                        </div>
                                        <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: `${getBranchColor(cls.branchId)}20`,
                    color: getBranchThemeColor(cls.branchId),
                    fontWeight: 'bold',
                    border: `1px solid ${getBranchColor(cls.branchId)}33`
                  }}>
                                            {getBranchName(cls.branchId)}
                                        </span>
                                    </div>
                                    <div style={{
                  fontSize: '0.75rem',
                  opacity: 0.6,
                  marginBottom: '8px'
                }}>{cls.instructor === 'Member' ? (t('g_dae3ed') || '회원') : cls.instructor}</div>
                                    <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '4px'
                }}>
                                        <span style={{
                    fontSize: '1.4rem',
                    fontWeight: '800',
                    color: 'var(--primary-gold)',
                    lineHeight: 1
                  }}>{cls.count}</span>
                                        <span style={{
                    fontSize: '0.8rem',
                    opacity: 0.5
                  }}>{t("g_8ded5e")}</span>
                                        {cls.deniedCount > 0 && <span style={{
                    fontSize: '0.7rem',
                    color: '#ff4d4f',
                    background: 'rgba(255, 77, 79, 0.1)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 77, 79, 0.2)',
                    fontWeight: 'bold',
                    marginLeft: '6px'
                  }}>{t("g_2b8b8b") || "⛔ 거부"}{cls.deniedCount}{t("g_5a62fd") || "people"}</span>}
                                    </div>
                                    {/* [NEW] Show multi-attendance member names */}
                                    {cls.memberNames?.length > 0 && <div style={{
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                                            {cls.memberNames.map(name => <span key={name} style={{
                    fontSize: '0.8rem',
                    color: 'var(--primary-gold)',
                    fontWeight: 'bold'
                  }}>
                                                    {name}
                                                </span>)}
                                        </div>}
                                </div>

                                {/* [UX FIX] 차트를 선택된 카드 바로 아래에 인라인 표시 */}
                                {isSelected && <div style={{
                gridColumn: '1 / -1',
                padding: '16px',
                borderRadius: '10px',
                background: 'rgba(var(--primary-rgb), 0.03)',
                border: '1px solid rgba(var(--primary-rgb), 0.15)',
                animation: 'fadeInDown 0.3s ease-out'
              }}>
                                        <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                                            <TrendUp size={16} color="var(--primary-gold)" />
                                            <span style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)'
                  }}>
                                                {cls.className} · {cls.instructor} — {t('recentTrend') || t('g_recent_trend') || "Recent 3-week trend"}
                                            </span>
                                        </div>
                                        
                                        {loadingTrend ? <div style={{
                  height: '140px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem'
                }}>
                                                {t("g_1a7678")}
                                            </div> : trendData && trendData.length > 0 ? <div style={{
                  width: '100%',
                  height: '160px'
                }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={trendData} margin={{
                      top: 16,
                      right: 16,
                      left: -20,
                      bottom: 0
                    }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                        <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={11} tickMargin={8} tickFormatter={(value, idx) => {
                        if (trendData.length > 10 && idx !== 0 && idx !== trendData.length - 1 && idx !== Math.floor(trendData.length / 2)) {
                          return '';
                        }
                        return value;
                      }} />
                                                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} allowDecimals={false} domain={[0, 'dataMax + 2']} />
                                                        <Tooltip content={<CustomTooltip />} cursor={{
                        stroke: 'rgba(var(--primary-rgb), 0.2)',
                        strokeWidth: 2
                      }} />
                                                        <Line type="linear" dataKey="count" stroke="var(--primary-gold)" strokeWidth={2} dot={{
                        r: 4,
                        fill: 'var(--primary-gold)',
                        stroke: '#fff',
                        strokeWidth: 1
                      }} activeDot={{
                        r: 6,
                        fill: '#fff',
                        stroke: 'var(--primary-gold)',
                        strokeWidth: 2
                      }} animationDuration={600}>
                                                            <LabelList dataKey="count" position="top" fill="rgba(255,255,255,0.8)" fontSize={11} offset={8} />
                                                        </Line>
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div> : <div style={{
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem'
                }}>
                                                {t("g_d2467f")}
                                            </div>}
                                    </div>}
                                </React.Fragment>;
          })}
                    </div>
                </CollapsibleCard>}

            {/* ─── Empty State ─── */}
            {!loadingHistorical && classCards.length === 0 && activeLogs.length === 0 && <div className="dashboard-card" style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-secondary)'
      }}>
                    <CalendarBlank size={48} style={{
          opacity: 0.3,
          marginBottom: '12px'
        }} />
                    <div style={{
          fontSize: '1rem',
          fontWeight: 'bold',
          marginBottom: '6px'
        }}>
                        {t('noAttendanceRecords')}
                    </div>
                    <div style={{
          fontSize: '0.85rem',
          opacity: 0.6
        }}>
                        {t("g_229ef8")}
                    </div>
                </div>}

            {/* ─── Activity Log List ─── */}
            {!loadingHistorical && <CollapsibleCard id="logs-activity" title={isToday ? t('todayActivityLog') : `${formatDisplayDate(selectedDate)} ${t('activityLog')}`} titleExtra={`${activeLogs.length}${t("g_230561")}`} defaultOpen={false}>
                        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '10px'
        }}>
                            {selectedClassKey && <button onClick={() => setSelectedClassKey(null)} style={{
            background: 'var(--primary-gold)',
            color: 'var(--text-on-primary)',
            border: 'none',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap'
          }}>
                                    <ClockCounterClockwise size={14} /> {t("g_17eb09")}
                                </button>}
                            
                            {/* Branch Filter (다중 지점일 때만 노출) */}
                            {branches.length > 1 && <select value={localBranch} onChange={e => setLocalBranch(e.target.value)} className="filter-select">
                                    <option value="all">{t("g_9c8d1a")}</option>
                                    {(config.BRANCHES || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>}

                            {/* Name Search */}
                            <div style={{
            position: 'relative'
          }}>
                                <input type="text" placeholder={t("g_98bffa")} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="filter-input" style={{
              paddingRight: '25px'
            }} />
                                {searchTerm && <button onClick={() => setSearchTerm('')} className="filter-clear-btn">×</button>}
                            </div>
                        </div>
                    <div style={{
          marginTop: '10px'
        }}>
                        {(() => {
            const filteredLogs = (selectedClassKey ? activeLogs.filter(l => {
              const info = guessClassInfo(l);
              const classTime = info?.startTime || '00:00';
              const canonicalClassName = info?.className || l.className || t("g_aef1a1") || "General";
              const canonicalInstructor = info?.instructor || l.instructor || t("g_620be2") || "Instructor";
              const logKey = canonicalClassName === (t("g_dd529d") || "Self Practice") ? `${canonicalClassName}-${l.branchId}` : `${canonicalClassName}-${canonicalInstructor}-${l.branchId}-${classTime}`;
              return logKey === selectedClassKey;
            }) : activeLogs).filter(l => {
              // Apply local filters
              const matchesBranch = localBranch === 'all' || l.branchId === localBranch;
              const matchesSearch = !searchTerm || l.memberName && l.memberName.toLowerCase().includes(searchTerm.toLowerCase()) || l.name && l.name.toLowerCase().includes(searchTerm.toLowerCase());
              return matchesBranch && matchesSearch;
            }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const itemsPerPage = 15;
            const startIndex = (currentLogPage - 1) * itemsPerPage;
            const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);
            const totalLogPages = Math.ceil(filteredLogs.length / itemsPerPage);
            if (filteredLogs.length === 0) {
              return <div style={{
                textAlign: 'center',
                padding: '20px',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem'
              }}>{t("g_79f7d4")}</div>;
            }
            return <>
                                    {paginatedLogs.map((log, index) => <LogListItem key={log.id || index} log={log} index={index} isToday={isToday} members={members} onMemberClick={onMemberClick} onImageClick={setLightboxImage} getBranchName={getBranchName} getBranchColor={getBranchColor} getBranchThemeColor={getBranchThemeColor} summary={summary} sessionRank={memberSessionRankMap[log.id]} totalSessions={memberAttCountMap[log.memberId]} isMultiAttMember={multiAttMemberIds.includes(log.memberId)} />)}
                                    {totalLogPages > 1 && <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '20px'
              }}>
                                            <button disabled={currentLogPage === 1} onClick={() => setCurrentLogPage(p => p - 1)} className="action-btn sm">&lt;</button>
                                            <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.9rem'
                }}>{currentLogPage} / {totalLogPages}</span>
                                            <button disabled={currentLogPage === totalLogPages} onClick={() => setCurrentLogPage(p => p + 1)} className="action-btn sm">&gt;</button>
                                        </div>}
                                </>;
          })()}
                    </div>
                </CollapsibleCard>}
        </div>

            {lightboxImage && <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </>;
};
export default LogsTab;