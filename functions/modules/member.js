/**
 * Member Module
 * 회원 관련 Cloud Functions
 * 
 * @module modules/member
 * [Refactor] Extracted from index.js
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, tenantDb, getAI, createPendingApproval, logAIError, getKSTDateString, getStudioName } = require("../helpers/common");

/**
 * 보안 회원 조회 (PIN 기반)
 */
exports.getSecureMemberV2Call = onCall({ 
    cors: require('../helpers/cors').ALLOWED_ORIGINS
}, async (request) => {
    const tdb = tenantDb();
    const db = tdb.raw(); // 글로벌 컬렉션(rate_limits)용
    const { phoneLast4 } = request.data;
    
    // Input validation
    if (!phoneLast4 || typeof phoneLast4 !== 'string' || !/^\d{4}$/.test(phoneLast4)) {
        throw new HttpsError('invalid-argument', '4자리 숫자를 입력해주세요');
    }

    // Rate limiting
    const clientIdentifier = request.auth?.uid || 
                           request.rawRequest?.headers?.['x-forwarded-for'] || 
                           request.rawRequest?.ip || 
                           'unknown';
    const rateLimitRef = db.collection('rate_limits').doc(`pin_${clientIdentifier.replace(/[^a-zA-Z0-9]/g, '_')}`);
    
    try {
        const rateLimitDoc = await rateLimitRef.get();
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        const maxAttempts = 300; // [CRITICAL FIX] Kiosk shares the same Anonymous UID. Increased to 300/min
        
        if (rateLimitDoc.exists) {
            const data = rateLimitDoc.data();
            if (data.lastAttempt && (now - data.lastAttempt) < windowMs && data.attempts >= maxAttempts) {
                throw new HttpsError('resource-exhausted', '너무 많은 시도. 1분 후 다시 시도해주세요.');
            }
        }

        await rateLimitRef.set({
            attempts: admin.firestore.FieldValue.increment(1),
            lastAttempt: now
        }, { merge: true });
        
        const snapshot = await tdb.collection('members').where('phoneLast4', '==', phoneLast4).limit(10).get();
        
        let docs = snapshot.docs;
        
        // [FALLBACK] 만약 phoneLast4로 검색이 안 된다면 (구데이터), 전체 데이터에서 필터링 시도
        if (docs.length === 0) {
            console.warn(`[getSecureMember] phoneLast4 ${phoneLast4} not found. Checking full phone fields manually...`);
            const allSnap = await tdb.collection('members').get();
            docs = allSnap.docs.filter(d => {
                const p = d.data().phone;
                return p && typeof p === 'string' && p.endsWith(phoneLast4);
            });
        }

        const members = docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id, 
                name: data.name, 
                credits: data.credits, 
                attendanceCount: data.attendanceCount || 0,
                streak: data.streak || 0, 
                homeBranch: data.homeBranch, 
                endDate: data.endDate,
                phoneMasked: data.phone ? data.phone.substring(0, 3) + "-****-" + data.phone.slice(-4) : "****"
            };
        });
        return { members };
    } catch (e) {
        if (e.code) throw e;
        throw new HttpsError('internal', e.message);
    }
});

/**
 * [NEW] 정식 회원 로그인 (이름 & PIN 기반)
 * 클라이언트의 무분별한 익명 로그인(Anonymous Auth)을 막고, 
 * 서버에서 검증 후 Custom Token을 발급하여 안전한 인증 세션을 수립합니다.
 */
exports.memberLoginV2Call = onCall({
    cors: require('../helpers/cors').ALLOWED_ORIGINS
}, async (request) => {
    const tdb = tenantDb();
    const db = tdb.raw(); // 글로벌 컬렉션(rate_limits)용
    
    // [FIX] Warmup Ping Handler
    if (request.data && request.data.ping) {
        return { success: true, message: 'pong' };
    }
    
    const { name, phoneLast4 } = request.data;

    // Input validation
    if (!name || typeof name !== 'string' || !phoneLast4 || typeof phoneLast4 !== 'string' || !/^\d{4}$/.test(phoneLast4)) {
        throw new HttpsError('invalid-argument', '이름과 4자리 숫자를 입력해주세요');
    }

    try {
        // [FIX] Rate limiting — same pattern as getSecureMemberV2Call
        const clientIdentifier = request.auth?.uid || 
                               request.rawRequest?.headers?.['x-forwarded-for'] || 
                               request.rawRequest?.ip || 
                               'unknown';
        const rateLimitRef = db.collection('rate_limits').doc(`login_${clientIdentifier.replace(/[^a-zA-Z0-9]/g, '_')}`);
        
        const rateLimitDoc = await rateLimitRef.get();
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        const maxAttempts = 10;
        
        if (rateLimitDoc.exists) {
            const rlData = rateLimitDoc.data();
            if (rlData.lastAttempt && (now - rlData.lastAttempt) < windowMs && rlData.attempts >= maxAttempts) {
                throw new HttpsError('resource-exhausted', '너무 많은 시도. 1분 후 다시 시도해주세요.');
            }
        }

        await rateLimitRef.set({
            attempts: admin.firestore.FieldValue.increment(1),
            lastAttempt: now
        }, { merge: true });

        const snapshot = await tdb.collection('members').where('phoneLast4', '==', phoneLast4).limit(10).get();
        let targetDoc = null;

        // [FIX] 이름 부분 매칭 처리 (공백, 대소문자 무시)
        const inputNameLower = name.trim().toLowerCase();

        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (!data.name) continue;
            
            const memberNameLower = data.name.trim().toLowerCase();
            if (memberNameLower === inputNameLower || 
                memberNameLower.startsWith(inputNameLower) || 
                memberNameLower.includes(inputNameLower)) {
                targetDoc = doc;
                break;
            }
        }
        
        // [FALLBACK] Login V2 fallback search
        if (!targetDoc) {
            const allSnap = await tdb.collection('members').get();
            for (const doc of allSnap.docs) {
                const data = doc.data();
                if (!data.name || !data.phone) continue;
                
                const p = data.phone;
                if (p && typeof p === 'string' && p.endsWith(phoneLast4)) {
                   const memberNameLower = data.name.trim().toLowerCase();
                   if (memberNameLower === inputNameLower || 
                       memberNameLower.startsWith(inputNameLower) || 
                       memberNameLower.includes(inputNameLower)) {
                       targetDoc = doc;
                       break;
                   }
                }
            }
        }

        if (!targetDoc) {
            return { success: false, message: '일치하는 회원 정보가 없습니다.' };
        }

        const data = targetDoc.data();
        const memberInfo = {
            id: targetDoc.id, 
            name: data.name, 
            credits: data.credits, 
            attendanceCount: data.attendanceCount || 0,
            streak: data.streak || 0, 
            homeBranch: data.homeBranch, 
            endDate: data.endDate,
            phoneMasked: data.phone ? data.phone.substring(0, 3) + "-****-" + data.phone.slice(-4) : "****"
        };

        // Create Custom Token for Member Auth
        const uid = `member_${targetDoc.id}`;
        let token = null;
        try {
            token = await admin.auth().createCustomToken(uid, { 
                member: true,
                name: data.name,
                memberId: targetDoc.id
            });
        } catch (tokenError) {
            console.error("[memberLoginV2Call] Error creating custom token:", tokenError);
            // Fallback (might fail firestore rules but allows login via Anonymous auth fallback in frontend)
        }
        
        return { success: true, member: memberInfo, token };

    } catch (e) {
        console.error('[memberLoginV2Call] Error:', e.code, e.message, e.stack);
        if (e.code) throw e;
        throw new HttpsError('internal', '회원 조회 중 서버 오류가 발생했습니다.');
    }
});

/**
 * 강사 인증 (이름 & PIN 기반)
 */
exports.verifyInstructorV2Call = onCall({
    cors: require('../helpers/cors').ALLOWED_ORIGINS
}, async (request) => {
    const tdb = tenantDb();
    const db = tdb.raw(); // 글로벌 컬렉션(rate_limits)용
    const { name, phoneLast4 } = request.data;

    if (!name || typeof name !== 'string' || !phoneLast4) {
        throw new HttpsError('invalid-argument', '이름과 전화번호 뒷자리가 필요합니다.');
    }

    try {
        // [FIX] Rate limiting to prevent brute-force on 4-digit PIN
        const clientIdentifier = request.auth?.uid || 
                               request.rawRequest?.headers?.['x-forwarded-for'] || 
                               request.rawRequest?.ip || 
                               'unknown';
        const rateLimitRef = db.collection('rate_limits').doc(`inst_verify_${clientIdentifier.replace(/[^a-zA-Z0-9]/g, '_')}`);
        
        const rateLimitDoc = await rateLimitRef.get();
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        const maxAttempts = 5; // Stricter for instructors
        
        if (rateLimitDoc.exists) {
            const rlData = rateLimitDoc.data();
            if (rlData.lastAttempt && (now - rlData.lastAttempt) < windowMs && rlData.attempts >= maxAttempts) {
                throw new HttpsError('resource-exhausted', '너무 많은 시도. 1분 후 다시 시도해주세요.');
            }
        }

        await rateLimitRef.set({
            attempts: admin.firestore.FieldValue.increment(1),
            lastAttempt: now
        }, { merge: true });

        const docSnap = await tdb.collection('settings').doc('instructors').get();
        if (!docSnap.exists) {
            throw new HttpsError('not-found', '강사 목록 설정을 찾을 수 없습니다.');
        }

        const list = docSnap.data().list || [];
        // [FIX] trim() 적용하여 공백으로 인한 인증 실패 방지
        const trimmedName = (name || '').trim();
        const trimmedLast4 = (phoneLast4 || '').trim();
        
        // [FIX] 이름 부분 매칭 - 입력한 이름이 포함되어 있으면 매칭 (대소문자 무시)
        const inputNameLower = trimmedName.toLowerCase();
        
        const instructor = list.find(inst => {
            const instName = (typeof inst === 'string' ? inst : inst.name || '').trim();
            const instNameLower = instName.toLowerCase();
            const instPhone = typeof inst === 'string' ? '' : (inst.phone || '');
            const instLast4 = (inst.phoneLast4 || instPhone.slice(-4) || '').trim();
            
            // 이름이 정확히 일치하거나, 저장된 이름이 입력 이름으로 시작하거나, 입력 이름을 포함하면 매칭
            const nameMatch = instNameLower === inputNameLower || 
                              instNameLower.startsWith(inputNameLower) || 
                              instNameLower.includes(inputNameLower);
            return nameMatch && instLast4 === trimmedLast4;
        });

        if (instructor) {
            const instructorName = typeof instructor === 'string' ? instructor : instructor.name;
            
            // [FIX] Create Custom Token for Instructor Auth
            // This allows the frontend to sign in as this instructor and pass firestore rules
            try {
                const uid = `instructor_${trimmedLast4}`;
                const token = await admin.auth().createCustomToken(uid, { 
                    instructor: true,
                    name: instructorName
                });
                
                return { success: true, name: instructorName, token };
            } catch (tokenError) {
                console.error("Error creating custom token:", tokenError);
                // Fallback (might fail firestore rules but allows login)
                return { success: true, name: instructorName };
            }
        } else {
            return { success: false, message: '일치하는 강사 정보가 없습니다.' };
        }
    } catch (e) {
        throw new HttpsError('internal', e.message);
    }
});


/**
 * 만료 예정 회원 체크 (매일 13:00)
 */
exports.checkExpiringMembersV2 = onSchedule({
    schedule: 'every day 13:00',
    timeZone: 'Asia/Seoul'
}, async (event) => {
    const tdb = tenantDb();
    const ai = getAI();
    const today = new Date();
    const targetDateStr = getKSTDateString(today);

    try {
        const snapshot = await tdb.collection('members').where('endDate', '==', targetDateStr).get();
        if (snapshot.empty) return null;

        const supportedLangs = ['ko', 'en', 'ru', 'zh', 'ja'];
        const messagesByLang = {};

        for (const lang of supportedLangs) {
            try {
                const langName = ai.getLangName(lang);
                messagesByLang[lang] = await ai.generate(`회원 만료 알림 메시지 (${langName}): 오늘 회원권이 만료됩니다. 갱신을 고려해주세요.`);
            } catch (e) {
                const fallbackMap = {
                    'ko': '오늘 회원권이 만료됩니다. 갱신을 고려해주세요.',
                    'en': 'Your membership expires today. Please consider renewing.',
                    'ru': 'Ваше членство истекает сегодня.',
                    'zh': '您的会员资格今天到期。',
                    'ja': '本日会員資格が期限切れとなります。'
                };
                messagesByLang[lang] = fallbackMap[lang] || fallbackMap['ko'];
            }
        }

        const membersByLang = { 'ko': [], 'en': [], 'ru': [], 'zh': [], 'ja': [] };
        snapshot.docs.forEach(doc => {
            const m = doc.data();
            const lang = m.language || 'ko';
            if (membersByLang[lang]) membersByLang[lang].push(doc.id);
            else membersByLang['ko'].push(doc.id);
        });

        for (const [lang, memberIds] of Object.entries(membersByLang)) {
            const body = messagesByLang[lang];
            if (memberIds && memberIds.length > 0) {
                const studioName = await getStudioName();
                await createPendingApproval('expiration', memberIds, `${studioName} 알림`, body, { lang, date: targetDateStr });
            }
        }
    } catch (error) {
        console.error("Error in scheduled expiration check:", error);
    }
    return null;
});

/**
 * 회원 자가 홀딩(일시정지) 신청
 * - 회원앱에서 로그인한 회원이 자신의 수강권을 일시정지합니다.
 * - 요가원별로 설정된 홀딩 규칙(HOLD_RULES)을 기반으로 자격을 검증합니다.
 * - 홀딩 규칙은 studios/{studioId} 또는 settings 컬렉션에서 읽어옵니다.
 */
exports.applyMemberHoldCall = onCall({
    cors: require('../helpers/cors').ALLOWED_ORIGINS
}, async (request) => {
    // [FIX] Auth guard — 회원 인증 필요
    const { requireAuth } = require('../helpers/authGuard');
    requireAuth(request, 'applyMemberHoldCall');
    const tdb = tenantDb();
    const db = tdb.raw(); // 글로벌 컬렉션(studios)용
    const { memberId, holdDays } = request.data;

    if (!memberId || !holdDays || holdDays <= 0) {
        throw new HttpsError('invalid-argument', '회원 ID와 홀딩 기간(일)이 필요합니다.');
    }

    try {
        const memberRef = tdb.collection('members').doc(memberId);
        const memberSnap = await memberRef.get();

        if (!memberSnap.exists) {
            throw new HttpsError('not-found', '회원을 찾을 수 없습니다.');
        }

        const memberData = memberSnap.data();

        // 이미 홀딩 중인지 확인
        if (memberData.holdStatus === 'holding') {
            throw new HttpsError('failed-precondition', '이미 홀딩 중입니다.');
        }

        // 스튜디오 설정에서 홀딩 규칙 읽기 (원소스 멀티유즈)
        let holdRules = [];
        let allowSelfHold = false;
        try {
            // studios 컬렉션에서 먼저 시도 (SaaS 구조)
            const studioSnap = await db.collection('studios').doc('config').get();
            if (studioSnap.exists) {
                const studioConfig = studioSnap.data();
                allowSelfHold = studioConfig?.POLICIES?.ALLOW_SELF_HOLD || false;
                holdRules = studioConfig?.POLICIES?.HOLD_RULES || [];
            }
        } catch (e) {
            console.warn('[applyMemberHold] Studios config not found, skipping');
        }

        if (!allowSelfHold) {
            throw new HttpsError('failed-precondition', '이 요가원에서는 자가 홀딩 기능이 비활성화되어 있습니다.');
        }

        // 회원의 수강 기간(개월 수) 판별 — duration 필드 없으면 startDate/endDate로 역산
        let memberDuration = memberData.duration || 0;
        if (!memberDuration && memberData.startDate && memberData.endDate && memberData.startDate !== 'TBD' && memberData.endDate !== 'TBD') {
            const start = new Date(memberData.startDate);
            const end = new Date(memberData.endDate);
            const diffMonths = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
            memberDuration = diffMonths;
        }
        
        // 매칭되는 홀딩 규칙 찾기: 정확한 매칭 → 가장 가까운 규칙 (작거나 같은 것 중 최대)
        let matchedRule = holdRules.find(r => r.durationMonths === memberDuration);
        if (!matchedRule && memberDuration > 0 && holdRules.length > 0) {
            const eligible = holdRules.filter(r => r.durationMonths <= memberDuration).sort((a, b) => b.durationMonths - a.durationMonths);
            matchedRule = eligible[0] || null;
        }
        if (!matchedRule) {
            throw new HttpsError('failed-precondition', `${memberDuration}개월권에 대한 홀딩 규칙이 설정되어 있지 않습니다.`);
        }

        // 최대 일수 검증
        const maxDays = (matchedRule.maxWeeks || 2) * 7;
        if (holdDays > maxDays) {
            throw new HttpsError('invalid-argument', `최대 ${maxDays}일(${matchedRule.maxWeeks}주)까지만 홀딩 가능합니다.`);
        }

        // 사용 횟수 검증
        const holdHistory = memberData.holdHistory || [];
        const usedCount = holdHistory.filter(h => !h.cancelledAt).length;
        if (usedCount >= (matchedRule.maxCount || 1)) {
            throw new HttpsError('failed-precondition', `홀딩 가능 횟수(${matchedRule.maxCount}회)를 모두 사용했습니다.`);
        }

        const today = getKSTDateString(new Date());

        // 홀딩 적용
        const holdEntry = {
            startDate: today,
            requestedDays: holdDays,
            appliedAt: new Date().toISOString(),
            releasedAt: null,
            actualDays: null
        };

        await memberRef.update({
            holdStatus: 'holding',
            holdStartDate: today,
            holdRequestedDays: holdDays,
            holdHistory: admin.firestore.FieldValue.arrayUnion(holdEntry),
            updatedAt: new Date().toISOString()
        });

        console.log(`[applyMemberHold] Hold applied for ${memberId}: ${holdDays} days from ${today}`);

        return {
            success: true,
            message: `${holdDays}일 홀딩이 적용되었습니다.`,
            holdStartDate: today,
            holdDays
        };
    } catch (e) {
        if (e.code) throw e;
        console.error('[applyMemberHold] Error:', e);
        throw new HttpsError('internal', '홀딩 처리 중 오류가 발생했습니다.');
    }
});
