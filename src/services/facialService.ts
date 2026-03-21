/**
 * Facial Recognition Service — High-Performance Edition
 * 
 * [PERF] WebGPU → WebGL → WASM 자동 폴백
 * [PERF] 모델 warmup으로 첫 추론 지연 제거
 * [PERF] 경량 TinyFaceDetector 옵션 최적화
 * [PERF] Float32Array 직접 조작으로 GC 부하 최소화
 */
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';
let modelsLoaded = false;
let backendName = 'unknown';

// ── 성능 최적화 상수 ──
const DETECTION_OPTIONS = new faceapi.TinyFaceDetectorOptions({
    inputSize: 224,     // 320 → 224로 줄여 감지 속도 ~40% 향상
    scoreThreshold: 0.5 // 0.5 기본 (낮추면 더 많이 감지하지만 느려짐)
});

export const loadFacialModels = async (): Promise<void> => {
    if (modelsLoaded) return;

    const t0 = performance.now();

    try {
        // [PERF] WebGPU → WebGL → CPU 자동 폴백
        if (faceapi.tf) {
            const tf = faceapi.tf as unknown as {
                setBackend: (b: string) => Promise<void>;
                ready: () => Promise<void>;
                getBackend: () => string;
            };

            // WebGPU 지원 체크 (2024+ 브라우저)
            const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
            
            if (hasWebGPU) {
                try {
                    await tf.setBackend('webgpu');
                    await tf.ready();
                    backendName = 'webgpu';
                } catch {
                    console.log('[FACIAL] WebGPU unavailable, trying WebGL');
                    try {
                        await tf.setBackend('webgl');
                        await tf.ready();
                        backendName = 'webgl';
                    } catch {
                        await tf.setBackend('cpu');
                        await tf.ready();
                        backendName = 'cpu';
                    }
                }
            } else {
                try {
                    await tf.setBackend('webgl');
                    await tf.ready();
                    backendName = 'webgl';
                } catch {
                    await tf.setBackend('cpu');
                    await tf.ready();
                    backendName = 'cpu';
                }
            }
        }

        // 모델 병렬 로드
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        modelsLoaded = true;

        const t1 = performance.now();
        console.log(`[FACIAL] Models loaded in ${(t1 - t0).toFixed(0)}ms (backend: ${backendName})`);

        // [PERF] Warmup 추론 — 첫 실제 호출에서의 JIT 컴파일 지연 제거
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 112;
            canvas.height = 112;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#888';
                ctx.fillRect(0, 0, 112, 112);
                await faceapi.detectSingleFace(canvas, DETECTION_OPTIONS);
            }
            console.log(`[FACIAL] Warmup done in ${(performance.now() - t1).toFixed(0)}ms`);
        } catch {
            // warmup 실패해도 무시
        }

    } catch (err) {
        console.error('[FACIAL] Model load failed:', err);
        throw err;
    }
};

export const getBackendInfo = (): string => backendName;

export const extractFaceDescriptor = async (
    input: HTMLVideoElement | HTMLCanvasElement,
    centerOnly = true
): Promise<Float32Array | null> => {
    if (!modelsLoaded) await loadFacialModels();

    const t0 = performance.now();

    const detection = await faceapi
        .detectSingleFace(input, DETECTION_OPTIONS)
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detection) return null;

    // 중앙 영역 체크 (키오스크에서 너무 옆이면 무시)
    if (centerOnly && 'videoWidth' in input && input.videoWidth && input.videoHeight) {
        const { box } = detection.detection;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const marginX = input.videoWidth * 0.2;
        const marginY = input.videoHeight * 0.2;
        const isCentered =
            centerX > marginX && centerX < (input.videoWidth - marginX) &&
            centerY > marginY && centerY < (input.videoHeight - marginY);
        if (!isCentered) return null;
    }

    const t1 = performance.now();
    console.log(`[FACIAL] Descriptor extracted in ${(t1 - t0).toFixed(0)}ms`);

    return detection.descriptor;
};

export interface MemberWithDescriptor {
    id?: string;
    name?: string;
    faceDescriptor?: Record<string, number> | Float32Array;
    faceDescriptors?: number[][];  // 다중 디스크립터 (정확도 향상)
    [key: string]: unknown;
}

// ── 유사도 함수 (자체 구현, face-api 의존 최소화) ──

/** 유클리드 거리 계산 — O(n) */
export const euclideanDistance = (a: Float32Array, b: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
};

/** 코사인 유사도 계산 — 향후 ArcFace 전환 시 사용 */
export const cosineSimilarity = (a: Float32Array, b: Float32Array): number => {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const matchFace = (
    descriptor1: Float32Array | null,
    descriptor2: Float32Array | null,
    threshold = 0.6
): boolean => {
    if (!descriptor1 || !descriptor2) return false;
    return euclideanDistance(descriptor1, descriptor2) < threshold;
};

export const findBestMatch = (
    currentDescriptor: Float32Array,
    membersWithDescriptors: MemberWithDescriptor[],
    threshold = 0.6
): MemberWithDescriptor | null => {
    let bestMatch: MemberWithDescriptor | null = null;
    let minDistance = threshold;

    for (const member of membersWithDescriptors) {
        // 다중 디스크립터가 있으면 모두 비교하여 최소 거리 사용
        if (member.faceDescriptors && member.faceDescriptors.length > 0) {
            for (const stored of member.faceDescriptors) {
                const storedDescriptor = new Float32Array(stored);
                const distance = euclideanDistance(currentDescriptor, storedDescriptor);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = member;
                }
            }
        } else if (member.faceDescriptor) {
            // 단일 디스크립터 (하위호환)
            const storedDescriptor = new Float32Array(Object.values(member.faceDescriptor));
            const distance = euclideanDistance(currentDescriptor, storedDescriptor);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = member;
            }
        }
    }

    if (bestMatch) {
        console.log(`[FACIAL] Best match: distance=${minDistance.toFixed(3)}, member=${bestMatch.name || bestMatch.id}`);
    }

    return bestMatch;
};
