/**
 * Admin AI Assistant Module — Tool-Calling Agent Architecture
 * 
 * [v3] AI가 도구(Tool)를 능동적으로 선택하여 DB에 정확한 쿼리만 실행하고,
 * 결과만 받아서 답변을 생성하는 에이전트 구조.
 * 
 * 기존 v2의 "전체 DB 풀스캔 → AI에 덤프" 방식 완전 제거.
 * 
 * @module modules/adminAssistant
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, tenantDb, getAI, checkAIQuota, getKSTDateString } = require("../helpers/common");
const { requireAdmin } = require("../helpers/authGuard");

const DAILY_ASSISTANT_LIMIT = 50;

// ═══════════════════════════════════════════════════════════
// 1. TOOL DECLARATIONS — Gemini Function Calling 스펙
// ═══════════════════════════════════════════════════════════

const TOOL_DECLARATIONS = [
    {
        name: "search_members",
        description: "회원을 이름, 전화번호, 전화번호 뒷자리 4자리, 메모, 종목 등으로 검색합니다. '홍길동 회원 알려줘', '뒷자리 1234 회원', '010-1234-5678 누구야' 같은 질문에 사용합니다.",
        parameters: {
            type: "OBJECT",
            properties: {
                query: { type: "STRING", description: "검색할 이름, 전화번호, 또는 키워드" },
                searchType: { type: "STRING", enum: ["name", "phone", "phoneLast4", "keyword"], description: "검색 방식: name=이름, phone=전체 전화번호, phoneLast4=뒷번호 4자리, keyword=메모/종목 등 키워드" }
            },
            required: ["query", "searchType"]
        }
    },
    {
        name: "find_duplicate_phones",
        description: "전화번호 뒷자리 4자리가 동일한 회원들을 찾습니다. '뒷번호 같은 회원 누구', '뒷자리 중복 회원 알려줘', '폰번호 뒷자리가 겹치는 사람들' 같은 질문에 사용합니다.",
        parameters: {
            type: "OBJECT",
            properties: {
                last4: { type: "STRING", description: "특정 뒷자리 4자리 (선택). 비워두면 전체 중복 조회" }
            }
        }
    },
    {
        name: "get_member_detail",
        description: "특정 회원 1명의 상세 정보를 조회합니다 (수강권, 출석 이력, 결제 내역 등). 이름으로 이미 찾은 회원의 ID가 있을 때 사용합니다.",
        parameters: {
            type: "OBJECT",
            properties: {
                memberId: { type: "STRING", description: "회원 문서 ID" }
            },
            required: ["memberId"]
        }
    },
    {
        name: "get_attendance_summary",
        description: "출석 현황을 조회합니다. 오늘/어제/특정 날짜/최근 7일 등 기간별 출석 통계와 상세 내역입니다. '오늘 출석 현황', '어제 몇 명 왔어', '이번 주 출석' 같은 질문에 사용합니다.",
        parameters: {
            type: "OBJECT",
            properties: {
                period: { type: "STRING", enum: ["today", "yesterday", "week", "month", "custom"], description: "조회 기간" },
                date: { type: "STRING", description: "특정 날짜 (YYYY-MM-DD, period가 custom일 때)" },
                branchId: { type: "STRING", description: "특정 지점 ID (선택)" }
            },
            required: ["period"]
        }
    },
    {
        name: "get_revenue_summary",
        description: "매출 분석 데이터를 조회합니다. 오늘/이번달/지난달/최근 6개월 추이 등입니다. '매출 얼마야', '이번 달 매출', '매출 분석해줘' 같은 질문에 사용합니다.",
        parameters: {
            type: "OBJECT",
            properties: {
                period: { type: "STRING", enum: ["today", "month", "lastMonth", "trend6m"], description: "조회 기간: today=오늘, month=이번달, lastMonth=지난달, trend6m=최근6개월추이" }
            },
            required: ["period"]
        }
    },
    {
        name: "get_expiring_members",
        description: "수강권 만료 임박 회원을 조회합니다. 7일/14일/30일 이내 만료 예정 회원 목록입니다. '만료 임박 회원', '곧 끝나는 회원 누구', '이번 주 만료' 같은 질문에 사용합니다.",
        parameters: {
            type: "OBJECT",
            properties: {
                withinDays: { type: "NUMBER", description: "며칠 이내 만료 (기본값: 7)" }
            }
        }
    },
    {
        name: "get_low_credits_members",
        description: "잔여 횟수 부족 회원을 조회합니다. '횟수 부족한 회원', '잔여 1회 남은 사람', '횟수 거의 다 쓴 회원' 같은 질문에 사용합니다.",
        parameters: {
            type: "OBJECT",
            properties: {
                maxCredits: { type: "NUMBER", description: "잔여 횟수 기준 (이하, 기본값: 3)" }
            }
        }
    },
    {
        name: "get_schedule_today",
        description: "오늘 스케줄(수업 시간표)을 조회합니다. '오늘 수업 뭐 있어', '오늘 스케줄', '수업 알려줘' 같은 질문에 사용합니다.",
        parameters: {
            type: "OBJECT",
            properties: {
                branchId: { type: "STRING", description: "특정 지점 ID (선택)" }
            }
        }
    },
    {
        name: "get_studio_overview",
        description: "스튜디오 전체 요약 통계를 가볍게 조회합니다. 총 회원 수, 활성 회원 수, 종목별/이용권별 분포 등 기본 현황입니다. '현황 알려줘', '회원 몇 명이야', '전체 현황' 같은 질문에 사용합니다.",
        parameters: {
            type: "OBJECT",
            properties: {
                includeDistribution: { type: "BOOLEAN", description: "종목별/이용권별 분포 포함 여부 (기본: true)" }
            }
        }
    }
];

// ═══════════════════════════════════════════════════════════
// 2. TOOL EXECUTION ENGINE — 각 도구별 Firestore 쿼리 실행
// ═══════════════════════════════════════════════════════════

async function executeTool(toolName, args, studioId) {
    const tdb = tenantDb(studioId);
    const today = getKSTDateString();

    switch (toolName) {

        // ── 회원 검색 ──
        case "search_members": {
            const { query, searchType } = args;
            const membersSnap = await tdb.collection('members').get();
            const allMembers = membersSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(m => !m.deleted && !m.deletedAt);

            let results = [];
            if (searchType === 'name') {
                results = allMembers.filter(m => m.name && m.name.includes(query));
            } else if (searchType === 'phone') {
                const cleanQuery = query.replace(/[-\s]/g, '');
                results = allMembers.filter(m => {
                    const phone = (m.phone || m.phoneNumber || '').replace(/[-\s]/g, '');
                    return phone.includes(cleanQuery);
                });
            } else if (searchType === 'phoneLast4') {
                const last4 = query.replace(/\D/g, '').slice(-4);
                results = allMembers.filter(m => {
                    const phone = (m.phone || m.phoneNumber || '').replace(/\D/g, '');
                    return phone.length >= 4 && phone.slice(-4) === last4;
                });
            } else { // keyword
                const q = query.toLowerCase();
                results = allMembers.filter(m => {
                    const searchable = [m.name, m.phone, m.membershipType, m.subject, m.notes, m.memo, m.homeBranch]
                        .filter(Boolean).join(' ').toLowerCase();
                    return searchable.includes(q);
                });
            }

            return {
                count: results.length,
                members: results.slice(0, 20).map(m => ({
                    id: m.id, name: m.name, phone: m.phone || '',
                    credits: m.credits ?? 0, endDate: m.endDate || '',
                    membershipType: m.membershipType || '', subject: m.subject || '',
                    lastAttendance: m.lastAttendance || '', notes: m.notes || '',
                    homeBranch: m.homeBranch || '', branchId: m.branchId || ''
                })),
                note: results.length > 20 ? `총 ${results.length}명 중 상위 20명만 표시` : null
            };
        }

        // ── 뒷번호 중복 회원 ──
        case "find_duplicate_phones": {
            const { last4 } = args || {};
            const membersSnap = await tdb.collection('members').get();
            const allMembers = membersSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(m => !m.deleted && !m.deletedAt);

            // 뒷번호 4자리 추출
            const phoneLast4Map = {};
            allMembers.forEach(m => {
                const phone = (m.phone || m.phoneNumber || '').replace(/\D/g, '');
                if (phone.length >= 4) {
                    const l4 = phone.slice(-4);
                    if (!phoneLast4Map[l4]) phoneLast4Map[l4] = [];
                    phoneLast4Map[l4].push({
                        id: m.id, name: m.name, phone: m.phone || '',
                        credits: m.credits ?? 0, endDate: m.endDate || '',
                        membershipType: m.membershipType || '',
                        isActive: (() => {
                            if ((m.credits ?? 0) <= 0) return false;
                            if (m.endDate && new Date(m.endDate) < new Date(today)) return false;
                            return true;
                        })()
                    });
                }
            });

            if (last4) {
                // 특정 뒷자리 조회
                const matches = phoneLast4Map[last4] || [];
                return { last4, count: matches.length, members: matches };
            }

            // 전체 중복 조회 (2명 이상인 뒷자리만)
            const duplicates = Object.entries(phoneLast4Map)
                .filter(([, members]) => members.length >= 2)
                .map(([l4, members]) => ({ last4: l4, count: members.length, members }))
                .sort((a, b) => b.count - a.count);

            return {
                totalDuplicateGroups: duplicates.length,
                duplicates: duplicates.slice(0, 15),
                note: duplicates.length > 15 ? `총 ${duplicates.length}그룹 중 상위 15개만 표시` : null
            };
        }

        // ── 회원 상세 ──
        case "get_member_detail": {
            const { memberId } = args;
            const doc = await tdb.collection('members').doc(memberId).get();
            if (!doc.exists) return { error: "회원을 찾을 수 없습니다." };
            const m = doc.data();

            // 최근 출석 10건
            let recentAttendance = [];
            try {
                const attSnap = await tdb.collection('attendance')
                    .where('memberId', '==', memberId)
                    .orderBy('timestamp', 'desc')
                    .limit(10)
                    .get();
                recentAttendance = attSnap.docs.map(d => {
                    const a = d.data();
                    return { date: a.date, className: a.className || '', time: a.classTime || '' };
                });
            } catch (e) {
                // 인덱스 없을 수 있음 - fallback
                try {
                    const attSnap2 = await tdb.collection('attendance')
                        .where('memberId', '==', memberId)
                        .limit(10)
                        .get();
                    recentAttendance = attSnap2.docs.map(d => {
                        const a = d.data();
                        return { date: a.date, className: a.className || '' };
                    });
                } catch (_) { /* skip */ }
            }

            return {
                id: doc.id, name: m.name, phone: m.phone || '',
                credits: m.credits ?? 0, endDate: m.endDate || '',
                startDate: m.startDate || '', regDate: m.regDate || '',
                membershipType: m.membershipType || '', subject: m.subject || '',
                attendanceCount: m.attendanceCount || 0, lastAttendance: m.lastAttendance || '',
                homeBranch: m.homeBranch || '', branchId: m.branchId || '',
                notes: m.notes || '', memo: m.memo || '',
                price: m.price || m.amount || '', paymentMethod: m.paymentMethod || '',
                pushEnabled: !!m.pushEnabled,
                upcomingMembership: m.upcomingMembership || null,
                recentAttendance
            };
        }

        // ── 출석 현황 ──
        case "get_attendance_summary": {
            const { period, date, branchId } = args;
            let targetDate = today;
            let dateRange = null;

            if (period === 'yesterday') {
                const d = new Date(); d.setDate(d.getDate() - 1);
                targetDate = getKSTDateString(d);
            } else if (period === 'custom' && date) {
                targetDate = date;
            } else if (period === 'week') {
                const d = new Date(); d.setDate(d.getDate() - 7);
                dateRange = { from: getKSTDateString(d), to: today };
            } else if (period === 'month') {
                dateRange = { from: `${today.substring(0, 7)}-01`, to: today };
            }

            if (dateRange) {
                // 기간 범위 쿼리
                let q = tdb.collection('attendance')
                    .where('date', '>=', dateRange.from)
                    .where('date', '<=', dateRange.to);
                const snap = await q.get();
                const logs = snap.docs.map(d => d.data()).filter(l => !l.deleted && !l.deletedAt);
                const filteredLogs = branchId ? logs.filter(l => l.branchId === branchId) : logs;

                // 일별 집계
                const dailyCounts = {};
                filteredLogs.forEach(l => { dailyCounts[l.date] = (dailyCounts[l.date] || 0) + 1; });

                return {
                    period: `${dateRange.from} ~ ${dateRange.to}`,
                    totalCount: filteredLogs.length,
                    dailyCounts,
                    topClasses: (() => {
                        const classCount = {};
                        filteredLogs.forEach(l => { classCount[l.className || '자율수련'] = (classCount[l.className || '자율수련'] || 0) + 1; });
                        return Object.entries(classCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
                    })()
                };
            }

            // 단일 날짜 쿼리
            let q = tdb.collection('attendance').where('date', '==', targetDate);
            const snap = await q.get();
            const logs = snap.docs.map(d => d.data()).filter(l => !l.deleted && !l.deletedAt);
            const filteredLogs = branchId ? logs.filter(l => l.branchId === branchId) : logs;

            return {
                date: targetDate,
                totalCount: filteredLogs.length,
                details: filteredLogs.slice(0, 30).map(l => ({
                    memberName: l.memberName || '?', className: l.className || '자율수련',
                    time: l.classTime || l.checkInTime || '', branchId: l.branchId || '',
                    status: l.status || 'valid'
                })),
                byBranch: (() => {
                    const counts = {};
                    filteredLogs.forEach(l => { counts[l.branchId || 'unknown'] = (counts[l.branchId || 'unknown'] || 0) + 1; });
                    return counts;
                })()
            };
        }

        // ── 매출 분석 ──
        case "get_revenue_summary": {
            const { period: revPeriod } = args;
            const statsDoc = await tdb.collection('stats').doc('revenue_summary').get();
            const stats = statsDoc.exists ? statsDoc.data() : {};
            const currentMonth = today.substring(0, 7);

            if (revPeriod === 'today') {
                return {
                    date: today,
                    total: stats.daily?.[today]?.total || 0,
                    count: stats.daily?.[today]?.count || 0
                };
            }

            if (revPeriod === 'month') {
                // 이번 달 매출 + 상세 내역
                const salesSnap = await tdb.collection('sales')
                    .where('date', '>=', `${currentMonth}-01`)
                    .get();
                const sales = salesSnap.docs.map(d => d.data()).filter(s => !s.deletedAt);
                const total = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
                const newCount = sales.filter(s => s.isNew !== false).length;
                const reRegCount = sales.filter(s => s.isNew === false).length;

                return {
                    month: currentMonth,
                    total, count: sales.length,
                    newRegistrations: newCount, reRegistrations: reRegCount,
                    byPaymentMethod: (() => {
                        const methods = {};
                        sales.forEach(s => { methods[s.paymentMethod || '미지정'] = (methods[s.paymentMethod || '미지정'] || 0) + (s.amount || 0); });
                        return methods;
                    })(),
                    recentSales: sales.slice(-10).map(s => ({
                        memberName: s.memberName || '', amount: s.amount || 0,
                        date: s.date || '', productName: s.productName || s.membershipType || '',
                        isNew: s.isNew !== false
                    }))
                };
            }

            if (revPeriod === 'lastMonth') {
                const d = new Date(today); d.setMonth(d.getMonth() - 1);
                const lastM = d.toISOString().substring(0, 7);
                return {
                    month: lastM,
                    total: stats.monthly?.[lastM]?.total || 0,
                    new: stats.monthly?.[lastM]?.new || 0,
                    reReg: stats.monthly?.[lastM]?.reReg || 0
                };
            }

            // trend6m
            const trend = {};
            for (let i = 0; i < 6; i++) {
                const d = new Date(today); d.setMonth(d.getMonth() - i);
                const ym = d.toISOString().substring(0, 7);
                trend[ym] = stats.monthly?.[ym] || { total: 0 };
            }
            return { trend, totalAllTime: stats.total || 0 };
        }

        // ── 만료 임박 회원 ──
        case "get_expiring_members": {
            const withinDays = args?.withinDays || 7;
            const membersSnap = await tdb.collection('members').get();
            const allMembers = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(m => !m.deleted && !m.deletedAt);

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + withinDays);
            const todayDate = new Date(today);

            const expiring = allMembers.filter(m => {
                if ((m.credits ?? 0) <= 0) return false;
                if (!m.endDate) return false;
                const end = new Date(m.endDate);
                return end >= todayDate && end <= futureDate;
            }).sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

            return {
                withinDays, count: expiring.length,
                members: expiring.slice(0, 30).map(m => ({
                    name: m.name, phone: m.phone || '', endDate: m.endDate,
                    credits: m.credits, membershipType: m.membershipType || '',
                    subject: m.subject || '', lastAttendance: m.lastAttendance || ''
                }))
            };
        }

        // ── 잔여 횟수 부족 회원 ──
        case "get_low_credits_members": {
            const maxCredits = args?.maxCredits || 3;
            const membersSnap = await tdb.collection('members').get();
            const allMembers = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(m => !m.deleted && !m.deletedAt);

            const todayDate = new Date(today);
            const lowCredits = allMembers.filter(m => {
                const credits = Number(m.credits || 0);
                if (credits <= 0 || credits > maxCredits) return false;
                if (m.endDate && new Date(m.endDate) < todayDate) return false;
                return true;
            }).sort((a, b) => (a.credits || 0) - (b.credits || 0));

            return {
                maxCredits, count: lowCredits.length,
                members: lowCredits.slice(0, 30).map(m => ({
                    name: m.name, phone: m.phone || '', credits: m.credits,
                    endDate: m.endDate || '', membershipType: m.membershipType || '',
                    subject: m.subject || '', lastAttendance: m.lastAttendance || ''
                }))
            };
        }

        // ── 오늘 스케줄 ──
        case "get_schedule_today": {
            const { branchId: schBranch } = args || {};
            let classes = [];

            // daily_schedule 먼저
            try {
                const schedDoc = await tdb.collection('daily_schedule').doc(today).get();
                if (schedDoc.exists) {
                    const d = schedDoc.data();
                    if (d.classes) {
                        classes = Object.values(d.classes).flat().map(c => ({
                            time: c.time, className: c.className, instructor: c.instructor,
                            capacity: c.capacity, enrolled: c.enrolled || 0, branchId: c.branchId || ''
                        }));
                    }
                }
            } catch (_) { /* skip */ }

            // daily_classes fallback
            if (classes.length === 0) {
                try {
                    const dcSnap = await tdb.collection('daily_classes').where('date', '==', today).get();
                    classes = dcSnap.docs.map(d => {
                        const c = d.data();
                        return { time: c.time || '', className: c.className || '', instructor: c.instructor || '', branchId: c.branchId || '' };
                    });
                } catch (_) { /* skip */ }
            }

            if (schBranch) {
                classes = classes.filter(c => c.branchId === schBranch);
            }
            classes.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

            return { date: today, classCount: classes.length, classes };
        }

        // ── 스튜디오 overview ──
        case "get_studio_overview": {
            const membersSnap = await tdb.collection('members').get();
            const allMembers = membersSnap.docs.map(d => d.data())
                .filter(m => !m.deleted && !m.deletedAt);
            const todayDate = new Date(today);

            const active = allMembers.filter(m => {
                if ((m.credits ?? 0) <= 0) return false;
                if (m.endDate && new Date(m.endDate) < todayDate) return false;
                return true;
            });

            const result = {
                totalMembers: allMembers.length,
                activeMembers: active.length,
                expiredMembers: allMembers.length - active.length,
                date: today
            };

            if (args?.includeDistribution !== false) {
                const subjectDist = {};
                const typeDist = {};
                allMembers.forEach(m => {
                    subjectDist[m.subject || '미지정'] = (subjectDist[m.subject || '미지정'] || 0) + 1;
                    typeDist[m.membershipType || '미지정'] = (typeDist[m.membershipType || '미지정'] || 0) + 1;
                });
                result.membersBySubject = subjectDist;
                result.membersByType = typeDist;
            }

            return result;
        }

        default:
            return { error: `알 수 없는 도구: ${toolName}` };
    }
}

// ═══════════════════════════════════════════════════════════
// 3. AI QUOTA (기존 유지)
// ═══════════════════════════════════════════════════════════

async function checkAssistantQuota(studioId) {
    const today = getKSTDateString();
    const tdb = tenantDb(studioId);
    const quotaRef = tdb.collection('ai_quota').doc(`assistant_${today}`);
    const snap = await quotaRef.get();
    const current = snap.exists ? snap.data().count || 0 : 0;
    if (current >= DAILY_ASSISTANT_LIMIT) {
        throw new HttpsError('resource-exhausted', `AI 비서 일일 한도 초과 (${current}/${DAILY_ASSISTANT_LIMIT})`);
    }
    await quotaRef.set({
        count: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { used: current + 1, limit: DAILY_ASSISTANT_LIMIT };
}

// ═══════════════════════════════════════════════════════════
// 4. AGENT LOOP — Tool-Calling 에이전트 메인 루프
// ═══════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `당신은 피트니스/웰니스 스튜디오 전담 AI 비서입니다.
제공된 도구(Tool)를 사용하여 스튜디오의 실제 운영 데이터를 조회하고, 정확한 답변을 제공합니다.

역할:
- 회원/출석/매출/스케줄 등 운영 데이터를 도구로 조회하여 정확하게 답변
- 마케팅, 홍보, 운영 전략에 대한 데이터 기반 조언 제공
- 회원 관리(이탈 방지, 재등록 유도 등)에 대한 실행 가능한 전략 제시

⚠️ 읽기 전용 시스템:
- 데이터 수정/삭제/추가 기능은 없습니다. 수정 요청은 "관리자 대시보드에서 직접 수정해주세요"로 안내하세요.

응답 규칙:
1. 반드시 도구를 사용하여 데이터를 조회한 후 답변하세요. 추측하지 마세요.
2. 한국어로 답변하세요.
3. 답변은 간결하되 구체적으로 (필요시 리스트/표 형식 사용).
4. 전화번호는 마스킹 없이 그대로 표시하세요 (관리자 전용).
5. 이모지를 적절히 사용하되 전문적인 톤을 유지하세요.
6. 복잡한 질문은 여러 도구를 조합하여 답변하세요.

최종 답변의 JSON 형식:
{ "answer": "답변 본문", "category": "member|attendance|revenue|schedule|strategy|general", "suggestions": ["관련 후속 질문 1", "관련 후속 질문 2"] }`;


/**
 * 메인 Cloud Function — Tool-Calling 에이전트 AI 비서
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

    // 1. Quota 체크
    await checkAIQuota(studioId);
    const quota = await checkAssistantQuota(studioId);

    // 2. Gemini 모델 준비 (Function Calling 모드)
    const ai = getAI();
    const client = ai.getClient();
    const model = client.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
        generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.7,
        }
    });

    // 3. 대화 컨텍스트 구성
    const chatHistory = conversationHistory.slice(-6).flatMap(h => ([
        { role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] }
    ]));

    // 4. 에이전트 루프 (최대 3라운드)
    const MAX_ROUNDS = 3;
    let contents = [
        ...chatHistory,
        { role: "user", parts: [{ text: question }] }
    ];
    let toolsUsed = [];

    try {
        for (let round = 0; round < MAX_ROUNDS; round++) {
            console.log(`[Agent] Round ${round + 1} — Calling Gemini...`);

            const result = await model.generateContent({ contents });
            const candidate = result.response.candidates?.[0];
            if (!candidate) throw new Error('AI 응답 없음');

            const parts = candidate.content?.parts || [];

            // functionCall 파트가 있으면 → 도구 실행
            const functionCalls = parts.filter(p => p.functionCall);

            if (functionCalls.length === 0) {
                // 텍스트 응답 = 최종 답변
                const textPart = parts.find(p => p.text);
                const rawText = textPart?.text || '';
                console.log(`[Agent] Final answer received (round ${round + 1}). Tools used: [${toolsUsed.join(', ')}]`);

                // JSON 파싱 시도
                let answer = rawText;
                let category = 'general';
                let suggestions = [];

                try {
                    let jsonStr = rawText.replace(/```json\s?|```/g, '').trim();
                    const first = jsonStr.indexOf('{');
                    const last = jsonStr.lastIndexOf('}');
                    if (first !== -1 && last !== -1) jsonStr = jsonStr.substring(first, last + 1);
                    const parsed = JSON.parse(jsonStr);
                    answer = parsed.answer || rawText;
                    category = parsed.category || 'general';
                    suggestions = parsed.suggestions || [];
                } catch (_) {
                    // JSON 파싱 실패 — 원본 텍스트 그대로 사용
                    answer = rawText;
                }

                // Firestore 대화 로그 저장
                const tdb = tenantDb(studioId);
                await tdb.collection('ai_assistant_logs').add({
                    question, answer, category,
                    toolsUsed,
                    rounds: round + 1,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    uid: request.auth.uid
                });

                return { answer, category, suggestions, quota };
            }

            // 도구 실행
            console.log(`[Agent] Round ${round + 1} — ${functionCalls.length} tool(s) requested: ${functionCalls.map(fc => fc.functionCall.name).join(', ')}`);

            // 모델 응답을 history에 추가
            contents.push({ role: "model", parts });

            // 각 도구 실행 + 결과 추가
            const functionResponseParts = [];
            for (const fc of functionCalls) {
                const { name, args } = fc.functionCall;
                toolsUsed.push(name);

                let toolResult;
                try {
                    toolResult = await executeTool(name, args || {}, studioId);
                } catch (toolErr) {
                    console.error(`[Agent] Tool ${name} failed:`, toolErr.message);
                    toolResult = { error: `도구 실행 실패: ${toolErr.message}` };
                }

                functionResponseParts.push({
                    functionResponse: { name, response: toolResult }
                });
            }

            // 도구 결과를 user 메시지로 추가
            contents.push({ role: "user", parts: functionResponseParts });
        }

        // 3라운드 초과 — 안전 탈출
        console.warn('[Agent] Max rounds exceeded. Forcing final answer.');
        return {
            answer: '질문을 처리하는 데 여러 단계가 필요했습니다. 질문을 더 구체적으로 해주시면 빠르게 답변드릴 수 있어요.',
            category: 'general', suggestions: [], quota
        };

    } catch (error) {
        console.error('Admin AI Assistant (Agent) failed:', error);

        const tdb = tenantDb(studioId);
        await tdb.collection('ai_assistant_logs').add({
            question, answer: '[오류] ' + error.message,
            category: 'error', toolsUsed,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            uid: request.auth.uid
        });

        return {
            answer: '죄송합니다, 일시적인 오류가 발생했습니다. 잠시 후 다시 질문해주세요.',
            category: 'error', suggestions: [], quota
        };
    }
});

/**
 * AI 비서 대화 히스토리 조회 (기존 유지)
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
