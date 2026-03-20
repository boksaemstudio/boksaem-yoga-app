/**
 * Facial Recognition Service — face-api.js wrapper
 * TypeScript version
 */
import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';
let modelsLoaded = false;

export const loadFacialModels = async (): Promise<void> => {
    if (modelsLoaded) return;
    try {
        if (faceapi.tf) {
            await (faceapi.tf as { setBackend: (b: string) => Promise<void>; ready: () => Promise<void> }).setBackend('webgl').catch(() => (faceapi.tf as { setBackend: (b: string) => Promise<void> }).setBackend('cpu'));
            await (faceapi.tf as { ready: () => Promise<void> }).ready();
        }
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        modelsLoaded = true;
    } catch (err) {
        console.error('[FACIAL] Model load failed:', err);
        throw err;
    }
};

export const extractFaceDescriptor = async (input: HTMLVideoElement | HTMLCanvasElement, centerOnly = true): Promise<Float32Array | null> => {
    if (!modelsLoaded) await loadFacialModels();
    const detection = await faceapi.detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks().withFaceDescriptor();
    if (!detection) return null;

    if (centerOnly && 'videoWidth' in input && input.videoWidth && input.videoHeight) {
        const { box } = detection.detection;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const marginX = input.videoWidth * 0.2;
        const marginY = input.videoHeight * 0.2;
        const isCentered = centerX > marginX && centerX < (input.videoWidth - marginX) && centerY > marginY && centerY < (input.videoHeight - marginY);
        if (!isCentered) return null;
    }
    return detection.descriptor;
};

export interface MemberWithDescriptor {
    id?: string;
    name?: string;
    faceDescriptor?: Record<string, number> | Float32Array;
    [key: string]: unknown;
}

export const matchFace = (descriptor1: Float32Array | null, descriptor2: Float32Array | null, threshold = 0.6): boolean => {
    if (!descriptor1 || !descriptor2) return false;
    const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
    return distance < threshold;
};

export const findBestMatch = (currentDescriptor: Float32Array, membersWithDescriptors: MemberWithDescriptor[], threshold = 0.6): MemberWithDescriptor | null => {
    let bestMatch: MemberWithDescriptor | null = null;
    let minDistance = threshold;
    for (const member of membersWithDescriptors) {
        if (!member.faceDescriptor) continue;
        const storedDescriptor = new Float32Array(Object.values(member.faceDescriptor));
        const distance = faceapi.euclideanDistance(currentDescriptor, storedDescriptor);
        if (distance < minDistance) { minDistance = distance; bestMatch = member; }
    }
    return bestMatch;
};
