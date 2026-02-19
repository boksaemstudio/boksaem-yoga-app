import { useState, useMemo } from 'react';
import { CaretLeft, CaretRight, Calendar as CalendarIcon } from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getHolidayName } from '../utils/holidays';

const AdminRevenue = ({ members, sales, currentBranch }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // 1. Data Merging & Processing
    const { dailyStats, monthlyStats, comparativeStats, recentTrend, monthlyTrend } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;

        const allItems = [];
        const salesKeySet = new Set(); // Format: `${memberId}_${date}`

        // 1. Process New Sales Data First (Primary Source)
        (sales || []).forEach(s => {
            const member = (members || []).find(m => m.id === s.memberId);
            const saleBranch = s.branchId;
            const memberBranch = member?.homeBranch;

            if (currentBranch !== 'all') {
                // If branch filter applied, check saleBranch FIRST, then memberBranch
                const matchFound = (saleBranch && saleBranch === currentBranch) || 
                                   (!saleBranch && memberBranch && memberBranch === currentBranch);
                if (!matchFound) return;
            }

            // [FIX] date가 없으면 timestamp에서 fallback
            const rawDate = s.date || s.timestamp;
            if (!rawDate) {
                console.warn('[Revenue] Sales record missing both date and timestamp:', s.id, s.memberName);
                return;
            }
            let dateStr;
            if (rawDate.includes('T')) {
                const d = new Date(rawDate);
                dateStr = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            } else {
                dateStr = rawDate;
            }

            // Determine isNew
            let isNew = false;
            if (s.type === 'extend') {
                isNew = false;
            } else if (s.type === 'register') {
                // If regDate matches sales date, it's likely a new registration or re-registration treated as new
                if (member && member.regDate === dateStr) {
                    isNew = true;
                } else {
                    isNew = false;
                }
            }

            allItems.push({
                id: s.id,
                memberId: s.memberId,
                date: dateStr,
                amount: s.amount,
                name: s.memberName,
                type: s.type, // 'register' or 'extend'
                item: s.item,
                isNew: isNew
            });

            // Add to dedup set
            if (s.memberId) {
                salesKeySet.add(`${s.memberId}_${dateStr}`);
            }
        });

        // 2. Process Legacy Members Data (Secondary Source)
        (members || []).forEach(m => {
            const amt = Number(m.amount) || 0;
            if (m.regDate && amt > 0) {
                if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return;

                // [FIX] Deduplication Check
                // If this member has a sales record on this date, skip legacy addition
                if (salesKeySet.has(`${m.id}_${m.regDate}`)) return;

                allItems.push({
                    id: m.id,
                    memberId: m.id,
                    date: m.regDate,
                    amount: amt,
                    name: m.name,
                    type: 'legacy',
                    item: m.subject || '수강권',
                    // Legacy assumption: if present in members with amount, specific to that regDate
                    isNew: true 
                });
            }
        });


        // 3. Final Sort
        allItems.sort((a, b) => new Date(b.date) - new Date(a.date));
        const finalItems = allItems;



        // [Debug] Log Revenue Data
        console.log('Revenue Debug:', {
            totalItems: allItems.length,
            sampleItems: allItems.slice(0, 5)
        });


        // 2. Monthly Stats (for Calendar)
        // Filter for current Month
        const monthlyItems = finalItems.filter(i => i.date.startsWith(monthStr));

        const daily = {};
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const dKey = `${monthStr}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(year, month - 1, d);
            const dayOfWeek = dateObj.getDay(); // 0=Sun
            // [Feature] Holiday Logic
            const holidayRaw = getHolidayName(dKey);
            // Simple mapping for display
            const holidayMap = {
                'holiday_new_year': '신정',
                'holiday_lunar_new_year': '설날',
                'holiday_samiljeol': '삼일절',
                'holiday_childrens_day': '어린이날',
                'holiday_buddha': '석가탄신일',
                'holiday_memorial': '현충일',
                'holiday_liberation': '광복절',
                'holiday_chuseok': '추석',
                'holiday_foundation': '개천절',
                'holiday_hangul': '한글날',
                'holiday_christmas': '크리스', // Shortened for space
                'holiday_election': '선거일'
            };

            daily[dKey] = {
                date: dKey, amount: 0, count: 0,
                amountNew: 0, amountReReg: 0, // [New]
                amountNewCount: 0, amountReRegCount: 0, // [New]
                isSunday: dayOfWeek === 0,
                isSaturday: dayOfWeek === 6,
                holidayName: holidayRaw ? (holidayMap[holidayRaw] || '공휴일') : null
            };
        }

        monthlyItems.forEach(item => {
            if (daily[item.date]) {
                daily[item.date].amount += item.amount;
                daily[item.date].count += 1;
                
                if (item.isNew) {
                    daily[item.date].amountNew += item.amount;
                    daily[item.date].amountNewCount += 1;
                } else {
                    daily[item.date].amountReReg += item.amount;
                    daily[item.date].amountReRegCount += 1;
                }
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

        const getDailyTotal = (dStr) => finalItems.filter(i => i.date === dStr).reduce((sum, i) => sum + i.amount, 0);

        const statYesterday = getDailyTotal(yesterdayStr);
        const statDayBefore = getDailyTotal(dayBeforeStr);
        const statToday = getDailyTotal(today.toLocaleDateString('sv-SE')); // [FIXED] Define today's total
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

        // 5. Monthly Trend (Last 6 Months)
        const monthlyTrendData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(year, month - 1 - i, 1);
            const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.getMonth() + 1}월`;
            
            // Sum revenue for this month
            const amount = finalItems
                .filter(item => item.date.startsWith(mStr))
                .reduce((sum, item) => sum + item.amount, 0);

            monthlyTrendData.push({
                name: label,
                monthParams: mStr, // For validation if needed
                amount: amount
            });
        }

        const monthlyNew = Object.values(daily).reduce((s, d) => s + d.amountNew, 0);
        const monthlyReReg = Object.values(daily).reduce((s, d) => s + d.amountReReg, 0);

        return {
            dailyStats: Object.values(daily),
            monthlyStats: {
                totalRevenue: Object.values(daily).reduce((s, d) => s + d.amount, 0),
                totalRevenueNew: monthlyNew,
                totalRevenueReReg: monthlyReReg,
                totalCount: monthlyItems.length
            },
            comparativeStats: {
                yesterday: statYesterday,
                dayBefore: statDayBefore,
                today: statToday // [MODIFIED] Return today
            },
            recentTrend: trendData,
            monthlyTrend: monthlyTrendData
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
                        <div style={{ fontSize: '0.9rem', color: 'var(--primary-gold)', fontWeight: 'bold', marginBottom: '4px' }}>
                            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 총 매출
                        </div>
                        <div style={{ fontSize: '2.4rem', fontWeight: '800', color: '#fff', textShadow: '0 0 20px rgba(212,175,55,0.3)' }}>
                            {formatCurrency(monthlyStats.totalRevenue)}원
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                            (신규: <span style={{ color: '#86efac' }}>{formatCurrency(monthlyStats.totalRevenueNew)}원</span> / 
                             재등록: <span style={{ color: '#60a5fa' }}>{formatCurrency(monthlyStats.totalRevenueReReg)}원</span>)
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>총 결제 건수</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{monthlyStats.totalCount}건</div>
                    </div>
                </div>
            </div>

            {/* Comparative Cards (Day Before, Yesterday, Today) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <CompCard title="그제 매출" amount={comparativeStats.dayBefore} subLabel="전전일" />
                <CompCard title="어제 매출" amount={comparativeStats.yesterday} subLabel="전일" />
                <CompCard title="오늘 매출" amount={comparativeStats.today} subLabel="실시간" />
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
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '600px' }}>
                    <CalendarIcon size={20} weight="fill" color="var(--primary-gold)" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월 정산 달력</h3>
                </div>
                <div className="calendar-grid-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', padding: '10px 0', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 'bold', color: '#71717a', minWidth: '600px' }}>
                    <div style={{ color: '#ef4444' }}>일</div>
                    <div>월</div>
                    <div>화</div>
                    <div>수</div>
                    <div>목</div>
                    <div>금</div>
                    <div>토</div>
                </div>
                <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minWidth: '600px' }}>
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
                                color: (day.isSunday || day.holidayName) ? '#ef4444' : (day.isSaturday ? '#3b82f6' : '#d4d4d8')
                            }}>
                                {parseInt(day.date.split('-')[2])}
                            </div>
                            {day.holidayName && (
                                <div style={{ fontSize: '0.65rem', color: '#ef4444', marginBottom: '4px', fontWeight: 'bold', lineHeight: 1.2 }}>
                                    {day.holidayName}
                                </div>
                            )}
                            {/* Detailed breakdown */}
                            {day.amount > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {day.amountNew > 0 && (
                                        <div style={{ fontSize: '0.7rem', color: '#86efac', fontWeight: '500' }}>
                                            신규: {formatCurrency(day.amountNew)}
                                        </div>
                                    )}
                                    {day.amountReReg > 0 && (
                                        <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: '500' }}>
                                            재등록: {formatCurrency(day.amountReReg)}
                                        </div>
                                    )}
                                    {/* Total if needed, specific UI request says separate amounts? Actually user said "재등록 금액과 신규등록 총금액으로 해줘" on calendar too. So separate is good. */}
                                    {(day.amountNew === 0 || day.amountReReg === 0) && (
                                        // If only one type exists, maybe emphasize it? Or just leave as is.
                                        // If mixed, both show up.
                                        // Let's add total sum at bottom slightly dimmed if both exist? Or just keep it clean.
                                        // User request: "재등록 금액과 신규등록 총금액으로 해줘" -> likely wants to see the breakdown.
                                        null
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
