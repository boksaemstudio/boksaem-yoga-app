// src/hooks/useAttendanceCamera.js
import { useEffect, useRef } from 'react';
import { storage } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

export const useAttendanceCamera = (PHOTO_ENABLED) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const cameraStreamRef = useRef(null);
    const capturedPhotoRef = useRef(null);

    // [PHOTO] 카메라 초기화 — 마운트 시 한 번만 실행
    // 태블릿에서 최초 1회 카메라 권한 허용 후 자동 작동 (회원별 아님)
    useEffect(() => {
        if (!PHOTO_ENABLED) return;
        
        let isMounted = true;
        
        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
                });
                
                if (isMounted) {
                    cameraStreamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                    console.log('[PHOTO] Camera initialized successfully');
                } else {
                    // Stop tracks immediately if unmounted before promise resolved
                    stream.getTracks().forEach(t => t.stop());
                }
            } catch (err) {
                console.warn('[PHOTO] Camera init failed (permission denied or no camera):', err.message);
            }
        };

        initCamera();

        return () => {
            isMounted = false;
            // Clean up the camera stream when the component unmounts
            if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach(t => t.stop());
                cameraStreamRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [PHOTO_ENABLED]);

    // [PHOTO] 현재 프레임을 캡처하여 blob으로 저장
    const capturePhoto = () => {
        if (!PHOTO_ENABLED) return;
        if (!videoRef.current || !canvasRef.current || !cameraStreamRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = 320;
        canvas.height = 240;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 320, 240);
        
        canvas.toBlob((blob) => {
            if (blob) {
                capturedPhotoRef.current = blob;
                console.log(`[PHOTO] Captured: ${(blob.size / 1024).toFixed(1)}KB`);
            }
        }, 'image/webp', 0.6);
    };

    // [PHOTO] 비동기 업로드 (체크인 결과와 무관하게 백그라운드망에서 실행)
    const uploadPhoto = async (attendanceId, memberName, status) => {
        if (!PHOTO_ENABLED) return;
        
        const blob = capturedPhotoRef.current;
        if (!blob || !navigator.onLine) {
            capturedPhotoRef.current = null;
            return;
        }

        try {
            const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            const fileName = `${attendanceId || Date.now()}.webp`;
            const path = `attendance-photos/${today}/${fileName}`;
            const fileRef = storageRef(storage, path);
            
            // Upload to Firebase Storage
            await uploadBytes(fileRef, blob, { contentType: 'image/webp' });
            const url = await getDownloadURL(fileRef);

            // Firestore에 photoUrl 추가 저장 (출석 기록이 있는 경우에만)
            if (attendanceId) {
                // To avoid circular dependency or heavy initial load, we dynamically import firestore
                const { doc, updateDoc } = await import('firebase/firestore');
                const { db } = await import('../firebase');
                await updateDoc(doc(db, 'attendance', attendanceId), {
                    photoUrl: url,
                    photoStatus: status || 'unknown'
                });
            }
            console.log(`[PHOTO] Uploaded: ${path} for ${memberName || 'unknown'}`);
        } catch (err) {
            console.warn('[PHOTO] Upload failed (non-blocking):', err.message);
        } finally {
            // Free memory after upload attempt
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
