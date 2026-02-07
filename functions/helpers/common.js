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
    const today = new Date().toISOString().split('T')[0];
    const quotaRef = db.collection('ai_quota').doc(today);
    
    const quotaSnap = await quotaRef.get();
    const currentCount = quotaSnap.exists ? quotaSnap.data().count || 0 : 0;
    const dailyLimit = 5000; // Configurable
    
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
    getAI,
    checkAIQuota,
    createPendingApproval
};
