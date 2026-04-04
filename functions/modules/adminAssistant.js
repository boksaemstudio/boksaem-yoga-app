/**
 * Admin AI Assistant Module
 * 관리자 AI 비서 — 자연어 질문에 스튜디오 실데이터 기반 답변
 * 
 * [v2] 모든 DB 데이터에 접근 가능 (읽기 전용)
 * - 회원: 이름, 전화번호, 메모, 종목, 이용권 등 모든 필드 검색
 * - 출석, 매출, 스케줄, 예약 데이터 항상 수집
 * 
 * @module modules/adminAssistant
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, tenantDb, getAI, checkAIQuota, getKSTDateString } = require("../helpers/common");
const { requireAdmin } = require("../helpers/authGuard");

const DAILY_ASSISTANT_LIMIT = 50;

/**
 * AI 비서 일일 호출 한도 체크 (별도 quota)
 */
async function checkAssistantQuota(studioId) {
    const today = getKSTDateString();
    const tdb = tenantDb(studioId);
    const quotaRef = tdb.collection('ai_quota').doc(`assistant_${today}`);
    const snap = await quotaRef.get();
    const current = snap.exists ? snap.data().count || 0 : 0;
    if (current >= DAILY_ASSISTANT_LIMIT) {
        throw new HttpsError('resource-exhausted', `AI 비서 일일 한도 초과 (${current}/${DAILY_ASSISTANT_LIMIT})`);
    }
    await quotaRef.set({ count: admin.firestore.FieldValue.increment(1), lastUpdated: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { used: current + 1, limit: DAILY_ASSISTANT_LIMIT };
}

// ═══ 검색 헬퍼 ═══

/**
 * 질문에서 검색 키워드 추출 — 이름, 전화번호, 종목 등
 */
function extractSearchTerms(question) {
    const terms = [];
    // 무시할 일반 단어
    const STOP_WORDS = [
        '오늘', '어제', '이번', '지난', '다음', '매출', '출석', '스케줄',
        '회원', '전체', '다시', '알려', '보여', '분석', '현황', '정보',
        '검색', '누구', '얼마', '언제', '어떻', '어디', '요가', '필라',
        '스튜디오', '선생님', '원장', '수업', '시간', '이달', '저번',
        '만료', '임박', '잔여', '횟수', '등록', '연장', '결제', '카드',
        '현금', '이체', '환불', '취소', '비서', '데이터'
    ];

    // 한국 이름 패턴 (2-4자 한글)
    const namePatterns = question.match(/([가-힣]{2,4})\s*(회원|님|씨|선생|고객|연락처|전화|번호|정보)?/g);
    if (namePatterns) {
        namePatterns.forEach(p => {
            const name = p.replace(/(회원|님|씨|선생|고객|연락처|전화|번호|정보)/g, '').trim();
            if (name.length >= 2 && !STOP_WORDS.includes(name)) {
                terms.push(name);
            }
        });
    }

    // 전화번호 전체 패턴 (010-1234-5678, 01012345678 등)
    const fullPhone = question.match(/0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g);
    if (fullPhone) terms.push(...fullPhone.map(p => p.replace(/[-\s]/g, '')));

    // 전화번호 뒷자리 (4자리 숫자 + 관련 키워드)
    const last4Match = question.match(/(\d{4})\s*(번호|전화|폰|핸드폰|휴대|뒷자리|번$)/);
    if (last4Match) terms.push(last4Match[1]);
    const last4Reverse = question.match(/(번호|전화|폰|핸드폰|휴대|뒷자리)\s*(\d{4})/);
    if (last4Reverse) terms.push(last4Reverse[2]);

    return [...new Set(terms)];
}

/**
 * 회원 전체 정보 포맷 (검색 결과용 — 마스킹 없음)
 */
function formatMemberFull(m) {
    return {
        name: m.name || '',
        phone: m.phone || '',
        membershipType: m.membershipType || '',
        subject: m.subject || '',
        credits: m.credits ?? 0,
        startDate: m.startDate || '',
        endDate: m.endDate || '',
        regDate: m.regDate || '',
        attendanceCount: m.attendanceCount || 0,
        lastAttendance: m.lastAttendance || '',
        homeBranch: m.homeBranch || '',
        notes: m.notes || '',
        memo: m.memo || '',
        hasFaceDescriptor: !!m.hasFaceDescriptor,
        price: m.price || m.amount || '',
        paymentMethod: m.paymentMethod || '',
        createdAt: m.createdAt || '',
        pushEnabled: !!m.pushEnabled,
        upcomingMembership: m.upcomingMembership || null
    };
}

/**
 * 회원 요약 정보 포맷 (전체 리스트용)
 */
function formatMemberSummary(m) {
    return {
        name: m.name || '',
        phone: m.phone || (m.phoneNumber ? m.phoneNumber : ''),
        credits: m.credits ?? 0,
        endDate: m.endDate || '',
        regDate: m.regDate || '',
        membershipType: m.membershipType || '',
        subject: m.subject || '',
        attendanceCount: m.attendanceCount || 0,
        lastAttendance: m.lastAttendance || '',
        notes: m.notes || ''
    };
}

/**
 * 스튜디오 전체 데이터 수집 — 모든 DB 컬렉션에서 읽기 전용 수집
 */
async function collectStudioData(question, studioId) {
    const tdb = tenantDb(studioId);
    const today = getKSTDateString();
    const data = { _collectedAt: today };

    // ═══ 1. 전체 회원 데이터 (항상 수집) ═══
    let allMembers = [];
    try {
        const membersSnap = await tdb.collection('members').get();
        allMembers = membersSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(m => !m.deleted && !m.deletedAt);

        const activeMembers = allMembers.filter(m => {
            const credits = Number(m.credits || 0);
            if (credits <= 0) return false;
            if (m.endDate) {
                const end = new Date(m.endDate);
                return end >= new Date(today);
            }
            return credits > 0;
        });

        // 기본 통계
        data.totalMembers = allMembers.length;
        data.activeMembers = activeMembers.length;
        data.expiredMembers = allMembers.length - activeMembers.length;

        // 종목별/이용권별 분포
        const subjectDist = {};
        const typeDist = {};
        allMembers.forEach(m => {
            const subj = m.subject || '미지정';
            subjectDist[subj] = (subjectDist[subj] || 0) + 1;
            const type = m.membershipType || '미지정';
            typeDist[type] = (typeDist[type] || 0) + 1;
        });
        data.membersBySubject = subjectDist;
        data.membersByType = typeDist;

        // 만료 임박 회원 (7일 이내)
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        const expiringSoon = activeMembers.filter(m => {
            if (!m.endDate) return false;
            const end = new Date(m.endDate);
            return end <= sevenDaysLater && end >= new Date(today);
        });
        data.expiringCount = expiringSoon.length;
        if (expiringSoon.length > 0) {
            data.expiringMembers = expiringSoon.slice(0, 30).map(m => ({
                name: m.name, endDate: m.endDate, credits: m.credits,
                phone: m.phone || '', membershipType: m.membershipType || '', subject: m.subject || ''
            }));
        }

        // 잔여 횟수 부족 회원 (3회 이하)
        const lowCredits = activeMembers.filter(m => Number(m.credits || 0) > 0 && Number(m.credits) <= 3);
        data.lowCreditsCount = lowCredits.length;
        if (lowCredits.length > 0 && lowCredits.length <= 30) {
            data.lowCreditsMembers = lowCredits.map(m => ({
                name: m.name, credits: m.credits, endDate: m.endDate || '', subject: m.subject || ''
            }));
        }

        // 신규 등록 (최근 30일)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const newMembers = allMembers.filter(m => m.regDate && m.regDate >= thirtyDaysAgoStr);
        data.newMembersLast30Days = newMembers.length;

        // ── 회원 검색 (이름/전화번호/메모/종목 등 모든 필드) ──
        const searchTerms = extractSearchTerms(question);
        if (searchTerms.length > 0) {
            const found = allMembers.filter(m => {
                const searchableText = [
                    m.name, m.phone, m.phoneLast4,
                    m.membershipType, m.subject,
                    m.notes, m.memo,
                    m.homeBranch, m.branchId,
                    m.regDate, m.startDate, m.endDate,
                    m.paymentMethod
                ].filter(Boolean).join(' ').toLowerCase();

                return searchTerms.some(term => searchableText.includes(term.toLowerCase()));
            });

            if (found.length > 0) {
                data.searchResults = found.slice(0, 30).map(formatMemberFull);
                data.searchQuery = searchTerms.join(', ');
                if (found.length > 30) {
                    data.searchNote = `총 ${found.length}명 중 상위 30명만 표시`;
                }
            } else {
                data.searchResults = [];
                data.searchQuery = searchTerms.join(', ');
                data.searchNote = '검색 결과 없음';
            }
        }

        // 활성화 회원 초경량 리스트 (AI가 뒷자리나 이름으로 검색할 수 있도록 최소 정보만)
        data.activeMembersForSearch = activeMembers.map(m => {
            const p = m.phone || m.phoneNumber || '';
            const last4 = p.replace(/\D/g, '').slice(-4);
            return `${m.name}:${last4 || '없음'}`;
        });

        // 전체 활성 회원 요약 (AI 분석/통계용) + 비활성 최근 50명
        data.allMembersSummary = activeMembers.map(formatMemberSummary);
        const inactiveMembers = allMembers.filter(m => !activeMembers.includes(m));
        const sortedInactive = [...inactiveMembers].sort((a, b) => (b.regDate || '').localeCompare(a.regDate || ''));
        data.inactiveMembersSummary = sortedInactive.slice(0, 50).map(formatMemberSummary);
        data.allMembersSummaryNote = `활성 회원 ${activeMembers.length}명 전원 + 비활성 최근 50명 요약`;

    } catch(e) { console.warn('Members fetch failed:', e.message); }

    // ═══ 2. 출석 데이터 (항상 수집) ═══
    try {
        // 오늘 출석
        const attSnap = await tdb.collection('attendance')
            .where('date', '==', today)
            .get();
        const todayLogs = attSnap.docs.map(d => d.data()).filter(l => !l.deleted);
        data.todayAttendance = todayLogs.length;
        data.todayAttendanceDetails = todayLogs.slice(0, 50).map(l => ({
            memberName: l.memberName || '?',
            className: l.className || '자율수련',
            time: l.classTime || l.checkInTime || '',
            instructor: l.instructor || '',
            status: l.status || 'valid',
            branchId: l.branchId || ''
        }));

        // 최근 7일 출석 요약
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weekAgoStr = sevenDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const weekAttSnap = await tdb.collection('attendance')
            .where('date', '>=', weekAgoStr)
            .get();
        const weekLogs = weekAttSnap.docs.map(d => d.data()).filter(l => !l.deleted);

        // 일별 출석 수
        const dailyAttendance = {};
        weekLogs.forEach(l => {
            const d = l.date || '';
            dailyAttendance[d] = (dailyAttendance[d] || 0) + 1;
        });
        data.weeklyAttendanceSummary = dailyAttendance;
        data.weeklyAttendanceTotal = weekLogs.length;

    } catch(e) { console.warn('Attendance fetch failed:', e.message); }

    // ═══ 3. 매출 데이터 (항상 수집) ═══
    try {
        // 매출 통계 요약
        const statsDoc = await tdb.collection('stats').doc('revenue_summary').get();
        if (statsDoc.exists) {
            const stats = statsDoc.data();
            const currentMonth = today.substring(0, 7);
            const prevMonth = (() => {
                const d = new Date(today);
                d.setMonth(d.getMonth() - 1);
                return d.toISOString().substring(0, 7);
            })();
            data.revenueThisMonth = stats.monthly?.[currentMonth]?.total || 0;
            data.revenueThisMonthNew = stats.monthly?.[currentMonth]?.new || 0;
            data.revenueThisMonthReReg = stats.monthly?.[currentMonth]?.reReg || 0;
            data.revenueLastMonth = stats.monthly?.[prevMonth]?.total || 0;
            data.revenueLastMonthNew = stats.monthly?.[prevMonth]?.new || 0;
            data.revenueLastMonthReReg = stats.monthly?.[prevMonth]?.reReg || 0;
            data.revenueToday = stats.daily?.[today]?.total || 0;
            data.revenueTotalAllTime = stats.total || 0;

            // 최근 6개월 월별 매출
            const monthlyTrend = {};
            for (let i = 0; i < 6; i++) {
                const d = new Date(today);
                d.setMonth(d.getMonth() - i);
                const ym = d.toISOString().substring(0, 7);
                if (stats.monthly?.[ym]) {
                    monthlyTrend[ym] = stats.monthly[ym];
                }
            }
            data.revenueMonthlyTrend = monthlyTrend;
        }

        // 최근 매출 내역 (이번 달)
        const monthStart = today.substring(0, 7);
        const salesSnap = await tdb.collection('sales')
            .where('date', '>=', `${monthStart}-01`)
            .get();
        const recentSales = salesSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(s => !s.deletedAt);
        data.salesThisMonthCount = recentSales.length;
        data.salesThisMonthDetails = recentSales.slice(0, 50).map(s => ({
            memberName: s.memberName || '',
            amount: s.amount || 0,
            date: s.date || '',
            type: s.type || '',
            productName: s.productName || s.membershipType || '',
            paymentMethod: s.paymentMethod || '',
            isNew: s.isNew !== false
        }));

    } catch(e) { console.warn('Revenue/Sales fetch failed:', e.message); }

    // ═══ 4. 스케줄 데이터 (항상 수집) ═══
    try {
        const scheduleSnap = await tdb.collection('daily_schedule').doc(today).get();
        if (scheduleSnap.exists) {
            const schedData = scheduleSnap.data();
            if (schedData.classes) {
                data.todayClasses = Object.values(schedData.classes).flat().map(c => ({
                    time: c.time, className: c.className, instructor: c.instructor,
                    capacity: c.capacity, enrolled: c.enrolled || 0
                }));
            }
        }
        // daily_classes도 확인
        const dailyClassesSnap = await tdb.collection('daily_classes')
            .where('date', '==', today)
            .get();
        if (!dailyClassesSnap.empty) {
            const classes = dailyClassesSnap.docs.map(d => d.data());
            if (!data.todayClasses || data.todayClasses.length === 0) {
                data.todayClasses = classes.map(c => ({
                    time: c.time || '', className: c.className || '',
                    instructor: c.instructor || '', capacity: c.capacity || 0
                }));
            }
        }
    } catch(e) { console.warn('Schedule fetch failed:', e.message); }

    // ═══ 5. 예약 데이터 (항상 수집) ═══
    try {
        const bookingsSnap = await tdb.collection('bookings')
            .where('date', '==', today)
            .get();
        const todayBookings = bookingsSnap.docs
            .map(d => d.data())
            .filter(b => b.status !== 'cancelled');
        data.todayBookingsCount = todayBookings.length;
        if (todayBookings.length > 0) {
            data.todayBookings = todayBookings.slice(0, 30).map(b => ({
                memberName: b.memberName || '',
                className: b.className || '',
                time: b.time || '',
                status: b.status || 'confirmed'
            }));
        }
    } catch(e) { console.warn('Bookings fetch failed:', e.message); }

    // ═══ 6. 설정 데이터 ═══
    try {
        const instructorDoc = await tdb.collection('settings').doc('instructors').get();
        if (instructorDoc.exists) {
            const instData = instructorDoc.data();
            data.instructors = instData.list || instData.instructors || Object.keys(instData).filter(k => k !== '_meta');
        }
    } catch(e) { /* 설정 없을 수 있음 */ }

    return data;
}

/**
 * 메인 Cloud Function — 관리자 AI 비서
 */
exports.adminAskAI = onCall({
    region: "asia-northeast3",
    memory: "1GiB",
    timeoutSeconds: 120,
    cors: require('../helpers/cors').ALLOWED_ORIGINS
}, async (request) => {
    requireAdmin(request, 'adminAskAI');

    const { question, conversationHistory = [], studioId } = request.data;
    if (!question || typeof question !== 'string' || question.trim().length < 2) {
        throw new HttpsError('invalid-argument', '질문을 입력해주세요.');
    }

    // 1. 별도 quota 체크
    await checkAIQuota(studioId);
    const quota = await checkAssistantQuota(studioId);

    // 2. 스튜디오 전체 데이터 수집
    const studioData = await collectStudioData(question, studioId);

    // 3. 대화 기록 Firestore 저장
    const tdb = tenantDb(studioId);
    const conversationRef = tdb.collection('ai_assistant_logs');
    
    // 4. Gemini 프롬프트 구성
    const ai = getAI();
    
    const recentHistory = conversationHistory.slice(-6).map(h => 
        `${h.role === 'user' ? '원장' : 'AI 비서'}: ${h.content}`
    ).join('\n');

    const prompt = `
당신은 요가/필라테스 스튜디오 전담 AI 비서입니다. 스튜디오의 실제 운영 데이터를 기반으로 정확하고 신뢰할 수 있는 답변을 제공합니다.

═══ 역할 ═══
- 회원/출석/매출/스케줄/예약 등 운영 데이터를 정확하게 조회하여 답변
- 마케팅, 홍보, 운영 전략에 대한 데이터 기반 조언 제공
- 회원 관리(이탈 방지, 재등록 유도 등)에 대한 실행 가능한 전략 제시

═══ ⚠️ 읽기 전용 시스템 ═══
- 이 시스템은 데이터 조회 및 분석 전용입니다.
- 데이터 수정, 삭제, 추가, 회원 정보 변경 등의 기능은 제공하지 않습니다.
- 수정이 필요한 요청에는 "관리자 대시보드에서 직접 수정해주세요"라고 안내하세요.

═══ 현재 스튜디오 데이터 ═══
${JSON.stringify(studioData, null, 2)}

═══ 이전 대화 ═══
${recentHistory || '(새 대화)'}

═══ 원장의 질문 ═══
${question}

═══ 응답 규칙 ═══
1. 데이터에 기반한 정확한 숫자만 인용하세요. 없는 데이터를 추측하지 마세요.
2. 데이터가 부족하면 "현재 조회 가능한 데이터 범위에서는..."이라고 전제하세요.
3. 한국어로 답변하세요.
4. 답변은 간결하되 구체적으로 (필요시 리스트/표 형식 사용).
5. 마케팅/전략 질문에는 반드시 스튜디오의 실제 숫자를 근거로 제시하세요.
6. 이모지를 적절히 사용하되, 전문적인 톤을 유지하세요.
7. 특정 회원 검색 결과(searchResults)가 있으면 해당 회원의 전체 정보를 정확히 답변하세요.
8. 전화번호 검색 결과는 전체 번호를 그대로 답변하세요 (관리자 전용이므로 마스킹 불필요).
9. activeMembersForSearch에 전체 활성 회원의 이름과 전화번호 뒷자리가 있으므로 "번호 뒷자리 같은 회원" 류의 질문에 활용하세요.

Format: { "answer": "답변 본문", "category": "member|attendance|revenue|schedule|strategy|general", "suggestions": ["관련 후속 질문 1", "관련 후속 질문 2"] }
`;

    try {
        const result = await ai.generateExperience(prompt);
        const answer = result?.answer || result?.message || '죄송합니다, 답변 생성에 실패했습니다.';
        const category = result?.category || 'general';
        const suggestions = result?.suggestions || [];

        // Firestore에 대화 로그 저장
        await conversationRef.add({
            question,
            answer,
            category,
            studioDataKeys: Object.keys(studioData),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            uid: request.auth.uid
        });

        return { answer, category, suggestions, quota };
    } catch (error) {
        console.error('Admin AI Assistant failed:', error);
        
        // Firestore에 실패 로그 저장
        await conversationRef.add({
            question,
            answer: '[오류] ' + error.message,
            category: 'error',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            uid: request.auth.uid
        });

        return {
            answer: '죄송합니다, 일시적인 오류가 발생했습니다. 잠시 후 다시 질문해주세요.',
            category: 'error',
            suggestions: [],
            quota
        };
    }
});

/**
 * AI 비서 대화 히스토리 조회
 */
exports.getAssistantHistory = onCall({
    region: "asia-northeast3",
    cors: require('../helpers/cors').ALLOWED_ORIGINS
}, async (request) => {
    requireAdmin(request, 'getAssistantHistory');
    
    const { limit = 50, studioId } = request.data || {};
    const tdb = tenantDb(studioId);
    
    const snap = await tdb.collection('ai_assistant_logs')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
    
    return snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate?.()?.toISOString() || ''
    }));
});
