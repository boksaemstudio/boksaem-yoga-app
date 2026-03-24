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

        const currentHourNow = getKSTHour();
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const dailyCacheKey = `ai_admin_briefing_${todayStr}`;

        // 하루 1회 마감 시간(20시 이후) 전략: 캐시가 있으면 그대로 사용
        const cachedBriefing = localStorage.getItem(dailyCacheKey);
        if (cachedBriefing) {
            try {
                const parsed = JSON.parse(cachedBriefing);
                if (parsed && parsed.message && !parsed.isFallback) {
                    // [FIX] 캐시된 activeMembers와 현재 값 비교 — 큰 차이가 있으면 캐시 무효화
                    const cachedActive = parsed._cachedActiveMembers ?? -1;
                    const currentActive = currentSummary.activeMembers || 0;
                    const isStale = (cachedActive === 0 && currentActive > 0) || 
                                    (currentActive > 0 && Math.abs(cachedActive - currentActive) / currentActive > 0.5);
                    if (!isStale) {
                        setAiInsight(parsed);
                        loadingRef.current = false;
                        setLoadingInsight(false);
                        return;
                    }
                    console.log(`[AI] Cache invalidated: cached activeMembers=${cachedActive}, current=${currentActive}`);
                }
            } catch {} // 파싱 실패 시 새로 생성
        }
        
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

            const currentHour = getKSTHour();
            
            // [NEW] Time-aware context for AI briefing
            const getTimeContext = (hour) => {
                if (hour < 9) return { period: '수업 전 (아침)', guidance: '아직 수업이 시작되지 않은 이른 아침입니다. 오늘의 매출이나 출석이 0인 것은 당연하므로 절대 언급하지 마세요. 대신 어제의 성과를 간략히 요약하고, 오늘 예정된 수업과 주요 일정을 안내해주세요. 긍정적이고 활기찬 톤으로 하루를 시작할 수 있게 해주세요.' };
                if (hour < 14) return { period: '오전 수업 중', guidance: '오전 수업이 진행 중입니다. 현재까지의 출석 현황과 오후 예정 수업을 분석해주세요. 매출이 적더라도 아직 오전이므로 부정적으로 언급하지 마세요.' };
                if (hour < 20) return { period: '오후 수업 중', guidance: '오후 피크 시간대입니다. 현재까지의 실시간 출석 현황, 남은 수업, 오늘의 트렌드를 분석해주세요.' };
                return { period: '마감 후 (저녁)', guidance: '오늘의 수업이 마무리되었습니다. 하루 전체 성과(출석, 매출, 신규 등록 등)를 종합 리포트 형태로 정리해주세요.' };
            };

            const timeCtx = getTimeContext(currentHour);

            const statsData = {
                // ── 기본 현황 ──
                branch: branchNameForPrompt,
                activeCount: currentSummary.activeMembers,
                totalMembers: currentSummary.totalMembers,
                attendanceToday: currentSummary.todayAttendance,
                totalAttendanceToday: currentSummary.totalAttendanceToday,

                // ── 등록 현황 ──
                todayRegistration: currentSummary.todayRegistration,
                newRegCount: currentSummary.todayNewCount,
                reRegCount: currentSummary.todayReRegCount,

                // ── 매출 분석 ──
                monthlyRevenue: currentSummary.monthlyRevenue,
                todayRevenue: currentSummary.totalRevenueToday,

                // ── 재등록률 (경영 핵심 지표) ──
                reRegistrationRate: currentSummary.reRegistrationRate || 0,
                recentReRegRate: currentSummary.recentReRegRate || 0,
                recentExpiredCount: currentSummary.recentExpiredCount || 0,
                recentReRegisteredCount: currentSummary.recentReRegisteredCount || 0,
                membersWithSales: currentSummary.membersWithSales || 0,
                membersReRegistered: currentSummary.membersReRegistered || 0,
                monthlyReRegTrend: (currentSummary.monthlyReRegTrend || []).map(t => ({
                    month: t.month, total: t.total, reReg: t.reReg, rate: t.rate
                })),

                // ── 이탈/위험 지표 ──
                expiringCount: currentSummary.expiringMembersCount,
                deniedCount: currentSummary.deniedCount || 0,
                deniedExpiredCount: currentSummary.deniedExpiredCount || 0,
                deniedNoCreditsCount: currentSummary.deniedNoCreditsCount || 0,

                // ── 앱 설치 / 도달률 ──
                installedCount: currentSummary.installedCount || 0,
                pushEnabledCount: currentSummary.pushEnabledCount || 0,
                installRatio: currentSummary.installRatio || 0,
                reachableRatio: currentSummary.reachableRatio || 0,

                // ── 강사별 출석 분석 (인사 평가 참고) ──
                instructorStats: (() => {
                    const instructorMap = {};
                    (currentTodayClasses || []).forEach(cls => {
                        const name = cls.instructor || '미지정';
                        if (!instructorMap[name]) instructorMap[name] = { totalStudents: 0, classCount: 0, classes: [] };
                        instructorMap[name].totalStudents += cls.count || 0;
                        instructorMap[name].classCount += 1;
                        instructorMap[name].classes.push({
                            className: cls.className,
                            time: cls.classTime,
                            students: cls.count || 0
                        });
                    });
                    return Object.entries(instructorMap).map(([name, data]) => ({
                        name,
                        totalStudents: data.totalStudents,
                        classCount: data.classCount,
                        avgStudents: data.classCount > 0 ? Math.round(data.totalStudents / data.classCount * 10) / 10 : 0,
                        classes: data.classes
                    })).sort((a, b) => b.totalStudents - a.totalStudents);
                })(),

                // ── 오늘 수업 현황 (상위 5개) ──
                topClasses: currentTodayClasses.slice(0, 5).map(c => ({
                    className: c.className,
                    instructor: c.instructor,
                    time: c.classTime,
                    students: c.count,
                    branch: c.branchId
                })),

                // ── 시간대 컨텍스트 ──
                currentHour,
                timeContext: timeCtx.period,
                timeGuidance: timeCtx.guidance,

                // ── AI 브리핑 가이드 ──
                briefingGuidance: `당신은 최고의 요가 스튜디오 경영 컨설턴트입니다. 원장에게 종합적인 경영 브리핑을 제공하세요.
다음 영역을 모두 커버해주세요:

1. 📊 매출 분석: 월간 매출 현황, 일매출 추이, 전월 대비 변화
2. 👥 회원 관리: 활성/총 회원 비율, 신규 등록 vs 재등록, 만료 임박 회원 관리 전략
3. 🔄 재등록률 심층 분석: 누적 재등록률과 최근 3개월 재등록률 비교, 월별 트렌드 해석, 재등록률 개선 전략
4. ⚠️ 이탈 방지: 만료/거부 회원 현황, 선제적 리텐션 전략
5. 👩‍🏫 강사 평가 및 인사 관련: 강사별 수업 참여도 분석, 인기 강사와 관심이 필요한 강사 파악, 수업 편성 최적화 제안
6. 📱 디지털 전환: 앱 설치율과 푸시 도달률 분석, 디지털 마케팅 기회
7. 🔮 미래 전망: 현재 추세 기반 다음 달 예측, 계절적 요인 고려, 선제적 대응 전략

톤: 전문적이면서도 실행 가능한 조언 위주. 숫자와 근거를 들어 설명. 4~6단락으로 구성.
절대로 데이터가 없는 영역을 꾸며내지 마세요. 실제 데이터 기반으로만 분석하세요.`
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
                setTimeout(() => reject(new Error("AI Analysis Timeout")), 30000)
            );

            const insight = await Promise.race([aiPromise, timeoutPromise]);
            if (insight) {
                setAiInsight(insight);
                // 하루 캐시 저장 (다음 접속 시 즉시 로드)
                if (!insight.isFallback) {
                    try { localStorage.setItem(dailyCacheKey, JSON.stringify({ ...insight, _cachedActiveMembers: currentSummary.activeMembers })); } catch {}
                }
            }
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
