import { useState, useEffect, useCallback, useRef } from 'react';
import { storageService } from '../services/storage';
import { getTodayKST, getKSTHour, toKSTDateString, safeParseDate } from '../utils/dates';
import { STUDIO_CONFIG } from '../studioConfig';
import { guessClassTime, guessClassInfo } from '../utils/classUtils';


export const useAdminData = (activeTab, initialBranch = 'all') => {
    const [currentBranch, setCurrentBranch] = useState(initialBranch);
    const [members, setMembers] = useState([]);
    const [sales, setSales] = useState([]);
    const [logs, setLogs] = useState([]);
    const [notices, setNotices] = useState([]);
    const [stats, setStats] = useState({ byTime: [], bySubject: [] });
    const [aiInsight, setAiInsight] = useState(null);
    const [loadingInsight, setLoadingInsight] = useState(false);
    const loadingRef = useRef(false); // [FIX] Use Ref to prevent dependency loop
    const [images, setImages] = useState({});
    const [optimisticImages, setOptimisticImages] = useState({});
    const [todayClasses, setTodayClasses] = useState([]);
    const [pushTokens, setPushTokens] = useState([]);
    const [aiUsage, setAiUsage] = useState({ count: 0, limit: 2000 });
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [summary, setSummary] = useState({
        totalMembers: 0,
        activeMembers: 0,
        todayAttendance: 0,
        totalAttendanceToday: 0,
        todayRegistration: 0,
        totalRevenueToday: 0,
        monthlyRevenue: 0,
        expiringMembersCount: 0,
        installedCount: 0,
        pushEnabledCount: 0
    });

    // Helper: Is Member Active? (Domain Logic)
    const isMemberActive = useCallback((m) => {
        const credits = Number(m.credits || 0);
        const todayStr = getTodayKST();

        // If no endDate, check only credits
        if (!m.endDate) {
            return credits > 0;
        }

        // If has endDate, must be future/today AND have credits > 0
        // (If credits are 0, member allows entry? usually no, unless unlimited type which has high credits)
        return m.endDate >= todayStr && credits > 0;
    }, []);

    // Helper: Is Member Expiring?
    const isMemberExpiring = useCallback((m) => {
        // If no endDate, just check credits
        const credits = Number(m.credits || 0);
        const hasNoCredits = credits <= 2;

        if (!m.endDate) return hasNoCredits;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(m.endDate);
        const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

        const isExpiringSoon = diffDays <= 7 && diffDays >= -30;
        // [Logic] Imminent (0-7 days) or Recently Expired (within 30 days)

        return isExpiringSoon || hasNoCredits;
    }, []);

    const calculateStats = useCallback((logs) => {
        const timeCount = {};
        logs.forEach(log => {
            const d = safeParseDate(log.timestamp);
            if (isNaN(d.getTime())) return;
            const hour = d.getHours();
            const key = `${hour}:00`;
            timeCount[key] = (timeCount[key] || 0) + 1;
        });

        const sortedTime = Object.entries(timeCount).sort((a, b) => b[1] - a[1]);

        const subjectCount = {};
        logs.forEach(log => {
            if (log.subject) {
                subjectCount[log.subject] = (subjectCount[log.subject] || 0) + 1;
            }
        });
        const sortedSubject = Object.entries(subjectCount).sort((a, b) => b[1] - a[1]);

        setStats({ byTime: sortedTime, bySubject: sortedSubject });
    }, []);

    const loadAIInsight = useCallback(async (members, logs, currentSummary, currentTodayClasses) => {
        if (loadingRef.current) return; // Check Ref
        loadingRef.current = true;      // Set Ref
        setLoadingInsight(true);
        
        try {
            const statsData = {
                activeCount: currentSummary.activeMembers,
                totalMembers: currentSummary.totalMembers,
                monthlyRevenue: currentSummary.monthlyRevenue,
                todayRevenue: currentSummary.totalRevenueToday,
                todayRegistration: currentSummary.todayRegistration,
                newRegCount: currentSummary.todayNewCount,
                reRegCount: currentSummary.todayReRegCount,
                attendanceToday: currentSummary.todayAttendance,
                expiringCount: currentSummary.expiringMembersCount,
                dormantCount: currentSummary.dormantMembersCount,
                installedCount: currentSummary.installedCount,
                branch: currentBranch,
                topClasses: currentTodayClasses.slice(0, 5)
            };

            const aiPromise = storageService.getAIAnalysis(
                "Administrator",
                logs.length,
                logs,
                getKSTHour(),
                'ko',
                'admin',
                statsData,
                'admin'
            );

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("AI Analysis Timeout")), 8000)
            );

            const insight = await Promise.race([aiPromise, timeoutPromise]);
            if (insight) setAiInsight(insight);
        } catch (err) {
            console.warn("[AI] Admin Insight failed or timed out. Using fallback summary.", err);
            const fallbackMsg = `현재 ${currentSummary.activeMembers}명의 회원이 활동 중이며, 오늘 ${currentSummary.todayAttendance}명이 출석했습니다. 안정적인 센터 운영이 이어지고 있습니다.`;
            setAiInsight({ message: fallbackMsg, isFallback: true });
        } finally {
            loadingRef.current = false; // Reset Ref
            setLoadingInsight(false);
        }
    }, []); // Removed [loadingInsight] dependency to prevent loop

    // [New] Re-registration Logic State
    const [todayReRegMemberIds, setTodayReRegMemberIds] = useState([]);

    const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

    const loadInitialData = useCallback(async () => {
        if (isInitialLoadDone) return;
        console.time('[Admin] loadInitialData');
        
        try {
            const [currentMembers, currentImages, tokensResult, usageResult, currentSales] = await Promise.all([
                storageService.loadAllMembers().catch(err => { console.warn("[Admin] Member load error", err); return []; }),
                (storageService.getImages ? storageService.getImages() : Promise.resolve({})).catch(err => ({})),
                storageService.getAllPushTokens().catch(err => { console.error('Failed to fetch push tokens:', err); return []; }),
                storageService.getAiUsage().catch(e => { console.warn("Failed to fetch AI usage", e); return { count: 0, limit: 2000 }; }),
                storageService.getSales().catch(err => { console.warn("[Admin] Sales load error", err); return []; })
            ]);

            const currentLogs = storageService.getAttendance();
            const currentNotices = storageService.getNotices();

            setMembers(Array.from(new Map(currentMembers.map(m => [m.id, m])).values()));
            setPushTokens(tokensResult);
            setAiUsage(usageResult);
            setLogs([...currentLogs]);
            setNotices([...currentNotices]);
            setImages({ ...currentImages });
            setSales([...currentSales]);
            setIsInitialLoadDone(true);
        } catch (err) {
            console.error("[Admin] Initial data load failed", err);
        } finally {
            console.timeEnd('[Admin] loadInitialData');
        }
    }, [isInitialLoadDone]);

    // [Refactored] 1. Data Subscriptions - Only Updates Raw State
    const handleDataUpdate = useCallback(async (eventType = 'general') => {
        console.log(`[Admin] Data update detected (${eventType}), syncing raw states...`);
        
        if (eventType === 'members' || eventType === 'general' || eventType === 'all') {
            // [FIX] Deep copy to defeat React's shallow comparison memoization for inner objects
            setMembers(Array.from(new Map(storageService.getMembers().map(m => [m.id, { ...m }])).values()));
        }
        if (eventType === 'logs' || eventType === 'general' || eventType === 'all') {
            setLogs([...storageService.getAttendance()]);
        }
        if (eventType === 'sales' || eventType === 'general' || eventType === 'all') {
            storageService.getSales().then(s => setSales([...s]));
        }
        if (eventType === 'images' || eventType === 'general' || eventType === 'all') {
            if (storageService.getImages) setImages({ ...storageService.getImages() });
        }
        if (eventType === 'notices' || eventType === 'general' || eventType === 'all') {
            setNotices([...storageService.getNotices()]);
        }
    }, []);

    // [Refactored] 2. Derived State Calculation - Runs when raw state changes
    useEffect(() => {
        if (!isInitialLoadDone) return;
        console.time('[Admin] Calculate Derived Data');

        const currentTodayKST = getTodayKST();
        const branchLogs = currentBranch === 'all'
            ? logs
            : logs.filter(l => l.branchId === currentBranch);

        calculateStats(branchLogs);
        
        // [Perf] Enrich logs with KST string to prevent repeated Date parsing
        const enrichedBranchLogs = branchLogs.map(l => {
            if (!l.timestamp) return { ...l, isValidDate: false };
            
            let d;
            if (typeof l.timestamp === 'string') {
                d = new Date(l.timestamp);
            } else if (l.timestamp && typeof l.timestamp.toDate === 'function') {
                d = l.timestamp.toDate();
            } else if (l.timestamp && l.timestamp.seconds) {
                d = new Date(l.timestamp.seconds * 1000);
            } else {
                d = new Date(l.timestamp);
            }

            if (isNaN(d.getTime())) return { ...l, isValidDate: false };
            return {
                ...l,
                isValidDate: true,
                logDate: toKSTDateString(d)
            };
        });

        // [Perf] Enrich sales
        const enrichedSales = sales.map(s => {
            const rawDate = s.date || s.timestamp;
            let sDate = null;
            
            if (rawDate) {
                if (typeof rawDate === 'string') {
                    if (rawDate.includes('T')) {
                        const d = new Date(rawDate);
                        if (!isNaN(d.getTime())) sDate = toKSTDateString(d);
                    } else {
                        sDate = rawDate; // Already YYYY-MM-DD
                    }
                } else if (typeof rawDate.toDate === 'function') {
                    sDate = toKSTDateString(rawDate.toDate());
                } else if (rawDate.seconds) {
                    sDate = toKSTDateString(new Date(rawDate.seconds * 1000));
                }
            }
            return { ...s, parsedDate: sDate };
        });

        const todayStr = currentTodayKST;
        const uniqueMembers = members;

        // [New] Multi-attendance Detection (Valid Log Count Base)
        const attendanceCountMap = {}; // memberId -> total sessions today
        
        try {
            enrichedBranchLogs.forEach(l => {
                if (!l.isValidDate || l.status === 'denied' || !l.memberId) return;
                if (l.logDate !== todayStr) return;
                attendanceCountMap[l.memberId] = (attendanceCountMap[l.memberId] || 0) + 1;
            });
        } catch (err) {
            console.error('[Admin] Error calculating multi-attendance:', err);
        }

        const multiAttendedMemberIds = Object.keys(attendanceCountMap).filter(id => attendanceCountMap[id] >= 2);

        // Stats Calculation
        const isMemberInBranch = (m) => currentBranch === 'all' || m.homeBranch === currentBranch;
        const attendedMemberIds = new Set();
        
        let deniedCount = 0;
        let deniedExpiredCount = 0;
        let deniedNoCreditsCount = 0;
        let totalAttendanceToday = 0;

        try {
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
        } catch (err) {
            console.error('[Admin] Error calculating stats:', err);
        }

        const checkIsAttended = (m) => attendedMemberIds.has(m.id);
        const checkIsRegistered = (m) => m.regDate === todayStr;

        const totalMembers = uniqueMembers.filter(m => isMemberInBranch(m)).length;
        const activeMembers = uniqueMembers.filter(m => isMemberInBranch(m) && isMemberActive(m)).length;
        const todayAttendance = uniqueMembers.filter(m => isMemberInBranch(m) && checkIsAttended(m)).length;

        // [Logic] Today Registration (New & Re-reg)
        const todayNewMembers = uniqueMembers.filter(m => isMemberInBranch(m) && checkIsRegistered(m));
        
        const memberMapCache = new Map();
        for (let i = 0; i < uniqueMembers.length; i++) {
            memberMapCache.set(uniqueMembers[i].id, uniqueMembers[i]);
        }

        const todaySalesMemberIds = new Set();
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

        setTodayReRegMemberIds(todayReRegMembers.map(m => m.id));

        const todayNewCount = todayNewMembers.length;
        const todayReRegCount = todayReRegMembers.length;
        const todayRegistrationTotal = todayNewCount + todayReRegCount;

        const expiringMembersCount = uniqueMembers.filter(m => isMemberInBranch(m) && isMemberExpiring(m)).length;

        // [Unified Revenue Logic]
        const allRevenueItems = [];
        uniqueMembers.forEach(m => {
            const amt = Number(m.amount) || 0;
            if (m.regDate && amt > 0) {
                if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return;
                allRevenueItems.push({
                    id: m.id,
                    memberId: m.id,
                    date: m.regDate,
                    amount: amt,
                    name: m.name,
                    type: 'legacy'
                });
            }
        });

        enrichedSales.forEach(s => {
            if (currentBranch !== 'all') {
                const member = memberMapCache.get(s.memberId);
                const memberBranch = member?.homeBranch;
                const saleBranch = s.branchId;
                if ((saleBranch && saleBranch !== currentBranch) && (memberBranch && memberBranch !== currentBranch)) return;
                if (!saleBranch && !memberBranch) return;
            }
            if (!s.parsedDate) return;

            allRevenueItems.push({
                id: s.id,
                memberId: s.memberId,
                date: s.parsedDate,
                amount: Number(s.amount) || 0,
                name: s.memberName,
                type: s.type,
                item: s.item
            });
        });

        const memberNameMap = new Map();
        members.forEach(m => memberNameMap.set(m.name, m.id));

        const uniqueRevenueItems = [];
        const salesKeys = new Set(
            allRevenueItems
                .filter(i => i.type !== 'legacy')
                .map(i => `${i.memberId || memberNameMap.get(i.name)}-${i.date}`)
        );

        allRevenueItems.forEach(item => {
            const resolvedMemberId = item.memberId || memberNameMap.get(item.name);
            if (item.type === 'legacy') {
                const key = `${item.memberId}-${item.date}`;
                if (salesKeys.has(key)) return;
            }
            if (!item.memberId && resolvedMemberId) {
                uniqueRevenueItems.push({ ...item, memberId: resolvedMemberId });
            } else {
                uniqueRevenueItems.push(item);
            }
        });

        const todayRevenue = uniqueRevenueItems
            .filter(i => i.date === todayStr)
            .reduce((sum, item) => sum + item.amount, 0);

        const currentMonthStr = todayStr.substring(0, 7);
        const monthlyRevenue = uniqueRevenueItems
            .filter(i => i.date.startsWith(currentMonthStr))
            .reduce((sum, item) => sum + item.amount, 0);

        // [Fix] Restore Missing Variables for Push Count
        const instructorNamesWithPush = new Set();
        pushTokens.forEach(t => {
            if (t.instructorName) instructorNamesWithPush.add(t.instructorName);
        });

        const newSummary = {
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
            todayReRegMemberIds: todayReRegMembers.map(m => m.id),
            multiAttendedMemberIds,
            attendanceCountMap,
            deniedCount,
            deniedExpiredCount,
            deniedNoCreditsCount,
            installedCount: uniqueMembers.filter(m => isMemberInBranch(m) && pushTokens.some(t => t.memberId === m.id)).length,
            todayInstalledCount: uniqueMembers.filter(m => isMemberInBranch(m) && m.installedAt && toKSTDateString(m.installedAt) === todayStr).length,
            pushEnabledCount: uniqueMembers.filter(m => isMemberInBranch(m) && pushTokens.some(t => t.memberId === m.id) && m.pushEnabled !== false).length,
            instructorPushCount: instructorNamesWithPush.size,
            installRatio: activeMembers > 0 ? Math.round((uniqueMembers.filter(m => isMemberInBranch(m) && pushTokens.some(t => t.memberId === m.id)).length / activeMembers) * 100) : 0,
            reachableRatio: activeMembers > 0 ? Math.round((uniqueMembers.filter(m => isMemberInBranch(m) && pushTokens.some(t => t.memberId === m.id) && m.pushEnabled !== false).length / activeMembers) * 100) : 0
        };
        setSummary(newSummary);

        // Today's Classes Calculation
        const todayLogs = enrichedBranchLogs.filter(l => 
            l.isValidDate && l.logDate === todayStr && (currentBranch === 'all' || l.branchId === currentBranch)
        );

        const classGroups = {};

        todayLogs.forEach(log => {
            const info = guessClassInfo(log);
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
                    memberNames: []
                };
            }
            if (log.status === 'denied') {
                classGroups[key].deniedCount++;
            } else {
                classGroups[key].count++;
                if (log.memberName && (multiAttendedMemberIds.includes(log.memberId) || log.sessionCount > 1 || log.isMultiSession)) {
                    if (!classGroups[key].memberNames.includes(log.memberName)) {
                        classGroups[key].memberNames.push(log.memberName);
                    }
                }
            }
        });
        
        const newTodayClasses = Object.values(classGroups).sort((a, b) => {
            if (!a.classTime) return 1;
            if (!b.classTime) return -1;
            return b.classTime.localeCompare(a.classTime);
        });
        setTodayClasses(newTodayClasses);

        console.timeEnd('[Admin] Calculate Derived Data');

    }, [isInitialLoadDone, members, logs, sales, currentBranch, pushTokens, isMemberActive, isMemberExpiring, calculateStats]);

    const refreshData = useCallback(async () => {
        // [Legacy Support] Force full refresh
        setIsInitialLoadDone(false);
        await loadInitialData();
    }, [loadInitialData]);

    // Subscriptions
    useEffect(() => {
        loadInitialData();
        const unsubscribe = storageService.subscribe(handleDataUpdate);
        // AI Pending Approvals (New)
        const unsubPending = storageService.getPendingApprovals((items) => {
            setPendingApprovals(items);
        });

        return () => {
            unsubscribe();
            if (unsubPending) unsubPending();
        };
    }, [loadInitialData, handleDataUpdate]);

    const handleApprovePush = async (id, title) => {
        if (confirm(`'${title}' 메시지 발송을 승인하시겠습니까?`)) {
            try {
                await storageService.approvePush(id);
            } catch (e) {
                alert("승인 처리 중 오류 발생: " + e.message);
            }
        }
    };

    const handleRejectPush = async (id) => {
        if (confirm("이 발송 건을 삭제(거절)하시겠습니까?")) {
            try {
                await storageService.rejectPush(id);
            } catch (e) {
                alert("삭제 처리 중 오류 발생: " + e.message);
            }
        }
    };

    // [Feature 1] Chart Data States
    const [revenueTrend, setRevenueTrend] = useState([]);
    const [memberStatusDist, setMemberStatusDist] = useState([]);

    useEffect(() => {
        if (activeTab === 'members' && summary.activeMembers > 0) {
            loadAIInsight(members, logs, summary, todayClasses);
        }
    }, [activeTab, summary, loadAIInsight, members, logs, todayClasses]);

    // [Feature 1] Calculate Chart Data (Memoized or inside refreshData)
    const calculateChartData = useCallback((currentSales, uniqueMembers, isMemberActiveFn) => {
        // [PERF FIX] O(N^2) 병목 제거: uniqueMembers 배열 순회를 O(1) Map 검색으로 대체
        const memberMap = new Map();
        for (let i = 0; i < uniqueMembers.length; i++) {
            memberMap.set(uniqueMembers[i].id, uniqueMembers[i]);
        }

        // 1. Revenue Trend (Last 6 Months)
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
                    if (rawDate.includes('T')) {
                        // KST conversion for ISO strings
                        sMonthKey = toKSTDateString(rawDate).substring(0, 7);
                    } else {
                        sMonthKey = rawDate.substring(0, 7);
                    }

                    // [PERF FIX] array.find() -> map.get()
                    const member = memberMap.get(s.memberId);
                    const branchMatch = currentBranch === 'all' || s.branchId === currentBranch || member?.homeBranch === currentBranch;
                    
                    return sMonthKey === key && branchMatch;
                })
                .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

            trends.push({ month: `${mm}월`, amount: monthRevenue, fullKey: key });
        }
        setRevenueTrend(trends);

        // 2. Member Status Distribution
        // Active: Currently attending (Active & Attended within 14 days)
        // Dormant: Active but no attendance > 14 days
        // Expired: No credits or expired date
        let activeCount = 0;
        let dormantCount = 0;
        let expiredCount = 0;

        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(today.getDate() - 14);

        uniqueMembers.filter(m => currentBranch === 'all' || m.homeBranch === currentBranch).forEach(m => {
            const isActive = isMemberActiveFn(m);
            if (!isActive) {
                expiredCount++;
            } else {
                // Check dormancy
                let lastAttDate = m.lastAttendance ? new Date(m.lastAttendance) : null;
                // If no lastAttendance, check join date? Or assume dormant if old reg?
                // Simple logic: if Active and lastAtt < 14 days ago -> Active, else Dormant
                if (lastAttDate && lastAttDate >= twoWeeksAgo) {
                    activeCount++;
                } else if (m.regDate && new Date(m.regDate) >= twoWeeksAgo && !lastAttDate) {
                    // New member (joined < 14 days) but no attendance yet -> Treat as Active (New)
                    activeCount++;
                } else {
                    dormantCount++;
                }
            }
        });

        setMemberStatusDist([
            { name: '활동중', value: activeCount },
            { name: '주춤(잠듦)', value: dormantCount },
            { name: '만료', value: expiredCount }
        ]);

    }, [currentBranch]);

    // Hook into refreshData to trigger chart calc
    useEffect(() => {
        if (members.length > 0) {
            calculateChartData(sales, members, isMemberActive);
        }
    }, [calculateStats, members, sales, calculateChartData, isMemberActive]);


    // [Added] AI Quota Check
    const checkAIQuota = useCallback(() => {
        return aiUsage.count < aiUsage.limit;
    }, [aiUsage]);

    // [Added] Filtered Members by Branch
    const filteredMembers = members.filter(m => currentBranch === 'all' || m.homeBranch === currentBranch);

    // [Added] Dormant Segments Logic
    const getDormantSegments = useCallback((targetMembers) => {
        const nowMs = Date.now();
        const fourteenDaysMs = 1000 * 60 * 60 * 24 * 14;
        const segments = { 'all': [] };

        targetMembers.forEach(m => {
            if (!isMemberActive(m)) return;

            let lastDateMs = m.lastAttendance ? new Date(m.lastAttendance).getTime() : null;
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
    }, [isMemberActive]);

    return {
        // State
        currentBranch,
        members,
        sales,
        logs,
        notices,
        stats,
        revenueTrend,   // [New]
        memberStatusDist, // [New]
        aiInsight,
        loadingInsight,
        images,
        optimisticImages,
        todayClasses,
        pushTokens,
        aiUsage,
        pendingApprovals,
        summary,

        // Actions
        setCurrentBranch: (branch) => {
            setCurrentBranch(branch);
            storageService.setBranch(branch); // Sync with storage
        },
        setOptimisticImages, // For immediate UI updates
        refreshData,
        handleApprovePush,
        handleRejectPush,
        isMemberActive,
        checkAIQuota,
        filteredMembers,
        getDormantSegments, // [New]
        isMemberExpiring,
        todayReRegMemberIds // [New]
    };
};
