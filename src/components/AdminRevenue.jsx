import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Cell, Legend } from 'recharts';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import CollapsibleCard from './admin/CollapsibleCard';
import { useRevenueStats } from '../hooks/useRevenueStats';
import { useStudioConfig } from '../contexts/StudioContext';

const AdminRevenue = ({ members, sales, currentBranch, revenueStats, viewMode }) => {
    const { config } = useStudioConfig();
    const branches = config.BRANCHES || [];
    const getBranchName = (id) => branches.find(b => b.id === id)?.name || id;

    const [currentDate, setCurrentDate] = useState(new Date());

    const { dailyStats, monthlyStats, comparativeStats, recentTrend, monthlyTrend, membershipSales } = useRevenueStats(sales, members, currentDate, currentBranch, revenueStats);

    const formatCurrency = (val) => new Intl.NumberFormat('ko-KR').format(val);

    return (
        <div className="revenue-container fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="nav-btn">
                        <CaretLeft size={20} />
                    </button>
                    <h2 className="outfit-font" style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>
                        {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                    </h2>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="nav-btn">
                        <CaretRight size={20} />
                    </button>
                </div>
                <div className="branch-badge">
                    {currentBranch === 'all' ? '전체 지점' : getBranchName(currentBranch)}
                </div>
            </div>

            {/* Total Month Summary */}
            <CollapsibleCard id="revenue-summary" title={`${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 총 매출 요약`} titleExtra={`${formatCurrency(monthlyStats.totalRevenue)}원`} defaultOpen={true}>
                <div className="dashboard-card revenue-summary-card" style={{ marginTop: '0', overflow: 'hidden', padding: viewMode === 'compact' ? '16px' : '20px' }}>
                    {viewMode === 'compact' ? (
                        /* [HONEST ANALYSIS] Ultra-compact view for mobile leaders */
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>오늘 매출</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-theme-color)', lineHeight: 1 }}>{formatCurrency(comparativeStats.today)}원</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>이번 달 누적</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{formatCurrency(monthlyStats.totalRevenue)}원</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>신규 비중</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4ade80' }}>
                                    {monthlyStats.totalRevenue > 0 ? Math.round((monthlyStats.totalRevenueNew / monthlyStats.totalRevenue) * 100) : 0}% 
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginLeft:'4px', fontWeight:400 }}>({formatCurrency(monthlyStats.totalRevenueNew)}원)</span>
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>총 결제 건수</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{monthlyStats.totalCount}건</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div style={{ flex: '1 1 auto', minWidth: '240px' }}>
                                <div className="revenue-summary-title">
                                    이번 달 누적 매출
                                </div>
                                <div className="revenue-summary-amount" style={{ wordBreak: 'break-all', whiteSpace: 'normal', lineHeight: '1.2' }}>
                                    {formatCurrency(monthlyStats.totalRevenue)}원
                                </div>
                                <div className="revenue-summary-details">
                                    (신규: <span className="revenue-new">{formatCurrency(monthlyStats.totalRevenueNew)}원</span> / 
                                     재등록: <span className="revenue-rereg">{formatCurrency(monthlyStats.totalRevenueReReg)}원</span>)
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <div className="revenue-count-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                        오늘 발생 매출
                                        <div className="tooltip-container" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>i</div>
                                            <div className="tooltip-text" style={{ width: '200px', left: 'auto', right: 0, transform: 'translateX(0)', textAlign: 'left' }}>
                                                <strong>오늘 매출 기준</strong><br/>현재 날짜(자정 0시 기준)에 발생한 결제 금액의 총합입니다.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="revenue-summary-amount" style={{ fontSize: '1.4rem', color: 'var(--primary-theme-color)' }}>
                                        {formatCurrency(comparativeStats.today)}원
                                    </div>
                                </div>
                                <div>
                                    <div className="revenue-count-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                        이번 달 결제 건수
                                        <div className="tooltip-container" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>i</div>
                                            <div className="tooltip-text" style={{ width: '200px', left: 'auto', right: 0, transform: 'translateX(0)', textAlign: 'left' }}>
                                                <strong>총 결제 건수</strong><br/>이번 달 발생한 승인 완료된 결제의 총 횟수입니다.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="revenue-count">{monthlyStats.totalCount}건</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CollapsibleCard>

            {/* Revenue Graph (Straight Line) */}
            {viewMode !== 'compact' && (
                <CollapsibleCard id="revenue-daily" title="📈 최근 14일 일별 매출" defaultOpen={true}>
                    <StraightLineChart data={recentTrend} branches={branches} showBranches={currentBranch === 'all' && branches.length > 1} />
                </CollapsibleCard>
            )}

            {/* Monthly Bar Chart */}
            {viewMode !== 'compact' && (
                <CollapsibleCard id="revenue-monthly" title="📊 월별 매출 추이 (최근 6개월)" defaultOpen={true}>
                <div style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyTrend.map(d => {
                                const row = { ...d };
                                if (d.partialBranches) {
                                    Object.entries(d.partialBranches).forEach(([bId, amt]) => {
                                        row[`partial_${bId}`] = amt;
                                    });
                                }
                                return row;
                            })} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                
                                <XAxis 
                                    xAxisId={0}
                                    dataKey="name" 
                                    stroke="#71717a" 
                                    tick={{ fill: '#71717a', fontSize: 12 }} 
                                    axisLine={{ stroke: '#3f3f46' }}
                                    tickLine={false}
                                />
                                <XAxis 
                                    xAxisId={1} 
                                    dataKey="name" 
                                    hide 
                                />

                                <YAxis 
                                    stroke="#71717a" 
                                    tick={{ fill: '#71717a', fontSize: 12 }} 
                                    tickFormatter={(value) => value === 0 ? '0' : `${(value / 10000).toLocaleString()}만`}
                                    axisLine={false}
                                    tickLine={false}
                                    width={60}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    wrapperStyle={{ maxWidth: '180px', fontSize: '0.75rem', zIndex: 10, pointerEvents: 'none' }}
                                    contentStyle={{ 
                                        backgroundColor: '#18181b', 
                                        borderColor: 'rgba(255, 255, 255, 0.5)', 
                                        borderWidth: '1.5px',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        padding: '8px 10px',
                                        fontSize: '0.75rem',
                                        whiteSpace: 'nowrap'
                                    }}
                                    formatter={(value, name) => [
                                        `${new Intl.NumberFormat('ko-KR').format(value)}원`, 
                                        name === 'amount' || name === 'partialAmount' ? (name === 'amount' ? '월 전체' : `${currentDate.getDate()}일까지`) : name
                                    ]}
                                    itemStyle={{ color: 'var(--primary-theme-color)', fontSize: '0.75rem' }}
                                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '0.7rem' }}
                                />
                                <Legend 
                                    wrapperStyle={{ fontSize: '0.75rem', color: '#a1a1aa', paddingTop: '10px' }}
                                    formatter={(value) => {
                                        if (value === 'amount') return '월 전체 매출';
                                        if (value === 'partialAmount') return `${currentDate.getDate()}일까지 매출`;
                                        return value;
                                    }}
                                />
                                
                                {/* Background bar: Total Amount (Faint) */}
                                <Bar xAxisId={0} dataKey="amount" name="amount" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                    {monthlyTrend.map((entry, index) => (
                                        <Cell key={`cell-bg-${index}`} fill={entry.monthParams === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}` ? 'rgba(var(--primary-rgb), 0.2)' : '#27272a'} />
                                    ))}
                                </Bar>
                                
                                {/* Foreground bar: Partial Amount up to current day */}
                                {currentBranch === 'all' && branches.length > 1 ? (
                                    branches.map((b, i) => {
                                        const branchColors = ['#00C49F', '#2196F3', '#FFBB28', '#FF8042', '#8884d8'];
                                        return (
                                            <Bar key={b.id} xAxisId={1} stackId="a" dataKey={`partial_${b.id}`} name={b.name} fill={branchColors[i % branchColors.length]} maxBarSize={60} />
                                        );
                                    })
                                ) : (
                                    <Bar xAxisId={1} dataKey="partialAmount" name="partialAmount" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                        {monthlyTrend.map((entry, index) => (
                                            <Cell key={`cell-fg-${index}`} fill={entry.monthParams === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}` ? 'var(--primary-theme-color)' : '#52525b'} />
                                        ))}
                                    </Bar>
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                </CollapsibleCard>
            )}

            {/* Membership Type Sales */}
            {membershipSales && membershipSales.length > 0 && viewMode !== 'compact' && (
                <CollapsibleCard id="revenue-membership" title="🏷️ 회원권별 판매 현황" titleExtra={`${membershipSales.length}종`} defaultOpen={true}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {membershipSales.map((ms, idx) => {
                            const maxCount = membershipSales[0]?.count || 1;
                            const pct = (ms.count / maxCount) * 100;
                            return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#e4e4e7', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {idx === 0 && '🏆 '}{ms.name}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: '#a1a1aa', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                                            <strong style={{ color: 'var(--primary-theme-color)', fontSize: '1rem' }}>{ms.count}</strong>건
                                            <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                                            {formatCurrency(ms.revenue)}원
                                        </span>
                                    </div>
                                    <div style={{ position: 'relative', height: '22px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                                        {ms.reregCount > 0 && (
                                            <div style={{
                                                position: 'absolute', left: 0, top: 0, height: '100%',
                                                width: `${pct}%`,
                                                background: 'var(--primary-theme-color)',
                                                borderRadius: '6px',
                                                opacity: 0.7,
                                                transition: 'width 0.5s ease'
                                            }} />
                                        )}
                                        {ms.newCount > 0 && (
                                            <div style={{
                                                position: 'absolute', left: 0, top: 0, height: '100%',
                                                width: `${(ms.newCount / maxCount) * 100}%`,
                                                background: '#4ade80',
                                                borderRadius: '6px',
                                                opacity: 0.85,
                                                transition: 'width 0.5s ease'
                                            }} />
                                        )}
                                        <div style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', color: '#fff', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                            {ms.newCount > 0 && <span style={{ marginRight: '8px' }}>신규 {ms.newCount}</span>}
                                            {ms.reregCount > 0 && <span>재등록 {ms.reregCount}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#a1a1aa' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#4ade80' }} />
                            신규
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#a1a1aa' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--primary-theme-color)', opacity: 0.7 }} />
                            재등록
                        </div>
                    </div>
                </CollapsibleCard>
            )}

            {/* Calendar View */}
            <CollapsibleCard id="revenue-calendar" title={`📅 ${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 정산 달력`} defaultOpen={true}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', margin: '0 -4px', padding: '0 4px' }}>
                <div className="calendar-grid custom-scroll" style={{ minWidth: '600px' }}>
                    {/* Header */}
                    {['일', '월', '화', '수', '목', '금', '토'].map((dayName, index) => (
                        <div key={`header-${index}`} className={`calendar-header-cell ${index === 0 ? 'sun' : (index === 6 ? 'sat' : '')}`}>
                            {dayName}
                        </div>
                    ))}

                    {/* Empty cells for start of month */}
                    {(() => {
                        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
                        return Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="calendar-empty-cell"></div>
                        ));
                    })()}

                    {/* Days */}
                    {dailyStats.map(day => (
                        <div key={day.date} className="calendar-day-cell">
                            <div className={`calendar-day-number ${(day.isSunday || day.holidayName) ? 'sun' : (day.isSaturday ? 'sat' : '')}`}>
                                {parseInt(day.date.split('-')[2])}
                            </div>
                            {day.holidayName && (
                                <div className="calendar-holiday-name">
                                    {day.holidayName}
                                </div>
                            )}
                            {/* Detailed breakdown */}
                            {day.amount > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {day.salesList && day.salesList.map((sale, idx) => (
                                        <div key={idx} className="calendar-amount-row" style={{ justifyContent: 'space-between', fontSize: '0.8rem', color: '#ccc' }}>
                                            <span>{sale.name}</span>
                                            <span>{formatCurrency(sale.amount)}</span>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }}></div>
                                    {day.amountNew > 0 && (
                                        <div className="calendar-amount-row new">
                                            <span>신규:</span>
                                            <span>{formatCurrency(day.amountNew)}</span>
                                        </div>
                                    )}
                                    {day.amountReReg > 0 && (
                                        <div className="calendar-amount-row rereg">
                                            <span>재등록:</span>
                                            <span>{formatCurrency(day.amountReReg)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                </div>
            </CollapsibleCard>

        </div>
    );
};

const CompCard = ({ title, amount }) => (
    <div className="dashboard-card" style={{ padding: '15px' }}>
        <div className="comp-card-title">{title}</div>
        <div className={`comp-card-amount ${amount > 0 ? 'positive' : ''}`}>
            {new Intl.NumberFormat('ko-KR').format(amount)}원
        </div>
    </div>
);

const StraightLineChart = ({ data, branches, showBranches }) => {
    // Keep data order as is (earliest to latest) so the latest date is on the right
    // Transform data to flatten branch keys
    const chartData = data.map(d => {
        const row = { ...d };
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

    return (
        <div style={{ width: '100%', height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                        dataKey="displayDate" 
                        stroke="#71717a" 
                        tick={{ fill: '#71717a', fontSize: 11 }} 
                        axisLine={false} 
                        tickLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis 
                        stroke="#71717a" 
                        tick={{ fill: '#71717a', fontSize: 11 }} 
                        tickFormatter={(val) => val === 0 ? '0' : `${(val / 10000).toLocaleString()}만`}
                        axisLine={false} 
                        tickLine={false}
                        domain={[0, yMax]}
                    />
                    <Tooltip 
                        wrapperStyle={{ maxWidth: '160px', fontSize: '0.72rem', zIndex: 10, pointerEvents: 'none' }}
                        contentStyle={{ 
                            backgroundColor: '#18181b', 
                            borderColor: 'rgba(255, 255, 255, 0.5)', 
                            borderWidth: '1.5px',
                            borderRadius: '8px',
                            color: '#fff',
                            padding: '6px 8px',
                            fontSize: '0.72rem',
                            whiteSpace: 'nowrap'
                        }}
                        itemStyle={{ color: 'var(--primary-theme-color)', fontSize: '0.72rem' }}
                        formatter={(value, name) => [`${new Intl.NumberFormat('ko-KR').format(value)}원`, name === 'amount' ? '총합' : name]}
                        labelStyle={{ color: '#a1a1aa', marginBottom: '2px', fontSize: '0.65rem' }}
                    />
                    <Line 
                        type="linear" 
                        dataKey="amount" 
                        name="총합"
                        stroke="var(--primary-theme-color)" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: '#000', stroke: 'var(--primary-theme-color)', strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: 'var(--primary-theme-color)', stroke: '#000', strokeWidth: 2 }}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.7rem', color: '#a1a1aa', paddingTop: '4px' }} />
                    {showBranches && branches.map((b, i) => (
                        <Line
                            key={b.id}
                            type="linear"
                            dataKey={`branch_${b.id}`}
                            name={b.name}
                            stroke={branchColors[i % branchColors.length]}
                            strokeWidth={2}
                            dot={{ r: 2, fill: '#000', stroke: branchColors[i % branchColors.length], strokeWidth: 1 }}
                            activeDot={{ r: 4, fill: branchColors[i % branchColors.length], stroke: '#000', strokeWidth: 1 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AdminRevenue;
