/**
 * Image Service Module
 * 이미지 관련 CRUD 작업을 처리합니다.
 * 
 * @module imageModule
 * [Refactor] Extracted from storage.js
 */

import { db } from "../../firebase";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";

/**
 * 이미지 목록 조회
 * @param {Object} cachedImages - 캐시된 이미지 객체 (storage.js에서 주입)
 * @param {Function} updateCache - 캐시 업데이트 콜백
 */
export const getImages = async (cachedImages = {}, updateCache = null) => {
    // 캐시가 있으면 반환
    if (Object.keys(cachedImages).length > 0) {
        return cachedImages;
    }

    // 캐시 없으면 Firestore에서 직접 조회
    try {
        console.log("[ImageModule] Fetching images from Firestore...");
        const snapshot = await getDocs(collection(db, 'images'));
        const imgs = {};
        snapshot.docs.forEach(doc => {
            imgs[doc.id] = doc.data().url || doc.data().base64;
        });
        
        // 캐시 업데이트 콜백 실행
        if (updateCache) updateCache(imgs);
        
        console.log("[ImageModule] Fetched images:", Object.keys(imgs).length);
        return imgs;
    } catch (e) {
        console.warn("[ImageModule] Failed to fetch images:", e);
        return {};
    }
};

/**
 * 이미지 업데이트
 * @param {string} id - 이미지 ID
 * @param {string} base64 - Base64 인코딩된 이미지 데이터
 * @param {Function} updateCache - 캐시 업데이트 콜백
 * @param {Function} notifyListeners - 리스너 알림 콜백
 */
export const updateImage = async (id, base64, updateCache = null, notifyListeners = null) => {
    try {
        if (!base64 || !id) throw new Error("Invalid image data");

        console.log(`[ImageModule] Updating image ${id}. Length: ${base64.length}`);
        
        // 캐시 즉시 업데이트
        if (updateCache) updateCache(id, base64);
        
        // 리스너 알림
        if (notifyListeners) notifyListeners();

        // Firestore 업데이트
        await setDoc(doc(db, 'images', id), { 
            base64, 
            updatedAt: new Date().toISOString() 
        }, { merge: true });
        
        console.log(`[ImageModule] Image update complete: ${id}`);
        return true;
    } catch (e) {
        console.error("[ImageModule] Update image failed:", e);
        throw e;
    }
};
