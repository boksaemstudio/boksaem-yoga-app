import { useState } from 'react';
import { CaretLeft, CaretRight, Calendar as CalendarIcon } from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { useRevenueStats } from '../hooks/useRevenueStats';

const AdminRevenue = ({ members, sales, currentBranch }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const { dailyStats, monthlyStats, comparativeStats, recentTrend, monthlyTrend } = useRevenueStats(sales, members, currentDate, currentBranch);

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
                    {currentBranch === 'all' ? '전체 지점' : (currentBranch === 'gwangheungchang' ? '광흥창점' : '마포점')}
                </div>
            </div>

            {/* Total Month Summary */}
            <div className="dashboard-card revenue-summary-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <div className="revenue-summary-title">
                            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 총 매출
                        </div>
                        <div className="revenue-summary-amount">
                            {formatCurrency(monthlyStats.totalRevenue)}원
                        </div>
                        <div className="revenue-summary-details">
                            (신규: <span className="revenue-new">{formatCurrency(monthlyStats.totalRevenueNew)}원</span> / 
                             재등록: <span className="revenue-rereg">{formatCurrency(monthlyStats.totalRevenueReReg)}원</span>)
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ marginBottom: '12px' }}>
                            <div className="revenue-count-title">오늘 매출</div>
                            <div className="revenue-summary-amount" style={{ fontSize: '1.4rem', color: 'var(--primary-gold)' }}>
                                {formatCurrency(comparativeStats.today)}원
                            </div>
                        </div>
                        <div>
                            <div className="revenue-count-title">총 결제 건수</div>
                            <div className="revenue-count">{monthlyStats.totalCount}건</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Revenue Graph (Straight Line) */}
            <div className="dashboard-card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-secondary)' }}>최근 14일 일별 매출</h3>
                <StraightLineChart data={recentTrend} />
            </div>

            {/* Monthly Bar Chart */}
            <div className="dashboard-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-secondary)' }}>월별 매출 추이 (최근 6개월)</h3>
                <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                stroke="#71717a" 
                                tick={{ fill: '#71717a', fontSize: 12 }} 
                                axisLine={{ stroke: '#3f3f46' }}
                                tickLine={false}
                            />
                            <YAxis 
                                stroke="#71717a" 
                                tick={{ fill: '#71717a', fontSize: 12 }} 
                                tickFormatter={(value) => `${(value / 10000).toLocaleString()}만`}
                                axisLine={false}
                                tickLine={false}
                                width={60}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ 
                                    backgroundColor: '#18181b', 
                                    borderColor: '#3f3f46', 
                                    borderRadius: '8px',
                                    color: '#fff',
                                    padding: '12px'
                                }}
                                formatter={(value) => [`${new Intl.NumberFormat('ko-KR').format(value)}원`, '매출']}
                                itemStyle={{ color: 'var(--primary-gold)' }}
                                labelStyle={{ color: '#a1a1aa', marginBottom: '8px' }}
                            />
                            <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                {monthlyTrend.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.monthParams === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}` ? 'var(--primary-gold)' : '#333'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Calendar View */}
            <div className="dashboard-card" style={{ padding: '0', overflowX: 'auto' }}>
                <div className="revenue-calendar-header">
                    <CalendarIcon size={20} weight="fill" color="var(--primary-gold)" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 정산 달력</h3>
                </div>
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

const StraightLineChart = ({ data }) => {
    // Keep data order as is (earliest to latest) so the latest date is on the right
    const chartData = data;

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
                    />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#18181b', 
                            borderColor: '#3f3f46', 
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '0.85rem'
                        }}
                        itemStyle={{ color: 'var(--primary-gold)' }}
                        formatter={(value) => [`${new Intl.NumberFormat('ko-KR').format(value)}원`, '매출']}
                        labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                    />
                    <Line 
                        type="linear" 
                        dataKey="amount" 
                        stroke="var(--primary-gold)" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: '#000', stroke: 'var(--primary-gold)', strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: 'var(--primary-gold)', stroke: '#000', strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default AdminRevenue;
