import { useEffect, useRef, useCallback, useState } from 'react';
import { extractFaceDescriptor, findBestMatch, loadFacialModels, euclideanDistance } from '../services/facialService';

/**
 * useFacialRecognition — 얼굴 인식 관련 로직 훅
 * CheckInPage에서 추출. 모델 로드, 생체 캐시, 실시간 스캔을 관리.
 * 
 * [근본 수정 v2] 2026.03.29
 * 1. 임계값 0.5 → 0.42 (데이터 분석 결과 0.42~0.50 구간에서 수백 쌍의 오인식 발생)
 * 2. 2nd-best gap 검증 추가: best match와 2nd best의 거리 차이가 0.08 이상일 때만 자동 출석
 * 3. 출석 후 카메라 스트림 공유: attendanceVideoRef를 받아서 사진 캡처에 사용
 * 4. 인식 후 15초 쿨다운 + isIdle 복귀 확인
 */
export function useFacialRecognition({ enabled, autoUpdateRef, proceedWithCheckIn, attendanceVideoRef }) {
    const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const faceVideoRef = useRef(null);
    const biometricsCache = useRef([]);
    const scanIntervalRef = useRef(null);
    const lastAutoCheckInRef = useRef(0);
    const lastDescriptorRef = useRef(null);
    const activeTaskIdRef = useRef(0);

    // 모델 로드
    useEffect(() => {
        loadFacialModels().then(() => setFaceModelsLoaded(true));
    }, []);

    // 생체 캐시 프리로드
    useEffect(() => {
        if (!enabled || !faceModelsLoaded) return;

        const loadBiometrics = async () => {
            try {
                const { getDocs } = await import('firebase/firestore');
                const { tenantDb } = await import('../utils/tenantDb');
                const snap = await getDocs(tenantDb.collection('face_biometrics'));
                biometricsCache.current = snap.docs.map(d => ({ memberId: d.id, ...d.data() }));
                console.log(`[FACIAL] Biometrics loaded: ${biometricsCache.current.length} members`);
            } catch (e) {
                console.warn('[FACIAL] Biometrics cache load failed:', e);
            }
        };
        loadBiometrics();
        const refreshInterval = setInterval(loadBiometrics, 5 * 60 * 1000);
        return () => clearInterval(refreshInterval);
    }, [enabled, faceModelsLoaded]);

    // 실시간 스캔 루프 (2초마다)
    useEffect(() => {
        if (!enabled || !faceModelsLoaded) return;

        const scanForFace = async () => {
            const state = autoUpdateRef.current;
            // [근본 수정] CheckInPage에서 모든 blocking 상태를 종합 판단한 isIdle 하나로 체크
            if (!state.isIdle) return;
            if (state.pin?.length > 0) return;
            if (Date.now() - lastAutoCheckInRef.current < 15000) return;
            if (biometricsCache.current.length === 0) return;

            const video = faceVideoRef.current;
            if (!video || !video.srcObject || video.readyState < 2) return;

            try {
                setIsScanning(true);
                const descriptor = await extractFaceDescriptor(video, true);
                setIsScanning(false);
                if (!descriptor) return;

                let bestMatch = null;
                let bestDistance = Infinity;
                let secondBestDistance = Infinity;

                // [근본 수정] 임계값 0.42로 대폭 강화 (0.5에서 하향)
                const MATCH_THRESHOLD = 0.42;

                for (const bio of biometricsCache.current) {
                    if (!bio.descriptor) continue;
                    const storedDesc = new Float32Array(Object.values(bio.descriptor));
                    const distance = euclideanDistance(descriptor, storedDesc);
                    
                    if (distance < bestDistance) {
                        secondBestDistance = bestDistance;
                        bestDistance = distance;
                        bestMatch = bio;
                    } else if (distance < secondBestDistance) {
                        secondBestDistance = distance;
                    }
                }

                // [근본 수정] 3중 안전장치:
                // 1) 거리가 0.42 이하여야 함
                // 2) 2nd best와의 갭이 0.08 이상이어야 함 (확실한 구별)
                // 3) best 거리가 0.35 이하면 갭 조건 완화 (매우 확실한 일치)
                const gap = secondBestDistance - bestDistance;
                const isConfidentMatch = bestDistance <= MATCH_THRESHOLD && (
                    gap >= 0.08 ||                    // 2등과 충분히 차이남
                    bestDistance <= 0.35 ||            // 매우 확실한 일치
                    biometricsCache.current.length <= 3 // 등록 인원이 적으면 갭 검증 스킵
                );

                if (bestMatch && isConfidentMatch) {
                    console.log(`[FACIAL] ✅ Match: ${bestMatch.memberId} (dist=${bestDistance.toFixed(3)}, gap=${gap.toFixed(3)})`);
                    lastAutoCheckInRef.current = Date.now();
                    lastDescriptorRef.current = descriptor;

                    // [근본 수정] 출석 전 사진 캡처를 위해 attendanceVideoRef에도 스트림 공유
                    if (attendanceVideoRef?.current && faceVideoRef.current?.srcObject) {
                        try {
                            if (!attendanceVideoRef.current.srcObject || 
                                attendanceVideoRef.current.srcObject !== faceVideoRef.current.srcObject) {
                                attendanceVideoRef.current.srcObject = faceVideoRef.current.srcObject;
                                await attendanceVideoRef.current.play().catch(() => {});
                            }
                        } catch (e) {
                            console.warn('[FACIAL] Could not share stream to attendance camera:', e);
                        }
                    }

                    proceedWithCheckIn(null, false, bestMatch.memberId, null);
                } else if (bestMatch && bestDistance <= 0.50) {
                    // 0.42 ~ 0.50 구간: 로그만 남기고 무시 (이전에 오인식 되던 구간)
                    console.log(`[FACIAL] ⚠️ Weak match ignored: ${bestMatch.memberId} (dist=${bestDistance.toFixed(3)}, gap=${gap.toFixed(3)}) — below confidence`);
                }
            } catch (e) {
                setIsScanning(false);
            }
        };

        scanIntervalRef.current = setInterval(scanForFace, 2000);
        return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); };
    }, [enabled, faceModelsLoaded, autoUpdateRef, proceedWithCheckIn, attendanceVideoRef]);

    return {
        faceModelsLoaded,
        isScanning,
        faceVideoRef,
        biometricsCache,
        lastDescriptorRef,
        activeTaskIdRef,
        findBestMatch,
    };
}
