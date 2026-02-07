/**
 * Error/Monitoring Service Module
 * 에러 로깅 및 모니터링 관련 작업을 처리합니다.
 * 
 * @module errorModule
 * [Refactor] Extracted from storage.js
 */

import { db } from "../../firebase";
import { collection, addDoc, deleteDoc, getDocs, doc, query, orderBy, limit as firestoreLimit, writeBatch } from "firebase/firestore";

/**
 * 에러 로그 기록
 */
export const logError = async (error, context = {}) => {
    try {
        await addDoc(collection(db, 'error_logs'), {
            message: error?.message || String(error),
            stack: error?.stack || null,
            context,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error("[Error Module] Failed to log error:", e);
    }
};

/**
 * 에러 로그 조회
 */
export const getErrorLogs = async (limitCount = 50) => {
    try {
        const q = query(
            collection(db, 'error_logs'),
            orderBy('timestamp', 'desc'),
            firestoreLimit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn("Failed to fetch error logs:", e);
        return [];
    }
};

/**
 * 단일 에러 로그 삭제
 */
export const deleteErrorLog = async (logId) => {
    try {
        await deleteDoc(doc(db, 'error_logs', logId));
        return { success: true };
    } catch (e) {
        console.error("Delete error log failed:", e);
        throw e;
    }
};

/**
 * 모든 에러 로그 삭제
 */
export const clearErrorLogs = async () => {
    try {
        const snapshot = await getDocs(collection(db, 'error_logs'));
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return { success: true, count: snapshot.size };
    } catch (e) {
        console.error("Clear error logs failed:", e);
        throw e;
    }
};

/**
 * 푸시 히스토리 조회
 */
export const getPushHistory = async (limitCount = 50) => {
    try {
        const q = query(
            collection(db, 'push_history'),
            orderBy('createdAt', 'desc'),
            firestoreLimit(limitCount)
        );
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                displayDate: data.createdAt?.toDate?.() || data.createdAt || new Date()
            };
        });
    } catch (e) {
        console.warn('Failed to fetch push history:', e);
        return [];
    }
};
