import { useState, useEffect, useCallback, useRef } from 'react';
// [Refactor] Hook logic synchronization for dynamic config
import { storageService } from '../services/storage';
import { getTodayKST, getKSTHour, toKSTDateString, safeParseDate } from '../utils/dates';
// [Refactor] Purged static config. Logic moved to useStudioConfig context.
import { guessClassTime, guessClassInfo } from '../utils/classUtils';
import { useStudioConfig } from '../contexts/StudioContext';


export const useAdminData = (activeTab, initialBranch = 'all') => {
    const { config } = useStudioConfig();
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
        pushEnabledCount: 0,
        facialDataCount: 0,
        facialDataRatio: 0,
        bioMissingCount: 0
    });

    // Helper: Is Member Active? (Domain Logic)
    const isMemberActive = useCallback((m) => {
        if (!m) return false;
        const credits = Number(m.credits || 0);
        const hasCredits = credits > 0 || credits === Infinity;
        
        // TBD is always considered valid/infinite in membership context
        if (m.endDate === 'TBD' || m.endDate === 'unlimited') return true;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let hasValidDate = true;
        if (m.endDate) {
            const endDate = safeParseDate(m.endDate);
            if (endDate < today) hasValidDate = false;
        }
        
        return hasCredits && hasValidDate;
    }, []);

    // Helper: Is Member Expiring?
    const isMemberExpiring = useCallback((m) => {
        if (!m || !isMemberActive(m)) return false;
        if (m.endDate === 'TBD' || m.endDate === 'unlimited') return false; // Never expires
        
        const credits = Number(m.credits || 0);
        if (credits <= 2 && credits > 0) return true; // Low credits
        
        if (m.endDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endDate = safeParseDate(m.endDate);
            const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            return diffDays <= 7 && diffDays >= 0;
        }
        return false;
    }, [isMemberActive]);

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

    // [Feature 1] Chart Data States
    const [revenueTrend, setRevenueTrend] = useState([]);
    const [memberStatusDist, setMemberStatusDist] = useState([]);

    // [PERF OPTIMIZATION] O(N) single-pass chart data calculation
    const calculateChartData = useCallback((currentSales, uniqueMembers, isMemberActiveFn) => {
        if (!uniqueMembers || uniqueMembers.length === 0) return;

        const memberMap = new Map(uniqueMembers.map(m => [m.id, m]));
        
        // 1. Revenue Trend (Single Pass over Sales)
        const today = new Date();
        const monthBuckets = {};
        for (let i = 0; i < 6; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthBuckets[key] = 0;
        }

        currentSales.forEach(s => {
            const rawDate = s.date || s.timestamp;
            if (!rawDate) return;
            const sMonthKey = rawDate.includes('T') ? toKSTDateString(rawDate).substring(0, 7) : rawDate.substring(0, 7);
            
            if (monthBuckets[sMonthKey] !== undefined) {
                const member = memberMap.get(s.memberId);
                const branchMatch = currentBranch === 'all' || s.branchId === currentBranch || member?.homeBranch === currentBranch;
                if (branchMatch) {
                    monthBuckets[sMonthKey] += (Number(s.amount) || 0);
                }
            }
        });

        const trends = Object.entries(monthBuckets)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, amount]) => ({
                month: `${parseInt(key.split('-')[1], 10)}월`,
                amount,
                fullKey: key
            }));
        setRevenueTrend(trends);

        // 2. Member Status Distribution (Single Pass over Members)
        let activeCount = 0;
        let dormantCount = 0;
        let expiredCount = 0;
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - (config.POLICIES?.DORMANT_THRESHOLD_DAYS || 14));

        uniqueMembers.forEach(m => {
            const branchMatch = currentBranch === 'all' || m.homeBranch === currentBranch;
            if (!branchMatch) return;

            if (!isMemberActiveFn(m)) {
                expiredCount++;
            } else {
                const lastAttDate = m.lastAttendance ? new Date(m.lastAttendance) : null;
                if (lastAttDate && lastAttDate >= twoWeeksAgo) {
                    activeCount++;
                } else if (m.regDate && new Date(m.regDate) >= twoWeeksAgo && !lastAttDate) {
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
                topClasses: currentTodayClasses.slice(0, 5),
                facialDataCount: currentSummary.facialDataCount,
                facialDataRatio: currentSummary.facialDataRatio
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

    useEffect(() => {
        if (activeTab === 'members' && summary.activeMembers > 0) {
            loadAIInsight(members, logs, summary, todayClasses);
        }
    }, [activeTab, summary, loadAIInsight, members, logs, todayClasses]);

    // [New] Re-registration Logic State
    const [todayReRegMemberIds, setTodayReRegMemberIds] = useState([]);

    const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

    const loadInitialData = useCallback(async () => {
        if (isInitialLoadDone) return;
        console.time('[Admin] loadInitialData');
        
        // [FIX] Wait for Firebase auth to be ready before querying Firestore
        // storageService.initialize() in App.jsx is fire-and-forget, so auth may not be ready yet
        try {
            const { auth } = await import('../firebase');
            if (!auth.currentUser) {
                console.log('[Admin] Waiting for auth to be ready...');
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => { resolve(null); }, 5000); // 5s max wait
                    const unsub = auth.onAuthStateChanged((user) => {
                        clearTimeout(timeout);
                        unsub();
                        resolve(user);
                    });
                });
            }
            // Also ensure storageService.initialize has run
            await storageService.initialize({ mode: 'full' });
        } catch (authErr) {
            console.warn('[Admin] Auth wait failed:', authErr);
        }
        
        try {
            const [currentMembers, currentImages, tokensResult, usageResult, currentSales] = await Promise.all([
                storageService.loadAllMembers(true).catch(err => { console.warn("[Admin] Member load error", err); return []; }),
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

            // [FIX] Retry if members came back empty (auth/timing race condition)
            // Use getMembers() (cache from real-time listener) as fallback
            if (currentMembers.length === 0) {
                console.warn('[Admin] Members returned empty from getDocs, trying cache fallback...');
                
                // Immediate fallback: check if listener already populated cache
                const cachedMembers = storageService.getMembers();
                if (cachedMembers && cachedMembers.length > 0) {
                    console.log(`[Admin] Cache fallback success: ${cachedMembers.length} members from listener cache`);
                    setMembers(Array.from(new Map(cachedMembers.map(m => [m.id, m])).values()));
                } else {
                    // Delayed retry: wait for listener to receive data
                    setTimeout(async () => {
                        try {
                            const retryCached = storageService.getMembers();
                            if (retryCached && retryCached.length > 0) {
                                console.log(`[Admin] Delayed cache fallback success: ${retryCached.length} members`);
                                setMembers(Array.from(new Map(retryCached.map(m => [m.id, m])).values()));
                            } else {
                                // Last resort: force fetch again 
                                const retryMembers = await storageService.loadAllMembers(true);
                                if (retryMembers.length > 0) {
                                    console.log(`[Admin] Force retry success: ${retryMembers.length} members loaded`);
                                    setMembers(Array.from(new Map(retryMembers.map(m => [m.id, m])).values()));
                                }
                            }
                        } catch (e) { console.warn('[Admin] Retry member load failed', e); }
                    }, 3000);
                }
            }
        } catch (err) {
            console.error("[Admin] Initial data load failed", err);
        } finally {
            console.timeEnd('[Admin] loadInitialData');
        }
    }, [isInitialLoadDone]);

    // [Refactored] 1. Data Subscriptions - Only Updates Raw State
    // IMPORTANT: Must be defined BEFORE the useEffect that references it (TDZ fix for production builds)
    const handleDataUpdate = useCallback(async (eventType = 'general') => {
        console.log(`[Admin] Data update detected (${eventType}), syncing raw states...`);
        
        if (eventType === 'members' || eventType === 'all') {
            const mems = storageService.getMembers();
            if (mems && mems.length > 0) {
                setMembers(Array.from(new Map(mems.map(m => [m.id, { ...m }])).values()));
            }
        }
        if (eventType === 'logs' || eventType === 'all') {
            const atts = storageService.getAttendance();
            if (atts && atts.length > 0) {
                setLogs([...atts]);
            }
        }
        if (eventType === 'sales' || eventType === 'all') {
            storageService.getSales().then(s => {
                if (s && s.length > 0) setSales([...s]);
            });
        }
        if (eventType === 'images' || eventType === 'all') {
            if (storageService.getImages) {
                const updatedImgs = await storageService.getImages();
                setImages({ ...updatedImgs });
            }
        }
        if (eventType === 'notices' || eventType === 'all') {
            const nots = storageService.getNotices();
            if (nots && nots.length > 0) {
                setNotices([...nots]);
            }
        }
        // [NEW] Settings & Classes
        if (eventType === 'settings' || eventType === 'dailyClasses' || eventType === 'all') {
            refreshTodayClasses();
        }
    }, []);

    // [ROOT SOLUTION] Reactive Event Subscription (Unified GULL Pipeline)
    // 땜질식 중복 구독을 걷어내고, 단일 파이프라인으로 통합하여 레이스 컨디션 및 메모리 누수 원천 차단
    useEffect(() => {
        if (!isInitialLoadDone) return;

        console.log("[Admin] Establishing unified real-time event subscriptions...");
        
        // [GULL] 모든 핵심 이벤트를 단일 리스너에서 통합 관리
        const unsubscribe = storageService.subscribe((eventType) => {
            // console.log(`[Admin] Reactive Trigger: ${eventType}`);
            handleDataUpdate(eventType);
        }, ['members', 'logs', 'sales', 'notices', 'images', 'settings', 'dailyClasses']);

        // [FIX] Immediately sync from cache to catch events that fired before subscription was ready
        // The real-time listener may have already populated the cache during initialize(),
        // but this useEffect only runs after isInitialLoadDone=true, missing those events.
        handleDataUpdate('all');

        // [GULL] AI Pending Approvals (독립적 라이프사이클 유지하되 단일 Effect 내에서 관리)
        const unsubPending = storageService.getPendingApprovals((items) => {
            console.log('[Admin] Pending approvals updated');
            setPendingApprovals(items);
        });

        return () => {
            console.log("[Admin] Cleaning up unified subscriptions...");
            unsubscribe();
            if (unsubPending) unsubPending();
        };
    }, [isInitialLoadDone, handleDataUpdate]);

    const refreshTodayClasses = useCallback(async () => {
        const branchToFetch = currentBranch === 'all' ? 'gwangheungchang' : currentBranch;
        try {
            // [FIX] getDailyClasses internalizes 'today', so no need to pass it as instructorName
            const data = await storageService.getDailyClasses(branchToFetch);
            setTodayClasses(data || []);
        } catch (e) {
            console.warn("[Admin] Today classes fetch failed", e);
        }
    }, [currentBranch]);

    // [ROOT SOLUTION] 2. Derived State Calculation (Phase 3 Optimized)
    // 수천 건의 데이터에서도 60fps에 가까운 반응성을 위해 O(N) 단일 패스 알고리즘 적용
    useEffect(() => {
        if (!isInitialLoadDone) return;
        console.time('[Admin] Optimized Data Pass');

        const currentTodayKST = getTodayKST();
        const branchLogs = currentBranch === 'all' ? logs : logs.filter(l => l.branchId === currentBranch);
        
        // 1. Logs Single Pass (Stats, Summary, Groups)
        const attendedMemberIds = new Set();
        const attendanceCountMap = {};
        let statsState = { timeCount: {}, subjectCount: {} };
        let denied = { total: 0, expired: 0, credits: 0 };
        const classGroups = {};

        branchLogs.forEach(l => {
            const d = safeParseDate(l.timestamp);
            if (isNaN(d.getTime())) return;
            const logDate = toKSTDateString(d);
            
            // Time Stats
            const hourKey = `${d.getHours()}:00`;
            statsState.timeCount[hourKey] = (statsState.timeCount[hourKey] || 0) + 1;
            if (l.subject) statsState.subjectCount[l.subject] = (statsState.subjectCount[l.subject] || 0) + 1;

            if (logDate === currentTodayKST) {
                if (l.status === 'denied') {
                    denied.total++;
                    if (l.denialReason === 'expired') denied.expired++;
                    if (l.denialReason === 'no_credits') denied.credits++;
                } else if (l.memberId) {
                    attendedMemberIds.add(l.memberId);
                    attendanceCountMap[l.memberId] = (attendanceCountMap[l.memberId] || 0) + 1;
                    if (l.facialMatched) {
                        statsState.todayFacialMatchCount = (statsState.todayFacialMatchCount || 0) + 1;
                    }
                }

                // Class Grouping
                const info = guessClassInfo(l, config.DEFAULT_SCHEDULE_TEMPLATE);
                const classTime = info?.startTime || '00:00';
                const cName = info?.className || l.className || '일반';
                const inst = info?.instructor || l.instructor || '선생님';
                const gKey = `${cName}-${inst}-${l.branchId}-${classTime}`;
                
                if (!classGroups[gKey]) {
                    classGroups[gKey] = { className: cName, instructor: inst, branchId: l.branchId, classTime, count: 0, deniedCount: 0, memberNames: [] };
                }
                if (l.status === 'denied') classGroups[gKey].deniedCount++;
                else {
                    classGroups[gKey].count++;
                    if (l.memberName && (attendanceCountMap[l.memberId] >= 2 || l.sessionCount > 1)) {
                        if (!classGroups[gKey].memberNames.includes(l.memberName)) classGroups[gKey].memberNames.push(l.memberName);
                    }
                }
            }
        });

        // 2. Members & Sales Processing (Revenue & Status)
        const memberMap = new Map(members.map(m => [m.id, m]));
        const todayRevenue = { total: 0, monthly: 0 };
        const currentMonthStr = currentTodayKST.substring(0, 7);
        const todaySalesMemberIds = new Set();

        sales.forEach(s => {
            const rawDate = s.date || s.timestamp;
            let sDate = toKSTDateString(rawDate);
            if (!sDate) return;

            const member = memberMap.get(s.memberId);
            const branchMatch = currentBranch === 'all' || s.branchId === currentBranch || member?.homeBranch === currentBranch;
            if (!branchMatch) return;

            const amt = Number(s.amount) || 0;
            if (sDate === currentTodayKST) {
                todayRevenue.total += amt;
                todaySalesMemberIds.add(s.memberId);
            }
            if (sDate.startsWith(currentMonthStr)) todayRevenue.monthly += amt;
        });

        // Combined Summary Update
        const activeInBranch = members.filter(m => currentBranch === 'all' || m.homeBranch === currentBranch);
        const expiringInBranch = activeInBranch.filter(isMemberExpiring);
        const instructorNamesWithPush = new Set(pushTokens.filter(t => t.instructorName).map(t => t.instructorName));

        setStats({
            byTime: Object.entries(statsState.timeCount).sort((a, b) => b[1] - a[1]),
            bySubject: Object.entries(statsState.subjectCount).sort((a, b) => b[1] - a[1])
        });

        setSummary({
            totalMembers: activeInBranch.length,
            activeMembers: activeInBranch.filter(isMemberActive).length,
            todayAttendance: attendedMemberIds.size,
            totalRevenueToday: todayRevenue.total,
            monthlyRevenue: todayRevenue.monthly,
            expiringMembersCount: expiringInBranch.length,
            deniedCount: denied.total,
            deniedExpiredCount: denied.expired,
            deniedNoCreditsCount: denied.credits,
            installedCount: activeInBranch.filter(m => pushTokens.some(t => t.memberId === m.id)).length,
            pushEnabledCount: activeInBranch.filter(m => pushTokens.some(t => t.memberId === m.id) && m.pushEnabled !== false).length,
            instructorPushCount: instructorNamesWithPush.size,
            facialDataCount: activeInBranch.filter(m => m.hasFaceDescriptor).length,
            facialDataRatio: activeInBranch.length > 0 ? Math.round((activeInBranch.filter(m => m.hasFaceDescriptor).length / activeInBranch.length) * 100) : 0,
            bioMissingCount: activeInBranch.filter(m => !m.hasFaceDescriptor).length,
            todayFacialMatchCount: statsState.todayFacialMatchCount || 0,
            todayFacialRatio: attendedMemberIds.size > 0 ? Math.round(((statsState.todayFacialMatchCount || 0) / attendedMemberIds.size) * 100) : 0
        });

        setTodayClasses(Object.values(classGroups).sort((a, b) => b.classTime.localeCompare(a.classTime)));
        setTodayReRegMemberIds(activeInBranch.filter(m => todaySalesMemberIds.has(m.id) && m.regDate !== currentTodayKST).map(m => m.id));

        // [FIX] Call missing stats algorithms so StatsTab has correctly formatted arrays instead of `{}`.
        calculateStats(branchLogs);
        calculateChartData(sales, activeInBranch, isMemberActive);

        console.timeEnd('[Admin] Optimized Data Pass');
    }, [isInitialLoadDone, members, logs, sales, currentBranch, pushTokens, isMemberActive, isMemberExpiring, calculateStats, calculateChartData]);

    const refreshData = useCallback(async () => {
        // [Legacy Support] Force full refresh
        setIsInitialLoadDone(false);
        await loadInitialData();
    }, [loadInitialData]);

    // [GULL] Subscriptions (Unified baseline subscriptions - handled in the GULL pipeline above)
    // Legacy subscription logic removed to prevent double-firing and memory leaks.


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

    // Hook into refreshData to trigger chart calc
    useEffect(() => {
        if (members.length > 0) {
            calculateChartData(sales, members, isMemberActive);
        }
    }, [members, sales, calculateChartData, isMemberActive]);


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
