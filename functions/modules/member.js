/**
 * Member Module
 * 회원 관련 Cloud Functions
 * 
 * @module modules/member
 * [Refactor] Extracted from index.js
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, getAI, createPendingApproval } = require("../helpers/common");

/**
 * 보안 회원 조회 (PIN 기반)
 */
exports.getSecureMemberV2Call = onCall({ 
    cors: ['https://boksaem-yoga.web.app', 'https://boksaem-yoga.firebaseapp.com']
}, async (request) => {
    const db = admin.firestore();
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
        const maxAttempts = 10;
        
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
        
        const snapshot = await db.collection('members').where('phoneLast4', '==', phoneLast4).limit(10).get();
        if (snapshot.empty) return { members: [] };

        const members = snapshot.docs.map(doc => {
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
 * 만료 예정 회원 체크 (매일 13:00)
 */
exports.checkExpiringMembersV2 = onSchedule({
    schedule: 'every day 13:00',
    timeZone: 'Asia/Seoul'
}, async (event) => {
    const db = admin.firestore();
    const ai = getAI();
    const today = new Date();
    const targetDateStr = today.toISOString().split('T')[0];

    try {
        const snapshot = await db.collection('members').where('endDate', '==', targetDateStr).get();
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
                await createPendingApproval('expiration', memberIds, "복샘요가 알림", body, { lang, date: targetDateStr });
            }
        }
    } catch (error) {
        console.error("Error in scheduled expiration check:", error);
    }
    return null;
});
