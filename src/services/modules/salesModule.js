/**
 * Sales Service Module
 * 매출 관련 CRUD 작업을 처리합니다.
 * 
 * @module salesModule
 * [Refactor] Extracted from storage.js
 */

import { db } from "../../firebase";
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";

/**
 * 매출 기록 추가
 */
export const addSalesRecord = async (data) => {
    try {
        await addDoc(collection(db, 'sales'), {
            ...data,
            timestamp: new Date().toISOString()
        });
        return true;
    } catch (e) {
        console.error("Add sales failed:", e);
        throw e;
    }
};

/**
 * 회원별 매출 기록 조회
 */
export const getSalesHistory = async (memberId) => {
    try {
        const q = query(
            collection(db, 'sales'),
            where("memberId", "==", memberId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn("Get sales history failed:", e);
        return [];
    }
};

/**
 * 전체 매출 기록 조회
 */
export const getAllSales = async () => {
    try {
        const q = query(
            collection(db, 'sales'),
            orderBy("timestamp", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.warn("Get all sales failed:", e);
        return [];
    }
};

/**
 * 매출 조회 (alias)
 */
export const getSales = getAllSales;
