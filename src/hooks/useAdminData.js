import { useState, useEffect, useCallback, useRef } from 'react';
import { storageService } from '../services/storage';
import { getKSTHour } from '../utils/dates';
import { STUDIO_CONFIG } from '../studioConfig';
import { isMemberActive, isMemberExpiring, getDormantSegments, calculateDerivedData, calculateChartData } from '../utils/adminCalculations';
import { useLanguageStore } from '../stores/useLanguageStore';

// [i18n] AI briefing prompts per language
const getAIBriefingGuidance = lang => {
  const guidances = {
    ko: `당신은 최고의 요가 스튜디오 경영 컨설턴트입니다. 원장에게 종합적인 경영 브리핑을 제공하세요.
다음 영역을 모두 커버해주세요:
1. 📊 매출 분석: 월간 매출 현황, 일매출 추이, 전월 대비 변화
2. 👥 회원 관리: 활성/총 회원 비율, 신규 등록 vs 재등록, 만료 임박 회원 관리 전략
3. 🔄 재등록률 심층 분석: 누적 재등록률과 최근 3개월 재등록률 비교, 월별 트렌드 해석, 재등록률 개선 전략
4. ⚠️ 이탈 방지: 만료/거부 회원 현황, 선제적 리텐션 전략
5. 👩‍🏫 강사 평가 및 인사 관련: 강사별 수업 참여도 분석, 인기 강사와 관심이 필요한 강사 파악, 수업 편성 최적화 제안
6. 📱 디지털 전환: 앱 설치율과 푸시 도달률 분석, 디지털 마케팅 기회
7. 🔮 미래 전망: 현재 추세 기반 다음 달 예측, 계절적 요인 고려, 선제적 대응 전략

톤: 전문적이면서도 실행 가능한 조언 위주. 숫자와 근거를 들어 설명. 4~6단락으로 구성.
절대로 데이터가 없는 영역을 꾸며내지 마세요. 실제 데이터 기반으로만 분석하세요.`,
    en: `You are a top-tier yoga/fitness studio management consultant. Provide a comprehensive business briefing to the studio owner.
Cover these areas:
1. 📊 Revenue Analysis: Monthly revenue status, daily trends, month-over-month changes
2. 👥 Member Management: Active/total ratio, new vs returning members, expiring membership strategy
3. 🔄 Re-enrollment Analysis: Cumulative vs recent 3-month re-enrollment rates, monthly trends
4. ⚠️ Churn Prevention: Expired/denied members, proactive retention strategies
5. 👩‍🏫 Instructor Evaluation: Class attendance by instructor, popular vs underperforming instructors
6. 📱 Digital Adoption: App install rate, push notification reach analysis
7. 🔮 Future Outlook: Next month forecast based on current trends, seasonal factors

Tone: Professional yet actionable. Use data and figures. 4-6 paragraphs.
Never fabricate data. Only analyze based on actual provided data.`,
    ja: `あなたはトップレベルのヨガ/フィットネススタジオ経営コンサルタントです。オーナーに総合的な経営ブリーフィングを提供してください。
以下の領域をカバーしてください：
1. 📊 売上分析：月間売上状況、日別推移、前月比
2. 👥 会員管理：アクティブ/全体比率、新規vs再登録、期限切れ会員対策
3. 🔄 再登録率分析：累計vs直近3ヶ月の再登録率、月別トレンド
4. ⚠️ 離脱防止：期限切れ/拒否会員の現状、先制的リテンション戦略
5. 👩‍🏫 講師評価：講師別クラス参加度、人気講師と要注意講師の把握
6. 📱 デジタル推進：アプリ導入率、プッシュ到達率分析
7. 🔮 将来展望：現在のトレンドに基づく来月予測

トーン：プロフェッショナルかつ実行可能なアドバイス中心。データと根拠を示す。4〜6段落構成。
データがない領域を作り上げないでください。実際のデータのみで分析してください。`
  };
  // For languages without a specific prompt, use English
  return guidances[lang] || guidances['en'];
};

// [i18n] Time context descriptions per language
const getTimeContextByLang = (hour, classStartHour, lang, t) => {
  if (lang === 'ko') {
    if (hour < classStartHour) return {
      period: t("g_d33888") || "\uC218\uC5C5 \uC804 (\uC544\uCE68)",
      guidance: `아직 수업이 시작되지 않은 아침입니다(오늘 첫 수업은 ${classStartHour}시부터 시작). 오늘의 매출이나 출석이 0인 것은 당연하므로 절대 언급하지 마세요. 대신 어제의 성과를 간략히 요약하고, 오늘 예정된 수업과 주요 일정을 안내해주세요.`
    };
    if (hour < 14) return {
      period: t("g_e70620") || "\uC624\uC804 \uC218\uC5C5 \uC911",
      guidance: `오전 수업이 진행 중입니다(오늘 첫 수업 ${classStartHour}시). 현재까지의 출석 현황과 오후 예정 수업을 분석해주세요.`
    };
    if (hour < 20) return {
      period: t("g_4054b9") || "\uC624\uD6C4 \uC218\uC5C5 \uC911",
      guidance: t("g_42aed9") || "\uC624\uD6C4 \uD53C\uD06C \uC2DC\uAC04\uB300\uC785\uB2C8\uB2E4. \uD604\uC7AC\uAE4C\uC9C0\uC758 \uC2E4\uC2DC\uAC04 \uCD9C\uC11D \uD604\uD669, \uB0A8\uC740 \uC218\uC5C5, \uC624\uB298\uC758 \uD2B8\uB80C\uB4DC\uB97C \uBD84\uC11D\uD574\uC8FC\uC138\uC694."
    };
    return {
      period: t("g_e29fcb") || "\uB9C8\uAC10 \uD6C4 (\uC800\uB141)",
      guidance: t("g_1f3eec") || "\uC624\uB298\uC758 \uC218\uC5C5\uC774 \uB9C8\uBB34\uB9AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uD558\uB8E8 \uC804\uCCB4 \uC131\uACFC\uB97C \uC885\uD569 \uB9AC\uD3EC\uD2B8 \uD615\uD0DC\uB85C \uC815\uB9AC\uD574\uC8FC\uC138\uC694."
    };
  }
  if (lang === 'ja') {
    if (hour < classStartHour) return {
      period: '授業前（朝）',
      guidance: `まだ授業が始まっていない朝です（本日の最初の授業は${classStartHour}時から）。売上や出席が0なのは当然のため言及しないでください。昨日の成果を簡潔にまとめ、本日の予定をお知らせください。`
    };
    if (hour < 14) return {
      period: '午前の授業中',
      guidance: `午前の授業が進行中です。現在までの出席状況と午後の予定を分析してください。`
    };
    if (hour < 20) return {
      period: '午後の授業中',
      guidance: '午後のピーク時間帯です。リアルタイムの出席状況と今日のトレンドを分析してください。'
    };
    return {
      period: '終了後（夜）',
      guidance: '本日の授業は終了しました。一日の総合レポートをまとめてください。'
    };
  }
  // Default: English (used for en + all other languages)
  if (hour < classStartHour) return {
    period: 'Before Classes (Morning)',
    guidance: `Classes haven't started yet (first class at ${classStartHour}:00). Don't mention zero revenue or attendance. Summarize yesterday's results and today's schedule.`
  };
  if (hour < 14) return {
    period: 'Morning Classes',
    guidance: `Morning classes are underway (first class at ${classStartHour}:00). Analyze attendance so far and upcoming afternoon classes.`
  };
  if (hour < 20) return {
    period: 'Afternoon Classes',
    guidance: 'Peak afternoon hours. Analyze real-time attendance, remaining classes, and today\'s trends.'
  };
  return {
    period: 'After Hours (Evening)',
    guidance: 'Today\'s classes are complete. Compile a comprehensive daily performance report.'
  };
};

// [i18n] Fallback message per language
const getFallbackMessage = (lang, activeMembers, todayAttendance) => {
  const msgs = {
    ko: `현재 ${activeMembers}명의 회원이 활동 중이며, 오늘 ${todayAttendance}명이 출석했습니다. 안정적인 센터 운영이 이어지고 있습니다.`,
    en: `Currently ${activeMembers} active members, with ${todayAttendance} check-ins today. Studio operations are running smoothly.`,
    ja: `現在${activeMembers}名の会員がアクティブで、本日${todayAttendance}名がチェックインしました。スタジオは安定して運営されています。`,
    zh: `当前有${activeMembers}名活跃会员，今天${todayAttendance}人已签到。工作室运营稳定。`,
    ru: `В настоящее время ${activeMembers} активных участников, сегодня ${todayAttendance} отметок. Студия работает стабильно.`,
    es: `Actualmente ${activeMembers} miembros activos, con ${todayAttendance} registros hoy. El estudio opera con normalidad.`,
    pt: `Atualmente ${activeMembers} membros ativos, com ${todayAttendance} check-ins hoje. O estúdio opera normalmente.`,
    fr: `Actuellement ${activeMembers} membres actifs, avec ${todayAttendance} enregistrements aujourd'hui. Le studio fonctionne bien.`,
    de: `Derzeit ${activeMembers} aktive Mitglieder, mit ${todayAttendance} Check-ins heute. Das Studio läuft stabil.`
  };
  return msgs[lang] || msgs['en'];
};
export const useAdminData = (activeTab, initialBranch = 'all') => {
  const t = useLanguageStore(s => s.t);
  const [currentBranch, setCurrentBranch] = useState(initialBranch);
  const [members, setMembers] = useState([]);
  const [sales, setSales] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notices, setNotices] = useState([]);
  const [stats, setStats] = useState({
    byTime: [],
    bySubject: []
  });
  const [revenueStats, setRevenueStats] = useState(null);
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const loadingRef = useRef(false); // [FIX] Use Ref to prevent dependency loop
  const [images, setImages] = useState({});
  const [optimisticImages, setOptimisticImages] = useState({});
  const [todayClasses, setTodayClasses] = useState([]);
  const [pushTokens, setPushTokens] = useState([]);
  const [aiUsage, setAiUsage] = useState({
    count: 0,
    limit: 2000
  });
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
    loadingRef.current = true; // Set Ref
    setLoadingInsight(true);
    const currentHourNow = getKSTHour();
    const todayStr = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul'
    });
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
          const isStale = cachedActive === 0 && currentActive > 0 || currentActive > 0 && Math.abs(cachedActive - currentActive) / currentActive > 0.5;
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

      // [FIX] 시간표에서 첫 수업 시작 시간 동적 추출 (하드코딩 제거)
      const getFirstClassHour = classes => {
        if (!classes || classes.length === 0) return 10; // 시간표 없을 때 기본값
        const hours = classes.map(c => c.classTime).filter(Boolean).map(item => parseInt(item.split(':')[0], 10)).filter(h => !isNaN(h));
        return hours.length > 0 ? Math.min(...hours) : 10;
      };
      const firstClassHour = getFirstClassHour(currentTodayClasses);

      // [NEW] Time-aware context for AI briefing (시간표 기반 동적 판단)
      // [i18n] Use language-aware time context
      const currentLang = useLanguageStore.getState().language || 'ko';
      const timeCtx = getTimeContextByLang(currentHour, firstClassHour, currentLang, t);
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
        // ── 재등록률 (회원 수 기준 — 유일한 소스: adminCalculations.ts) ──
        // ※ 서버 revenue_summary.monthly.reReg는 금액 기반이므로 별개의 지표입니다.
        reRegistrationRate: currentSummary.reRegistrationRate || 0,
        // 누적 재등록률 (%)
        recentReRegRate: currentSummary.recentReRegRate || 0,
        // 최근 3개월 재등록률 (%)
        recentExpiredCount: currentSummary.recentExpiredCount || 0,
        recentReRegisteredCount: currentSummary.recentReRegisteredCount || 0,
        membersWithSales: currentSummary.membersWithSales || 0,
        membersReRegistered: currentSummary.membersReRegistered || 0,
        monthlyReRegTrend: (currentSummary.monthlyReRegTrend || []).map(item => ({
          month: item.month,
          monthKey: item.monthKey,
          total: item.total,
          reReg: item.reReg,
          rate: item.rate
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
            const name = cls.instructor || t("g_4477e5") || "\uBBF8\uC9C0\uC815";
            if (!instructorMap[name]) instructorMap[name] = {
              totalStudents: 0,
              classCount: 0,
              classes: []
            };
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
        firstClassHour,
        timeContext: timeCtx.period,
        timeGuidance: timeCtx.guidance,
        // ── AI 브리핑 가이드 ──
        briefingGuidance: getAIBriefingGuidance(currentLang)
      };
      const aiPromise = storageService.getAIAnalysis("Administrator", logs.length, logs, getKSTHour(), currentLang, 'admin', statsData, 'admin');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("AI Analysis Timeout")), 30000));
      const insight = await Promise.race([aiPromise, timeoutPromise]);
      if (insight) {
        setAiInsight(insight);
        // 하루 캐시 저장 (다음 접속 시 즉시 로드)
        if (!insight.isFallback) {
          try {
            localStorage.setItem(dailyCacheKey, JSON.stringify({
              ...insight,
              _cachedActiveMembers: currentSummary.activeMembers
            }));
          } catch {}
        }
      }
    } catch (err) {
      console.warn("[AI] Admin Insight failed or timed out. Using fallback summary.", err);
      const fallbackLang = useLanguageStore.getState().language || 'ko';
      const fallbackMsg = getFallbackMessage(fallbackLang, currentSummary.activeMembers, currentSummary.todayAttendance);
      setAiInsight({
        message: fallbackMsg,
        isFallback: true
      });
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
      const [currentMembers, currentImages, tokensResult, usageResult, currentSales, currentStats] = await Promise.all([storageService.loadAllMembers().catch(err => {
        console.warn("[Admin] Member load error", err);
        return [];
      }), Promise.resolve(storageService.getImages ? storageService.getImages() : {}).catch(() => ({})), storageService.getAllPushTokens().catch(err => {
        console.error('Failed to fetch push tokens:', err);
        return [];
      }), storageService.getAiUsage().catch(e => {
        console.warn("Failed to fetch AI usage", e);
        return {
          count: 0,
          limit: 2000
        };
      }), storageService.getSales().catch(err => {
        console.warn("[Admin] Sales load error", err);
        return [];
      }), storageService.getRevenueStats().catch(err => {
        console.warn("[Admin] Server stats load error", err);
        return null;
      })]);
      const currentLogs = storageService.getAttendance();
      const currentNotices = storageService.getNotices();
      setMembers(Array.from(new Map(currentMembers.map(m => [m.id, m])).values()));
      setPushTokens(tokensResult);
      setAiUsage(usageResult);
      setLogs([...currentLogs]);
      setNotices([...currentNotices]);
      setImages({
        ...currentImages
      });
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
      setMembers(Array.from(new Map(storageService.getMembers().map(m => [m.id, {
        ...m
      }])).values()));
    }
    if (eventType === 'logs' || eventType === 'general' || eventType === 'all') {
      setLogs([...storageService.getAttendance()]);
    }
    if (eventType === 'sales' || eventType === 'general' || eventType === 'all') {
      storageService.getSales().then(s => setSales([...s]));
      storageService.getRevenueStats().then(s => {
        if (s) setRevenueStats(s);
      });
    }
    if (eventType === 'images' || eventType === 'general' || eventType === 'all') {
      if (storageService.getImages) setImages({
        ...storageService.getImages()
      });
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
    const unsubPending = storageService.getPendingApprovals(items => {
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
        alert((t("g_dcd19b") || "\uC2B9\uC778 \uCC98\uB9AC \uC911 \uC624\uB958 \uBC1C\uC0DD: ") + e.message);
      }
    }
  };
  const handleRejectPush = async id => {
    if (confirm(t("g_ffc381") || "\uC774 \uBC1C\uC1A1 \uAC74\uC744 \uC0AD\uC81C(\uAC70\uC808)\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) {
      try {
        await storageService.rejectPush(id);
      } catch (e) {
        alert((t("g_cb1fb3") || "\uC0AD\uC81C \uCC98\uB9AC \uC911 \uC624\uB958 \uBC1C\uC0DD: ") + e.message);
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
    revenueTrend,
    // [New]
    memberStatusDist,
    // [New]
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
    setCurrentBranch: branch => {
      setCurrentBranch(branch);
      storageService.setBranch(branch); // Sync with storage
    },
    setOptimisticImages,
    // For immediate UI updates
    refreshData,
    handleApprovePush,
    handleRejectPush,
    isMemberActive,
    checkAIQuota,
    filteredMembers,
    getDormantSegments,
    // [New]
    isMemberExpiring,
    todayReRegMemberIds,
    // [New]
    revenueStats // [New] Server aggregated stats
  };
};