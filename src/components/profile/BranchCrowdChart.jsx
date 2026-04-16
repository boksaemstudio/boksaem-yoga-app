import { useLanguageStore } from '../../stores/useLanguageStore';
import { useState, useEffect, useMemo, memo } from 'react';
import { useStudioConfig } from '../../contexts/StudioContext';
import { useLanguage } from '../../hooks/useLanguage';
import { storageService } from '../../services/storage';

// ─── 혼잡도 레벨 판별 ───
const getCrowdLevel = (val, maxCount, t) => {
  if (val === 0) return {
    label: t('member_crowd_level_1') || t("g_b2da00") || "한산",
    color: '#10b981',
    emoji: '🟢',
    bg: 'rgba(16, 185, 129, 0.12)'
  };
  const ratio = maxCount > 0 ? val / maxCount : 0;
  if (ratio < 0.35) return {
    label: t('member_crowd_level_2') || t("g_ac8de5") || "여유",
    color: '#34d399',
    emoji: '🟢',
    bg: 'rgba(52, 211, 153, 0.12)'
  };
  if (ratio < 0.65) return {
    label: t('member_crowd_level_3') || t("g_2179da") || "보통",
    color: '#fbbf24',
    emoji: '🟡',
    bg: 'rgba(251, 191, 36, 0.12)'
  };
  if (ratio < 0.85) return {
    label: t('member_crowd_level_4') || t("g_452e98") || "혼잡",
    color: '#f97316',
    emoji: '🟠',
    bg: 'rgba(249, 115, 22, 0.12)'
  };
  return {
    label: t('member_crowd_level_5') || t("g_59767d") || "매우 혼잡",
    color: '#ef4444',
    emoji: '🔴',
    bg: 'rgba(239, 68, 68, 0.12)'
  };
};

// ─── 히트맵 셀 ───
const HeatCell = memo(({
  val,
  maxCount,
  isNow,
  t
}) => {
  const level = getCrowdLevel(val, maxCount, t);
  return <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    padding: '4px 2px',
    minHeight: '32px',
    background: level.bg,
    border: isNow ? '2px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.03)',
    position: 'relative',
    transition: 'all 0.3s ease',
    boxShadow: isNow ? '0 0 8px rgba(var(--primary-rgb), 0.3)' : 'none'
  }}>
            <span style={{
      fontSize: '0.8rem',
      color: val > 0 ? level.color : 'rgba(255,255,255,0.15)'
    }}>
                {val > 0 ? level.emoji : '·'}
            </span>
            {isNow && <div style={{
      position: 'absolute',
      top: '-6px',
      right: '-4px',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: 'var(--primary-gold)',
      animation: 'pulse 2s ease-in-out infinite',
      boxShadow: '0 0 6px rgba(var(--primary-rgb), 0.6)'
    }} />}
        </div>;
});
HeatCell.displayName = 'HeatCell';

// ─── Main Component ───
const BranchCrowdChart = memo(() => {
  const {
    config
  } = useStudioConfig();
  const {
    t
  } = useLanguage();
  const branches = config?.BRANCHES || [];
  const [activeBranch, setActiveBranch] = useState(branches[0]?.id || '');
  const [rawLogs, setRawLogs] = useState(null);
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Seoul'
  });
  const nowKST = new Date(new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Seoul'
  }));
  const currentDayOfWeek = nowKST.getDay(); // 0=일
  const currentHourBucket = String(Math.floor(nowKST.getHours() / 2) * 2).padStart(2, '0');

  // Fetch 28 days of data
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const datesToFetch = [];
        const d = new Date(todayStr + 'T00:00:00+09:00');
        for (let i = 0; i < 28; i++) {
          const temp = new Date(d);
          temp.setDate(temp.getDate() - i);
          datesToFetch.push(temp.toLocaleDateString('sv-SE', {
            timeZone: 'Asia/Seoul'
          }));
        }
        const results = await Promise.all(datesToFetch.map(dateStr => storageService.getAttendanceByDate(dateStr)));
        if (!isMounted) return;
        const data = {};
        datesToFetch.forEach((dateStr, idx) => {
          data[dateStr] = results[idx].filter(l => l.status !== 'denied');
        });
        setRawLogs(data);
      } catch (err) {
        console.error('[BranchCrowdChart] Fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute heatmap per branch
  const computed = useMemo(() => {
    if (!rawLogs) return null;
    const result = {};
    branches.forEach(b => {
      const heatmap = {};
      let maxCount = 0;
      Object.values(rawLogs).forEach(dayLogs => {
        dayLogs.filter(l => l.branchId === b.id).forEach(log => {
          if (!log.timestamp) return;
          const ts = new Date(log.timestamp);
          const dayIdx = ts.getDay();
          const hour = ts.getHours();
          const bucket = String(Math.floor(hour / 2) * 2).padStart(2, '0');
          if (parseInt(bucket) < 6 || parseInt(bucket) > 20) return;
          if (!heatmap[dayIdx]) heatmap[dayIdx] = {};
          heatmap[dayIdx][bucket] = (heatmap[dayIdx][bucket] || 0) + 1;
          if (heatmap[dayIdx][bucket] > maxCount) maxCount = heatmap[dayIdx][bucket];
        });
      });

      // Find best (least crowded) times with at least some traffic
      const rankings = [];
      const dayLabels = [t('member_crowd_day_sun') || t("g_06cf3e") || "일", t('member_crowd_day_mon') || t("g_754486") || "월", t('member_crowd_day_tue') || t("g_adb4a2") || "화", t('member_crowd_day_wed') || t("g_c04eb2") || "수", t('member_crowd_day_thu') || t("g_5664a6") || "목", t('member_crowd_day_fri') || t("g_cf5632") || "금", t('member_crowd_day_sat') || t("g_b9e406") || "토"];
      const hourLabels = {
        '06': t('member_crowd_hour_range', {
          start: '6',
          end: '8'
        }) || t("g_529272") || "6-8시",
        '08': t('member_crowd_hour_range', {
          start: '8',
          end: '10'
        }) || t("g_016c3e") || "8-10시",
        '10': t('member_crowd_hour_range', {
          start: '10',
          end: '12'
        }) || t("g_0ce3ea") || "10-12시",
        '12': t('member_crowd_hour_range', {
          start: '12',
          end: '14'
        }) || t("g_3484ac") || "12-14시",
        '14': t('member_crowd_hour_range', {
          start: '14',
          end: '16'
        }) || t("g_b53d90") || "14-16시",
        '16': t('member_crowd_hour_range', {
          start: '16',
          end: '18'
        }) || t("g_ebf72b") || "16-18시",
        '18': t('member_crowd_hour_range', {
          start: '18',
          end: '20'
        }) || t("g_80139e") || "18-20시",
        '20': t('member_crowd_hour_range', {
          start: '20',
          end: '22'
        }) || t("g_011822") || "20-22시"
      };
      [1, 2, 3, 4, 5, 6, 0].forEach(dayIdx => {
        ['06', '08', '10', '12', '14', '16', '18', '20'].forEach(bucket => {
          const val = heatmap[dayIdx]?.[bucket] || 0;
          rankings.push({
            dayIdx,
            bucket,
            val,
            label: `${dayLabels[dayIdx]} ${hourLabels[bucket]}`
          });
        });
      });

      // Sort by val ascending (for quiet times), exclude zeros
      const quietTimes = rankings.filter(r => r.val > 0 && r.val <= maxCount * 0.35).sort((a, b) => a.val - b.val).slice(0, 3);
      result[b.id] = {
        heatmap,
        maxCount,
        quietTimes
      };
    });
    return result;
  }, [rawLogs, branches, t]);
  // 다중 지점이 아니면 렌더 안 함
  if (branches.length <= 1) return null;
  if (loading) {
    return <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '16px',
      padding: '24px',
      marginTop: '20px',
      marginBottom: '20px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      textAlign: 'center',
      color: 'var(--text-secondary)'
    }}>
                <div style={{
        width: '24px',
        height: '24px',
        border: '2px solid rgba(var(--primary-rgb), 0.15)',
        borderTop: '2px solid var(--primary-gold)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 10px'
      }} />
                <span style={{
        fontSize: '0.85rem'
      }}>{t('member_crowd_analyzing') || t("g_765926") || "혼잡도 데이터 분석 중..."}</span>
            </div>;
  }
  if (!computed) return null;
  const branchData = computed[activeBranch];
  if (!branchData) return null;
  const dayLabels = [t('member_crowd_day_mon') || t("g_754486") || "월", t('member_crowd_day_tue') || t("g_adb4a2") || "화", t('member_crowd_day_wed') || t("g_c04eb2") || "수", t('member_crowd_day_thu') || t("g_5664a6") || "목", t('member_crowd_day_fri') || t("g_cf5632") || "금", t('member_crowd_day_sat') || t("g_b9e406") || "토", t('member_crowd_day_sun') || t("g_06cf3e") || "일"];
  const dayIndices = [1, 2, 3, 4, 5, 6, 0];
  const hourBuckets = ['06', '08', '10', '12', '14', '16', '18', '20'];
  const hourLabels = [t('member_crowd_hour_label', {
    hour: '6'
  }) || t("g_82aea5") || "6시", t('member_crowd_hour_label', {
    hour: '8'
  }) || t("g_f41c9c") || "8시", t('member_crowd_hour_label', {
    hour: '10'
  }) || t("g_a989b6") || "10시", t('member_crowd_hour_label', {
    hour: '12'
  }) || t("g_6b3307") || "12시", t('member_crowd_hour_label', {
    hour: '14'
  }) || t("g_42bc54") || "14시", t('member_crowd_hour_label', {
    hour: '16'
  }) || t("g_bcfea5") || "16시", t('member_crowd_hour_label', {
    hour: '18'
  }) || t("g_18575c") || "18시", t('member_crowd_hour_label', {
    hour: '20'
  }) || t("g_5d3b6b") || "20시"];

  // 현재 시간의 혼잡도
  const nowVal = branchData.heatmap[currentDayOfWeek]?.[currentHourBucket] || 0;
  const nowLevel = getCrowdLevel(nowVal, branchData.maxCount, t);
  return <div style={{
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '16px',
    padding: '20px',
    marginTop: '20px',
    marginBottom: '20px',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  }}>
            {/* Header */}
            <h3 style={{
      color: 'var(--primary-gold)',
      fontSize: '1rem',
      margin: '0 0 4px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
                📊 {t('member_crowd_title') || t("g_f922d7") || "지점별 혼잡도"}
            </h3>
            <p style={{
      color: 'rgba(255,255,255,0.5)',
      fontSize: '0.8rem',
      margin: '0 0 16px 0'
    }}>
                {t('member_crowd_subtitle') || t("g_ff0fac") || "최근 4주 출석 데이터 기반 · 한산한 시간에 방문하세요!"}
            </p>

            {/* Branch Tabs */}
            <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '16px'
    }}>
                {branches.map(b => {
        const isActive = activeBranch === b.id;
        return <button key={b.id} onClick={() => setActiveBranch(b.id)} style={{
          flex: 1,
          padding: '10px 8px',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '0.85rem',
          border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
          background: isActive ? `linear-gradient(135deg, ${b.color || 'var(--primary-gold)'}40, ${b.color || 'var(--primary-gold)'}20)` : 'rgba(255,255,255,0.03)',
          color: isActive ? b.color || 'var(--primary-gold)' : 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: isActive ? `0 2px 12px ${b.color || 'var(--primary-gold)'}30` : 'none'
        }}>
                            {b.name}
                        </button>;
      })}
            </div>

            {/* 현재 혼잡도 카드 */}
            <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 16px',
      borderRadius: '12px',
      marginBottom: '16px',
      background: nowLevel.bg,
      border: `1px solid ${nowLevel.color}30`
    }}>
                <span style={{
        fontSize: '1.6rem'
      }}>{nowLevel.emoji}</span>
                <div>
                    <div style={{
          fontSize: '0.8rem',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '2px'
        }}>
                        {t('member_crowd_visit_now') || t("g_03a5b8") || "지금 방문하면?"}
                    </div>
                    <div style={{
          fontSize: '1rem',
          fontWeight: '700',
          color: nowLevel.color
        }}>
                        {nowLevel.label}
                    </div>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div style={{
      overflowX: 'auto',
      marginBottom: '14px'
    }}>
                <div style={{
        display: 'grid',
        gridTemplateColumns: `36px repeat(${hourBuckets.length}, 1fr)`,
        gap: '3px',
        minWidth: '320px'
      }}>
                    {/* Hour header */}
                    <div />
                    {hourLabels.map(h => <div key={h} style={{
          textAlign: 'center',
          fontSize: '0.65rem',
          color: 'rgba(255,255,255,0.4)',
          fontWeight: '600',
          paddingBottom: '4px'
        }}>{h}</div>)}

                    {/* Day rows */}
                    {dayLabels.map((day, di) => {
          const dayIdx = dayIndices[di];
          const isToday = dayIdx === currentDayOfWeek;
          return [<div key={`label-${di}`} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: isToday ? '800' : '600',
            color: isToday ? 'var(--primary-gold)' : 'rgba(255,255,255,0.5)'
          }}>
                                {day}
                            </div>, ...hourBuckets.map(bucket => {
            const val = branchData.heatmap[dayIdx]?.[bucket] || 0;
            const isNow = dayIdx === currentDayOfWeek && bucket === currentHourBucket;
            return <HeatCell key={`${di}-${bucket}`} val={val} maxCount={branchData.maxCount} isNow={isNow} t={t} />;
          })];
        })}
                </div>
            </div>

            {/* Legend */}
            <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '12px',
      fontSize: '0.7rem',
      color: 'rgba(255,255,255,0.4)',
      marginBottom: '14px'
    }}>
                {[{
        label: t('member_crowd_level_1') || t("g_b2da00") || "한산",
        color: '#10b981'
      }, {
        label: t('member_crowd_level_3') || t("g_2179da") || "보통",
        color: '#fbbf24'
      }, {
        label: t('member_crowd_level_4') || t("g_452e98") || "혼잡",
        color: '#f97316'
      }, {
        label: t('member_crowd_level_5') || t("g_59767d") || "매우 혼잡",
        color: '#ef4444'
      }].map(l => <span key={l.label} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
                        <span style={{
          width: '10px',
          height: '10px',
          borderRadius: '3px',
          background: `${l.color}30`,
          border: `1px solid ${l.color}60`,
          display: 'inline-block'
        }} />
                        {l.label}
                    </span>)}
            </div>

            {/* 추천 시간대 */}
            {branchData.quietTimes.length > 0 && <div style={{
      padding: '12px 14px',
      borderRadius: '10px',
      background: 'rgba(16, 185, 129, 0.06)',
      border: '1px solid rgba(16, 185, 129, 0.15)'
    }}>
                    <div style={{
        fontSize: '0.8rem',
        color: '#10b981',
        fontWeight: '700',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
                        ✨ {t('member_crowd_recommended') || t("g_d2b108") || "추천 방문 시간"}
                    </div>
                    <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
                        {branchData.quietTimes.map((qt, i) => <span key={i} style={{
          padding: '4px 10px',
          borderRadius: '6px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          color: '#34d399',
          fontSize: '0.8rem',
          fontWeight: '600'
        }}>
                                {qt.label}
                            </span>)}
                    </div>
                </div>}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.3); }
                }
            `}</style>
        </div>;
});
BranchCrowdChart.displayName = 'BranchCrowdChart';
export default BranchCrowdChart;