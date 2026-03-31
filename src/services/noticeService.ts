/**
 * Notice Service — Studio Notices
 * TypeScript version
 */
import { functions, storage } from "../firebase";
import { addDoc, deleteDoc, getDocs, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { tenantStoragePath } from '../utils/tenantStorage';
import { httpsCallable } from "firebase/functions";
import { tenantDb } from '../utils/tenantDb';

// ── Types ──
export interface Notice {
    id: string;
    title?: string;
    content?: string;
    image?: string | null;
    images?: string[];
    sendPush?: boolean;
    date?: string;
    timestamp?: string;
}

// ── Service ──
export const addNotice = async (title: string, content: string, images: string[] | string = [], sendPush = true): Promise<{ success: boolean }> => {
    try {
        const today = new Date();
        const dateStr = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

        let imageList: string[] = Array.isArray(images) ? images : (typeof images === 'string' ? [images] : []);
        let finalImages: string[] = [];

        if (imageList.length > 0) {
            const uploadPromises = imageList.map(async (imgData, index) => {
                if (typeof imgData === 'string' && imgData.startsWith('data:image')) {
                    try {
                        const res = await fetch(imgData);
                        const blob = await res.blob();
                        const storageRef = ref(storage, tenantStoragePath(`notices/${Date.now()}_${index}.webp`));
                        const uploadPromise = uploadBytes(storageRef, blob);
                        const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('STORAGE_TIMEOUT')), 15000));
                        await Promise.race([uploadPromise, timeoutPromise]);
                        return await getDownloadURL(storageRef);
                    } catch (uploadErr) {
                        console.warn(`[Storage] Storage upload failed (${(uploadErr as Error).message}). Using compressed Base64 fallback.`);
                        try {
                            const compressedBase64 = await new Promise<string | null>((resolve) => {
                                const img = new Image();
                                img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    const MAX_WIDTH = 400;
                                    let w = img.width, h = img.height;
                                    if (w > MAX_WIDTH) { h *= MAX_WIDTH / w; w = MAX_WIDTH; }
                                    canvas.width = w; canvas.height = h;
                                    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                                    resolve(canvas.toDataURL('image/jpeg', 0.3));
                                };
                                img.onerror = () => resolve(null);
                                img.src = imgData;
                            });
                            if (compressedBase64) return compressedBase64;
                        } catch { /* ignore */ }
                        return null;
                    }
                }
                return imgData;
            });
            finalImages = (await Promise.all(uploadPromises)).filter((v): v is string => !!v);
        }

        await addDoc(tenantDb.collection('notices'), {
            title, content,
            image: finalImages.length > 0 ? finalImages[0] : null,
            images: finalImages, sendPush, date: dateStr, timestamp: today.toISOString()
        });
        return { success: true };
    } catch (e) {
        console.error("Add notice failed:", e);
        throw e;
    }
};

export const loadNotices = async (): Promise<Notice[]> => {
    try {
        const q = query(tenantDb.collection('notices'), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Notice));
    } catch (e) {
        console.warn("Load notices failed:", e);
        return [];
    }
};

export const deleteNotice = async (noticeId: string): Promise<{ success: boolean }> => {
    await deleteDoc(tenantDb.doc('notices', noticeId));
    return { success: true };
};

export const translateNotices = async (notices: Notice[], targetLang: string): Promise<Notice[]> => {
    if (targetLang === 'ko' || !notices || notices.length === 0) return notices;
    try {
        const translateCall = httpsCallable(functions, 'translateNoticesV2');
        const response = await translateCall({ notices: notices.map(n => ({ id: n.id, title: n.title, content: n.content })), language: targetLang });
        const data = response.data as { notices?: Array<{ id: string; title?: string; content?: string }> };
        if (data?.notices) {
            return data.notices.map(translated => {
                const original = notices.find(n => n.id === translated.id);
                return { ...original, ...translated } as Notice;
            });
        }
        return notices;
    } catch (e) {
        console.warn("[Storage] Notice translation failed:", e);
        return notices;
    }
};
