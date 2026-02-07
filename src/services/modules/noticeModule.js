/**
 * Notice Service Module
 * 공지사항 관련 CRUD 작업을 처리합니다.
 * 
 * @module noticeModule
 * [Refactor] Extracted from storage.js
 */

import { db, functions } from "../../firebase";
import { collection, addDoc, deleteDoc, getDocs, doc, query, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

/**
 * 공지사항 추가
 */
export const addNotice = async (title, content, image = null) => {
    try {
        const today = new Date();
        const dateStr = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        await addDoc(collection(db, 'notices'), {
            title,
            content,
            image,
            date: dateStr,
            timestamp: today.toISOString()
        });
        return { success: true };
    } catch (e) {
        console.error("Add notice failed:", e);
        throw e;
    }
};

/**
 * 공지사항 삭제
 */
export const deleteNotice = async (noticeId) => {
    try {
        await deleteDoc(doc(db, 'notices', noticeId));
        return { success: true };
    } catch (e) {
        console.error("Delete notice failed:", e);
        throw e;
    }
};

/**
 * 공지사항 목록 조회 (캐시 없을 때 사용)
 */
export const loadNotices = async () => {
    try {
        const q = query(
            collection(db, 'notices'),
            orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn("Load notices failed:", e);
        return [];
    }
};

/**
 * 공지사항 다국어 번역
 */
export const translateNotices = async (notices, targetLang) => {
    if (targetLang === 'ko' || !notices || notices.length === 0) return notices;

    try {
        const translate = httpsCallable(functions, 'translateContentV2');
        const res = await translate({ 
            items: notices.map(n => ({ title: n.title, content: n.content })), 
            targetLang 
        });
        const translated = res.data?.translations || [];
        return notices.map((n, i) => ({
            ...n,
            title: translated[i]?.title || n.title,
            content: translated[i]?.content || n.content
        }));
    } catch (e) {
        console.warn("Translation failed:", e);
        return notices;
    }
};
