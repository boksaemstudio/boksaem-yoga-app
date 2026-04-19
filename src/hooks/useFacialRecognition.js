import { useEffect, useRef, useState } from 'react';
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
export function useFacialRecognition({
  enabled,
  autoUpdateRef,
  proceedWithCheckIn,
  attendanceVideoRef
}) {
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const faceVideoRef = useRef(null);
  const biometricsCache = useRef([]);
  const scanIntervalRef = useRef(null);
  const lastAutoCheckInRef = useRef(0);
  const lastDescriptorRef = useRef(null);
  const activeTaskIdRef = useRef(0);

  // 모델 로드 — enabled=true일 때만 (안면인식 OFF면 모델 자체를 로드하지 않음)
  useEffect(() => {
    if (!enabled) return;
    loadFacialModels().then(() => setFaceModelsLoaded(true));
  }, [enabled]);

  // 생체 캐시 프리로드
  useEffect(() => {
    if (!enabled || !faceModelsLoaded) return;
    const loadBiometrics = async () => {
      try {
        const {
          getDocs
        } = await import('firebase/firestore');
        const {
          tenantDb
        } = await import('../utils/tenantDb');
        const snap = await getDocs(tenantDb.collection('face_biometrics'));
        biometricsCache.current = snap.docs.map(d => ({
          memberId: d.id,
          ...d.data()
        }));
        console.log(`[FACIAL] Biometrics loaded: ${biometricsCache.current.length} members`);
      } catch (e) {
        console.warn('[FACIAL] Biometrics cache load failed:', e);
      }
    };
    loadBiometrics();
    const refreshInterval = setInterval(loadBiometrics, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [enabled, faceModelsLoaded]);

  // ── 연속 매칭 상태 추적 (최소 3회 연속 동일인 확인 필수) ──
  const consecutiveMatchRef = useRef({
    memberId: null,
    count: 0,
    lastDescriptor: null
  });

  // 실시간 스캔 루프 (2초마다) — 3회 연속 매칭 필수
  useEffect(() => {
    if (!enabled || !faceModelsLoaded) return;
    const scanForFace = async () => {
      const state = autoUpdateRef.current;
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
        if (!descriptor) {
          // 얼굴 미감지 → 연속 카운트 초기화
          consecutiveMatchRef.current = {
            memberId: null,
            count: 0,
            lastDescriptor: null
          };
          return;
        }

        // ── 안정성 검증: 이전 프레임 디스크립터와 비교 ──
        // 디스크립터 변동이 크면 = 얼굴이 움직이고 있음 → 무시
        const prevDesc = consecutiveMatchRef.current.lastDescriptor;
        if (prevDesc) {
          const frameDrift = euclideanDistance(descriptor, prevDesc);
          if (frameDrift > 0.25) {
            // 프레임 간 변동이 크면 얼굴이 움직이는 중 → 초기화
            consecutiveMatchRef.current = {
              memberId: null,
              count: 0,
              lastDescriptor: descriptor
            };
            return;
          }
        }
        let bestMatch = null;
        let bestDistance = Infinity;
        let secondBestDistance = Infinity;
        const MATCH_THRESHOLD = 0.42;
        for (const bio of biometricsCache.current) {
          if (!bio.descriptor) continue;
          let storedDesc;
          if (bio.descriptor instanceof Float32Array) {
            storedDesc = bio.descriptor;
          } else if (Array.isArray(bio.descriptor)) {
            storedDesc = new Float32Array(bio.descriptor);
          } else if (typeof bio.descriptor === 'object') {
            const keys = Object.keys(bio.descriptor).sort((a, b) => Number(a) - Number(b));
            storedDesc = new Float32Array(keys.map(k => bio.descriptor[k]));
          } else {
            continue;
          }
          const distance = euclideanDistance(descriptor, storedDesc);
          if (distance < bestDistance) {
            secondBestDistance = bestDistance;
            bestDistance = distance;
            bestMatch = bio;
          } else if (distance < secondBestDistance) {
            secondBestDistance = distance;
          }
        }
        const gap = secondBestDistance - bestDistance;
        // [강화 v3] 임계값을 대폭 강화 — 오인식 근본 차단
        // Level 1 (극고신뢰): dist <= 0.30 && gap >= 0.15 → 자동 출석
        // Level 2 (고신뢰):   dist <= 0.35 && gap >= 0.12 → 자동 출석
        // Level 3 (중신뢰):   dist <= 0.42 → 확인 요청 ("OO 맞나요?")
        // Level 4 (저신뢰):   dist > 0.42 → 무시
        const THRESHOLD_AUTO = 0.35;
        const THRESHOLD_CONFIRM = 0.42;
        const GAP_MIN = 0.12;
        const isAutoMatch = bestDistance <= THRESHOLD_AUTO && gap >= GAP_MIN;
        const isConfirmMatch = !isAutoMatch && bestDistance <= THRESHOLD_CONFIRM && gap >= 0.06;
        if (bestMatch && (isAutoMatch || isConfirmMatch)) {
          const prev = consecutiveMatchRef.current;
          if (prev.memberId === bestMatch.memberId) {
            // ── 연속 카운트 누적 ──
            const newCount = prev.count + 1;
            consecutiveMatchRef.current = {
              memberId: bestMatch.memberId,
              count: newCount,
              lastDescriptor: descriptor,
              isAutoMatch
            };
            console.log(`[FACIAL] Consecutive match #${newCount}: ${bestMatch.memberId} (dist=${bestDistance.toFixed(3)}, gap=${gap.toFixed(3)}, auto=${isAutoMatch})`);

            // ── 4회 연속 확인 완료 → 출석 처리 or 확인 요청 ──
            if (newCount >= 4) {
              consecutiveMatchRef.current = {
                memberId: null,
                count: 0,
                lastDescriptor: null
              };
              lastAutoCheckInRef.current = Date.now();
              lastDescriptorRef.current = descriptor;
              if (attendanceVideoRef?.current && faceVideoRef.current?.srcObject) {
                try {
                  if (!attendanceVideoRef.current.srcObject || attendanceVideoRef.current.srcObject !== faceVideoRef.current.srcObject) {
                    attendanceVideoRef.current.srcObject = faceVideoRef.current.srcObject;
                    await attendanceVideoRef.current.play().catch(() => {});
                  }
                } catch (e) {
                  console.warn('[FACIAL] Could not share stream:', e);
                }
              }
              if (isAutoMatch) {
                // 극고신뢰 → 바로 출석
                console.log(`[FACIAL] ✅ AUTO CHECK-IN (4 consecutive, high confidence): ${bestMatch.memberId}`);
                proceedWithCheckIn(null, false, bestMatch.memberId, null);
              } else {
                // 중신뢰 → 확인 요청 (memberId만 넘기고, 확인 모달을 CheckInPage에서 처리)
                console.log(`[FACIAL] ❓ CONFIRM REQUIRED (4 consecutive, medium confidence): ${bestMatch.memberId} dist=${bestDistance.toFixed(3)}`);
                proceedWithCheckIn(null, false, bestMatch.memberId, null, true); // needConfirm=true
              }
            }
          } else {
            // ── 다른 사람으로 바뀜 → 카운트 리셋 ──
            consecutiveMatchRef.current = {
              memberId: bestMatch.memberId,
              count: 1,
              lastDescriptor: descriptor,
              isAutoMatch
            };
            console.log(`[FACIAL] New candidate: ${bestMatch.memberId} (dist=${bestDistance.toFixed(3)}) — need 3 more`);
          }
        } else {
          // 매칭 실패 → 초기화
          consecutiveMatchRef.current = {
            memberId: null,
            count: 0,
            lastDescriptor: descriptor
          };
          if (bestMatch && bestDistance <= 0.50) {
            console.log(`[FACIAL] ⚠️ Weak match ignored: ${bestMatch.memberId} (dist=${bestDistance.toFixed(3)})`);
          }
        }
      } catch (e) {
        setIsScanning(false);
      }
    };
    scanIntervalRef.current = setInterval(scanForFace, 2000);
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [enabled, faceModelsLoaded, autoUpdateRef, proceedWithCheckIn, attendanceVideoRef]);
  return {
    faceModelsLoaded,
    isScanning,
    faceVideoRef,
    biometricsCache,
    lastDescriptorRef,
    activeTaskIdRef,
    findBestMatch
  };
}