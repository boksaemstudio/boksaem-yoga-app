/**
 * 공유 헬퍼 함수들
 * Cloud Functions에서 공통으로 사용되는 유틸리티
 * 
 * @module helpers/common
 */

const admin = require("firebase-admin");
const AIService = require("../utils/ai");

// Initialize Admin (if not already)
if (admin.apps.length === 0) {
    admin.initializeApp();
    admin.firestore().settings({ ignoreUndefinedProperties: true });
}

// ─── [TENANT ISOLATION] ───────────────────────────────────────────
// SaaS 멀티테넌트 지원을 위한 스튜디오 ID 상수
// 모든 테넌트별 데이터는 studios/{STUDIO_ID}/ 하위에 저장됩니다.
const STUDIO_ID = process.env.STUDIO_ID || 'boksaem-yoga';

/**
 * 테넌트 격리된 Firestore 접근 헬퍼
 * 모든 CF 모듈에서 이 헬퍼를 통해 테넌트별 데이터에 접근합니다.
 * 
 * @example
 * const tdb = tenantDb();
 * const memberRef = tdb.collection('members').doc(memberId);
 * const snap = await memberRef.get();
 * 
 * @returns {{ collection: Function, doc: Function, raw: Function }}
 */
const tenantDb = (overrideStudioId) => {
    const db = admin.firestore();
    const sid = overrideStudioId || STUDIO_ID;
    return {
        /** 이 tdb 인스턴스가 바라보는 스튜디오 ID */
        _studioId: sid,
        /** 테넌트 격리된 컬렉션 참조 */
        collection: (name) => db.collection(`studios/${sid}/${name}`),
        /** 테넌트 격리된 문서 참조 (콜렉션/문서 경로) */
        doc: (collectionName, docId) => docId
            ? db.doc(`studios/${sid}/${collectionName}/${docId}`)
            : db.collection(`studios/${sid}/${collectionName}`).doc(),
        /** 글로벌(루트) Firestore 직접 접근 (rate_limits, ai_logs 등) */
        raw: () => db
    };
};
// ──────────────────────────────────────────────────────────────────

// [UNIFIED] FCM 토큰 컬렉션 — 레거시 마이그레이션 완료, 단일 컬렉션 사용
const FCM_COLLECTIONS = ["fcm_tokens"];

/**
 * 한국 표준시(KST) 기준의 "YYYY-MM-DD" 포맷 문자열 반환
 * 클라우드 함수의 언어 환경에 종속되지 않는 안전한 유틸리티
 * @param {Date} [date] - 기준 날짜 (기본값: 현재 시간)
 * @returns {string} "YYYY-MM-DD"
 */
const getKSTDateString = (date = new Date()) => {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const parts = formatter.formatToParts(date);
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const d = parts.find(p => p.type === 'day')?.value;
        if (y && m && d) return `${y}-${m}-${d}`;
    } catch (e) {
        console.warn("Date polyfill fallback active:", e);
    }
    
    // Fallback if Intl fails
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(date.getTime() + kstOffset);
    return kstDate.toISOString().split('T')[0];
};

/**
 * 모든 FCM 컬렉션에서 토큰을 조회하는 공통 헬퍼
 * [TENANT] 테넌트 격리 경로를 사용합니다.
 * @param {Object} _db - (레거시 호환) 무시됨, tenantDb() 사용
 * @param {Object} filters - { memberId, role, instructorName, studioId } 등 필터 조건
 * @returns {Object} { tokens: string[], tokenSources: { token: collectionName } }
 */
const getAllFCMTokens = async (_db, filters = {}) => {
    const tokens = [];
    const tokenSources = {};
    const tdb = tenantDb(filters.studioId);

    for (const col of FCM_COLLECTIONS) {
        try {
            // [FIX] roles 배열(array-contains) + role 단일필드 병행 조회
            // 원장이 admin/instructor 두 역할을 모두 가지면 role 필드가 마지막 접속 역할로 덮어써지므로
            // roles 배열에서도 찾아야 토큰 누락을 방지할 수 있음
            const queries = [];
            
            if (filters.role && !filters.memberId) {
                // (1) roles 배열에서 array-contains로 조회
                let q1 = tdb.collection(col).where('roles', 'array-contains', filters.role);
                if (filters.instructorName) q1 = q1.where('instructorName', '==', filters.instructorName);
                queries.push(q1);
                
                // (2) 레거시: role 단일 필드로도 조회 (roles 배열이 없는 구 토큰 호환)
                let q2 = tdb.collection(col).where('role', '==', filters.role);
                if (filters.instructorName) q2 = q2.where('instructorName', '==', filters.instructorName);
                queries.push(q2);
            } else {
                // memberId 필터 또는 필터 없음 — 기존 로직 유지
                let q = tdb.collection(col);
                if (filters.memberId) q = q.where('memberId', '==', filters.memberId);
                if (filters.role) q = q.where('role', '==', filters.role);
                if (filters.instructorName) q = q.where('instructorName', '==', filters.instructorName);
                queries.push(q);
            }

            for (const q of queries) {
                const snap = await q.get();
                snap.docs.forEach(doc => {
                    if (!tokens.includes(doc.id)) {
                        tokens.push(doc.id);
                        tokenSources[doc.id] = col;
                    }
                });
            }
        } catch (e) {
            // Collection might not exist, skip
            console.warn(`[getAllFCMTokens] Query error for ${col}:`, e.message);
        }
    }

    return { tokens, tokenSources };
};

/**
 * AI 에러 로깅
 */
const logAIError = async (context, error, overrideStudioId) => {
    try {
        const tdb = tenantDb(overrideStudioId);
        await tdb.collection('ai_error_logs').add({
            context,
            error: error.message || error,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log AI error:", e);
    }
};

/**
 * AI 요청 로깅 (디버깅용)
 */
const logAIRequest = async (type, memberName, data, context, overrideStudioId) => {
    try {
        const tdb = tenantDb(overrideStudioId);
        await tdb.collection('ai_request_logs').add({
            type,
            memberName,
            data,
            context,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log AI request:", e);
    }
};

/**
 * AI 서비스 인스턴스 생성
 */
const getAI = () => {
    const key = process.env.GEMINI_KEY || admin.app().options?.geminiKey;
    return new AIService(key);
};

/**
 * AI 일일 할당량 체크
 */
const checkAIQuota = async (overrideStudioId) => {
    // [FIX] 순환 require('./common') 제거 — 동일 파일 스코프의 getKSTDateString 직접 사용
    const today = getKSTDateString();
    const tdb = tenantDb(overrideStudioId);
    const quotaRef = tdb.collection('ai_quota').doc(today);
    
    const quotaSnap = await quotaRef.get();
    const currentCount = quotaSnap.exists ? quotaSnap.data().count || 0 : 0;
    const dailyLimit = 10000; // Increased for testing
    
    if (currentCount >= dailyLimit) {
        throw new Error(`AI 일일 할당량 초과 (${currentCount}/${dailyLimit})`);
    }
    
    await quotaRef.set({ 
        count: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    return { remaining: dailyLimit - currentCount - 1 };
};

/**
 * Pending Approval 생성 (관리자 확인 필요한 푸시)
 */
const createPendingApproval = async (type, targetMemberIds, title, body, data = {}, overrideStudioId) => {
    const tdb = tenantDb(overrideStudioId);
    await tdb.collection('pending_approvals').add({
        type,
        targetMemberIds,
        title,
        body,
        data,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
};

/**
 * 스튜디오 이름 가져오기 (SaaS 동적 브랜딩)
 */
const getStudioName = async (overrideStudioId) => {
    try {
        const sid = overrideStudioId || process.env.STUDIO_ID || STUDIO_ID;
        const doc = await admin.firestore().collection('studios').doc(sid).get();
        if (doc.exists) {
            return doc.data().IDENTITY?.NAME || "Studio";
        }
        // Legacy fallback — 테넌트 경로에서 settings/identity 조회
        const tdb = tenantDb(sid);
        const oldDoc = await tdb.collection('settings').doc('identity').get();
        if (oldDoc.exists) {
            return oldDoc.data().studioName || "Studio";
        }
    } catch (e) {
        console.warn("Failed to fetch studio name:", e);
    }
    return "Studio";
};

/**
 * 스튜디오 로고 URL 가져오기 (SaaS 동적 브랜딩)
 */
const getStudioLogoUrl = async (overrideStudioId) => {
    try {
        const sid = overrideStudioId || process.env.STUDIO_ID || STUDIO_ID;
        const doc = await admin.firestore().collection('studios').doc(sid).get();
        if (doc.exists && doc.data().IDENTITY?.LOGO_URL) {
            return doc.data().IDENTITY.LOGO_URL;
        }
    } catch (e) {
        console.warn("Failed to fetch studio logo:", e);
    }
    return '/assets/passflow_square_logo.png'; // SaaS 중립 폴백 (특정 스튜디오 URL 아님)
};

module.exports = {
    admin,
    tenantDb, // [TENANT] 테넌트 격리 헬퍼
    STUDIO_ID, // [TENANT] 스튜디오 ID 상수
    logAIError,
    logAIRequest,
    getAI,
    checkAIQuota,
    createPendingApproval,
    getStudioName, // [NEW] 동적 브랜딩 지원
    getStudioLogoUrl, // [NEW] 동적 로고 URL
    FCM_COLLECTIONS,
    getAllFCMTokens,
    getKSTDateString // [NEW] 안전한 날짜 생성기
};
