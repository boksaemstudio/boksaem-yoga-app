import { useLanguageStore } from '../stores/useLanguageStore';
import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Cell, Legend } from 'recharts';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import CollapsibleCard from './admin/CollapsibleCard';
import { useRevenueStats } from '../hooks/useRevenueStats';
import { useStudioConfig } from '../contexts/StudioContext';
const AdminRevenue = ({
  members,
  sales,
  currentBranch,
  revenueStats
}) => {
  const t = useLanguageStore(s => s.t);
  const {
    config
  } = useStudioConfig();
  const branches = config.BRANCHES || [];
  const getBranchName = id => branches.find(b => b.id === id)?.name || id;
  const [currentDate, setCurrentDate] = useState(new Date());
  const {
    dailyStats,
    monthlyStats,
    comparativeStats,
    recentTrend,
    monthlyTrend,
    membershipSales
  } = useRevenueStats(sales, members, currentDate, currentBranch, revenueStats);
  const formatCurrency = val => new Intl.NumberFormat('ko-KR').format(val);
  return <div className="revenue-container fade-in" style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  }}>

            {/* Header */}
            <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="nav-btn">
                        <CaretLeft size={20} />
                    </button>
                    <h2 className="outfit-font" style={{
          margin: 0,
          fontSize: '1.8rem',
          fontWeight: 700
        }}>
                        {currentDate.getFullYear()}{t("g_e29d2c") || t("g_e29d2c") || t("g_e29d2c") || t("g_e29d2c") || t("g_e29d2c") || "\uB144"}{currentDate.getMonth() + 1}{t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || "\uC6D4"}</h2>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="nav-btn">
                        <CaretRight size={20} />
                    </button>
                </div>
                <div className="branch-badge">
                    {currentBranch === 'all' ? t("g_9c8d1a") || t("g_9c8d1a") || t("g_9c8d1a") || t("g_9c8d1a") || t("g_9c8d1a") || "\uC804\uCCB4 \uC9C0\uC810" : getBranchName(currentBranch)}
                </div>
            </div>

            {/* Total Month Summary */}
            <CollapsibleCard id="revenue-summary" title={`${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 총 매출 요약`} titleExtra={`${formatCurrency(monthlyStats.totalRevenue)}원`} defaultOpen={true}>
                <div className="dashboard-card revenue-summary-card" style={{
        marginTop: '0',
        overflow: 'hidden',
        padding: '20px'
      }}>
                        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          justifyContent: 'space-between',
          alignItems: 'flex-end'
        }}>
                            <div style={{
            flex: '1 1 auto',
            minWidth: '240px'
          }}>
                                <div className="revenue-summary-title">{t("g_759d76") || t("g_759d76") || t("g_759d76") || t("g_759d76") || t("g_759d76") || "\uC774\uBC88 \uB2EC \uB204\uC801 \uB9E4\uCD9C"}</div>
                                <div className="revenue-summary-amount" style={{
              wordBreak: 'break-all',
              whiteSpace: 'normal',
              lineHeight: '1.2'
            }}>
                                    {formatCurrency(monthlyStats.totalRevenue)}{t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || "\uC6D0"}</div>
                                <div className="revenue-summary-details">{t("g_dceb18") || t("g_dceb18") || t("g_dceb18") || t("g_dceb18") || t("g_dceb18") || "(\uC2E0\uADDC:"}<span className="revenue-new">{formatCurrency(monthlyStats.totalRevenueNew)}{t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || "\uC6D0"}</span>{t("g_0f01cd") || t("g_0f01cd") || t("g_0f01cd") || t("g_0f01cd") || t("g_0f01cd") || "/ \n                                     \uC7AC\uB4F1\uB85D:"}<span className="revenue-rereg">{formatCurrency(monthlyStats.totalRevenueReReg)}{t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || "\uC6D0"}</span>)
                                </div>
                            </div>
                            <div style={{
            textAlign: 'right'
          }}>
                                <div style={{
              marginBottom: '12px'
            }}>
                                    <div className="revenue-count-title" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '4px'
              }}>{t("g_0621cd") || t("g_0621cd") || t("g_0621cd") || t("g_0621cd") || t("g_0621cd") || "\uC624\uB298 \uBC1C\uC0DD \uB9E4\uCD9C"}<div className="tooltip-container" style={{
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
                    textAlign: 'left'
                  }}>
                                                <strong>{t("g_5835fe") || t("g_5835fe") || t("g_5835fe") || t("g_5835fe") || t("g_5835fe") || "\uC624\uB298 \uB9E4\uCD9C \uAE30\uC900"}</strong><br />{t("g_0607f8") || t("g_0607f8") || t("g_0607f8") || t("g_0607f8") || t("g_0607f8") || "\uD604\uC7AC \uB0A0\uC9DC(\uC790\uC815 0\uC2DC \uAE30\uC900)\uC5D0 \uBC1C\uC0DD\uD55C \uACB0\uC81C \uAE08\uC561\uC758 \uCD1D\uD569\uC785\uB2C8\uB2E4."}</div>
                                        </div>
                                    </div>
                                    <div className="revenue-summary-amount" style={{
                fontSize: '1.4rem',
                color: 'var(--primary-theme-color)'
              }}>
                                        {formatCurrency(comparativeStats.today)}{t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || "\uC6D0"}</div>
                                </div>
                                <div>
                                    <div className="revenue-count-title" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '4px'
              }}>{t("g_2a64d2") || t("g_2a64d2") || t("g_2a64d2") || t("g_2a64d2") || t("g_2a64d2") || "\uC774\uBC88 \uB2EC \uACB0\uC81C \uAC74\uC218"}<div className="tooltip-container" style={{
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
                    textAlign: 'left'
                  }}>
                                                <strong>{t("g_f40826") || t("g_f40826") || t("g_f40826") || t("g_f40826") || t("g_f40826") || "\uCD1D \uACB0\uC81C \uAC74\uC218"}</strong><br />{t("g_25f764") || t("g_25f764") || t("g_25f764") || t("g_25f764") || t("g_25f764") || "\uC774\uBC88 \uB2EC \uBC1C\uC0DD\uD55C \uC2B9\uC778 \uC644\uB8CC\uB41C \uACB0\uC81C\uC758 \uCD1D \uD69F\uC218\uC785\uB2C8\uB2E4."}</div>
                                        </div>
                                    </div>
                                    <div className="revenue-count">{monthlyStats.totalCount}{t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || "\uAC74"}</div>
                                </div>
                            </div>
                        </div>
                </div>
            </CollapsibleCard>

            {/* Revenue Graph (Straight Line) */}
            <CollapsibleCard id="revenue-daily" title={t("g_c783a6") || t("g_c783a6") || t("g_c783a6") || t("g_c783a6") || t("g_c783a6") || "\uD83D\uDCC8 \uCD5C\uADFC 14\uC77C \uC77C\uBCC4 \uB9E4\uCD9C"} defaultOpen={true}>
                <StraightLineChart data={recentTrend} branches={branches} showBranches={currentBranch === 'all' && branches.length > 1} />
            </CollapsibleCard>

            {/* Monthly Bar Chart */}
            <CollapsibleCard id="revenue-monthly" title={t("g_80a529") || t("g_80a529") || t("g_80a529") || t("g_80a529") || t("g_80a529") || "\uD83D\uDCCA \uC6D4\uBCC4 \uB9E4\uCD9C \uCD94\uC774 (\uCD5C\uADFC 6\uAC1C\uC6D4)"} defaultOpen={true}>
                <div style={{
        height: '360px',
        display: 'flex',
        flexDirection: 'column'
      }}>
                    <div style={{
          flex: 1,
          minHeight: 0
        }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyTrend.map(d => {
              const row = {
                ...d
              };
              if (d.partialBranches) {
                Object.entries(d.partialBranches).forEach(([bId, amt]) => {
                  row[`partial_${bId}`] = amt;
                });
              }
              return row;
            })} margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5
            }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                
                                <XAxis xAxisId={0} dataKey="name" stroke="#71717a" tick={{
                fill: '#71717a',
                fontSize: 12
              }} axisLine={{
                stroke: '#3f3f46'
              }} tickLine={false} />
                                <XAxis xAxisId={1} dataKey="name" hide />

                                <YAxis stroke="#71717a" tick={{
                fill: '#71717a',
                fontSize: 12
              }} tickFormatter={value => value === 0 ? '0' : `${(value / 10000).toLocaleString()}만`} axisLine={false} tickLine={false} width={60} />
                                <Tooltip cursor={{
                fill: 'rgba(255,255,255,0.05)'
              }} wrapperStyle={{
                maxWidth: '180px',
                fontSize: '0.75rem',
                zIndex: 10,
                pointerEvents: 'none'
              }} contentStyle={{
                backgroundColor: '#18181b',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                borderWidth: '1.5px',
                borderRadius: '8px',
                color: '#fff',
                padding: '8px 10px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap'
              }} formatter={(value, name) => [`${new Intl.NumberFormat('ko-KR').format(value)}원`, name === 'amount' || name === 'partialAmount' ? name === 'amount' ? t("g_e0f99f") || t("g_e0f99f") || t("g_e0f99f") || t("g_e0f99f") || t("g_e0f99f") || "\uC6D4 \uC804\uCCB4" : `${currentDate.getDate()}일까지` : name]} itemStyle={{
                color: 'var(--primary-theme-color)',
                fontSize: '0.75rem'
              }} labelStyle={{
                color: '#a1a1aa',
                marginBottom: '4px',
                fontSize: '0.7rem'
              }} />
                                <Legend wrapperStyle={{
                fontSize: '0.75rem',
                color: '#a1a1aa',
                paddingTop: '10px'
              }} formatter={value => {
                if (value === 'amount') return t("g_739bdd") || t("g_739bdd") || t("g_739bdd") || t("g_739bdd") || t("g_739bdd") || "\uC6D4 \uC804\uCCB4 \uB9E4\uCD9C";
                if (value === 'partialAmount') return `${currentDate.getDate()}일까지 매출`;
                return value;
              }} />
                                
                                {/* Background bar: Total Amount (Faint) */}
                                <Bar xAxisId={0} dataKey="amount" name="amount" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                    {monthlyTrend.map((entry, index) => <Cell key={`cell-bg-${index}`} fill={entry.monthParams === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}` ? 'rgba(var(--primary-rgb), 0.2)' : '#27272a'} />)}
                                </Bar>
                                
                                {/* Foreground bar: Partial Amount up to current day */}
                                {currentBranch === 'all' && branches.length > 1 ? branches.map((b, i) => {
                const branchColors = ['#00C49F', '#2196F3', '#FFBB28', '#FF8042', '#8884d8'];
                return <Bar key={b.id} xAxisId={1} stackId="a" dataKey={`partial_${b.id}`} name={b.name} fill={branchColors[i % branchColors.length]} maxBarSize={60} />;
              }) : <Bar xAxisId={1} dataKey="partialAmount" name="partialAmount" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                        {monthlyTrend.map((entry, index) => <Cell key={`cell-fg-${index}`} fill={entry.monthParams === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}` ? 'var(--primary-theme-color)' : '#52525b'} />)}
                                    </Bar>}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CollapsibleCard>

            {/* Membership Type Sales */}
            {membershipSales && membershipSales.length > 0 && <CollapsibleCard id="revenue-membership" title={t("g_8fda0e") || t("g_8fda0e") || t("g_8fda0e") || t("g_8fda0e") || t("g_8fda0e") || "\uD83C\uDFF7\uFE0F \uD68C\uC6D0\uAD8C\uBCC4 \uD310\uB9E4 \uD604\uD669"} titleExtra={`${membershipSales.length}종`} defaultOpen={true}>
                    <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
                        {membershipSales.map((ms, idx) => {
          const maxCount = membershipSales[0]?.count || 1;
          const pct = ms.count / maxCount * 100;
          return <div key={idx} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
                                    <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
                                        <span style={{
                fontSize: '0.9rem',
                color: '#e4e4e7',
                fontWeight: 500,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                                            {idx === 0 && '🏆 '}{ms.name}
                                        </span>
                                        <span style={{
                fontSize: '0.8rem',
                color: '#a1a1aa',
                whiteSpace: 'nowrap',
                marginLeft: '12px'
              }}>
                                            <strong style={{
                  color: 'var(--primary-theme-color)',
                  fontSize: '1rem'
                }}>{ms.count}</strong>{t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || "\uAC74"}<span style={{
                  margin: '0 6px',
                  opacity: 0.3
                }}>|</span>
                                            {formatCurrency(ms.revenue)}{t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || "\uC6D0"}</span>
                                    </div>
                                    <div style={{
              position: 'relative',
              height: '22px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
                                        {ms.reregCount > 0 && <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${pct}%`,
                background: 'var(--primary-theme-color)',
                borderRadius: '6px',
                opacity: 0.7,
                transition: 'width 0.5s ease'
              }} />}
                                        {ms.newCount > 0 && <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${ms.newCount / maxCount * 100}%`,
                background: '#4ade80',
                borderRadius: '6px',
                opacity: 0.85,
                transition: 'width 0.5s ease'
              }} />}
                                        <div style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.65rem',
                color: '#fff',
                fontWeight: 600,
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              }}>
                                            {ms.newCount > 0 && <span style={{
                  marginRight: '8px'
                }}>{t("g_5a601c") || t("g_5a601c") || t("g_5a601c") || t("g_5a601c") || t("g_5a601c") || "\uC2E0\uADDC"}{ms.newCount}</span>}
                                            {ms.reregCount > 0 && <span>{t("g_763e2b") || t("g_763e2b") || t("g_763e2b") || t("g_763e2b") || t("g_763e2b") || "\uC7AC\uB4F1\uB85D"}{ms.reregCount}</span>}
                                        </div>
                                    </div>
                                </div>;
        })}
                    </div>
                    <div style={{
        display: 'flex',
        gap: '16px',
        marginTop: '16px',
        justifyContent: 'center'
      }}>
                        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          color: '#a1a1aa'
        }}>
                            <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            background: '#4ade80'
          }} />{t("g_5a601c") || t("g_5a601c") || t("g_5a601c") || t("g_5a601c") || t("g_5a601c") || "\uC2E0\uADDC"}</div>
                        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          color: '#a1a1aa'
        }}>
                            <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            background: 'var(--primary-theme-color)',
            opacity: 0.7
          }} />{t("g_763e2b") || t("g_763e2b") || t("g_763e2b") || t("g_763e2b") || t("g_763e2b") || "\uC7AC\uB4F1\uB85D"}</div>
                    </div>
                </CollapsibleCard>}

            {/* Calendar View */}
            <CollapsibleCard id="revenue-calendar" title={`📅 ${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 정산 달력`} defaultOpen={true}>
                <div style={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-x',
        margin: '0 -4px',
        padding: '0 4px'
      }}>
                <div className="calendar-grid custom-scroll" style={{
          minWidth: '600px'
        }}>
                    {/* Header */}
                    {[t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || t("g_95e431") || "\uC77C", t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || t("g_5b51dd") || "\uC6D4", t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || t("g_74d3f7") || "\uD654", t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || t("g_cae82d") || "\uC218", t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || t("g_d5f699") || "\uBAA9", t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || t("g_cef92d") || "\uAE08", t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || t("g_ccc0dc") || "\uD1A0"].map((dayName, index) => <div key={`header-${index}`} className={`calendar-header-cell ${index === 0 ? 'sun' : index === 6 ? 'sat' : ''}`}>
                            {dayName}
                        </div>)}

                    {/* Empty cells for start of month */}
                    {(() => {
            const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
            return Array.from({
              length: firstDay
            }).map((_, i) => <div key={`empty-${i}`} className="calendar-empty-cell"></div>);
          })()}

                    {/* Days */}
                    {dailyStats.map(day => <div key={day.date} className="calendar-day-cell">
                            <div className={`calendar-day-number ${day.isSunday || day.holidayName ? 'sun' : day.isSaturday ? 'sat' : ''}`}>
                                {parseInt(day.date.split('-')[2])}
                            </div>
                            {day.holidayName && <div className="calendar-holiday-name">
                                    {day.holidayName}
                                </div>}
                            {/* Detailed breakdown */}
                            {day.amount > 0 && <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
                                    {day.salesList && day.salesList.map((sale, idx) => <div key={idx} className="calendar-amount-row" style={{
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: '#ccc'
              }}>
                                            <span>{sale.name}</span>
                                            <span>{formatCurrency(sale.amount)}</span>
                                        </div>)}
                                    <div style={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                margin: '4px 0'
              }}></div>
                                    {day.amountNew > 0 && <div className="calendar-amount-row new">
                                            <span>{t("g_204336") || t("g_204336") || t("g_204336") || t("g_204336") || t("g_204336") || "\uC2E0\uADDC:"}</span>
                                            <span>{formatCurrency(day.amountNew)}</span>
                                        </div>}
                                    {day.amountReReg > 0 && <div className="calendar-amount-row rereg">
                                            <span>{t("g_6a2b8e") || t("g_6a2b8e") || t("g_6a2b8e") || t("g_6a2b8e") || t("g_6a2b8e") || "\uC7AC\uB4F1\uB85D:"}</span>
                                            <span>{formatCurrency(day.amountReReg)}</span>
                                        </div>}
                                </div>}
                        </div>)}
                </div>
                </div>
            </CollapsibleCard>

        </div>;
};
const CompCard = ({
  title,
  amount
}) => <div className="dashboard-card" style={{
  padding: '15px'
}}>
        <div className="comp-card-title">{title}</div>
        <div className={`comp-card-amount ${amount > 0 ? 'positive' : ''}`}>
            {new Intl.NumberFormat('ko-KR').format(amount)}{t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || t("g_771dc3") || "\uC6D0"}</div>
    </div>;
const StraightLineChart = ({
  data,
  branches,
  showBranches
}) => {
  const t = useLanguageStore(s => s.t);
  // Keep data order as is (earliest to latest) so the latest date is on the right
  // Transform data to flatten branch keys
  const chartData = data.map(d => {
    const row = {
      ...d
    };
    if (d.branches) {
      Object.entries(d.branches).forEach(([bId, amt]) => {
        row[`branch_${bId}`] = amt;
      });
    }
    return row;
  });

  // [FIX] Y축을 실제 데이터 최대값에 맞게 자동 조정 (20% 여유)
  const maxAmount = Math.max(...(chartData || []).map(d => d.amount || 0), 0);
  const yMax = maxAmount > 0 ? Math.ceil(maxAmount * 1.2 / 50000) * 50000 : 100000;
  const branchColors = ['#00C49F', '#2196F3', '#FFBB28', '#FF8042', '#8884d8'];
  return <div style={{
    width: '100%',
    height: '180px'
  }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{
        top: 10,
        right: 10,
        left: -20,
        bottom: 0
      }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="displayDate" stroke="#71717a" tick={{
          fill: '#71717a',
          fontSize: 11
        }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis stroke="#71717a" tick={{
          fill: '#71717a',
          fontSize: 11
        }} tickFormatter={val => val === 0 ? '0' : `${(val / 10000).toLocaleString()}만`} axisLine={false} tickLine={false} domain={[0, yMax]} />
                    <Tooltip wrapperStyle={{
          maxWidth: '160px',
          fontSize: '0.72rem',
          zIndex: 10,
          pointerEvents: 'none'
        }} contentStyle={{
          backgroundColor: '#18181b',
          borderColor: 'rgba(255, 255, 255, 0.5)',
          borderWidth: '1.5px',
          borderRadius: '8px',
          color: '#fff',
          padding: '6px 8px',
          fontSize: '0.72rem',
          whiteSpace: 'nowrap'
        }} itemStyle={{
          color: 'var(--primary-theme-color)',
          fontSize: '0.72rem'
        }} formatter={(value, name) => [`${new Intl.NumberFormat('ko-KR').format(value)}원`, name === 'amount' ? t("g_ae7f5a") || t("g_ae7f5a") || t("g_ae7f5a") || t("g_ae7f5a") || t("g_ae7f5a") || "\uCD1D\uD569" : name]} labelStyle={{
          color: '#a1a1aa',
          marginBottom: '2px',
          fontSize: '0.65rem'
        }} />
                    <Line type="linear" dataKey="amount" name={t("g_ae7f5a") || t("g_ae7f5a") || t("g_ae7f5a") || t("g_ae7f5a") || t("g_ae7f5a") || "\uCD1D\uD569"} stroke="var(--primary-theme-color)" strokeWidth={2} dot={{
          r: 3,
          fill: '#000',
          stroke: 'var(--primary-theme-color)',
          strokeWidth: 2
        }} activeDot={{
          r: 5,
          fill: 'var(--primary-theme-color)',
          stroke: '#000',
          strokeWidth: 2
        }} />
                    <Legend wrapperStyle={{
          fontSize: '0.7rem',
          color: '#a1a1aa',
          paddingTop: '4px'
        }} />
                    {showBranches && branches.map((b, i) => <Line key={b.id} type="linear" dataKey={`branch_${b.id}`} name={b.name} stroke={branchColors[i % branchColors.length]} strokeWidth={2} dot={{
          r: 2,
          fill: '#000',
          stroke: branchColors[i % branchColors.length],
          strokeWidth: 1
        }} activeDot={{
          r: 4,
          fill: branchColors[i % branchColors.length],
          stroke: '#000',
          strokeWidth: 1
        }} />)}
                </LineChart>
            </ResponsiveContainer>
        </div>;
};
export default AdminRevenue;