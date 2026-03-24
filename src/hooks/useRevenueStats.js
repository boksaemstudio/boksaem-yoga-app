import { useMemo } from 'react';
import { getHolidayName } from '../utils/holidays';

export const useRevenueStats = (sales, members, currentDate, currentBranch, revenueStats) => {
    return useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;

        const allItems = [];
        const salesKeySet = new Set(); // Format: `${memberId}_${date}`
        const seenSalesKeys = new Set(); // Format: `${memberId}_${date}_${amount}`
        const memberIdsWithRegisterSales = new Set(); // [FIX] Members with primary sales records
        const memberNameMap = new Map();
        
        (members || []).forEach(m => memberNameMap.set(m.name, m.id));

        // 1. Process New Sales Data First (Primary Source)
        (sales || []).forEach(s => {
            const resolvedMemberId = s.memberId || memberNameMap.get(s.memberName);
            const member = (members || []).find(m => m.id === resolvedMemberId);
            const saleBranch = s.branchId;
            const memberBranch = member?.homeBranch;

            if (currentBranch !== 'all') {
                // If branch filter applied, check saleBranch FIRST, then memberBranch
                const matchFound = (saleBranch && saleBranch === currentBranch) || 
                                   (!saleBranch && memberBranch && memberBranch === currentBranch);
                if (!matchFound) return;
            }

            // [FIX] Robust date extraction handling both string and Firestore Timestamp
            let dateStr;
            const rawDate = s.date || s.timestamp;
            
            if (!rawDate) {
                console.warn('[Revenue] Sales record missing both date and timestamp:', s.id, s.memberName);
                return;
            }
            
            if (typeof rawDate === 'string' && rawDate.includes('T')) {
                const d = new Date(rawDate);
                dateStr = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            } else if (typeof rawDate === 'object' && rawDate.toDate) {
                // Handle Firestore Timestamp just in case
                dateStr = rawDate.toDate().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            } else {
                dateStr = String(rawDate); // Fallback string conversion
            }

            // Determine isNew
            let isNew = false;
            if (s.type === 'extend') {
                isNew = false;
            } else if (s.type === 'register' || !s.type) {
                // [FIX] Assume 'register' if type is missing and it matches registration date
                if (member && member.regDate === dateStr) {
                    isNew = true;
                } else {
                    isNew = false;
                }
            }

            const rawAmount = Number(s.amount) || 0;

            // Self Deduplication to match useAdminData.js
            if (resolvedMemberId) {
                const uniqueSaleKey = `${resolvedMemberId}_${dateStr}_${rawAmount}`;
                if (seenSalesKeys.has(uniqueSaleKey)) {
                    return; // Drop duplicate
                }
                seenSalesKeys.add(uniqueSaleKey);
                
                // Track register sales to prevent legacy fallback duplicate
                if (s.type === 'register' || s.type === 'legacy' || (!s.type && isNew)) {
                    memberIdsWithRegisterSales.add(resolvedMemberId);
                }
            }

            const branchId = saleBranch || memberBranch || 'unknown';

            allItems.push({
                id: s.id,
                memberId: resolvedMemberId,
                date: dateStr,
                amount: rawAmount,
                name: s.memberName,
                type: s.type || 'register', // Fallback type
                item: s.item,
                isNew: isNew,
                branchId: branchId
            });

            // Add to dedup set
            if (resolvedMemberId) {
                salesKeySet.add(`${resolvedMemberId}_${dateStr}`);
            }
        });

        // 2. Process Legacy Members Data (Secondary Source)
        // Performance Improvement: Use a Map for O(1) lookups instead of filtering `finalItems` later
        const legacyMemberData = new Map();

        (members || []).forEach(m => {
            const amt = Number(m.amount) || 0;
            if (m.regDate && amt > 0) {
                // Basic validation for reasonable date structure before keeping it
                if (typeof m.regDate !== 'string' || m.regDate.length < 10) return;

                if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return;

                // [FIX] Deduplication Check: Ignore if a register sales record exists for this member
                if (memberIdsWithRegisterSales.has(m.id)) return;
                // Double fallback using legacy matching (just in case they have multiple)
                if (salesKeySet.has(`${m.id}_${m.regDate}`)) return;

                legacyMemberData.set(m.id, {
                    id: m.id,
                    memberId: m.id,
                    date: m.regDate,
                    amount: amt,
                    name: m.name,
                    type: 'legacy',
                    item: m.subject || '수강권',
                    isNew: true,
                    branchId: m.homeBranch || 'unknown'
                });
            }
        });

        const finalItems = [...allItems, ...Array.from(legacyMemberData.values())];
        finalItems.sort((a, b) => new Date(b.date) - new Date(a.date));

        // [Debug] Log Revenue Data
        // console.log('Revenue Debug:', {
        //     totalItems: finalItems.length,
        //     sampleItems: finalItems.slice(0, 5)
        // });

        // Optimization: Use a Map to grouping daily amounts for O(1) lookups
        const dailyAmountsMap = new Map();
        finalItems.forEach(item => {
            const currentObj = dailyAmountsMap.get(item.date) || { 
                amount: 0, count: 0, amountNew: 0, amountReReg: 0, amountNewCount: 0, amountReRegCount: 0, salesList: [], branches: {} 
            };
            
            currentObj.amount += item.amount;
            currentObj.count += 1;
            currentObj.salesList.push(item);
            
            const bId = item.branchId || 'unknown';
            currentObj.branches[bId] = (currentObj.branches[bId] || 0) + item.amount;
            
            if (item.isNew) {
                currentObj.amountNew += item.amount;
                currentObj.amountNewCount += 1;
            } else {
                currentObj.amountReReg += item.amount;
                currentObj.amountReRegCount += 1;
            }
            
            dailyAmountsMap.set(item.date, currentObj);
        });

        // 2. Monthly Stats (for Calendar)
        const daily = {};
        const daysInMonth = new Date(year, month, 0).getDate();
        
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

        let monthlyTotal = 0;
        let monthlyNew = 0;
        let monthlyReReg = 0;
        let monthlyCount = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dKey = `${monthStr}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(year, month - 1, d);
            const dayOfWeek = dateObj.getDay(); // 0=Sun
            const holidayRaw = getHolidayName(dKey);
            
            // Fetch aggregated data from map (O(1) instead of filter loop)
            const dayData = dailyAmountsMap.get(dKey) || { 
                amount: 0, count: 0, amountNew: 0, amountReReg: 0, amountNewCount: 0, amountReRegCount: 0, salesList: [] 
            };

            daily[dKey] = {
                date: dKey,
                amount: dayData.amount,
                count: dayData.count,
                amountNew: dayData.amountNew,
                amountReReg: dayData.amountReReg,
                amountNewCount: dayData.amountNewCount,
                amountReRegCount: dayData.amountReRegCount,
                salesList: dayData.salesList,
                isSunday: dayOfWeek === 0,
                isSaturday: dayOfWeek === 6,
                holidayName: holidayRaw ? (holidayMap[holidayRaw] || '공휴일') : null
            };
            
            monthlyTotal += dayData.amount;
            monthlyNew += dayData.amountNew;
            monthlyReReg += dayData.amountReReg;
            monthlyCount += dayData.count;
        }

        // [FIX] Server Stats Override 제거 — revenueStats는 신규 매출만 집계하여 부정확
        // sales 데이터에서 직접 계산한 monthlyTotal/monthlyNew/monthlyReReg가 정확합니다.


        // 3. Comparative Stats (Yesterday, Day Before, Last Week)
        const today = new Date();
        const getOffsetDateString = (offsetDays) => {
            const d = new Date(today);
            d.setDate(today.getDate() - offsetDays);
            return d.toLocaleDateString('sv-SE');
        }

        const todayStr = getOffsetDateString(0);
        const yesterdayStr = getOffsetDateString(1);
        const dayBeforeStr = getOffsetDateString(2);
        const lastWeekStr = getOffsetDateString(7);

        const getDailyTotalOptimized = (dStr) => dailyAmountsMap.get(dStr)?.amount || 0;

        const statYesterday = getDailyTotalOptimized(yesterdayStr);
        const statDayBefore = getDailyTotalOptimized(dayBeforeStr);
        const statToday = getDailyTotalOptimized(todayStr); 
        const statLastWeekStr = getDailyTotalOptimized(lastWeekStr);


        // 4. Trend Graph (Last 14 Days)
        const trendData = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dStr = d.toLocaleDateString('sv-SE');
            const dayData = dailyAmountsMap.get(dStr) || {};
            trendData.push({
                date: dStr,
                displayDate: `${d.getMonth() + 1}/${d.getDate()}`,
                amount: dayData.amount || 0,
                branches: dayData.branches || {}
            });
        }

        // 5. Monthly Trend (Last 6 Months)
        const monthlyTrendData = [];
        const currentDayOfM = currentDate.getDate(); // 1~31

        for (let i = 5; i >= 0; i--) {
            const d = new Date(year, month - 1 - i, 1);
            const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.getMonth() + 1}월`;
            
            let amount = 0;
            let partialAmount = 0;
            let branches = {};
            let partialBranches = {};

            // [FIX] 항상 sales 데이터에서 직접 계산 (revenueStats 서버 통계 사용 안 함)
            dailyAmountsMap.forEach((val, key) => {
                if (key.startsWith(mStr)) {
                    amount += val.amount;
                    const dayPart = parseInt(key.substring(8, 10), 10);
                    if (dayPart <= currentDayOfM) {
                        partialAmount += val.amount;
                    }
                }
            });

            // Always calculate branch amounts from dailyAmountsMap for graphs
            dailyAmountsMap.forEach((val, key) => {
                if (key.startsWith(mStr)) {
                    Object.entries(val.branches || {}).forEach(([bId, amt]) => {
                        branches[bId] = (branches[bId] || 0) + amt;
                        const dayPart = parseInt(key.substring(8, 10), 10);
                        if (dayPart <= currentDayOfM) {
                            partialBranches[bId] = (partialBranches[bId] || 0) + amt;
                        }
                    });
                }
            });

            monthlyTrendData.push({
                name: label,
                monthParams: mStr, 
                amount: amount,
                partialAmount: partialAmount,
                branches,
                partialBranches
            });
        }

        // 6. Membership Type Sales (회원권별 판매수)
        const membershipMap = new Map();
        finalItems.forEach(item => {
            if (!item.date.startsWith(monthStr)) return;
            const key = item.item || '수강권';
            const current = membershipMap.get(key) || { name: key, count: 0, revenue: 0, newCount: 0, reregCount: 0 };
            current.count += 1;
            current.revenue += item.amount;
            if (item.isNew) current.newCount += 1;
            else current.reregCount += 1;
            membershipMap.set(key, current);
        });
        const membershipSales = Array.from(membershipMap.values())
            .sort((a, b) => b.count - a.count);

        return {
            dailyStats: Object.values(daily),
            monthlyStats: {
                totalRevenue: monthlyTotal,
                totalRevenueNew: monthlyNew,
                totalRevenueReReg: monthlyReReg,
                totalCount: monthlyCount
            },
            comparativeStats: {
                yesterday: statYesterday,
                dayBefore: statDayBefore,
                today: statToday
            },
            recentTrend: trendData,
            monthlyTrend: monthlyTrendData,
            membershipSales
        };

    }, [members, sales, currentDate, currentBranch, revenueStats]);
};
