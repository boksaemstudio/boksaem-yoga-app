import { useLanguageStore } from '../../stores/useLanguageStore';
import { useState, useEffect, useMemo, memo } from 'react';
import { useStudioConfig } from '../../contexts/StudioContext';
import { useLanguage } from '../../hooks/useLanguage';
import { storageService } from '../../services/storage';

// ─── 혼잡도 레벨 판별 ───
const getCrowdLevel = (val, maxCount, t) => {
  if (val === 0) return {
    label: t('member_crowd_level_1') || t("g_2ad113") || t("g_2ad113") || t("g_2ad113") || t("g_2ad113") || t("g_2ad113") || "\uD55C\uC0B0",
    color: '#10b981',
    emoji: '🟢',
    bg: 'rgba(16, 185, 129, 0.12)'
  };
  const ratio = maxCount > 0 ? val / maxCount : 0;
  if (ratio < 0.35) return {
    label: t('member_crowd_level_2') || t("g_9da070") || t("g_9da070") || t("g_9da070") || t("g_9da070") || t("g_9da070") || "\uC5EC\uC720",
    color: '#34d399',
    emoji: '🟢',
    bg: 'rgba(52, 211, 153, 0.12)'
  };
  if (ratio < 0.65) return {
    label: t('member_crowd_level_3') || t("g_6b1017") || t("g_6b1017") || t("g_6b1017") || t("g_6b1017") || t("g_6b1017") || "\uBCF4\uD1B5",
    color: '#fbbf24',
    emoji: '🟡',
    bg: 'rgba(251, 191, 36, 0.12)'
  };
  if (ratio < 0.85) return {
    label: t('member_crowd_level_4') || t("g_598de5") || t("g_598de5") || t("g_598de5") || t("g_598de5") || t("g_598de5") || "\uD63C\uC7A1",
    color: '#f97316',
    emoji: '🟠',
    bg: 'rgba(249, 115, 22, 0.12)'
  };
  return {
    label: t('member_crowd_level_5') || t("g_106c6b") || t("g_106c6b") || t("g_106c6b") || t("g_106c6b") || t("g_106c6b") || "\uB9E4\uC6B0 \uD63C\uC7A1",
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

  // 다중 지점이 아니면 렌더 안 함
  if (branches.length <= 1) return null;
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
      const dayLabels = [t('member_crowd_day_sun') || t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || "\uC77C", t('member_crowd_day_mon') || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || "\uC6D4", t('member_crowd_day_tue') || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || "\uD654", t('member_crowd_day_wed') || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || "\uC218", t('member_crowd_day_thu') || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || "\uBAA9", t('member_crowd_day_fri') || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || "\uAE08", t('member_crowd_day_sat') || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || "\uD1A0"];
      const hourLabels = {
        '06': t('member_crowd_hour_range', {
          start: '6',
          end: '8'
        }) || t("g_ea785a") || t("g_ea785a") || t("g_ea785a") || t("g_ea785a") || t("g_ea785a") || "6-8\uC2DC",
        '08': t('member_crowd_hour_range', {
          start: '8',
          end: '10'
        }) || t("g_75ee8c") || t("g_75ee8c") || t("g_75ee8c") || t("g_75ee8c") || t("g_75ee8c") || "8-10\uC2DC",
        '10': t('member_crowd_hour_range', {
          start: '10',
          end: '12'
        }) || t("g_526db5") || t("g_526db5") || t("g_526db5") || t("g_526db5") || t("g_526db5") || "10-12\uC2DC",
        '12': t('member_crowd_hour_range', {
          start: '12',
          end: '14'
        }) || t("g_e83d2c") || t("g_e83d2c") || t("g_e83d2c") || t("g_e83d2c") || t("g_e83d2c") || "12-14\uC2DC",
        '14': t('member_crowd_hour_range', {
          start: '14',
          end: '16'
        }) || t("g_e6a43f") || t("g_e6a43f") || t("g_e6a43f") || t("g_e6a43f") || t("g_e6a43f") || "14-16\uC2DC",
        '16': t('member_crowd_hour_range', {
          start: '16',
          end: '18'
        }) || t("g_9b6af5") || t("g_9b6af5") || t("g_9b6af5") || t("g_9b6af5") || t("g_9b6af5") || "16-18\uC2DC",
        '18': t('member_crowd_hour_range', {
          start: '18',
          end: '20'
        }) || t("g_e0dbf7") || t("g_e0dbf7") || t("g_e0dbf7") || t("g_e0dbf7") || t("g_e0dbf7") || "18-20\uC2DC",
        '20': t('member_crowd_hour_range', {
          start: '20',
          end: '22'
        }) || t("g_cfed3a") || t("g_cfed3a") || t("g_cfed3a") || t("g_cfed3a") || t("g_cfed3a") || "20-22\uC2DC"
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
  }, [rawLogs, branches]);
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
      }}>{t('member_crowd_analyzing') || t("g_8bfbb0") || t("g_8bfbb0") || t("g_8bfbb0") || t("g_8bfbb0") || t("g_8bfbb0") || "\uD63C\uC7A1\uB3C4 \uB370\uC774\uD130 \uBD84\uC11D \uC911..."}</span>
            </div>;
  }
  if (!computed) return null;
  const branchData = computed[activeBranch];
  if (!branchData) return null;
  const dayLabels = [t('member_crowd_day_mon') || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || "\uC6D4", t('member_crowd_day_tue') || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || "\uD654", t('member_crowd_day_wed') || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || "\uC218", t('member_crowd_day_thu') || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || "\uBAA9", t('member_crowd_day_fri') || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || "\uAE08", t('member_crowd_day_sat') || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || "\uD1A0", t('member_crowd_day_sun') || t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || "\uC77C"];
  const dayIndices = [1, 2, 3, 4, 5, 6, 0];
  const hourBuckets = ['06', '08', '10', '12', '14', '16', '18', '20'];
  const hourLabels = [t('member_crowd_hour_label', {
    hour: '6'
  }) || t("g_4ccb06") || t("g_4ccb06") || t("g_4ccb06") || t("g_4ccb06") || t("g_4ccb06") || "6\uC2DC", t('member_crowd_hour_label', {
    hour: '8'
  }) || t("g_b6181b") || t("g_b6181b") || t("g_b6181b") || t("g_b6181b") || t("g_b6181b") || "8\uC2DC", t('member_crowd_hour_label', {
    hour: '10'
  }) || t("g_19b25b") || t("g_19b25b") || t("g_19b25b") || t("g_19b25b") || t("g_19b25b") || "10\uC2DC", t('member_crowd_hour_label', {
    hour: '12'
  }) || t("g_ae6eac") || t("g_ae6eac") || t("g_ae6eac") || t("g_ae6eac") || t("g_ae6eac") || "12\uC2DC", t('member_crowd_hour_label', {
    hour: '14'
  }) || t("g_48f715") || t("g_48f715") || t("g_48f715") || t("g_48f715") || t("g_48f715") || "14\uC2DC", t('member_crowd_hour_label', {
    hour: '16'
  }) || t("g_4f3745") || t("g_4f3745") || t("g_4f3745") || t("g_4f3745") || t("g_4f3745") || "16\uC2DC", t('member_crowd_hour_label', {
    hour: '18'
  }) || t("g_0ca1de") || t("g_0ca1de") || t("g_0ca1de") || t("g_0ca1de") || t("g_0ca1de") || "18\uC2DC", t('member_crowd_hour_label', {
    hour: '20'
  }) || t("g_554f7a") || t("g_554f7a") || t("g_554f7a") || t("g_554f7a") || t("g_554f7a") || "20\uC2DC"];

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
                📊 {t('member_crowd_title') || t("g_9e7de1") || t("g_9e7de1") || t("g_9e7de1") || t("g_9e7de1") || t("g_9e7de1") || "\uC9C0\uC810\uBCC4 \uD63C\uC7A1\uB3C4"}
            </h3>
            <p style={{
      color: 'rgba(255,255,255,0.5)',
      fontSize: '0.8rem',
      margin: '0 0 16px 0'
    }}>
                {t('member_crowd_subtitle') || t("g_1bf651") || t("g_1bf651") || t("g_1bf651") || t("g_1bf651") || t("g_1bf651") || "\uCD5C\uADFC 4\uC8FC \uCD9C\uC11D \uB370\uC774\uD130 \uAE30\uBC18 \xB7 \uD55C\uC0B0\uD55C \uC2DC\uAC04\uC5D0 \uBC29\uBB38\uD558\uC138\uC694!"}
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
                        {t('member_crowd_visit_now') || t("g_e49be0") || t("g_e49be0") || t("g_e49be0") || t("g_e49be0") || t("g_e49be0") || "\uC9C0\uAE08 \uBC29\uBB38\uD558\uBA74?"}
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
        label: t('member_crowd_level_1') || t("g_2ad113") || t("g_2ad113") || t("g_2ad113") || t("g_2ad113") || t("g_2ad113") || "\uD55C\uC0B0",
        color: '#10b981'
      }, {
        label: t('member_crowd_level_3') || t("g_6b1017") || t("g_6b1017") || t("g_6b1017") || t("g_6b1017") || t("g_6b1017") || "\uBCF4\uD1B5",
        color: '#fbbf24'
      }, {
        label: t('member_crowd_level_4') || t("g_598de5") || t("g_598de5") || t("g_598de5") || t("g_598de5") || t("g_598de5") || "\uD63C\uC7A1",
        color: '#f97316'
      }, {
        label: t('member_crowd_level_5') || t("g_106c6b") || t("g_106c6b") || t("g_106c6b") || t("g_106c6b") || t("g_106c6b") || "\uB9E4\uC6B0 \uD63C\uC7A1",
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
                        ✨ {t('member_crowd_recommended') || t("g_e5741e") || t("g_e5741e") || t("g_e5741e") || t("g_e5741e") || t("g_e5741e") || "\uCD94\uCC9C \uBC29\uBB38 \uC2DC\uAC04"}
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