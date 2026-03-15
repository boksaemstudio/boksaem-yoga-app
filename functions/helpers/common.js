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
const tenantDb = () => {
    const db = admin.firestore();
    return {
        /** 테넌트 격리된 컬렉션 참조 */
        collection: (name) => db.collection(`studios/${STUDIO_ID}/${name}`),
        /** 테넌트 격리된 문서 참조 (콜렉션/문서 경로) */
        doc: (collectionName, docId) => docId
            ? db.doc(`studios/${STUDIO_ID}/${collectionName}/${docId}`)
            : db.collection(`studios/${STUDIO_ID}/${collectionName}`).doc(),
        /** 글로벌(루트) Firestore 직접 접근 (rate_limits, ai_logs 등) */
        raw: () => db
    };
};
// ──────────────────────────────────────────────────────────────────

// [UNIFIED] FCM 토큰 컬렉션 상수 (레거시 마이그레이션 완료 시까지 유지)
const FCM_COLLECTIONS = ["fcm_tokens", "fcmTokens", "push_tokens"];

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
 * @param {Object} filters - { memberId, role, instructorName } 등 필터 조건
 * @returns {Object} { tokens: string[], tokenSources: { token: collectionName } }
 */
const getAllFCMTokens = async (_db, filters = {}) => {
    const tokens = [];
    const tokenSources = {};
    const tdb = tenantDb();

    for (const col of FCM_COLLECTIONS) {
        try {
            let q = tdb.collection(col);
            if (filters.memberId) q = q.where('memberId', '==', filters.memberId);
            if (filters.role) q = q.where('role', '==', filters.role);
            if (filters.instructorName) q = q.where('instructorName', '==', filters.instructorName);
            
            const snap = await q.get();
            snap.docs.forEach(doc => {
                if (!tokens.includes(doc.id)) {
                    tokens.push(doc.id);
                    tokenSources[doc.id] = col;
                }
            });
        } catch (e) {
            // Collection might not exist, skip
        }
    }
    return { tokens, tokenSources };
};

/**
 * AI 에러 로깅
 */
const logAIError = async (context, error) => {
    try {
        await admin.firestore().collection('ai_error_logs').add({
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
const logAIRequest = async (type, memberName, data, context) => {
    try {
        await admin.firestore().collection('ai_request_logs').add({
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
const checkAIQuota = async () => {
    // [FIX] 순환 require('./common') 제거 — 동일 파일 스코프의 getKSTDateString 직접 사용
    const today = getKSTDateString();
    // [FIX] 미선언 변수 db → admin.firestore() 사용
    const quotaRef = admin.firestore().collection('ai_quota').doc(today);
    
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
const createPendingApproval = async (type, targetMemberIds, title, body, data = {}) => {
    const db = admin.firestore();
    await db.collection('pending_approvals').add({
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
const getStudioName = async () => {
    try {
        const studioId = process.env.STUDIO_ID || 'default';
        const doc = await admin.firestore().collection('studios').doc(studioId).get();
        if (doc.exists) {
            return doc.data().IDENTITY?.NAME || "요가 스튜디오";
        }
        // Legacy fallback
        const oldDoc = await admin.firestore().collection('settings').doc('identity').get();
        if (oldDoc.exists) {
            return oldDoc.data().studioName || "요가 스튜디오";
        }
    } catch (e) {
        console.warn("Failed to fetch studio name:", e);
    }
    return "요가 스튜디오";
};

/**
 * 스튜디오 로고 URL 가져오기 (SaaS 동적 브랜딩)
 */
const getStudioLogoUrl = async () => {
    try {
        const studioId = process.env.STUDIO_ID || 'default';
        const doc = await admin.firestore().collection('studios').doc(studioId).get();
        if (doc.exists && doc.data().IDENTITY?.LOGO_URL) {
            return doc.data().IDENTITY.LOGO_URL;
        }
    } catch (e) {
        console.warn("Failed to fetch studio logo:", e);
    }
    return 'https://boksaem-yoga.web.app/logo_circle.png'; // 기본 폴백
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
