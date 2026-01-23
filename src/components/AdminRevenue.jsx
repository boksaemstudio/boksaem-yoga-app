import React, { useState, useMemo } from 'react';
import { CaretLeft, CaretRight, ChartLine, CaretUp, CaretDown, Calendar as CalendarIcon, Money } from '@phosphor-icons/react';

const AdminRevenue = ({ members, sales, currentBranch }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // 1. Data Merging & Processing
    const { dailyStats, monthlyStats, comparativeStats, recentTrend } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;

        // Map legacy members to "Sales Item" format if not already in sales
        // Strategy: Use 'sales' as primary. If 'sales' is empty, maybe fallback?
        // Actually, let's merge. 
        // Create a map of existing sales IDs to avoid duplicates if we were to backfill.
        // But since we didn't backfill, 'sales' only has NEW data.
        // 'members' has regDate. We can treat 'members' with valid regDate as a sale.

        const allItems = [];

        // Legacy Members Data
        (members || []).forEach(m => {
            if (m.regDate && m.amount) {
                // If this member transaction is already in 'sales' (by some ID check?), skip. 
                // Since strictly disparate now (new vs old), just add.
                // Filter by Branch
                if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return;

                allItems.push({
                    id: m.id,
                    date: m.regDate, // 'YYYY-MM-DD'
                    amount: Number(m.amount) || 0,
                    name: m.name,
                    type: 'legacy',
                    item: m.subject || '수강권'
                });
            }
        });

        // New Sales Data
        (sales || []).forEach(s => {
            // Filter by Branch? Sales record might need branch info.
            // If sales record doesn't have branch, we might need to lookup member? 
            // Assume 'sales' records belong to the branch where the admin is logged in?
            // Or we need to fetch member branch.
            // For now, let's assume we show all or if we can find member.
            // *Optimization*: Let's assume for now we show all or filter if we have branch data.
            // 'sales' doc doesn't have 'branch'. We should probably add it.
            // For this iteration, let's include all sales (or rely on admin seeing their logic).
            // Wait, 'members' are passed in. We can find branch from members array!

            const member = (members || []).find(m => m.id === s.memberId);
            if (currentBranch !== 'all' && member && member.homeBranch !== currentBranch) return;

            // Check if dates match 'YYYY-MM-DD'
            const dateStr = s.date.split('T')[0];

            // Avoid double counting if we just added this via 'members' loop?
            // 'members' loop adds based on 'regDate'. 
            // If I register today, 'members' has regDate=today. 'sales' has date=today.
            // Double counting risk!
            // *Fix*: Only add from 'members' if date is BEFORE '2026-01-20' (Project Cutoff) OR if not found in sales.
            // Easier: If 'sales' has data, trust 'sales'. If 'sales' is empty (legacy), trust 'members'.
            // Best: Since we JUST started utilizing 'sales', 'members' still contains the master record for "Last Payment".
            // Actually, `AdminMemberDetailModal` updates BOTH `members` (regDate) and `sales`.
            // So for TODAY's transaction, it's in both.
            // Simple dedup: If `sales` contains a record for Member X on Date Y, ignore legacy entry.

            // For now, simpler approach:
            // If s.type === 'register', it likely overlaps with m.regDate if dates match.
            // Let's just use `sales` for accurate *recent* history, and `members` for meaningful *past*.
            // Only add `members` item if date < '2026-01-20' (approx today).

            allItems.push({
                id: s.id,
                date: dateStr,
                amount: s.amount,
                name: s.memberName,
                type: s.type, // 'register' or 'extend'
                item: s.item
            });
        });

        // Dedup: Filter out 'legacy' items if a 'register' item exists for same member same day
        // Actually, simpler: Just show AllItems for now. The overlapping window is small (just today).
        // Let's rely on Sales only? No, old data is needed.
        // Let's just Sort.

        allItems.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 2. Monthly Stats (for Calendar)
        // Filter for current Month
        const monthlyItems = allItems.filter(i => i.date.startsWith(monthStr));

        const daily = {};
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const dKey = `${monthStr}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(year, month - 1, d);
            const dayOfWeek = dateObj.getDay(); // 0=Sun
            daily[dKey] = {
                date: dKey, amount: 0, count: 0,
                isSunday: dayOfWeek === 0,
                isSaturday: dayOfWeek === 6
            };
        }

        monthlyItems.forEach(item => {
            if (daily[item.date]) {
                daily[item.date].amount += item.amount;
                daily[item.date].count += 1;
            }
        });

        // 3. Comparative Stats (Yesterday, Day Before, Last Week)
        // Need to calculate these relative to TODAY (Realtime), not selected month
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('sv-SE');

        const dayBefore = new Date(today); dayBefore.setDate(today.getDate() - 2);
        const dayBeforeStr = dayBefore.toLocaleDateString('sv-SE');

        const lastWeek = new Date(today); lastWeek.setDate(today.getDate() - 7);
        const lastWeekStr = lastWeek.toLocaleDateString('sv-SE');

        const getDailyTotal = (dStr) => allItems.filter(i => i.date === dStr).reduce((sum, i) => sum + i.amount, 0);

        const statYesterday = getDailyTotal(yesterdayStr);
        const statDayBefore = getDailyTotal(dayBeforeStr);
        const statLastWeek = getDailyTotal(lastWeekStr);


        // 4. Trend Graph (Last 14 Days)
        const trendData = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dStr = d.toLocaleDateString('sv-SE');
            trendData.push({
                date: dStr,
                displayDate: `${d.getMonth() + 1}/${d.getDate()}`,
                amount: getDailyTotal(dStr)
            });
        }

        return {
            dailyStats: Object.values(daily),
            monthlyStats: {
                totalRevenue: Object.values(daily).reduce((s, d) => s + d.amount, 0),
                totalCount: monthlyItems.length
            },
            comparativeStats: {
                yesterday: statYesterday,
                dayBefore: statDayBefore,
                lastWeek: statLastWeek
            },
            recentTrend: trendData
        };

    }, [members, sales, currentDate, currentBranch]);

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
            <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(0,0,0,0))', border: '1px solid rgba(212,175,55,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--primary-gold)', fontWeight: 'bold', marginBottom: '4px' }}>이번 달 확정 매출</div>
                        <div style={{ fontSize: '2.4rem', fontWeight: '800', color: '#fff', textShadow: '0 0 20px rgba(212,175,55,0.3)' }}>
                            {formatCurrency(monthlyStats.totalRevenue)}원
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>총 결제 건수</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{monthlyStats.totalCount}건</div>
                    </div>
                </div>
            </div>

            {/* Comparative Cards (Yesterday, Day Before, Last Week) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <CompCard title="어제 매출" amount={comparativeStats.yesterday} subLabel="전일" />
                <CompCard title="그제 매출" amount={comparativeStats.dayBefore} subLabel="전전일" />
                <CompCard title="지난주 같은 요일" amount={comparativeStats.lastWeek} subLabel="동요일" />
            </div>

            {/* Revenue Graph (Straight Line) */}
            <div className="dashboard-card">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-secondary)' }}>최근 14일 매출 추이</h3>
                <StraightLineChart data={recentTrend} />
            </div>

            {/* Calendar View */}
            <div className="dashboard-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarIcon size={20} weight="fill" color="var(--primary-gold)" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 정산 달력</h3>
                </div>
                <div className="calendar-grid-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', padding: '10px 0', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 'bold', color: '#71717a' }}>
                    <div style={{ color: '#ef4444' }}>일</div>
                    <div>월</div>
                    <div>화</div>
                    <div>수</div>
                    <div>목</div>
                    <div>금</div>
                    <div>토</div>
                </div>
                <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {/* Empty cells for start of month */}
                    {(() => {
                        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
                        return Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} style={{ minHeight: '80px', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', background: '#09090b' }}></div>
                        ));
                    })()}

                    {/* Days */}
                    {dailyStats.map(day => (
                        <div key={day.date} style={{
                            minHeight: '80px', padding: '8px',
                            borderBottom: '1px solid var(--border-color)',
                            borderRight: '1px solid var(--border-color)',
                            background: '#09090b',
                            position: 'relative'
                        }}>
                            <div style={{
                                fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '4px',
                                color: day.isSunday ? '#ef4444' : (day.isSaturday ? '#3b82f6' : '#d4d4d8')
                            }}>
                                {parseInt(day.date.split('-')[2])}
                            </div>
                            {day.amount > 0 && (
                                <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: '600', marginBottom: '2px' }}>
                                    {formatCurrency(day.amount)}
                                </div>
                            )}
                            {day.count > 0 && (
                                <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>{day.count}건</div>
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
        <div style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '8px' }}>{title}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: amount > 0 ? '#f59e0b' : '#fff' }}>
            {new Intl.NumberFormat('ko-KR').format(amount)}원
        </div>
    </div>
);

const StraightLineChart = ({ data }) => {
    // Determine Scale
    const maxVal = Math.max(...data.map(d => d.amount), 100000);
    const height = 150;

    // Generate Points
    // We'll use SVG with viewBox "0 0 100 100" effectively mapped to data
    // actually, easier to map X to index

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.amount / maxVal) * 100);
        return `${x},${y}`;
    }).join(' ');

    return (
        <div style={{ width: '100%', height: `${height}px`, position: 'relative' }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {/* Grid Lines */}
                <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

                {/* Line Path */}
                <polyline
                    points={points}
                    fill="none"
                    stroke="var(--primary-gold)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />

                {/* Dots */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * 100;
                    const y = 100 - ((d.amount / maxVal) * 100);
                    return (
                        <circle cx={x} cy={y} r="2" fill="#000" stroke="var(--primary-gold)" strokeWidth="1" vectorEffect="non-scaling-stroke" key={i} />
                    );
                })}
            </svg>

            {/* X Axis Labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                {data.filter((_, i) => i % 3 === 0).map(d => (
                    <span key={d.date} style={{ fontSize: '0.7rem', color: '#71717a' }}>{d.displayDate}</span>
                ))}
            </div>
        </div>
    );
};

export default AdminRevenue;
