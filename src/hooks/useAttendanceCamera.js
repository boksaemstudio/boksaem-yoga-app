// src/hooks/useAttendanceCamera.js
import { useEffect, useRef, useCallback, useState } from 'react';
import { storage } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { tenantStoragePath } from '../utils/tenantStorage';
import { storageService } from '../services/storage';
export const useAttendanceCamera = PHOTO_ENABLED => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const capturedPhotoRef = useRef(null);
  const isCapturingRef = useRef(false);
  const lastCaptureTimeRef = useRef(0);
  const capturePromisesRef = useRef([]);
  const isRecoveringRef = useRef(false);
  const recoveryCountRef = useRef(0);
  const [stream, setStream] = useState(null);

  // [PHOTO] 카메라 초기화 (재사용 가능한 함수로 분리)
  const initCamera = useCallback(async (reason = 'initial') => {
    if (!PHOTO_ENABLED) return false;
    if (isRecoveringRef.current) {
      console.log('[PHOTO] Recovery already in progress, skipping.');
      return false;
    }
    isRecoveringRef.current = true;
    try {
      // 기존 스트림 정리
      if (cameraStreamRef.current) {
        try {
          cameraStreamRef.current.getTracks().forEach(t => t.stop());
        } catch (e) {}
        cameraStreamRef.current = null;
      }
      // [FIX] 원장님 지시 없이 임의로 추가했던 해상도(width: 800) 제약을 완전히 삭제하고 기본값으로 원복합니다.
      const streamObj = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      cameraStreamRef.current = streamObj;
      setStream(streamObj);

      // [FIX] track.onended 이벤트 감시 — 스트림이 죽으면 자동 복구
      streamObj.getVideoTracks().forEach(track => {
        track.onended = () => {
          console.warn(`[PHOTO] ⚠️ Camera track ended unexpectedly! Reason: ${track.label}`);
          cameraStreamRef.current = null;
          setStream(null);
          // 짧은 딜레이 후 자동 복구 시도
          setTimeout(() => initCamera('track_ended'), 2000);
        };
      });
      if (videoRef.current) {
        videoRef.current.srcObject = streamObj;
        videoRef.current.setAttribute('autoplay', '');
        videoRef.current.setAttribute('muted', '');
        videoRef.current.setAttribute('playsinline', '');
        await videoRef.current.play().catch(e => {
          console.warn('[PHOTO] Autoplay blocked, will retry on interaction:', e);
        });
      }
      recoveryCountRef.current = reason === 'initial' ? 0 : recoveryCountRef.current + 1;
      console.log(`[PHOTO] Camera initialized successfully (${reason}). Recovery count: ${recoveryCountRef.current}`);
      return true;
    } catch (err) {
      console.error(`[PHOTO] ❌ Camera init failed (${reason}):`, err.message);
      return false;
    } finally {
      isRecoveringRef.current = false;
    }
  }, [PHOTO_ENABLED]);

  // [PHOTO] 스트림 상태 확인 유틸리티
  const isStreamAlive = useCallback(() => {
    if (!cameraStreamRef.current) return false;
    const tracks = cameraStreamRef.current.getVideoTracks();
    if (tracks.length === 0) return false;
    // track.readyState: 'live' = 정상, 'ended' = 죽음
    return tracks.some(t => t.readyState === 'live');
  }, []);

  // [PHOTO] 카메라 초기화 + 복구 구독
  useEffect(() => {
    if (!PHOTO_ENABLED) return;
    let isMounted = true;

    // 초기 카메라 설정
    initCamera('initial');

    // [FIX] visibilitychange 기반 카메라 복구
    // 태블릿이 절전에서 깨어나면 카메라 스트림이 죽어있을 수 있음
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        // 잠시 Waitlisted at position 후 스트림 상태 확인 (OS가 리소스를 재할당할 시간)
        setTimeout(() => {
          if (!isMounted) return;
          if (!isStreamAlive()) {
            console.warn('[PHOTO] ⚠️ Camera stream dead after visibility change. Recovering...');
            initCamera('visibility_recovery');
          } else {
            // 스트림은 살아있지만 video가 paused일 수 있음
            if (videoRef.current && videoRef.current.paused) {
              console.log('[PHOTO] Video paused after visibility change, resuming...');
              videoRef.current.play().catch(() => {});
            }
          }
        }, 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // [FIX] 1분 Heartbeat — 스트림 건강 체크 (PWA 전체화면에서 visibilityState가 불안정하므로 항상 체크)
    const heartbeatInterval = setInterval(() => {
      if (!isMounted) return;
      if (!isStreamAlive()) {
        console.warn('[PHOTO] ⚠️ Heartbeat: Camera stream is dead. Recovering...');
        initCamera('heartbeat_recovery');
      } else if (videoRef.current && videoRef.current.paused) {
        console.log('[PHOTO] Heartbeat: Video is paused, resuming...');
        videoRef.current.play().catch(() => {});
      }
    }, 60 * 1000); // 1분

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
        setStream(null);
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [PHOTO_ENABLED, initCamera, isStreamAlive]);

  // [PHOTO] 프레임 캡처 — Silent Return 로깅 강화
  const capturePhoto = useCallback(() => {
    if (!PHOTO_ENABLED) {
      // L63 silent return → 이제 로그 추가
      return;
    }

    // [O] Cooldown: Don't capture more than once every 10 seconds to save CPU
    const now = Date.now();
    if (now - lastCaptureTimeRef.current < 10000 && capturedPhotoRef.current) {
      console.log('[PHOTO] Skipping capture: cooling down');
      return;
    }

    // [FIX] Silent return 경로에 로그 추가 + 스트림 복구 트리거
    if (!videoRef.current || !canvasRef.current) {
      console.warn('[PHOTO] ⚠️ Missing video/canvas ref. Cannot capture.');
      return;
    }
    if (!cameraStreamRef.current || !isStreamAlive()) {
      console.warn('[PHOTO] ⚠️ Camera stream is not available. Triggering recovery + retry...');
      // [FIX] 복구+재캡처를 Promise로 감싸서 uploadPhoto가 대기할 수 있게 등록
      const recoveryPromise = initCamera('capture_recovery').then(ok => {
        if (ok) {
          return new Promise(resolve => {
            setTimeout(() => {
              const v = videoRef.current;
              if (v && v.readyState >= 2 && !v.paused && isStreamAlive()) {
                console.log('[PHOTO] ✅ Recovery succeeded, retrying capture...');
                doCapture(v);
                // doCapture 안에서 toBlob은 비동기이므로 추가 대기
                setTimeout(() => resolve(capturedPhotoRef.current), 1000);
              } else {
                console.warn('[PHOTO] ⚠️ Recovery succeeded but video still not ready.');
                resolve(null);
              }
            }, 1500);
          });
        }
        return null;
      });
      capturePromisesRef.current.push(recoveryPromise);
      if (capturePromisesRef.current.length > 5) capturePromisesRef.current.shift();
      return;
    }
    const video = videoRef.current;
    if (video.readyState < 2 || video.paused) {
      console.warn(`[PHOTO] ⚠️ Video not ready (readyState=${video.readyState}, paused=${video.paused}). Attempting play + delayed retry...`);
      video.play().catch(() => {});
      // [FIX] 즉시 포기하지 말고 500ms 후 한번 더 시도
      setTimeout(() => {
        if (video.readyState >= 2 && !video.paused) {
          console.log('[PHOTO] Retry after play() succeeded. Capturing now...');
          doCapture(video);
        } else {
          console.warn('[PHOTO] ⚠️ Retry failed. Video still not ready.');
        }
      }, 500);
      return;
    }
    doCapture(video);
  }, [PHOTO_ENABLED, initCamera, isStreamAlive]);

  // 실제 캡처 로직 분리
  const doCapture = useCallback(video => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // [CRITICAL FIX] Clear old photo so uploadPhoto is forced to wait for THIS new capture
    capturedPhotoRef.current = null;

    // [FIX] 해상도 강제 고정(800x600)을 제거하고 카메라 원본 비율을 유지합니다.
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    isCapturingRef.current = true;
    const capturePromise = new Promise(resolve => {
      const timeout = setTimeout(() => {
        console.warn('[PHOTO] ⚠️ toBlob timed out after 5s');
        isCapturingRef.current = false;
        resolve(null);
      }, 5000);
      try {
        // [O] Switch to WebP for better compression (v10), with JPEG fallback for older iOS
        canvas.toBlob(blob => {
          if (blob) {
            clearTimeout(timeout);
            capturedPhotoRef.current = blob;
            lastCaptureTimeRef.current = Date.now();
            console.log(`[PHOTO] ✅ Captured WebP: ${(blob.size / 1024).toFixed(1)}KB`);
            isCapturingRef.current = false;
            resolve(blob);
          } else {
            console.warn('[PHOTO] ⚠️ toBlob returned null for webp, falling back to jpeg');
            canvas.toBlob(fallbackBlob => {
              clearTimeout(timeout);
              if (fallbackBlob) {
                capturedPhotoRef.current = fallbackBlob;
                lastCaptureTimeRef.current = Date.now();
                console.log(`[PHOTO] ✅ Captured JPEG Fallback: ${(fallbackBlob.size / 1024).toFixed(1)}KB`);
              } else {
                console.warn('[PHOTO] ❌ toBlob returned null blob for jpeg as well');
              }
              isCapturingRef.current = false;
              resolve(fallbackBlob);
            }, 'image/jpeg', 0.8);
          }
        }, 'image/webp', 0.8);
      } catch (err) {
        clearTimeout(timeout);
        console.error('[PHOTO] ❌ toBlob threw:', err.message);
        isCapturingRef.current = false;
        resolve(null);
      }
    });
    capturePromisesRef.current.push(capturePromise);
    if (capturePromisesRef.current.length > 3) capturePromisesRef.current.shift();
  }, []);

  // [PHOTO] 비동기 업로드
  const uploadPhoto = async (attendanceId, memberName, status) => {
    if (!PHOTO_ENABLED) return null;
    // [FIX] navigator.onLine 체크 제거 — 태블릿에서 잘못 감지될 수 있음
    // 업로드 시도 후 실패하면 catch에서 처리

    // [CRITICAL FIX] Always wait if capture is active, regardless of having an old blob
    if (isCapturingRef.current && capturePromisesRef.current.length > 0) {
      console.log('[PHOTO] Waiting for active capture...');
      const lastPromise = capturePromisesRef.current[capturePromisesRef.current.length - 1];
      await Promise.race([lastPromise, new Promise(r => setTimeout(r, 6000))]);
    }

    // [FIX] blob이 아직 없으면 단계적 Waitlisted at position (카메라 복구 포함 최대 3초)
    if (!capturedPhotoRef.current) {
      console.log('[PHOTO] No blob yet, waiting for recovery (up to 3s)...');
      // 1차: 캡처 promise Waitlisted at position (복구 포함)
      if (capturePromisesRef.current.length > 0) {
        const lastPromise = capturePromisesRef.current[capturePromisesRef.current.length - 1];
        await Promise.race([lastPromise, new Promise(r => setTimeout(r, 3000))]);
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    // 2차: 그래도 없으면 마지막 500ms 대기
    if (!capturedPhotoRef.current) {
      await new Promise(r => setTimeout(r, 500));
    }
    const blob = capturedPhotoRef.current;
    if (!blob) {
      console.warn(`[PHOTO] ❌ No captured photo for upload. Stream alive: ${isStreamAlive()}. Member: ${memberName || 'unknown'}`);
      // [FIX] 사진 업로드 실패를 에러 로그에 기록
      try {
        storageService.logError(`[PHOTO] No photo available at upload time`, {
          memberName: memberName || 'unknown',
          attendanceId,
          streamAlive: isStreamAlive(),
          hasVideo: !!videoRef.current,
          videoReadyState: videoRef.current?.readyState,
          videoPaused: videoRef.current?.paused,
          timeSinceLastCapture: Date.now() - lastCaptureTimeRef.current
        });
      } catch (e) {}
      return null;
    }
    if (!attendanceId) {
      console.log('[PHOTO] No attendanceId (offline mode). Will upload and return URL for pending sync.');
    }
    try {
      const today = new Date().toLocaleDateString('sv-SE', {
        timeZone: 'Asia/Seoul'
      });
      const fileName = `${attendanceId || Date.now()}.webp`;
      const path = tenantStoragePath(`attendance-photos/${today}/${fileName}`);
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, blob, {
        contentType: 'image/webp'
      });
      const url = await getDownloadURL(fileRef);
      if (attendanceId) {
        const {
          updateDoc
        } = await import('firebase/firestore');
        const {
          tenantDb
        } = await import('../utils/tenantDb');
        await updateDoc(tenantDb.doc('attendance', attendanceId), {
          photoUrl: url,
          photoStatus: status || 'unknown'
        });
      }
      console.log(`[PHOTO] ✅ Upload Success: ${path} (${(blob.size / 1024).toFixed(1)}KB)`);
      return url;
    } catch (err) {
      console.error(`[PHOTO] ❌ Upload failed:`, err.message);
      try {
        storageService.logError(`[PHOTO] Upload failed for ${memberName || 'unknown'}`, {
          error: err.message,
          attendanceId
        });
      } catch (e) {}
      return null;
    } finally {
      // [O] Immediate memory release
      capturedPhotoRef.current = null;
    }
  };
  return {
    videoRef,
    canvasRef,
    capturePhoto,
    uploadPhoto,
    stream
  };
};