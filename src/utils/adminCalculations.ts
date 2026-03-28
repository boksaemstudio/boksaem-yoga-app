import { getTodayKST, toKSTDateString, safeParseDate } from './dates';
import { guessClassInfo } from './classUtils';
import { Member, SalesRecord, AttendanceLog, PushToken } from '../types';

// ----------------------------------------------------
// Member Status Helpers
// ----------------------------------------------------

export const isMemberActive = (m: Member): boolean => {
    const credits = Number(m.credits || 0);
    const todayStr = getTodayKST();

    if (!m.endDate) {
        return credits > 0;
    }

    return m.endDate >= todayStr && credits > 0;
};

export const isMemberExpiring = (m: Member): boolean => {
    // 이미 만료된 회원은 '만료 예정(위험)'이 아니라 '만료' 상태이므로 제외
    if (!isMemberActive(m)) return false;

    const credits = Number(m.credits || 0);
    const hasLowCredits = credits <= 2;

    if (!m.endDate) return hasLowCredits;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(m.endDate);
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 오늘부터 향후 7일 이내 만료 (이미 지난 날짜 제외)
    const isExpiringSoon = diffDays <= 7 && diffDays >= 0;

    return isExpiringSoon || hasLowCredits;
};

export const getDormantSegments = (targetMembers: Member[]): Record<string, Member[]> => {
    const nowMs = Date.now();
    const fourteenDaysMs = 1000 * 60 * 60 * 24 * 14;
    const segments: Record<string, Member[]> = { 'all': [] };

    targetMembers.forEach(m => {
        if (!isMemberActive(m)) return;

        let lastDateMs: number | null = m.lastAttendance ? new Date(m.lastAttendance).getTime() : null;
        if (!lastDateMs && m.regDate) {
            const regMs = new Date(m.regDate).getTime();
            if ((nowMs - regMs) > fourteenDaysMs) lastDateMs = regMs;
        }

        if (!lastDateMs) return;

        if ((nowMs - lastDateMs) >= fourteenDaysMs) {
            segments['all'].push(m);
        }
    });
    return segments;
};

// ----------------------------------------------------
// Stats & Derived Data Calculators
// ----------------------------------------------------

export const calculateStats = (logs: AttendanceLog[]) => {
    const timeCount: Record<string, number> = {};
    logs.forEach(log => {
        const d = safeParseDate(log.timestamp as any);
        if (isNaN(d.getTime())) return;
        const hour = d.getHours();
        const key = `${hour}:00`;
        timeCount[key] = (timeCount[key] || 0) + 1;
    });

    const sortedTime = Object.entries(timeCount).sort((a, b) => b[1] - a[1]);

    const subjectCount: Record<string, number> = {};
    logs.forEach(log => {
        if (log.subject) {
            subjectCount[log.subject] = (subjectCount[log.subject] || 0) + 1;
        }
    });
    const sortedSubject = Object.entries(subjectCount).sort((a, b) => b[1] - a[1]);

    return { byTime: sortedTime, bySubject: sortedSubject };
};

export const calculateDerivedData = (
    logs: AttendanceLog[], 
    sales: SalesRecord[], 
    members: Member[], 
    currentBranch: string, 
    pushTokens: PushToken[]
) => {
    const currentTodayKST = getTodayKST();
    const branchLogs = currentBranch === 'all'
        ? logs
        : logs.filter(l => l.branchId === currentBranch);

    const stats = calculateStats(branchLogs);

    const enrichedBranchLogs = branchLogs.map(l => {
        if (!l.timestamp) return { ...l, isValidDate: false, logDate: '' };
        let d: Date;
        if (typeof l.timestamp === 'string') {
            d = new Date(l.timestamp);
        } else if (l.timestamp && typeof l.timestamp.toDate === 'function') {
            d = l.timestamp.toDate();
        } else if (l.timestamp && l.timestamp.seconds) {
            d = new Date(l.timestamp.seconds * 1000);
        } else {
            d = new Date(l.timestamp);
        }

        if (isNaN(d.getTime())) return { ...l, isValidDate: false, logDate: '' };
        return {
            ...l,
            isValidDate: true,
            logDate: toKSTDateString(d)
        };
    });

    const enrichedSales = sales.map(s => {
        const rawDate = s.date || s.timestamp;
        let sDate: string | null = null;
        if (rawDate) {
            if (typeof rawDate === 'string') {
                if (rawDate.includes('T')) {
                    const d = new Date(rawDate);
                    if (!isNaN(d.getTime())) sDate = toKSTDateString(d);
                } else {
                    sDate = rawDate;
                }
            } else if (typeof rawDate === 'object' && typeof (rawDate as any).toDate === 'function') {
                sDate = toKSTDateString((rawDate as any).toDate());
            } else if (typeof rawDate === 'object' && (rawDate as any).seconds) {
                sDate = toKSTDateString(new Date((rawDate as any).seconds * 1000));
            }
        }
        return { ...s, parsedDate: sDate };
    });

    const todayStr = currentTodayKST;
    const uniqueMembers = members;

    const attendanceCountMap: Record<string, number> = {};
    enrichedBranchLogs.forEach(l => {
        if (!l.isValidDate || l.status === 'denied' || !l.memberId) return;
        if (l.logDate !== todayStr) return;
        attendanceCountMap[l.memberId] = (attendanceCountMap[l.memberId] || 0) + 1;
    });

    const multiAttendedMemberIds = Object.keys(attendanceCountMap).filter(id => attendanceCountMap[id] >= 2);

    const isMemberInBranch = (m: Member) => currentBranch === 'all' || m.homeBranch === currentBranch;
    const attendedMemberIds = new Set<string>();
    
    let deniedCount = 0;
    let deniedExpiredCount = 0;
    let deniedNoCreditsCount = 0;
    let totalAttendanceToday = 0;

    enrichedBranchLogs.forEach(l => {
        if (!l.isValidDate) return;
        if (l.logDate === todayStr) {
            if (l.status === 'denied') {
                deniedCount++;
                if (l.denialReason === 'expired') deniedExpiredCount++;
                if (l.denialReason === 'no_credits') deniedNoCreditsCount++;
            } else {
                attendedMemberIds.add(l.memberId);
                totalAttendanceToday++;
            }
        }
    });

    const checkIsAttended = (m: Member) => attendedMemberIds.has(m.id);
    const checkIsRegistered = (m: Member) => {
        if (m.regDate === todayStr) return true;
        if (m.createdAt) {
            const created = typeof m.createdAt === 'string' ? m.createdAt : '';
            if (created.startsWith(todayStr)) return true;
        }
        return false;
    };

    const totalMembers = uniqueMembers.filter(m => isMemberInBranch(m)).length;
    const activeMembers = uniqueMembers.filter(m => isMemberInBranch(m) && isMemberActive(m)).length;
    const todayAttendance = uniqueMembers.filter(m => isMemberInBranch(m) && checkIsAttended(m)).length;

    const todayNewMembers = uniqueMembers.filter(m => isMemberInBranch(m) && checkIsRegistered(m));
    
    const memberMapCache = new Map<string, Member>();
    for (let i = 0; i < uniqueMembers.length; i++) {
        memberMapCache.set(uniqueMembers[i].id, uniqueMembers[i]);
    }

    const todaySalesMemberIds = new Set<string>();
    enrichedSales.forEach(s => {
        if (!s.parsedDate) return;
        if (s.parsedDate === todayStr) {
            if (currentBranch === 'all' || s.branchId === currentBranch || memberMapCache.get(s.memberId)?.homeBranch === currentBranch) {
                todaySalesMemberIds.add(s.memberId);
            }
        }
    });

    const todayReRegMembers = uniqueMembers.filter(m => 
        isMemberInBranch(m) && todaySalesMemberIds.has(m.id) && !checkIsRegistered(m)
    );

    const todayReRegMemberIds = todayReRegMembers.map(m => m.id);
    const todayNewCount = todayNewMembers.length;
    const todayReRegCount = todayReRegMembers.length;
    const todayRegistrationTotal = todayNewCount + todayReRegCount;
    const expiringMembersCount = uniqueMembers.filter(m => isMemberInBranch(m) && isMemberExpiring(m)).length;

    let todayRevenue = 0;
    let monthlyRevenue = 0;
    const currentMonthStr = todayStr.substring(0, 7);
    const salesKeys = new Set<string>();
    
    enrichedSales.forEach(s => {
        if (currentBranch !== 'all' && s.branchId !== currentBranch && memberMapCache.get(s.memberId)?.homeBranch !== currentBranch) return;
        if (!s.parsedDate) return;
        
        const uniqueKey = `${s.memberId}_${s.parsedDate}_${s.amount}`;
        if (salesKeys.has(uniqueKey)) return;
        salesKeys.add(uniqueKey);

        if (s.parsedDate === todayStr) todayRevenue += (Number(s.amount) || 0);
        if (s.parsedDate.startsWith(currentMonthStr)) monthlyRevenue += (Number(s.amount) || 0);
    });

    const instructorNamesWithPush = new Set<string>();
    pushTokens.forEach(t => {
        if (t.instructorName) instructorNamesWithPush.add(t.instructorName);
    });

    // ━━━━ 재등록률 계산 (통일된 정의) ━━━━
    // 정의: 해당 월에 결제한 회원 중, 그 월 이전에도 결제 이력이 있으면 "재등록"
    // 이 정의를 상단 카드, 최근 3개월, 월별 트렌드에서 동일하게 적용

    // Step 1: 회원별 결제 월 수집
    const salesMonthsByMember = new Map<string, Set<string>>();  // memberId -> Set<"2026-03">
    enrichedSales.forEach(s => {
        if (!s.parsedDate || !s.memberId) return;
        if (currentBranch !== 'all' && s.branchId !== currentBranch && memberMapCache.get(s.memberId)?.homeBranch !== currentBranch) return;
        const monthKey = s.parsedDate.substring(0, 7);
        if (!salesMonthsByMember.has(s.memberId)) salesMonthsByMember.set(s.memberId, new Set());
        salesMonthsByMember.get(s.memberId)!.add(monthKey);
    });

    const membersWithSales = salesMonthsByMember.size;

    // Step 2: 월별 트렌드 (최근 6개월) — 기준 정의
    const monthlyReRegTrend: { month: string; total: number; reReg: number; rate: number | null }[] = [];
    const recentMonthKeys: string[] = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = `${d.getMonth() + 1}월`;
        recentMonthKeys.push(monthStr);

        let totalMembers = 0;
        let reRegMembers = 0;

        salesMonthsByMember.forEach((months, memberId) => {
            if (!months.has(monthStr)) return;
            totalMembers++;
            // 이 회원이 이번 달 이전에 결제한 적이 있으면 → 재등록
            const hasPriorMonth = Array.from(months).some(m => m < monthStr);
            if (hasPriorMonth) reRegMembers++;
        });

        monthlyReRegTrend.push({
            month: monthLabel,
            total: totalMembers,
            reReg: reRegMembers,
            // total=0이면 null (데이터 없음), total>0이고 reReg=0이면 진짜 0%
            rate: totalMembers > 0 ? Math.round((reRegMembers / totalMembers) * 100) : null
        });
    }

    // Step 3: 누적 재등록률 — 2개 이상 서로 다른 월에 결제한 회원
    const membersReRegistered = Array.from(salesMonthsByMember.values()).filter(months => months.size >= 2).length;
    const reRegistrationRate = membersWithSales > 0 ? Math.round((membersReRegistered / membersWithSales) * 100) : 0;

    // Step 4: 최근 3개월 재등록률 — 월별 트렌드의 최근 3개월 합산
    const recent3 = monthlyReRegTrend.slice(-3);
    const recent3Total = recent3.reduce((sum, m) => sum + m.total, 0);
    const recent3ReReg = recent3.reduce((sum, m) => sum + m.reReg, 0);
    const recentReRegRate = recent3Total > 0 ? Math.round((recent3ReReg / recent3Total) * 100) : 0;
    const recentExpiredCount = recent3Total;
    const recentReRegistered = recent3ReReg;

    const summary = {
        totalMembers,
        activeMembers,
        todayAttendance,
        totalAttendanceToday,
        todayRegistration: todayRegistrationTotal,
        todayNewCount,
        todayReRegCount,
        totalRevenueToday: todayRevenue,
        monthlyRevenue,
        expiringMembersCount,
        todayReRegMemberIds,
        multiAttendedMemberIds,
        attendanceCountMap,
        deniedCount,
        deniedExpiredCount,
        deniedNoCreditsCount,
        // 재등록률 지표
        reRegistrationRate,        // 누적 재등록률 (%)
        recentReRegRate,           // 최근 3개월 재등록률 (%)
        recentExpiredCount,
        recentReRegisteredCount: recentReRegistered,
        membersWithSales,
        membersReRegistered,
        monthlyReRegTrend,         // 월별 트렌드 [{month, total, reReg, rate}]
        installedCount: uniqueMembers.filter(m => isMemberInBranch(m) && pushTokens.some(t => t.memberId === m.id)).length,
        todayInstalledCount: uniqueMembers.filter(m => isMemberInBranch(m) && m.installedAt && toKSTDateString(new Date(m.installedAt)) === todayStr).length,
        pushEnabledCount: uniqueMembers.filter(m => isMemberInBranch(m) && pushTokens.some(t => t.memberId === m.id) && m.pushEnabled !== false).length,
        instructorPushCount: instructorNamesWithPush.size,
        installRatio: activeMembers > 0 ? Math.round((uniqueMembers.filter(m => isMemberInBranch(m) && pushTokens.some(t => t.memberId === m.id)).length / activeMembers) * 100) : 0,
        reachableRatio: activeMembers > 0 ? Math.round((uniqueMembers.filter(m => isMemberInBranch(m) && pushTokens.some(t => t.memberId === m.id) && m.pushEnabled !== false).length / activeMembers) * 100) : 0
    };

    const todayLogs = enrichedBranchLogs.filter(l => 
        l.isValidDate && l.logDate === todayStr && (currentBranch === 'all' || l.branchId === currentBranch)
    );

    const classGroups: Record<string, any> = {};
    todayLogs.forEach(log => {
        const info = guessClassInfo(log as any);
        const classTime = info?.startTime || '00:00';
        const canonicalClassName = info?.className || log.className || '일반';
        const canonicalInstructor = info?.instructor || log.instructor || '선생님';

        const key = `${canonicalClassName}-${canonicalInstructor}-${log.branchId}-${classTime}`;
        
        if (!classGroups[key]) {
            classGroups[key] = {
                className: canonicalClassName,
                instructor: canonicalInstructor,
                branchId: log.branchId,
                classTime: classTime,
                count: 0,
                deniedCount: 0,
                memberNames: [] as string[]
            };
        }
        if (log.status === 'denied') {
            classGroups[key].deniedCount++;
        } else {
            classGroups[key].count++;
            if (log.memberName && (multiAttendedMemberIds.includes(log.memberId) || (log.sessionCount ?? 0) > 1 || log.isMultiSession)) {
                if (!classGroups[key].memberNames.includes(log.memberName)) {
                    classGroups[key].memberNames.push(log.memberName);
                }
            }
        }
    });
    
    const todayClasses = Object.values(classGroups).sort((a: any, b: any) => {
        if (!a.classTime) return 1;
        if (!b.classTime) return -1;
        return b.classTime.localeCompare(a.classTime);
    });

    return { stats, summary, todayClasses, todayReRegMemberIds };
};

export const calculateChartData = (currentSales: SalesRecord[], uniqueMembers: Member[], currentBranch: string) => {
    const memberMap = new Map<string, Member>();
    for (let i = 0; i < uniqueMembers.length; i++) {
        memberMap.set(uniqueMembers[i].id, uniqueMembers[i]);
    }

    const trends = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${yyyy}-${mm}`;

        const monthRevenue = currentSales
            .filter(s => {
                const rawDate = s.date || s.timestamp;
                if (!rawDate) return false;
                
                let sMonthKey;
                if (typeof rawDate === 'string' && rawDate.includes('T')) {
                    sMonthKey = toKSTDateString(new Date(rawDate)).substring(0, 7);
                } else if (typeof rawDate === 'string') {
                    sMonthKey = rawDate.substring(0, 7);
                } else {
                    return false;
                }

                const member = memberMap.get(s.memberId);
                const branchMatch = currentBranch === 'all' || s.branchId === currentBranch || member?.homeBranch === currentBranch;
                
                return sMonthKey === key && branchMatch;
            })
            .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        trends.push({ month: `${mm}월`, amount: monthRevenue, fullKey: key });
    }

    let activeCount = 0;
    let dormantCount = 0;
    let expiredCount = 0;

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(today.getDate() - 14);

    uniqueMembers.filter(m => currentBranch === 'all' || m.homeBranch === currentBranch).forEach(m => {
        const isActive = isMemberActive(m);
        if (!isActive) {
            expiredCount++;
        } else {
            let lastAttDate: Date | null = m.lastAttendance ? new Date(m.lastAttendance) : null;
            if (lastAttDate && lastAttDate >= twoWeeksAgo) {
                activeCount++;
            } else if (m.regDate && new Date(m.regDate) >= twoWeeksAgo && !lastAttDate) {
                activeCount++;
            } else {
                dormantCount++;
            }
        }
    });

    const memberStatusDist = [
        { name: '활동중', value: activeCount },
        { name: '주춤(잠듦)', value: dormantCount },
        { name: '만료', value: expiredCount }
    ];

    return { revenueTrend: trends, memberStatusDist };
};
