/**
 * Studio Registry Service — 플랫폼 수준 스튜디오 관리
 * 
 * Firestore 구조:
 *   platform/registry/studios/{studioId} → { name, domain, createdAt, status, ... }
 * 
 * 각 스튜디오의 실제 데이터는 기존 studios/{studioId}/ 경로 사용.
 */
import { db } from '../firebase';
import { doc, collection, getDocs, getDoc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { STUDIO_CONFIG } from '../studioConfig';

// ── Types ──
export interface StudioInfo {
    id: string;
    name: string;
    nameEnglish?: string;
    domain?: string;
    ownerEmail: string;
    status: 'active' | 'suspended' | 'trial';
    plan: 'free' | 'basic' | 'pro';
    createdAt: string;
    memberCount?: number;
    lastActivity?: string;
}

export interface RegisterStudioInput {
    studioId: string;
    name: string;
    nameEnglish?: string;
    domain?: string;
    ownerEmail: string;
    plan?: 'free' | 'basic' | 'pro';
}

// ── Constants ──
const REGISTRY_PATH = 'platform/registry/studios';

// ── Service ──
export const studioRegistryService = {

    /** 등록된 모든 스튜디오 목록 조회 */
    async listStudios(): Promise<StudioInfo[]> {
        try {
            const q = query(collection(db, REGISTRY_PATH), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudioInfo));
        } catch (e) {
            console.error('[Registry] Failed to list studios:', e);
            return [];
        }
    },

    /** 특정 스튜디오 조회 */
    async getStudio(studioId: string): Promise<StudioInfo | null> {
        try {
            const snap = await getDoc(doc(db, REGISTRY_PATH, studioId));
            return snap.exists() ? { id: snap.id, ...snap.data() } as StudioInfo : null;
        } catch (e) {
            console.error('[Registry] Failed to get studio:', e);
            return null;
        }
    },

    /** 새 스튜디오 등록 + 초기 데이터 시딩 */
    async registerStudio(input: RegisterStudioInput): Promise<{ success: boolean; message: string }> {
        try {
            const { studioId, name, nameEnglish, domain, ownerEmail, plan } = input;

            // 1. 중복 검사
            const existing = await this.getStudio(studioId);
            if (existing) {
                return { success: false, message: `이미 등록된 스튜디오 ID입니다: ${studioId}` };
            }

            // 2. 레지스트리에 등록
            const registryData: Omit<StudioInfo, 'id'> = {
                name,
                nameEnglish: nameEnglish || name,
                domain: domain || '',
                ownerEmail,
                status: 'active',
                plan: plan || 'free',
                createdAt: new Date().toISOString(),
                memberCount: 0,
            };
            await setDoc(doc(db, REGISTRY_PATH, studioId), registryData);

            // 3. 스튜디오 설정 자동 시딩 (기본 템플릿 기반)
            const seedConfig = {
                ...JSON.parse(JSON.stringify(STUDIO_CONFIG)),
                IDENTITY: {
                    ...STUDIO_CONFIG.IDENTITY,
                    NAME: name,
                    NAME_ENGLISH: nameEnglish || name,
                    LOGO_TEXT: name.substring(0, 4).toUpperCase(),
                },
            };
            await setDoc(doc(db, 'studios', studioId), seedConfig);

            return { success: true, message: `${name} 스튜디오가 등록되었습니다.` };
        } catch (e) {
            console.error('[Registry] Register failed:', e);
            return { success: false, message: `등록 실패: ${(e as Error).message}` };
        }
    },

    /** 스튜디오 정보 업데이트 */
    async updateStudio(studioId: string, updates: Partial<StudioInfo>): Promise<boolean> {
        try {
            await setDoc(doc(db, REGISTRY_PATH, studioId), updates, { merge: true });
            return true;
        } catch (e) {
            console.error('[Registry] Update failed:', e);
            return false;
        }
    },

    /** 스튜디오 삭제 (레지스트리에서만 — 실제 데이터는 보존) */
    async deleteStudio(studioId: string): Promise<boolean> {
        try {
            await deleteDoc(doc(db, REGISTRY_PATH, studioId));
            return true;
        } catch (e) {
            console.error('[Registry] Delete failed:', e);
            return false;
        }
    },
};
