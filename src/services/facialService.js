// src/services/facialService.js
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';
let modelsLoaded = false;

export const loadFacialModels = async () => {
    if (modelsLoaded) return;
    try {
        // [FIX] Ensure TensorFlow backend is explicitly initialized before loading models
        if (faceapi.tf) {
            await faceapi.tf.setBackend('webgl').catch(() => faceapi.tf.setBackend('cpu'));
            await faceapi.tf.ready();
        }

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        modelsLoaded = true;
        console.log('[FACIAL] Models loaded successfully');
    } catch (err) {
        console.error('[FACIAL] Model load failed:', err);
        throw err;
    }
};

/**
 * 캡처된 비디오/캔버스 요소에서 얼굴 디스크립터(디지털 지문)를 추출합니다.
 * [HARDENING] 센터 포커스 필터를 통해 배경 인물 오인식을 방지합니다.
 */
export const extractFaceDescriptor = async (input, centerOnly = true) => {
    if (!modelsLoaded) await loadFacialModels();
    
    // tinyFaceDetector: 성능이 뛰어나고 브라우저에 적합함
    const detection = await faceapi.detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
    
    if (!detection) return null;

    // [CENTER-FOCUS] 화면 중앙에 위치하지 않은 얼굴은 무시 (배경 노이즈 제거)
    if (centerOnly && input.videoWidth && input.videoHeight) {
        const { box } = detection.detection;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        
        // 가로/세로 중앙 60% 영역 내에 있어야 함 (여백 20%씩)
        const marginX = input.videoWidth * 0.2;
        const marginY = input.videoHeight * 0.2;
        
        const isCentered = 
            centerX > marginX && centerX < (input.videoWidth - marginX) &&
            centerY > marginY && centerY < (input.videoHeight - marginY);
            
        if (!isCentered) {
            console.log('[FACIAL] Face detected but ignored (Not centered)');
            return null;
        }
    }
    
    return detection.descriptor;
};

/**
 * 두 얼굴 디스크립터 간의 유클리드 거리를 계산하여 동일인인지 판별합니다.
 * 보통 0.6 미만이면 동일인으로 간주합니다. (임계값은 조절 가능)
 */
export const matchFace = (descriptor1, descriptor2, threshold = 0.6) => {
    if (!descriptor1 || !descriptor2) return false;
    
    // Float32Array 형식의 디스크립터를 매칭
    const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
    return distance < threshold;
};

/**
 * 후보군 멤버들과 현재 캡처된 얼굴을 비교하여 가장 일치하는 멤버를 찾습니다.
 */
export const findBestMatch = (currentDescriptor, membersWithDescriptors, threshold = 0.6) => {
    let bestMatch = null;
    let minDistance = threshold;

    for (const member of membersWithDescriptors) {
        if (!member.faceDescriptor) continue;
        
        // Firestore에는 일반 배열로 저장되므로 Float32Array로 변환 필요할 수 있음
        const storedDescriptor = new Float32Array(Object.values(member.faceDescriptor));
        const distance = faceapi.euclideanDistance(currentDescriptor, storedDescriptor);
        
        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = member;
        }
    }

    return bestMatch;
};
