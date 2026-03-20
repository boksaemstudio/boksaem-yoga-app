import { useEffect, useRef, useCallback, useState } from 'react';
import { extractFaceDescriptor, findBestMatch, loadFacialModels, euclideanDistance } from '../services/facialService';

/**
 * useFacialRecognition — 얼굴 인식 관련 로직 훅
 * CheckInPage에서 추출. 모델 로드, 생체 캐시, 실시간 스캔을 관리.
 * 
 * @param {Object} options
 * @param {boolean} options.enabled - 얼굴 인식 활성화 여부
 * @param {React.RefObject} options.autoUpdateRef - 현재 UI 상태 ref
 * @param {Function} options.proceedWithCheckIn - 출석 처리 함수
 * @returns {{ faceModelsLoaded, isScanning, faceVideoRef, biometricsCache, lastDescriptorRef, activeTaskIdRef }}
 */
export function useFacialRecognition({ enabled, autoUpdateRef, proceedWithCheckIn }) {
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
            } catch (e) {
                console.warn('[FACIAL] Biometrics cache load failed:', e);
            }
        };
        loadBiometrics();
        const refreshInterval = setInterval(loadBiometrics, 5 * 60 * 1000);
        return () => clearInterval(refreshInterval);
    }, [enabled, faceModelsLoaded]);

    // 실시간 스캔 루프 (3초마다)
    useEffect(() => {
        if (!enabled || !faceModelsLoaded) return;

        const scanForFace = async () => {
            const state = autoUpdateRef.current;
            if (state.message || state.loading || state.showSelectionModal || state.showDuplicateConfirm) return;
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
                let minDistance = 0.5;

                for (const bio of biometricsCache.current) {
                    if (!bio.descriptor) continue;
                    const storedDesc = new Float32Array(Object.values(bio.descriptor));
                    const distance = euclideanDistance(descriptor, storedDesc);
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestMatch = bio;
                    }
                }

                if (bestMatch) {
                    lastAutoCheckInRef.current = Date.now();
                    lastDescriptorRef.current = descriptor;
                    proceedWithCheckIn(null, false, bestMatch.memberId, null);
                }
            } catch (e) {
                setIsScanning(false);
            }
        };

        scanIntervalRef.current = setInterval(scanForFace, 1500);
        return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); };
    }, [enabled, faceModelsLoaded, autoUpdateRef, proceedWithCheckIn]);

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
