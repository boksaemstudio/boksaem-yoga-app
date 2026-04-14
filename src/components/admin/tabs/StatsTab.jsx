import { memo } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { UserFocus } from '@phosphor-icons/react';
import { AttendanceHeatmap, RevenueTrend, MemberStatusPie } from '../charts/AdminCharts';
import { useStudioConfig } from '../../../contexts/StudioContext';
const StatsTab = ({
  summary,
  stats,
  revenueTrend,
  memberStatusDist
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const primaryColor = config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)';
  // Format data for charts
  const heatmapData = stats.byTime.map(([time, count]) => ({
    time,
    count
  }));
  return <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  }}>
            {/* [NEW] Facial Data Status Highlight */}
            <div className="dashboard-card" style={{
      border: '1px solid rgba(59, 130, 246, 0.3)',
      background: 'rgba(59, 130, 246, 0.05)'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px'
      }}>
                    <UserFocus size={20} weight="fill" color="#60A5FA" />
                    <span style={{
          fontSize: '0.9rem',
          fontWeight: 'bold'
        }}>{t('얼굴 등록 현황')}</span>
                    <div className="tooltip-container" style={{
          display: 'inline-flex',
          cursor: 'pointer'
        }}>
                        <div style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#60A5FA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            fontWeight: 'bold'
          }}>i</div>
                        <div className="tooltip-text" style={{
            width: '200px',
            left: 0,
            transform: 'translateX(0)',
            color: '#fff',
            fontSize: '0.8rem'
          }}>
                            {t('키오스크 얼굴인식 출석을 위해')}<br />{t('얼굴 데이터를 등록한 활성 회원의')}<br />{t('비율입니다.')}
                        </div>
                    </div>
                </div>
                <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '10px'
      }}>
                    <span style={{
          fontSize: '1.8rem',
          fontWeight: '800',
          color: primaryColor
        }}>{summary?.facialDataCount || 0}</span>
                    <span style={{
          fontSize: '1rem',
          opacity: 0.6
        }}>{t('명 등록')}</span>
                    <span style={{
          marginLeft: 'auto',
          fontSize: '1.4rem',
          fontWeight: '900',
          color: '#60A5FA'
        }}>{summary?.facialDataRatio || 0}%</span>
                </div>
                <div style={{
        marginTop: '12px',
        height: '6px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
                    <div style={{
          width: `${summary?.facialDataRatio || 0}%`,
          height: '100%',
          background: '#60A5FA',
          transition: 'width 0.8s ease-out'
        }} />
                </div>
                {summary?.todayFacialMatchCount > 0 && <div style={{
        marginTop: '12px',
        padding: '8px 12px',
        background: 'rgba(16, 185, 129, 0.1)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
                        <span style={{
          fontSize: '0.8rem',
          color: '#34D399'
        }}>{t('✨ 오늘 AI 자동 인식 출석')}</span>
                        <div style={{
          textAlign: 'right'
        }}>
                            <span style={{
            fontSize: '0.9rem',
            fontWeight: 'bold',
            color: '#34D399'
          }}>{summary.todayFacialMatchCount}{t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || "\uAC74"}</span>
                            <span style={{
            fontSize: '0.75rem',
            opacity: 0.6,
            marginLeft: '6px'
          }}>{t("g_becee3") || t("g_becee3") || t("g_becee3") || t("g_becee3") || t("g_becee3") || "(\uC804\uCCB4 \uCD9C\uC11D\uC758"}{summary.todayFacialRatio}%)</span>
                        </div>
                    </div>}
            </div>

            {/* Top Row: Legacy bars (Optional, maybe replace completely? Keeping for now as requested) */}
            <div style={{
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap'
    }}>
                <div className="dashboard-card" style={{
        flex: 1,
        minWidth: '300px'
      }}>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px'
        }}>
                        <h3 className="card-label" style={{
            margin: 0
          }}>{t('시간대별 이용 현황')}</h3>
                        <div className="tooltip-container" style={{
            display: 'inline-flex',
            cursor: 'pointer'
          }}>
                            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 'bold'
            }}>i</div>
                            <div className="tooltip-text" style={{
              width: '200px',
              left: 0,
              transform: 'translateX(0)',
              color: '#fff',
              fontSize: '0.8rem'
            }}>
                                {t('몇 시에 회원이 가장 많이')}<br />{t('오는지 한눈에 보여줍니다.')}
                            </div>
                        </div>
                    </div>
                    <div style={{
          marginTop: '10px'
        }}>
                        {stats.byTime.map(([time, count]) => <div key={time} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
                                <span style={{
              width: '60px',
              color: 'var(--text-secondary)'
            }}>{time}</span>
                                <div style={{
              flex: 1,
              height: '8px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
                                    <div style={{
                width: `${count / Math.max(1, stats.byTime[0]?.[1]) * 100}%`,
                height: '100%',
                background: primaryColor
              }} />
                                </div>
                                <span style={{
              width: '40px',
              textAlign: 'right',
              fontWeight: 'bold'
            }}>{count}</span>
                            </div>)}
                    </div>
                </div>
                <div className="dashboard-card" style={{
        flex: 1,
        minWidth: '300px'
      }}>
                    <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '10px'
        }}>
                        <h3 className="card-label" style={{
            margin: 0
          }}>{t('수업별 인기 현황')}</h3>
                        <div className="tooltip-container" style={{
            display: 'inline-flex',
            cursor: 'pointer'
          }}>
                            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 'bold'
            }}>i</div>
                            <div className="tooltip-text" style={{
              width: '200px',
              left: 'auto',
              right: 0,
              transform: 'translateX(0)',
              color: '#fff',
              fontSize: '0.8rem'
            }}>
                                {t('어떤 수업이 가장 인기있는지')}<br />{t('참석 횟수 기준으로 보여줍니다.')}
                            </div>
                        </div>
                    </div>
                    <div style={{
          marginTop: '10px'
        }}>
                        {stats.bySubject.map(([subject, count]) => <div key={subject} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
                                <span style={{
              width: '100px',
              color: 'var(--text-secondary)'
            }}>{subject}</span>
                                <div style={{
              flex: 1,
              height: '8px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
                                    <div style={{
                width: `${count / Math.max(1, stats.bySubject[0]?.[1]) * 100}%`,
                height: '100%',
                background: 'var(--accent-success)'
              }} />
                                </div>
                                <span style={{
              width: '40px',
              textAlign: 'right',
              fontWeight: 'bold'
            }}>{count}</span>
                            </div>)}
                    </div>
                </div>
            </div>

            {/* Middle Row: Charts */}
            <div style={{
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap'
    }}>
                <div className="dashboard-card" style={{
        flex: 1,
        minWidth: '300px'
      }}>
                    <AttendanceHeatmap data={heatmapData} />
                </div>
                <div className="dashboard-card" style={{
        flex: 1,
        minWidth: '300px'
      }}>
                    <MemberStatusPie data={memberStatusDist} />
                </div>
            </div>

            {/* Bottom Row: Revenue */}
            <div className="dashboard-card">
                <RevenueTrend data={revenueTrend} />
            </div>
        </div>;
};
export default memo(StatsTab);