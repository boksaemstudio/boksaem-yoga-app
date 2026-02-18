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

// [UNIFIED] FCM 토큰 컬렉션 상수 (레거시 마이그레이션 완료 시까지 유지)
const FCM_COLLECTIONS = ["fcm_tokens", "fcmTokens", "push_tokens"];

/**
 * 모든 FCM 컬렉션에서 토큰을 조회하는 공통 헬퍼
 * @param {Object} db - Firestore instance
 * @param {Object} filters - { memberId, role, instructorName } 등 필터 조건
 * @returns {Object} { tokens: string[], tokenSources: { token: collectionName } }
 */
const getAllFCMTokens = async (db, filters = {}) => {
    const tokens = [];
    const tokenSources = {};

    for (const col of FCM_COLLECTIONS) {
        try {
            let q = db.collection(col);
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
    const db = admin.firestore();
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const quotaRef = db.collection('ai_quota').doc(today);
    
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

module.exports = {
    admin,
    logAIError,
    logAIRequest,
    getAI,
    checkAIQuota,
    createPendingApproval,
    FCM_COLLECTIONS,
    getAllFCMTokens
};
