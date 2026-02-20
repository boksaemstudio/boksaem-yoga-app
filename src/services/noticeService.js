import { db, functions, storage } from "../firebase";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";

export const addNotice = async (title, content, images = [], sendPush = true) => {
    try {
        const today = new Date();
        const dateStr = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); 
        
        let imageList = [];
        if (Array.isArray(images)) {
            imageList = images;
        } else if (typeof images === 'string') {
            imageList = [images];
        }

        let finalImages = [];
        if (imageList && imageList.length > 0) {
            const uploadPromises = imageList.map(async (imgData, index) => {
                if (typeof imgData === 'string' && imgData.startsWith('data:image')) {
                    try {
                        const res = await fetch(imgData);
                        const blob = await res.blob();
                        const storageRef = ref(storage, `notices/${Date.now()}_${index}.webp`);
                        
                        const uploadPromise = uploadBytes(storageRef, blob);
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('STORAGE_TIMEOUT')), 15000)
                        );
                        
                        await Promise.race([uploadPromise, timeoutPromise]);
                        const downloadURL = await getDownloadURL(storageRef);
                        console.log(`[Storage] Uploaded image ${index+1}/${imageList.length} to Storage`);
                        return downloadURL;
                    } catch (uploadErr) {
                        console.warn(`[Storage] Storage upload failed (${uploadErr.message}). Using compressed Base64 fallback.`);
                        try {
                            const compressedBase64 = await new Promise((resolve) => {
                                const img = new Image();
                                img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    const MAX_WIDTH = 400; 
                                    let w = img.width, h = img.height;
                                    if (w > MAX_WIDTH) { h *= MAX_WIDTH / w; w = MAX_WIDTH; }
                                    canvas.width = w;
                                    canvas.height = h;
                                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                                    resolve(canvas.toDataURL('image/jpeg', 0.3)); 
                                };
                                img.onerror = () => resolve(null);
                                img.src = imgData;
                            });
                            if (compressedBase64) return compressedBase64;
                        } catch { /* ignore */ }
                        return null; 
                    }
                } else {
                    return imgData;
                }
            });

            finalImages = (await Promise.all(uploadPromises)).filter(Boolean);
        }
        const finalPrimaryImage = finalImages.length > 0 ? finalImages[0] : null;

        await addDoc(collection(db, 'notices'), {
            title,
            content,
            image: finalPrimaryImage, 
            images: finalImages,      
            sendPush,            
            date: dateStr,
            timestamp: today.toISOString()
        });
        return { success: true };
    } catch (e) {
        console.error("Add notice failed:", e);
        throw e;
    }
};

export const deleteNotice = async (noticeId) => {
    try {
        await deleteDoc(doc(db, 'notices', noticeId));
        return { success: true };
    } catch (e) {
        console.error("Delete notice failed:", e);
        throw e;
    }
};

export const translateNotices = async (notices, targetLang) => {
    if (targetLang === 'ko' || !notices || notices.length === 0) return notices;
    try {
        const translateCall = httpsCallable(functions, 'translateNoticesV2');
        const response = await translateCall({ notices: notices.map(n => ({ id: n.id, title: n.title, content: n.content })), language: targetLang });
        if (response.data && response.data.notices) {
            return response.data.notices.map(translated => {
                const original = notices.find(n => n.id === translated.id);
                return { ...original, ...translated };
            });
        }
        return notices;
    } catch (e) {
        console.warn("[Storage] Notice translation failed:", e);
        return notices;
    }
};
