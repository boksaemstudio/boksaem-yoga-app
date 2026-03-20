import { useState, useEffect, useCallback, useRef } from 'react';
import { storageService } from '../services/storage';
import { getKSTHour } from '../utils/dates';
import { STUDIO_CONFIG } from '../studioConfig';
import { isMemberActive, isMemberExpiring, getDormantSegments, calculateDerivedData, calculateChartData } from '../utils/adminCalculations';
export const useAdminData = (activeTab, initialBranch = 'all') => {
    const [currentBranch, setCurrentBranch] = useState(initialBranch);
    const [members, setMembers] = useState([]);
    const [sales, setSales] = useState([]);
    const [logs, setLogs] = useState([]);
    const [notices, setNotices] = useState([]);
    const [stats, setStats] = useState({ byTime: [], bySubject: [] });
    const [revenueStats, setRevenueStats] = useState(null);
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

    const loadAIInsight = useCallback(async (members, logs, currentSummary, currentTodayClasses) => {
        if (loadingRef.current) return; // Check Ref
        loadingRef.current = true;      // Set Ref
        setLoadingInsight(true);
        
        try {
            let safeBranch = currentBranch;
            if (!safeBranch || safeBranch === 'undefined') safeBranch = 'all';
            
            let branchNameForPrompt = safeBranch;
            if (safeBranch !== 'all') {
                const branchObj = STUDIO_CONFIG?.BRANCHES?.find(b => b.id === safeBranch);
                if (branchObj && branchObj.name) {
                    // Remove '점' from the end if it exists, since the cloud function appends '점'
                    branchNameForPrompt = branchObj.name.replace(/점$/, '');
                }
            }

            const statsData = {
                activeCount: currentSummary.activeMembers,
                totalMembers: currentSummary.totalMembers,
                attendanceToday: currentSummary.todayAttendance,
                expiringCount: currentSummary.expiringMembersCount,
                topClasses: currentTodayClasses.slice(0, 3),
                branch: branchNameForPrompt, // [FIX] undefined점 방지 및 실제 지점명 전달
                todayRegistration: currentSummary.todayRegistration,
                newRegCount: currentSummary.todayNewCount,
                reRegCount: currentSummary.todayReRegCount,
                monthlyRevenue: currentSummary.monthlyRevenue
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
            const [currentMembers, currentImages, tokensResult, usageResult, currentSales, currentStats] = await Promise.all([
                storageService.loadAllMembers().catch(err => { console.warn("[Admin] Member load error", err); return []; }),
                Promise.resolve(storageService.getImages ? storageService.getImages() : {}).catch(() => ({})),
                storageService.getAllPushTokens().catch(err => { console.error('Failed to fetch push tokens:', err); return []; }),
                storageService.getAiUsage().catch(e => { console.warn("Failed to fetch AI usage", e); return { count: 0, limit: 2000 }; }),
                storageService.getSales().catch(err => { console.warn("[Admin] Sales load error", err); return []; }),
                storageService.getRevenueStats().catch(err => { console.warn("[Admin] Server stats load error", err); return null; })
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
            if (currentStats) setRevenueStats(currentStats);
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
            storageService.getRevenueStats().then(s => { if (s) setRevenueStats(s) });
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

        try {
            const derived = calculateDerivedData(logs, sales, members, currentBranch, pushTokens);
            setStats(derived.stats);
            setSummary(derived.summary);
            setTodayClasses(derived.todayClasses);
            setTodayReRegMemberIds(derived.todayReRegMemberIds);
        } catch (err) {
            console.error('[Admin] Error calculating derived data:', err);
        }

        console.timeEnd('[Admin] Calculate Derived Data');

    }, [isInitialLoadDone, members, logs, sales, currentBranch, pushTokens]);

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

    // Hook into refreshData to trigger chart calc
    useEffect(() => {
        if (members.length > 0) {
            const chartData = calculateChartData(sales, members, currentBranch);
            setRevenueTrend(chartData.revenueTrend);
            setMemberStatusDist(chartData.memberStatusDist);
        }
    }, [members, sales, currentBranch]);


    // [Added] AI Quota Check
    const checkAIQuota = useCallback(() => {
        return aiUsage.count < aiUsage.limit;
    }, [aiUsage]);

    // [Added] Filtered Members by Branch
    const filteredMembers = members.filter(m => currentBranch === 'all' || m.homeBranch === currentBranch);

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
        todayReRegMemberIds, // [New]
        revenueStats // [New] Server aggregated stats
    };
};
