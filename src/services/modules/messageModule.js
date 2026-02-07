/**
 * Message Service Module
 * 메시지/푸시 관련 CRUD 작업을 처리합니다.
 * 
 * @module messageModule
 * [Refactor] Extracted from storage.js
 */

import { db } from "../../firebase";
import { collection, addDoc, getDocs, query, where, orderBy, limit as firestoreLimit } from "firebase/firestore";

/**
 * 개인 메시지 추가 (푸시 알림 트리거)
 */
export const addMessage = async (memberId, content) => {
    try {
        if (!memberId || !content) throw new Error("Invalid message data");

        const docRef = await addDoc(collection(db, 'messages'), {
            memberId,
            content,
            type: 'admin_individual',
            createdAt: new Date().toISOString(),
            timestamp: new Date().toISOString()
        });

        console.log(`[Message] Message added for ${memberId}: ${docRef.id}. Triggering push...`);
        return { success: true, id: docRef.id };
    } catch (e) {
        console.error("Add message failed:", e);
        throw e;
    }
};

/**
 * 회원별 메시지 기록 조회
 */
export const getMessages = async (memberId) => {
    try {
        const q = query(
            collection(db, 'messages'),
            where("memberId", "==", memberId),
            orderBy("timestamp", "desc"),
            firestoreLimit(50)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn("Get messages failed:", e);
        return [];
    }
};

/**
 * 벌크 푸시 캠페인 생성
 */
export const sendBulkPushCampaign = async (targetMemberIds, title, body) => {
    try {
        if (!body) throw new Error("Message body is required");

        const docRef = await addDoc(collection(db, 'push_campaigns'), {
            target: 'selected',
            memberIds: targetMemberIds,
            title: title || '복샘요가',
            body,
            status: 'pending',
            createdAt: new Date().toISOString()
        });

        console.log(`[Message] Bulk push campaign created: ${docRef.id}`);
        return { success: true, id: docRef.id };
    } catch (e) {
        console.error("Send bulk push failed:", e);
        throw e;
    }
};

/**
 * 회원별 모든 메시지 조회 (개인 + 공지)
 */
export const getMessagesByMemberId = async (memberId, cachedNotices = []) => {
    try {
        // 1. Get individual messages
        const msgQuery = query(
            collection(db, 'messages'),
            where("memberId", "==", memberId),
            orderBy("timestamp", "desc"),
            firestoreLimit(50)
        );
        const msgSnapshot = await getDocs(msgQuery);
        const individualMessages = msgSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            type: 'individual'
        }));

        // 2. Get notices (use cached if available)
        let notices = cachedNotices;
        if (!notices || notices.length === 0) {
            const noticeQuery = query(
                collection(db, 'notices'),
                orderBy("date", "desc"),
                firestoreLimit(30)
            );
            const noticeSnapshot = await getDocs(noticeQuery);
            notices = noticeSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: 'notice'
            }));
        } else {
            notices = notices.map(n => ({ ...n, type: 'notice' }));
        }

        // 3. Merge and sort
        const combined = [...individualMessages, ...notices].sort((a, b) => {
            const dateA = new Date(a.timestamp || a.date || 0);
            const dateB = new Date(b.timestamp || b.date || 0);
            return dateB - dateA;
        });

        return combined;
    } catch (e) {
        console.warn("Get messages by member failed:", e);
        return [];
    }
};
