import { useEffect, useRef } from 'react';

/**
 * useProximityReturn — 카메라 얼굴 감지로 근접 사용자 감지 시 키오스크 공지 자동 해제
 * 
 * face-api.js의 detectSingleFace를 활용하여 주기적으로 얼굴 감지.
 * 얼굴이 감지되면 콜백을 호출해 출석체크 화면으로 자동 전환.
 * 
 * @param {Object} options
 * @param {boolean} options.enabled - 근접 감지 활성화 여부 (kioskSettings.proximityReturn)
 * @param {boolean} options.isNoticeVisible - 공지 화면이 현재 표시 중인지
 * @param {React.RefObject} options.videoRef - 카메라 비디오 ref (faceVideoRef)
 * @param {Function} options.onPersonDetected - 사람 감지 시 호출할 콜백
 */
export function useProximityReturn({ enabled, isNoticeVisible, videoRef, onPersonDetected }) {
    const intervalRef = useRef(null);
    const faceApiRef = useRef(null);
    const cooldownRef = useRef(false);

    useEffect(() => {
        // 조건이 맞지 않으면 정리
        if (!enabled || !isNoticeVisible) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // face-api.js 동적 로드
        const loadAndStart = async () => {
            try {
                if (!faceApiRef.current) {
                    const faceapi = await import('@vladmandic/face-api');
                    faceApiRef.current = faceapi;
                }

                const faceapi = faceApiRef.current;

                // 모델이 로드되지 않은 경우 → tinyFaceDetector만 로드
                if (!faceapi.nets.tinyFaceDetector.isLoaded) {
                    try {
                        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
                    } catch (e) {
                        console.warn('[Proximity] Failed to load face detection models:', e);
                        return;
                    }
                }

                // 1초 간격으로 얼굴 감지 (더 빠른 반응)
                intervalRef.current = setInterval(async () => {
                    if (cooldownRef.current) return;

                    const video = videoRef?.current;
                    if (!video || video.readyState < 2) return;

                    try {
                        const detection = await faceapi.detectSingleFace(
                            video,
                            new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.2 })
                        );

                        if (detection) {
                            // 쿨다운 (다시 공지가 뜨고 나서 바로 또 울리는 것 방지)
                            cooldownRef.current = true;
                            setTimeout(() => { cooldownRef.current = false; }, 10000);

                            onPersonDetected?.();
                        }
                    } catch (e) {
                        // 감지 실패 무시
                    }
                }, 1000);
            } catch (e) {
                console.warn('[Proximity] Initialization failed:', e);
            }
        };

        loadAndStart();

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled, isNoticeVisible, videoRef, onPersonDetected]);
}
