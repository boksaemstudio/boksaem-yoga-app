// src/hooks/useAttendanceCamera.js
import { useEffect, useRef } from 'react';
import { storage } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

export const useAttendanceCamera = (PHOTO_ENABLED) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const cameraStreamRef = useRef(null);
    const capturedPhotoRef = useRef(null);
    const isCapturingRef = useRef(false);
    const lastCaptureTimeRef = useRef(0);
    const capturePromisesRef = useRef([]);

    // [PHOTO] 카메라 초기화
    useEffect(() => {
        if (!PHOTO_ENABLED) return;
        
        let isMounted = true;
        
        const initCamera = async () => {
            try {
                // [O] 800x600 ideal resolution for better quality
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 800 }, height: { ideal: 600 } }
                });
                
                if (isMounted) {
                    cameraStreamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.setAttribute('autoplay', '');
                        videoRef.current.setAttribute('muted', '');
                        videoRef.current.setAttribute('playsinline', '');
                        
                        videoRef.current.play().catch(e => {
                            console.warn('[PHOTO] Autoplay blocked, will retry on interaction:', e);
                        });
                    }
                    console.log('[PHOTO] Camera initialized successfully (800x600)');
                } else {
                    stream.getTracks().forEach(t => t.stop());
                }
            } catch (err) {
                console.warn('[PHOTO] Camera init failed:', err.message);
            }
        };

        initCamera();

        return () => {
            isMounted = false;
            if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach(t => t.stop());
                cameraStreamRef.current = null;
            }
            if (videoRef.current) videoRef.current.srcObject = null;
        };
    }, [PHOTO_ENABLED]);

    // [PHOTO] 프레임 캡처
    const capturePhoto = () => {
        if (!PHOTO_ENABLED) return;
        
        // [O] Cooldown: Don't capture more than once every 10 seconds to save CPU
        const now = Date.now();
        if (now - lastCaptureTimeRef.current < 10000 && capturedPhotoRef.current) {
            console.log('[PHOTO] Skipping capture: cooling down');
            return;
        }

        if (!videoRef.current || !canvasRef.current || !cameraStreamRef.current) return;

        const video = videoRef.current;
        if (video.readyState < 2 || video.paused) {
            video.play().catch(() => {});
            return;
        }
        
        // [CRITICAL FIX] Clear old photo so uploadPhoto is forced to wait for THIS new capture
        capturedPhotoRef.current = null;
        
        const canvas = canvasRef.current;
        // [O] Set higher resolution (800x600)
        canvas.width = 800;
        canvas.height = 600;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 800, 600);
        
        isCapturingRef.current = true;
        const capturePromise = new Promise((resolve) => {
            const timeout = setTimeout(() => {
                isCapturingRef.current = false;
                resolve(null);
            }, 5000);

            try {
                // [O] Switch to WebP for better compression (v10)
                canvas.toBlob((blob) => {
                    clearTimeout(timeout);
                    if (blob) {
                        capturedPhotoRef.current = blob;
                        lastCaptureTimeRef.current = Date.now();
                        console.log(`[PHOTO] Captured WebP: ${(blob.size / 1024).toFixed(1)}KB`);
                    }
                    isCapturingRef.current = false;
                    resolve(blob);
                }, 'image/webp', 0.8);
            } catch (err) {
                clearTimeout(timeout);
                isCapturingRef.current = false;
                resolve(null);
            }
        });
        
        capturePromisesRef.current.push(capturePromise);
        if (capturePromisesRef.current.length > 3) capturePromisesRef.current.shift();
    };

    // [PHOTO] 비동기 업로드
    const uploadPhoto = async (attendanceId, memberName, status) => {
        if (!PHOTO_ENABLED) return;
        // [FIX] navigator.onLine 체크 제거 — 태블릿에서 잘못 감지될 수 있음
        // 업로드 시도 후 실패하면 catch에서 처리

        // [CRITICAL FIX] Always wait if capture is active, regardless of having an old blob
        if (isCapturingRef.current && capturePromisesRef.current.length > 0) {
            console.log('[PHOTO] Waiting for active capture...');
            const lastPromise = capturePromisesRef.current[capturePromisesRef.current.length - 1];
            await Promise.race([
                lastPromise,
                new Promise(r => setTimeout(r, 6000))
            ]);
        }

        // [FIX] blob이 아직 없으면 짧은 대기 후 재확인 (toBlob 콜백 지연 대비)
        if (!capturedPhotoRef.current) {
            console.log('[PHOTO] No blob yet, waiting 500ms...');
            await new Promise(r => setTimeout(r, 500));
        }

        const blob = capturedPhotoRef.current;
        if (!blob) {
            console.warn('[PHOTO] No captured photo available for upload. Camera may not be active.');
            return;
        }

        if (!attendanceId) {
            console.warn('[PHOTO] No attendanceId provided (offline mode?). Skipping doc update.');
        }

        try {
            const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            const fileName = `${attendanceId || Date.now()}.webp`;
            const path = `attendance-photos/${today}/${fileName}`;
            const fileRef = storageRef(storage, path);
            
            await uploadBytes(fileRef, blob, { contentType: 'image/webp' });
            const url = await getDownloadURL(fileRef);

            if (attendanceId) {
                const { doc, updateDoc } = await import('firebase/firestore');
                const { db } = await import('../firebase');
                await updateDoc(doc(db, 'attendance', attendanceId), {
                    photoUrl: url,
                    photoStatus: status || 'unknown'
                });
            }
            console.log(`[PHOTO] Upload Success: ${path} (${(blob.size / 1024).toFixed(1)}KB)`);
        } catch (err) {
            console.error(`[PHOTO] Upload failed:`, err.message);
            try {
                const { logError } = await import('../services/modules/errorModule');
                await logError(`[PHOTO] Upload failed for ${memberName || 'unknown'}`, { 
                    error: err.message, 
                    attendanceId 
                });
            } catch (e) {}
        } finally {
            // [O] Immediate memory release
            capturedPhotoRef.current = null;
        }
    };

    return {
        videoRef,
        canvasRef,
        capturePhoto,
        uploadPhoto
    };
};
