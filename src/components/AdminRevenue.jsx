import React, { useState, useMemo } from 'react';
import { CaretLeft, CaretRight, ChartBar, TrendUp, CreditCard } from '@phosphor-icons/react';

const AdminRevenue = ({ members, currentBranch }) => {
    // State for selected month (default: current month)
    const [currentDate, setCurrentDate] = useState(new Date());

    // Helper to format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR').format(amount) + '원';
    };

    // Filter data based on branch and selected month
    const { monthlyData, totalRevenue, totalRegistrations, dailyStats } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;

        // 1. Filter members by branch and registration date (month)
        const filtered = members.filter(m => {
            if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return false;
            if (!m.regDate) return false;
            // regDate format is assumed to be YYYY-MM-DD
            return m.regDate.startsWith(monthStr);
        });

        // 2. Calculate aggregations
        const revenue = filtered.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
        
        // 3. Group by Day
        const daily = {};
        // Initialize all days in month
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayStr = `${monthStr}-${String(i).padStart(2, '0')}`;
            daily[dayStr] = { date: dayStr, amount: 0, count: 0, items: [] };
        }

        filtered.forEach(m => {
            const date = m.regDate;
            if (daily[date]) {
                daily[date].amount += (Number(m.amount) || 0);
                daily[date].count += 1;
                daily[date].items.push(m);
            }
        });

        return {
            monthlyData: filtered,
            totalRevenue: revenue,
            totalRegistrations: filtered.length,
            dailyStats: Object.values(daily)
        };
    }, [members, currentBranch, currentDate]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Find max daily revenue for chart scaling
    const maxDailyRevenue = Math.max(...dailyStats.map(d => d.amount), 1);

    return (
        <div className="revenue-container fade-in">
            {/* 1. Header & Month Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={handlePrevMonth} className="nav-btn">
                        <CaretLeft size={20} />
                    </button>
                    <h2 className="outfit-font" style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>
                        {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
                    </h2>
                    <button onClick={handleNextMonth} className="nav-btn">
                        <CaretRight size={20} />
                    </button>
                </div>
                <div className="branch-badge">
                    {currentBranch === 'all' ? '전체 지점' : (currentBranch === 'gwangheungchang' ? '광흥창점' : '마포점')}
                </div>
            </div>

            {/* 2. Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: '32px' }}>
                <div className="dashboard-card highlight">
                    <span className="card-label"><TrendUp size={16} style={{marginRight: '6px', verticalAlign: 'text-bottom'}}/>월간 총 매출</span>
                    <span className="card-value gold" style={{ fontSize: '2rem' }}>{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="dashboard-card">
                    <span className="card-label"><CreditCard size={16} style={{marginRight: '6px', verticalAlign: 'text-bottom'}}/>총 결제 건수</span>
                    <span className="card-value">{totalRegistrations}건</span>
                </div>
            </div>

            {/* 3. Daily Revenue Chart */}
            <div className="dashboard-card" style={{ marginBottom: '24px', padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-secondary)' }}>일별 매출 추이</h3>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-end', 
                    gap: '4px', 
                    height: '200px', 
                    width: '100%',
                    paddingBottom: '24px', // Space for dates
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    {dailyStats.map((day) => {
                        const heightPercent = (day.amount / maxDailyRevenue) * 100;
                        const dayNum = parseInt(day.date.split('-')[2]);
                        return (
                            <div key={day.date} style={{ 
                                flex: 1, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                height: '100%',
                                position: 'relative'
                            }}>
                                <div 
                                    className="revenue-bar"
                                    style={{ 
                                        width: '60%', 
                                        height: `${Math.max(heightPercent, 0)}%`, /* Min height for visibility? No, 0 is 0 */
                                        minHeight: day.amount > 0 ? '4px' : '0',
                                        backgroundColor: day.amount > 0 ? 'var(--primary-gold)' : 'transparent',
                                        borderRadius: '4px 4px 0 0',
                                        opacity: 0.8,
                                        transition: 'all 0.3s ease'
                                    }}
                                    title={`${day.date}: ${formatCurrency(day.amount)}`}
                                />
                                <span style={{ 
                                    position: 'absolute', 
                                    bottom: '-24px', 
                                    fontSize: '0.7rem', 
                                    color: 'var(--text-secondary)',
                                    transform: dayNum % 5 === 0 || dayNum === 1 ? 'none' : 'scale(0)' // Show every 5th day + 1st
                                }}>
                                    {dayNum}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 4. Detailed Transaction List */}
            <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>상세 매출 내역</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                            <tr>
                                <th style={thStyle}>날짜</th>
                                <th style={thStyle}>회원명</th>
                                <th style={thStyle}>항목 (수강권)</th>
                                <th style={thStyle}>지점</th>
                                <th style={{...thStyle, textAlign: 'right'}}>금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyData.length > 0 ? (
                                monthlyData
                                    .sort((a, b) => b.regDate.localeCompare(a.regDate)) // Sort by date desc
                                    .map((item) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={tdStyle}>{item.regDate}</td>
                                        <td style={{...tdStyle, fontWeight: 'bold'}}>{item.name}</td>
                                        <td style={{...tdStyle, color: 'var(--text-secondary)'}}>{item.subject || '-'}</td>
                                        <td style={tdStyle}>
                                            <span className={`badge ${item.homeBranch === 'gwangheungchang' ? 'gold' : 'grey'}`}>
                                                {item.homeBranch === 'gwangheungchang' ? '광흥창' : '마포'}
                                            </span>
                                        </td>
                                        <td style={{...tdStyle, textAlign: 'right', color: 'var(--primary-gold)', fontWeight: 600}}>
                                            {formatCurrency(item.amount || 0)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        해당 월의 매출 내역이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const thStyle = {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 500,
    whiteSpace: 'nowrap'
};

const tdStyle = {
    padding: '14px 16px',
    color: 'var(--text-primary)'
};

export default AdminRevenue;
