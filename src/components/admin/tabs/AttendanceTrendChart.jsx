import { useState, useEffect, useMemo, memo, useRef, useCallback } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { TrendUp, TrendDown, Equals, ChartLineUp, ChartBar, Fire, Users, Funnel, CalendarBlank } from '@phosphor-icons/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts';
import { storageService } from '../../../services/storage';
import { useStudioConfig } from '../../../contexts/StudioContext';

// ─── 주간 비교 요약 카드 (동일 시점 비교) ───
const WeeklyComparisonCards = memo(({
  thisWeekCount,
  lastWeekSameCount,
  lastWeekLabel
}) => {
  const diff = thisWeekCount - lastWeekSameCount;
  const pct = lastWeekSameCount > 0 ? Math.round(diff / lastWeekSameCount * 100) : thisWeekCount > 0 ? 100 : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;
  return <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '10px',
    marginBottom: '18px'
  }}>
            {/* 이번 주 (월~오늘) */}
            <div style={{
      padding: '14px 12px',
      borderRadius: '10px',
      background: 'rgba(var(--primary-rgb), 0.06)',
      border: '1px solid rgba(var(--primary-rgb), 0.15)',
      textAlign: 'center'
    }}>
                <div style={{
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        marginBottom: '6px'
      }}>{t(t('admin_trend_this_week') || t("g_134ec4") || t("g_134ec4") || t("g_134ec4") || t("g_134ec4") || t("g_134ec4") || "\uC774\uBC88 \uC8FC")}</div>
                <div style={{
        fontSize: '1.4rem',
        fontWeight: '800',
        color: 'var(--primary-gold)'
      }}>{thisWeekCount}</div>
                <div style={{
        fontSize: '0.7rem',
        color: 'var(--text-secondary)',
        marginTop: '2px'
      }}>{t(t('admin_trend_mon_to_today') || t("g_200ef0") || t("g_200ef0") || t("g_200ef0") || t("g_200ef0") || t("g_200ef0") || "\uC6D4~\uC624\uB298")}</div>
            </div>
            {/* 지난 주 동일 시점 */}
            <div style={{
      padding: '14px 12px',
      borderRadius: '10px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      textAlign: 'center'
    }}>
                <div style={{
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        marginBottom: '6px'
      }}>{t(t('admin_trend_last_week') || t("g_6e297f") || t("g_6e297f") || t("g_6e297f") || t("g_6e297f") || t("g_6e297f") || "\uC9C0\uB09C \uC8FC")}</div>
                <div style={{
        fontSize: '1.4rem',
        fontWeight: '800'
      }}>{lastWeekSameCount}</div>
                <div style={{
        fontSize: '0.7rem',
        color: 'var(--text-secondary)',
        marginTop: '2px'
      }}>{lastWeekLabel}</div>
            </div>
            {/* 증감률 */}
            <div style={{
      padding: '14px 12px',
      borderRadius: '10px',
      background: isUp ? 'rgba(76, 175, 80, 0.08)' : isDown ? 'rgba(244, 67, 54, 0.08)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isUp ? 'rgba(76, 175, 80, 0.2)' : isDown ? 'rgba(244, 67, 54, 0.2)' : 'rgba(255,255,255,0.06)'}`,
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
                <div style={{
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        marginBottom: '6px'
      }}>{t(t('admin_trend_vs_same_time') || t("g_b148e5") || t("g_b148e5") || t("g_b148e5") || t("g_b148e5") || t("g_b148e5") || "\uB3D9\uC77C \uC2DC\uC810 \uB300\uBE44")}</div>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '1.3rem',
        fontWeight: '800',
        color: isUp ? '#4CAF50' : isDown ? '#F44336' : 'var(--text-secondary)'
      }}>
                    {isUp ? <TrendUp size={20} weight="bold" /> : isDown ? <TrendDown size={20} weight="bold" /> : <Equals size={16} />}
                    {isUp ? '+' : ''}{pct}%
                </div>
            </div>
        </div>;
});
WeeklyComparisonCards.displayName = 'WeeklyComparisonCards';

// ─── Custom Tooltip ───
const DailyTooltip = ({
  active,
  payload
}) => {
  const t = useLanguageStore(s => s.t);
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return <div style={{
    background: 'rgba(20,20,30,0.95)',
    border: '1px solid rgba(var(--primary-rgb), 0.3)',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: 'white'
  }}>
            <div style={{
      color: 'var(--text-secondary)',
      marginBottom: '4px'
    }}>
                {d.fullDate} ({d.dayName}){d.isToday ? ' · ' + t(t('admin_trend_collecting') || t("g_059816") || t("g_059816") || t("g_059816") || t("g_059816") || t("g_059816") || "\uC9D1\uACC4 \uC911") : ''}
            </div>
            <div style={{
      color: 'var(--primary-gold)',
      fontWeight: 'bold',
      fontSize: '1rem'
    }}>
                {t('admin_trend_attendance') || t("g_b31acb") || t("g_b31acb") || t("g_b31acb") || t("g_b31acb") || t("g_b31acb") || "\uCD9C\uC11D"}: {d.count}{t('admin_trend_count_unit') || t('admin_trend_count_unit') || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || "\uAC74"}{d.isToday ? ' (' + t(t('admin_trend_in_progress') || t("g_df4a7e") || t("g_df4a7e") || t("g_df4a7e") || t("g_df4a7e") || t("g_df4a7e") || "\uC9C4\uD589 \uC911") + ')' : ''}
            </div>
            {d.newCount != null && d.newCount > 0 && <div style={{
      color: '#86efac',
      fontSize: '0.8rem',
      marginTop: '2px'
    }}>
                    {t('admin_trend_new') || t("g_5a601c") || t("g_5a601c") || t("g_5a601c") || t("g_5a601c") || t("g_5a601c") || "\uC2E0\uADDC"}: {d.newCount}{t('admin_trend_count_unit') || t('admin_trend_count_unit') || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || "\uAC74"} | {t('admin_trend_existing') || t("g_e9d2a1") || t("g_e9d2a1") || t("g_e9d2a1") || t("g_e9d2a1") || t("g_e9d2a1") || "\uAE30\uC874"}: {d.existingCount}{t('admin_trend_count_unit') || t('admin_trend_count_unit') || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || "\uAC74"}
                </div>}
            {d.ma7 != null && <div style={{
      color: 'rgba(255,255,255,0.5)',
      fontSize: '0.8rem',
      marginTop: '2px'
    }}>
                    {t(t('admin_trend_7d_avg') || t("g_c0c78e") || t("g_c0c78e") || t("g_c0c78e") || t("g_c0c78e") || t("g_c0c78e") || "7\uC77C \uD3C9\uADE0")}: {d.ma7}{t('명')}
                </div>}
        </div>;
};

// ─── 요일×시간대 히트맵 ───
const HeatmapChart = memo(({
  data
}) => {
  // data: { [dayIdx]: { [hourBucket]: count } }
  const dayLabels = [t('admin_trend_day_mon') || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || "\uC6D4", t('admin_trend_day_tue') || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || "\uD654", t('admin_trend_day_wed') || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || "\uC218", t('admin_trend_day_thu') || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || "\uBAA9", t('admin_trend_day_fri') || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || "\uAE08", t('admin_trend_day_sat') || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || "\uD1A0", t('admin_trend_day_sun') || t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || "\uC77C"];
  const hourBuckets = ['06', '08', '10', '12', '14', '16', '18', '20'];
  const hourLabels = ['6' + t(t('admin_trend_hour_suffix') || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || "\uC2DC"), '8' + t(t('admin_trend_hour_suffix') || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || "\uC2DC"), '10' + t(t('admin_trend_hour_suffix') || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || "\uC2DC"), '12' + t(t('admin_trend_hour_suffix') || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || "\uC2DC"), '14' + t(t('admin_trend_hour_suffix') || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || "\uC2DC"), '16' + t(t('admin_trend_hour_suffix') || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || "\uC2DC"), '18' + t(t('admin_trend_hour_suffix') || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || "\uC2DC"), '20' + t(t('admin_trend_hour_suffix') || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || t("g_1ab611") || "\uC2DC")];

  // Find max for color scaling
  let maxCount = 0;
  dayLabels.forEach((_, di) => {
    hourBuckets.forEach(h => {
      const dayIdx = [1, 2, 3, 4, 5, 6, 0][di]; // 월~일 순서
      const v = data[dayIdx]?.[h] || 0;
      if (v > maxCount) maxCount = v;
    });
  });
  const cellW = 40,
    cellH = 34,
    labelW = 36,
    headerH = 28;
  const totalW = labelW + hourBuckets.length * cellW;
  const totalH = headerH + dayLabels.length * cellH;
  const getColor = val => {
    if (val === 0) return 'rgba(255,255,255,0.03)';
    const ratio = maxCount > 0 ? val / maxCount : 0;
    if (ratio < 0.25) return 'rgba(var(--primary-rgb), 0.1)';
    if (ratio < 0.5) return 'rgba(var(--primary-rgb), 0.25)';
    if (ratio < 0.75) return 'rgba(var(--primary-rgb), 0.5)';
    return 'var(--primary-gold)';
  };
  const getTextColor = val => {
    if (val === 0) return 'rgba(255,255,255,0.15)';
    const ratio = maxCount > 0 ? val / maxCount : 0;
    if (ratio >= 0.75) return 'rgba(0,0,0,0.8)';
    return 'rgba(255,255,255,0.9)';
  };
  return <div style={{
    overflowX: 'auto',
    padding: '4px 0'
  }}>
            <svg width={totalW} height={totalH} style={{
      display: 'block',
      margin: '0 auto'
    }}>
                {/* Hour headers */}
                {hourBuckets.map((h, hi) => <text key={`h-${h}`} x={labelW + hi * cellW + cellW / 2} y={headerH - 8} textAnchor="middle" fontSize="11" fill="var(--text-secondary)" fontWeight="600">
                        {hourLabels[hi]}
                    </text>)}
                {/* Rows */}
                {dayLabels.map((day, di) => {
        const dayIdx = [1, 2, 3, 4, 5, 6, 0][di];
        return <g key={`row-${di}`}>
                            <text x={labelW - 8} y={headerH + di * cellH + cellH / 2 + 4} textAnchor="end" fontSize="12" fill="var(--text-secondary)" fontWeight="600">
                                {day}
                            </text>
                            {hourBuckets.map((h, hi) => {
            const val = data[dayIdx]?.[h] || 0;
            return <g key={`cell-${di}-${hi}`}>
                                        <rect x={labelW + hi * cellW + 1} y={headerH + di * cellH + 1} width={cellW - 2} height={cellH - 2} rx="4" ry="4" fill={getColor(val)} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                                        <text x={labelW + hi * cellW + cellW / 2} y={headerH + di * cellH + cellH / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={getTextColor(val)}>
                                            {val > 0 ? val : '·'}
                                        </text>
                                    </g>;
          })}
                        </g>;
      })}
            </svg>
            {/* 범례 */}
            <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '12px',
      marginTop: '10px',
      fontSize: '0.8rem',
      color: 'var(--text-secondary)'
    }}>
                <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
                    <span style={{
          width: '12px',
          height: '12px',
          borderRadius: '3px',
          background: 'rgba(var(--primary-rgb), 0.1)',
          display: 'inline-block'
        }} /> {t(t('admin_trend_few') || t("g_08d289") || t("g_08d289") || t("g_08d289") || t("g_08d289") || t("g_08d289") || "\uC801\uC74C")}
                </span>
                <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
                    <span style={{
          width: '12px',
          height: '12px',
          borderRadius: '3px',
          background: 'rgba(var(--primary-rgb), 0.5)',
          display: 'inline-block'
        }} /> {t(t('admin_trend_moderate') || t("g_6b1017") || t("g_6b1017") || t("g_6b1017") || t("g_6b1017") || t("g_6b1017") || "\uBCF4\uD1B5")}
                </span>
                <span style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
                    <span style={{
          width: '12px',
          height: '12px',
          borderRadius: '3px',
          background: 'var(--primary-gold)',
          display: 'inline-block'
        }} /> {t(t('admin_trend_peak') || t("g_3c9d2e") || t("g_3c9d2e") || t("g_3c9d2e") || t("g_3c9d2e") || t("g_3c9d2e") || "\uD53C\uD06C")}
                </span>
            </div>
        </div>;
});
HeatmapChart.displayName = 'HeatmapChart';

// ─── 수업/강사 인기 랭킹 ───
const PopularityRanking = memo(({
  classRanking,
  instructorRanking
}) => {
  return <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  }}>
            {/* 수업 랭킹 */}
            <div>
                <div style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: '10px',
        fontWeight: '600'
      }}>
                    {t(t('admin_trend_top5_class') || t("g_09435e") || t("g_09435e") || t("g_09435e") || t("g_09435e") || t("g_09435e") || "\uD83C\uDFC6 \uC778\uAE30 \uC218\uC5C5 Top 5")}
                </div>
                {classRanking.slice(0, 5).map((c, i) => <div key={i} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        background: i === 0 ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent',
        borderRadius: '8px',
        marginBottom: '4px'
      }}>
                        <span style={{
          fontSize: '0.8rem',
          fontWeight: '800',
          minWidth: '20px',
          textAlign: 'center',
          color: i === 0 ? 'var(--primary-gold)' : i < 3 ? '#e5e7eb' : '#71717a'
        }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                        </span>
                        <span style={{
          flex: 1,
          fontSize: '0.85rem',
          color: i === 0 ? 'var(--primary-gold)' : 'var(--text-primary)',
          fontWeight: i === 0 ? '700' : '500'
        }}>
                            {c.name}
                        </span>
                        <span style={{
          fontSize: '0.85rem',
          fontWeight: '700',
          color: 'var(--text-secondary)'
        }}>
                            {c.count}{t('admin_trend_count_unit') || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || "\uAC74"}
                        </span>
                    </div>)}
                {classRanking.length === 0 && <div style={{
        fontSize: '0.8rem',
        color: '#52525b',
        textAlign: 'center',
        padding: '16px'
      }}>{t(t('admin_trend_no_data') || t("g_04f463") || t("g_04f463") || t("g_04f463") || t("g_04f463") || t("g_04f463") || "\uB370\uC774\uD130 \uC5C6\uC74C")}</div>}
            </div>
            {/* 강사 랭킹 */}
            <div>
                <div style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: '10px',
        fontWeight: '600'
      }}>
                    {t(t('admin_trend_top5_inst') || t("g_381ce3") || t("g_381ce3") || t("g_381ce3") || t("g_381ce3") || t("g_381ce3") || "\u2B50 \uC778\uAE30 \uAC15\uC0AC Top 5")}
                </div>
                {instructorRanking.slice(0, 5).map((c, i) => <div key={i} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        background: i === 0 ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent',
        borderRadius: '8px',
        marginBottom: '4px'
      }}>
                        <span style={{
          fontSize: '0.8rem',
          fontWeight: '800',
          minWidth: '20px',
          textAlign: 'center',
          color: i === 0 ? 'var(--primary-gold)' : i < 3 ? '#e5e7eb' : '#71717a'
        }}>
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                        </span>
                        <span style={{
          flex: 1,
          fontSize: '0.85rem',
          color: i === 0 ? 'var(--primary-gold)' : 'var(--text-primary)',
          fontWeight: i === 0 ? '700' : '500'
        }}>
                            {c.name}
                        </span>
                        <span style={{
          fontSize: '0.85rem',
          fontWeight: '700',
          color: 'var(--text-secondary)'
        }}>
                            {c.count}{t('admin_trend_count_unit') || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || "\uAC74"}
                        </span>
                    </div>)}
                {instructorRanking.length === 0 && <div style={{
        fontSize: '0.8rem',
        color: '#52525b',
        textAlign: 'center',
        padding: '16px'
      }}>{t(t('admin_trend_no_data') || t("g_04f463") || t("g_04f463") || t("g_04f463") || t("g_04f463") || t("g_04f463") || "\uB370\uC774\uD130 \uC5C6\uC74C")}</div>}
            </div>
        </div>;
});
PopularityRanking.displayName = 'PopularityRanking';

// ─── 신규/기존 회원 비율 ───
const NewVsReturningBar = memo(({
  newCount,
  existingCount
}) => {
  const total = newCount + existingCount;
  if (total === 0) return null;
  const newPct = Math.round(newCount / total * 100);
  const existPct = 100 - newPct;
  return <div style={{
    marginBottom: '18px'
  }}>
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px'
    }}>
                <span style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
                    <Users size={14} /> {t('admin_trend_ratio_title_pp') || t("g_562e2c") || t("g_562e2c") || t("g_562e2c") || t("g_562e2c") || t("g_562e2c") || "\uC218\uAC15 \uC778\uC6D0 \uBE44\uC728 (\uC2E0\uADDC vs \uAE30\uC874 \uD68C\uC6D0)"}
                </span>
                <span style={{
        fontSize: '0.75rem',
        color: 'var(--text-secondary)'
      }}>{t('admin_trend_distinct_members') || t("g_05d3de") || t("g_05d3de") || t("g_05d3de") || t("g_05d3de") || t("g_05d3de") || "\uC21C\uC218 \uC778\uC6D0(\uBA85) \uAE30\uC900"}</span>
            </div>
            <div style={{
      display: 'flex',
      height: '24px',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'rgba(255,255,255,0.04)'
    }}>
                {newCount > 0 && <div style={{
        width: `${newPct}%`,
        background: 'linear-gradient(90deg, #10b981, #34d399)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: '700',
        color: 'rgba(0,0,0,0.8)',
        transition: 'width 0.5s ease',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
      }}>
                        {newPct >= 18 ? `${t('admin_trend_new') || t("g_5a601c") || t("g_5a601c") || t("g_5a601c") || t("g_5a601c") || t("g_5a601c") || "\uC2E0\uADDC"} ${newPct}%` : ''}
                    </div>}
                {existingCount > 0 && <div style={{
        width: `${existPct}%`,
        background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
        transition: 'width 0.5s ease',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
      }}>
                        {existPct >= 18 ? `${t('admin_trend_existing') || t("g_e9d2a1") || t("g_e9d2a1") || t("g_e9d2a1") || t("g_e9d2a1") || t("g_e9d2a1") || "\uAE30\uC874"} ${existPct}%` : ''}
                    </div>}
            </div>
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '6px',
      fontSize: '0.8rem',
      flexWrap: 'wrap',
      gap: '4px'
    }}>
                <span style={{
        color: '#34d399',
        fontWeight: '600',
        whiteSpace: 'nowrap'
      }}>{t('admin_trend_new_pp') || t("g_dd5149") || t("g_dd5149") || t("g_dd5149") || t("g_dd5149") || t("g_dd5149") || "\uC2E0\uADDC \uD68C\uC6D0"} {newCount}{t('명')} <span style={{
          fontSize: '0.7rem',
          opacity: 0.8
        }}>({t('admin_trend_recent_30d') || t("g_49bd9f") || t("g_49bd9f") || t("g_49bd9f") || t("g_49bd9f") || t("g_49bd9f") || "\uCD5C\uADFC 30\uC77C \uB4F1\uB85D"})</span></span>
                <span style={{
        color: '#60a5fa',
        fontWeight: '600',
        whiteSpace: 'nowrap'
      }}>{t('admin_trend_existing_pp') || t("g_37a21c") || t("g_37a21c") || t("g_37a21c") || t("g_37a21c") || t("g_37a21c") || "\uAE30\uC874 \uD68C\uC6D0"} {existingCount}{t('명')}</span>
            </div>
        </div>;
});
NewVsReturningBar.displayName = 'NewVsReturningBar';

// ─── 기간 표시 헬퍼 ───
const formatPeriodLabel = days => {
  if (days <= 14) return `${days}일`;
  if (days < 60) return `${Math.round(days / 7)}주`;
  return `${Math.round(days / 30)}개월`;
};

// ─── Main Component ───
const AttendanceTrendChart = memo(({
  selectedDate,
  members = []
}) => {
  const {
    config
  } = useStudioConfig();
  const branches = config?.BRANCHES || [];
  const [rawLogs, setRawLogs] = useState(null); // { dateStr: AttendanceLog[] }
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'heatmap' | 'ranking'
  const [branchFilter, setBranchFilter] = useState('all'); // 'all' | branchId
  const [periodDays, setPeriodDays] = useState(28); // fetch 트리거용 (디바운스)
  const [sliderDays, setSliderDays] = useState(28); // UI 즉시 반영용
  const debounceRef = useRef(null);
  const handlePeriodChange = useCallback(val => {
    setSliderDays(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPeriodDays(val), 400);
  }, []);
  const todayStr = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Seoul'
  });
  const baseDate = selectedDate || todayStr;

  // Build member lookup for new vs existing
  const memberMap = useMemo(() => {
    const map = {};
    members.forEach(m => {
      if (m.id) map[m.id] = m;
    });
    return map;
  }, [members]);

  // Fetch N days of raw log data (periodDays)
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const datesToFetch = [];
        const d = new Date(baseDate + 'T00:00:00+09:00');
        for (let i = 0; i < periodDays; i++) {
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
          // denied 제외
          data[dateStr] = results[idx].filter(l => l.status !== 'denied');
        });
        setRawLogs(data);
      } catch (err) {
        console.error('[AttendanceTrendChart] Fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [baseDate, periodDays]);

  // ─── Computed Data ───
  const computed = useMemo(() => {
    if (!rawLogs) return null;

    // ── 지점 필터 적용 ──
    const filteredLogs = {};
    Object.entries(rawLogs).forEach(([dateStr, logs]) => {
      filteredLogs[dateStr] = branchFilter === 'all' ? logs : logs.filter(l => l.branchId === branchFilter);
    });
    const sortedDates = Object.keys(filteredLogs).sort();
    const dayNames = [t('admin_trend_day_sun') || t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || "\uC77C", t('admin_trend_day_mon') || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || "\uC6D4", t('admin_trend_day_tue') || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || "\uD654", t('admin_trend_day_wed') || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || "\uC218", t('admin_trend_day_thu') || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || "\uBAA9", t('admin_trend_day_fri') || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || "\uAE08", t('admin_trend_day_sat') || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || "\uD1A0"];
    const thirtyDaysAgo = new Date(baseDate + 'T00:00:00+09:00');
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoMs = thirtyDaysAgo.getTime();

    // ── 신규/기존 분류 helper ──
    const isNewMember = memberId => {
      const member = memberMap[memberId];
      if (!member || !member.regDate) return false;
      return new Date(member.regDate + 'T00:00:00+09:00').getTime() >= thirtyDaysAgoMs;
    };

    // Unique Members tracking sets
    const newMembersSet = new Set();
    const existingMembersSet = new Set();
    const daily = sortedDates.map((dateStr, idx) => {
      const logs = filteredLogs[dateStr];
      const count = logs.length;
      const isToday = dateStr === todayStr;

      // New vs existing per day
      let newCount = 0,
        existingCount = 0;
      logs.forEach(l => {
        if (l.memberId) {
          if (isNewMember(l.memberId)) {
            newCount++;
            newMembersSet.add(l.memberId);
          } else {
            existingCount++;
            existingMembersSet.add(l.memberId);
          }
        }
      });

      // 7-day MA
      let ma7 = null;
      if (idx >= 6) {
        let sum = 0;
        for (let j = idx - 6; j <= idx; j++) {
          // 오늘은 MA에서 제외 (진행 중이므로)
          if (sortedDates[j] === todayStr) {
            sum += rawLogs[sortedDates[j > 0 ? j - 1 : j]].length; // 이전 날로 대체
          } else {
            sum += rawLogs[sortedDates[j]].length;
          }
        }
        ma7 = Math.round(sum / 7 * 10) / 10;
      }
      const dObj = new Date(dateStr + 'T00:00:00+09:00');
      return {
        date: dateStr.slice(5).replace('-', '/'),
        fullDate: dateStr,
        count,
        ma7,
        newCount,
        existingCount,
        dayName: dayNames[dObj.getDay()],
        isSelected: dateStr === baseDate,
        isToday
      };
    });

    // ── 주간 비교 (동일 시점) ──
    const bd = new Date(baseDate + 'T00:00:00+09:00');
    const bdDow = bd.getDay(); // 0=Sunday
    const mondayOffset = bdDow === 0 ? 6 : bdDow - 1; // 이번 주 월요일부터 오늘까지의 일 수

    let thisWeek = 0;
    let lastWeekSame = 0;
    const lastWeekDayNames = [];
    sortedDates.forEach(dateStr => {
      const diff = Math.floor((bd.getTime() - new Date(dateStr + 'T00:00:00+09:00').getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff <= mondayOffset) {
        thisWeek += filteredLogs[dateStr].length;
      } else if (diff >= 7 && diff <= 7 + mondayOffset) {
        lastWeekSame += filteredLogs[dateStr].length;
        const dObj = new Date(dateStr + 'T00:00:00+09:00');
        lastWeekDayNames.push(dayNames[dObj.getDay()]);
      }
    });
    const lastWeekLabel = lastWeekDayNames.length > 0 ? `${lastWeekDayNames[lastWeekDayNames.length - 1]}~${lastWeekDayNames[0]}` : t(t('admin_trend_same_period') || t("g_233ae1") || t("g_233ae1") || t("g_233ae1") || t("g_233ae1") || t("g_233ae1") || "\uB3D9\uC77C \uAE30\uAC04");

    // ── 요일×시간대 히트맵 ──
    const heatmapData = {};
    sortedDates.forEach(dateStr => {
      filteredLogs[dateStr].forEach(log => {
        if (!log.timestamp) return;
        const ts = new Date(log.timestamp);
        const dayIdx = ts.getDay(); // 0~6
        const hour = ts.getHours();
        const bucket = String(Math.floor(hour / 2) * 2).padStart(2, '0');
        if (parseInt(bucket) < 6 || parseInt(bucket) > 20) return; // 6시~22시만

        if (!heatmapData[dayIdx]) heatmapData[dayIdx] = {};
        heatmapData[dayIdx][bucket] = (heatmapData[dayIdx][bucket] || 0) + 1;
      });
    });

    // ── 수업/강사 랭킹 ──
    const classCounts = {};
    const instructorCounts = {};
    sortedDates.forEach(dateStr => {
      filteredLogs[dateStr].forEach(log => {
        const cls = log.className || t(t('admin_trend_general') || t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || "\uC77C\uBC18");
        const inst = log.instructor || t(t('admin_trend_unassigned') || t("g_4477e5") || t("g_4477e5") || t("g_4477e5") || t("g_4477e5") || t("g_4477e5") || "\uBBF8\uC9C0\uC815");
        classCounts[cls] = (classCounts[cls] || 0) + 1;
        if (inst !== (t('admin_trend_unassigned') || t("g_4477e5") || t("g_4477e5") || t("g_4477e5") || t("g_4477e5") || t("g_4477e5") || "\uBBF8\uC9C0\uC815") && inst !== t(t('admin_trend_unassigned') || t("g_4477e5") || t("g_4477e5") || t("g_4477e5") || t("g_4477e5") || t("g_4477e5") || "\uBBF8\uC9C0\uC815") && inst !== (t('admin_trend_admin') || t("g_0cb522") || t("g_0cb522") || t("g_0cb522") || t("g_0cb522") || t("g_0cb522") || "\uAD00\uB9AC\uC790") && inst !== t(t('admin_trend_admin') || t("g_0cb522") || t("g_0cb522") || t("g_0cb522") || t("g_0cb522") || t("g_0cb522") || "\uAD00\uB9AC\uC790")) {
          instructorCounts[inst] = (instructorCounts[inst] || 0) + 1;
        }
      });
    });
    const classRanking = Object.entries(classCounts).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);
    const instructorRanking = Object.entries(instructorCounts).map(([name, count]) => ({
      name,
      count
    })).sort((a, b) => b.count - a.count);
    return {
      dailyChartData: daily,
      thisWeekCount: thisWeek,
      lastWeekSameCount: lastWeekSame,
      lastWeekLabel,
      heatmapData,
      classRanking,
      instructorRanking,
      totalNewCount: newMembersSet.size,
      totalExistingCount: existingMembersSet.size
    };
  }, [rawLogs, baseDate, todayStr, memberMap, branchFilter]);
  if (loading) {
    return <div className="dashboard-card" style={{
      border: '1px solid rgba(var(--primary-rgb), 0.1)',
      padding: '24px',
      textAlign: 'center',
      color: 'var(--text-secondary)'
    }}>
                <div style={{
        width: '28px',
        height: '28px',
        border: '3px solid rgba(var(--primary-rgb), 0.15)',
        borderTop: '3px solid var(--primary-gold)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 10px'
      }} />
                <span style={{
        fontSize: '0.85rem'
      }}>{t(t('admin_trend_analyzing') || t("g_c8f4eb") || t("g_c8f4eb") || t("g_c8f4eb") || t("g_c8f4eb") || t("g_c8f4eb") || "\uCD9C\uC11D \uCD94\uC138 \uBD84\uC11D \uC911...")}</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>;
  }
  if (!computed || computed.dailyChartData.length === 0) return null;
  const {
    dailyChartData,
    thisWeekCount,
    lastWeekSameCount,
    lastWeekLabel,
    heatmapData,
    classRanking,
    instructorRanking,
    totalNewCount,
    totalExistingCount
  } = computed;
  const tabStyle = isActive => ({
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    background: isActive ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
    color: isActive ? 'var(--primary-gold)' : 'var(--text-secondary)',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  });
  return <div className="dashboard-card" style={{
    border: '1px solid rgba(var(--primary-rgb), 0.15)',
    animation: 'fadeInDown 0.4s ease-out'
  }}>
            {/* Header */}
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
      flexWrap: 'wrap',
      gap: '8px'
    }}>
                <h3 className="card-label" style={{
        margin: 0,
        color: 'var(--primary-gold)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
                    <TrendUp size={18} />
                    {t(t('admin_trend_title') || t("g_a301d3") || t("g_a301d3") || t("g_a301d3") || t("g_a301d3") || t("g_a301d3") || "\uCD9C\uC11D \uCD94\uC138 \uBD84\uC11D")}
                </h3>
                <div style={{
        display: 'flex',
        gap: '4px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        padding: '3px'
      }}>
                    <button onClick={() => setActiveTab('daily')} style={tabStyle(activeTab === 'daily')}>
                        <ChartLineUp size={14} /> {t(t('admin_trend_tab_daily') || t("g_e1caaf") || t("g_e1caaf") || t("g_e1caaf") || t("g_e1caaf") || t("g_e1caaf") || "\uC77C\uBCC4 \uCD94\uC138")}
                    </button>
                    <button onClick={() => setActiveTab('heatmap')} style={tabStyle(activeTab === 'heatmap')}>
                        <ChartBar size={14} /> {t(t('admin_trend_tab_heatmap') || t("g_e124ee") || t("g_e124ee") || t("g_e124ee") || t("g_e124ee") || t("g_e124ee") || "\uD788\uD2B8\uB9F5")}
                    </button>
                    <button onClick={() => setActiveTab('ranking')} style={tabStyle(activeTab === 'ranking')}>
                        <Fire size={14} /> {t(t('admin_trend_tab_ranking') || t("g_95c624") || t("g_95c624") || t("g_95c624") || t("g_95c624") || t("g_95c624") || "\uC778\uAE30 \uBD84\uC11D")}
                    </button>
                </div>
            </div>

            {/* ─── 지점 + 기간 필터 ─── */}
            <div style={{
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: '16px',
      padding: '10px 12px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.04)'
    }}>
                {/* 지점 필터 (다중 지점일 때만 표시) */}
                {branches.length > 1 && <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
                        <Funnel size={14} color="var(--text-secondary)" />
                        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{
          background: 'rgba(var(--primary-rgb), 0.08)',
          border: '1px solid rgba(var(--primary-rgb), 0.2)',
          borderRadius: '6px',
          padding: '5px 10px',
          color: 'var(--text-primary)',
          fontSize: '0.8rem',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
                            <option value="all">{t(t('admin_trend_filter_all') || t("g_b919ef") || t("g_b919ef") || t("g_b919ef") || t("g_b919ef") || t("g_b919ef") || "\uD83D\uDCCA \uC804\uCCB4 \uD1B5\uD569")}</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>}

                {/* 기간 선택 — 슬라이더 */}
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: 1,
        minWidth: '180px',
        marginLeft: branches.length > 1 ? '8px' : '0'
      }}>
                    <CalendarBlank size={14} color="var(--text-secondary)" style={{
          flexShrink: 0
        }} />
                    <span style={{
          fontSize: '0.75rem',
          fontWeight: '800',
          color: 'var(--primary-gold)',
          minWidth: '42px',
          textAlign: 'center',
          flexShrink: 0
        }}>
                        {formatPeriodLabel(sliderDays)}
                    </span>
                    <input type="range" min={7} max={365} step={1} value={sliderDays} onChange={e => handlePeriodChange(Number(e.target.value))} style={{
          flex: 1,
          height: '4px',
          cursor: 'pointer',
          accentColor: 'var(--primary-gold)',
          WebkitAppearance: 'none',
          appearance: 'none',
          background: `linear-gradient(to right, var(--primary-gold) ${(sliderDays - 7) / (365 - 7) * 100}%, rgba(255,255,255,0.1) ${(sliderDays - 7) / (365 - 7) * 100}%)`,
          borderRadius: '2px',
          outline: 'none'
        }} />
                    <span style={{
          fontSize: '0.65rem',
          color: 'var(--text-secondary)',
          flexShrink: 0,
          opacity: 0.5
        }}>
                        {t(t('admin_trend_1year') || t("g_3d5bb6") || t("g_3d5bb6") || t("g_3d5bb6") || t("g_3d5bb6") || t("g_3d5bb6") || "1\uB144")}
                    </span>
                </div>
            </div>

            {/* Weekly Comparison Cards */}
            <WeeklyComparisonCards thisWeekCount={thisWeekCount} lastWeekSameCount={lastWeekSameCount} lastWeekLabel={lastWeekLabel} />

            {/* 신규 vs 기존 비율 */}
            <NewVsReturningBar newCount={totalNewCount} existingCount={totalExistingCount} />

            {/* Tab Content */}
            {activeTab === 'daily' ? <>
                    <div style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
                        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
                            <span style={{
            width: '12px',
            height: '2px',
            background: 'var(--primary-gold)',
            display: 'inline-block',
            borderRadius: '1px'
          }} />
                            {t(t('admin_trend_tab_daily') || t("g_e1caaf") || t("g_e1caaf") || t("g_e1caaf") || t("g_e1caaf") || t("g_e1caaf") || "\uC77C\uBCC4 \uCD94\uC138")}
                        </span>
                        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
                            <span style={{
            width: '12px',
            height: '2px',
            background: 'rgba(255,255,255,0.25)',
            display: 'inline-block',
            borderRadius: '1px',
            borderTop: '2px dashed rgba(255,255,255,0.25)'
          }} />
                            {t('7일 이동평균')}
                        </span>
                        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: '#71717a',
          fontSize: '0.8rem'
        }}>
                            {t(t('admin_trend_daily_dot') || t("g_aa750a") || t("g_aa750a") || t("g_aa750a") || t("g_aa750a") || t("g_aa750a") || "\u25CB \uC810\uC120 = \uC624\uB298(\uC9D1\uACC4 \uC911)")}
                        </span>
                    </div>
                    <div style={{
        width: '100%',
        height: '200px'
      }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyChartData} margin={{
            top: 18,
            right: 12,
            left: -24,
            bottom: 0
          }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={12} tickMargin={6} tickFormatter={(value, idx) => {
              if (idx === 0 || idx === dailyChartData.length - 1 || idx % 7 === 0) return value;
              return '';
            }} />
                                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} allowDecimals={false} domain={[0, 'dataMax + 5']} />
                                <Tooltip content={<DailyTooltip />} cursor={{
              stroke: 'rgba(var(--primary-rgb), 0.15)',
              strokeWidth: 2
            }} />

                                {/* 7-day MA */}
                                <Line type="monotone" dataKey="ma7" stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={false} connectNulls={false} animationDuration={800} />

                                {/* Daily count */}
                                <Line type="linear" dataKey="count" stroke="var(--primary-gold)" strokeWidth={2} dot={props => {
              const {
                cx,
                cy,
                payload
              } = props;
              if (payload.isToday) {
                // 오늘: 반투명 + 큰 점 + 점선 테두리
                return <g>
                                                    <circle cx={cx} cy={cy} r={7} fill="none" stroke="var(--primary-gold)" strokeWidth={2} strokeDasharray="3 2" opacity={0.6} />
                                                    <circle cx={cx} cy={cy} r={3} fill="var(--primary-gold)" opacity={0.4} />
                                                </g>;
              }
              if (payload.isSelected) {
                return <circle cx={cx} cy={cy} r={6} fill="var(--primary-gold)" stroke="#fff" strokeWidth={2} />;
              }
              return <circle cx={cx} cy={cy} r={3} fill="var(--primary-gold)" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />;
            }} activeDot={{
              r: 6,
              fill: '#fff',
              stroke: 'var(--primary-gold)',
              strokeWidth: 2
            }} animationDuration={600}>
                                    <LabelList dataKey="count" position="top" fill="rgba(255,255,255,0.6)" fontSize={10} offset={10} formatter={(value, entry, index) => {
                if (!dailyChartData || dailyChartData.length === 0) return '';
                // 오늘은 "집계중" 표시
                if (dailyChartData[index]?.isToday) return `${value}⏳`;
                if (index === 0 || index === dailyChartData.length - 1) return value;
                if (dailyChartData[index]?.isSelected) return value;
                const counts = dailyChartData.map(d => d.count);
                const maxVal = Math.max(...counts);
                const minVal = Math.min(...counts.filter(c => !dailyChartData[counts.indexOf(c)]?.isToday));
                if (value === maxVal || value === minVal) return value;
                return '';
              }} />
                                </Line>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </> : activeTab === 'heatmap' ? <>
                    <div style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: '12px'
      }}>{t("g_468667") || t("g_468667") || t("g_468667") || t("g_468667") || t("g_468667") || "\uCD5C\uADFC"}{formatPeriodLabel(periodDays)}{t("g_9d5c4f") || t("g_9d5c4f") || t("g_9d5c4f") || t("g_9d5c4f") || t("g_9d5c4f") || "\uAE30\uC900, \uC694\uC77C\xD7\uC2DC\uAC04\uB300\uBCC4 \uCD9C\uC11D \uBD84\uD3EC"}{branchFilter !== 'all' ? `(${branches.find(b => b.id === branchFilter)?.name || branchFilter})` : t("g_7f60d9") || t("g_7f60d9") || t("g_7f60d9") || t("g_7f60d9") || t("g_7f60d9") || "(\uC804\uCCB4)"}
                    </div>
                    <HeatmapChart data={heatmapData} />
                </> : <>
                    <div style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: '12px'
      }}>{t("g_468667") || t("g_468667") || t("g_468667") || t("g_468667") || t("g_468667") || "\uCD5C\uADFC"}{formatPeriodLabel(periodDays)}{t("g_42505d") || t("g_42505d") || t("g_42505d") || t("g_42505d") || t("g_42505d") || "\uAE30\uC900, \uC218\uC5C5/\uAC15\uC0AC\uBCC4 \uCD1D \uCD9C\uC11D \uC218"}{branchFilter !== 'all' ? `(${branches.find(b => b.id === branchFilter)?.name || branchFilter})` : t("g_7f60d9") || t("g_7f60d9") || t("g_7f60d9") || t("g_7f60d9") || t("g_7f60d9") || "(\uC804\uCCB4)"}
                    </div>
                    <PopularityRanking classRanking={classRanking} instructorRanking={instructorRanking} />
                </>}
        </div>;
});
AttendanceTrendChart.displayName = 'AttendanceTrendChart';
export default AttendanceTrendChart;