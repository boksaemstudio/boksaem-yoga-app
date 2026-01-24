import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storage';
import { STUDIO_CONFIG } from '../studioConfig';

// Helper for consistent date parsing
const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
};

export const useAdminData = (activeTab, initialBranch = 'all') => {
    const [currentBranch, setCurrentBranch] = useState(initialBranch);
    const [members, setMembers] = useState([]);
    const [sales, setSales] = useState([]);
    const [logs, setLogs] = useState([]);
    const [notices, setNotices] = useState([]);
    const [stats, setStats] = useState({ byTime: [], bySubject: [] });
    const [aiInsight, setAiInsight] = useState(null);
    const [loadingInsight, setLoadingInsight] = useState(false);
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
        todayRegistration: 0,
        totalRevenueToday: 0,
        monthlyRevenue: 0,
        expiringMembersCount: 0
    });

    // Helper: Is Member Active? (Domain Logic)
    const isMemberActive = useCallback((m) => {
        if (!m.endDate) return false;
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        return m.endDate >= todayStr && m.credits > 0;
    }, []);

    // Helper: Is Member Expiring?
    const isMemberExpiring = useCallback((m) => {
        if (!m.endDate) return false;
        const today = new Date();
        const end = new Date(m.endDate);
        const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
        const isExpiringSoon = diffDays >= 0 && diffDays <= 7;
        const isExpired = diffDays < 0 && diffDays > -30;
        const noCredits = m.credits <= 1;
        return isExpiringSoon || isExpired || noCredits;
    }, []);

    const calculateStats = useCallback((logs) => {
        const timeCount = {};
        logs.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
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
        if (loadingInsight) return;
        setLoadingInsight(true);
        try {
            const statsData = {
                activeCount: currentSummary.activeMembers,
                attendanceToday: currentSummary.todayAttendance,
                expiringCount: currentSummary.expiringMembersCount,
                topClasses: currentTodayClasses.slice(0, 3)
            };

            const aiPromise = storageService.getAIAnalysis(
                "Administrator",
                logs.length,
                logs,
                new Date().getHours(),
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
            setLoadingInsight(false);
        }
    }, [loadingInsight]);

    const refreshData = useCallback(async () => {
        const currentMembers = await storageService.loadAllMembers();
        const currentLogs = storageService.getAttendance();
        const currentNotices = storageService.getNotices();
        const currentImages = await storageService.getImages();

        try {
            const tokens = await storageService.getAllPushTokens();
            setPushTokens(tokens);
        } catch (err) {
            console.error('Failed to fetch push tokens:', err);
        }

        try {
            const usage = await storageService.getAiUsage();
            setAiUsage(usage);
        } catch (e) {
            console.warn("Failed to fetch AI usage", e);
        }

        const currentSales = await storageService.getSales();

        setMembers(currentMembers);
        setLogs(currentLogs);
        setNotices(currentNotices);
        setImages(currentImages);
        setSales(currentSales);

        // Branch Filtering for Stats
        const branchLogs = currentBranch === 'all'
            ? currentLogs
            : currentLogs.filter(l => l.branchId === currentBranch);

        calculateStats(branchLogs);

        // Stats Calculation
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const today = new Date(todayStr);
        const currentMonth = todayStr.substring(0, 7);
        const isMemberInBranch = (m) => currentBranch === 'all' || m.homeBranch === currentBranch;

        const attendedMemberIds = new Set();
        branchLogs.forEach(l => {
            if (!l.timestamp) return;
            const logDate = new Date(l.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            if (logDate === todayStr) attendedMemberIds.add(l.memberId);
        });

        const checkIsAttended = (m) => attendedMemberIds.has(m.id);
        const checkIsRegistered = (m) => m.regDate === todayStr;

        const totalMembers = currentMembers.filter(m => isMemberInBranch(m)).length;
        const activeMembers = currentMembers.filter(m => isMemberInBranch(m) && isMemberActive(m)).length;
        const todayAttendance = currentMembers.filter(m => isMemberInBranch(m) && checkIsAttended(m)).length;
        const todayRegistration = currentMembers.filter(m => isMemberInBranch(m) && checkIsRegistered(m)).length;
        const expiringMembersCount = currentMembers.filter(m => isMemberInBranch(m) && isMemberExpiring(m)).length;

        const todayRevenue = currentSales
            .filter(s => {
                const sDate = parseDate(s.timestamp);
                if (!sDate) return false;
                const sDateStr = sDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                return sDateStr === todayStr && (currentBranch === 'all' || s.branchId === currentBranch);
            })
            .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        const monthlyRevenue = currentSales
            .filter(s => {
                const sDate = parseDate(s.timestamp);
                if (!sDate) return false;
                const sDateStr = sDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                return sDateStr.startsWith(currentMonth) && (currentBranch === 'all' || s.branchId === currentBranch);
            })
            .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        const newSummary = {
            totalMembers,
            activeMembers,
            todayAttendance,
            todayRegistration,
            totalRevenueToday: todayRevenue,
            monthlyRevenue,
            expiringMembersCount
        };
        setSummary(newSummary);

        // Today's Classes Calculation
        const todayLogs = currentLogs.filter(l => {
            if (!l.timestamp) return false;
            const logDate = new Date(l.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            return logDate === todayStr && (currentBranch === 'all' || l.branchId === currentBranch);
        });

        const classGroups = {};
        todayLogs.forEach(log => {
            const key = `${log.className || '일반'}-${log.instructor || '선생님'}-${log.branchId}`;
            if (!classGroups[key]) {
                classGroups[key] = {
                    className: log.className || '일반',
                    instructor: log.instructor || '선생님',
                    branchId: log.branchId,
                    count: 0
                };
            }
            classGroups[key].count++;
        });
        const newTodayClasses = Object.values(classGroups).sort((a, b) => b.count - a.count);
        setTodayClasses(newTodayClasses);

        // Trigger AI Insight if tab matches (handled by caller effectively)
        // Returning summary for caller to decide on AI call

    }, [currentBranch, calculateStats, isMemberActive, isMemberExpiring]);

    // Subscriptions
    useEffect(() => {
        refreshData();
        const unsubscribe = storageService.subscribe(refreshData);
        // AI Pending Approvals (New)
        const unsubPending = storageService.getPendingApprovals((items) => {
            setPendingApprovals(items);
        });

        return () => {
            unsubscribe();
            if (unsubPending) unsubPending();
        };
    }, [refreshData]);

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

    // Derived Logic for Insight
    // We expose a manual trigger or effect for AI insight to avoid automatic calls on every render
    useEffect(() => {
        if (activeTab === 'members' && summary.activeMembers > 0) {
            loadAIInsight(members, logs, summary, todayClasses);
        }
    }, [activeTab, summary.activeMembers]); // Depend on stable summary stats


    return {
        // State
        currentBranch,
        members,
        sales,
        logs,
        notices,
        stats,
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
        isMemberExpiring
    };
};
