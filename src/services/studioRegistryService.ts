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
    logoUrl?: string;
    scheduleUrls?: string[];
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
            const { studioId, name, nameEnglish, domain, ownerEmail, plan, logoUrl } = input;

            // 1. 중복 검사
            const existing = await this.getStudio(studioId);
            if (existing) {
                return { success: false, message: `이미 등록된 스튜디오 ID입니다: ${studioId}` };
            }

            // 2. 레지스트리에 등록 (2개월 무료 체험 기본)
            const now = new Date();
            const trialEnd = new Date(now);
            trialEnd.setDate(trialEnd.getDate() + 60);
            const registryData: any = {
                name,
                nameEnglish: nameEnglish || name,
                domain: domain || '',
                ownerEmail,
                status: 'trial',
                plan: plan || 'basic',
                createdAt: now.toISOString(),
                trialStartDate: now.toISOString(),
                trialEndDate: trialEnd.toISOString(),
                memberCount: 0,
            };
            if (logoUrl) registryData.logoUrl = logoUrl;
            if (input.scheduleUrls) registryData.scheduleUrls = input.scheduleUrls;
            
            await setDoc(doc(db, REGISTRY_PATH, studioId), registryData);

            // 3. 스튜디오 설정 자동 시딩 (기본 템플릿 기반)
            const seedConfig = {
                ...JSON.parse(JSON.stringify(STUDIO_CONFIG)),
                IDENTITY: {
                    ...STUDIO_CONFIG.IDENTITY,
                    NAME: name,
                    NAME_ENGLISH: nameEnglish || name,
                    LOGO_TEXT: name.substring(0, 4).toUpperCase(),
                    ...(logoUrl && { LOGO_URL: logoUrl })
                },
                ASSETS: {
                    ...STUDIO_CONFIG.ASSETS,
                    LOGO: {
                        ...STUDIO_CONFIG.ASSETS?.LOGO,
                        ...(logoUrl && { WIDE: logoUrl, SQUARE: logoUrl })
                    }
                }
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

    // ==========================================
    // 🚀 Onboarding & Pending Studios
    // ==========================================

    /** 대기 중인 온보딩 신청 목록 조회 */
    async listPendingStudios() {
        try {
            const q = query(collection(db, 'platform/registry/pending_studios'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error('[Registry] Failed to list pending:', e);
            return [];
        }
    },

    /** 신규 온보딩 신청 → 자동 승인 + 관리자 푸시 알림 */
    async requestOnboarding(data: any) {
        try {
            // 1. pending_studios에 기록 (이력 보존)
            const newDocRef = doc(collection(db, 'platform/registry/pending_studios'));
            await setDoc(newDocRef, {
                ...data,
                status: 'pending',
                createdAt: new Date().toISOString()
            });

            // 2. studioId 자동 생성 (영문 이름 기반, 중복 방지)
            const baseName = (data.nameEnglish || data.name || 'studio')
                .toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 20);
            const studioId = `${baseName}-${Date.now().toString(36)}`;

            // 3. 즉시 스튜디오 등록 (2개월 무료 체험)
            const regResult = await this.registerStudio({
                studioId,
                name: data.name,
                nameEnglish: data.nameEnglish,
                ownerEmail: data.ownerEmail,
                plan: data.plan || 'basic',
                logoUrl: data.logoUrl,
                scheduleUrls: data.scheduleUrls || []
            });

            if (!regResult.success) {
                return { success: false, message: regResult.message };
            }

            // 4. pending 상태를 approved로 업데이트
            await setDoc(newDocRef, { 
                status: 'approved', 
                approvedAt: new Date().toISOString(),
                assignedStudioId: studioId 
            }, { merge: true });

            // 5. 복샘요가 관리자에게 푸시 알림 (notices 트리거를 활용)
            try {
                const noticeRef = doc(collection(db, 'studios/boksaem-yoga/notices'));
                await setDoc(noticeRef, {
                    title: `🆕 새 스튜디오 가입: ${data.name}`,
                    content: `${data.name} (${data.ownerEmail})이 PassFlow AI에 가입했습니다. 스튜디오ID: ${studioId}`,
                    date: new Date().toISOString().split('T')[0],
                    timestamp: new Date().toISOString(),
                    images: [],
                    sendPush: true,
                    isSystemNotice: true
                });
                console.log('[Registry] Admin push notification sent via notices trigger');
            } catch (pushErr) {
                console.warn('[Registry] Failed to send admin push:', pushErr);
            }

            return { success: true, id: newDocRef.id, studioId };
        } catch (e) {
            console.error('[Registry] Failed to request onboarding:', e);
            return { success: false, message: (e as Error).message };
        }
    },

    /** 온보딩 승인 및 스튜디오 자동 발급 (슈퍼어드민용) */
    async approveOnboarding(pendingId: string, studioId: string, ownerEmail: string, name: string) {
        try {
            const pendingRef = doc(db, 'platform/registry/pending_studios', pendingId);
            const pendingSnap = await getDoc(pendingRef);
            if (!pendingSnap.exists()) return { success: false, message: '신청서를 찾을 수 없습니다.' };
            
            const pendingData = pendingSnap.data();

            // 1. 실제 스튜디오 등록 처리
            const regResult = await this.registerStudio({
                studioId,
                name,
                ownerEmail,
                plan: pendingData.plan || 'basic',
                logoUrl: pendingData.logoUrl,
                scheduleUrls: pendingData.scheduleUrls || []
            });

            if (!regResult.success) {
                return { success: false, message: regResult.message };
            }

            // 2. Pending 승인 처리
            await setDoc(pendingRef, { status: 'approved', approvedAt: new Date().toISOString() }, { merge: true });
            
            return { success: true, message: '스튜디오 세팅 및 승인 완료!' };
        } catch (e) {
            console.error('[Registry] Approve failed:', e);
            return { success: false, message: e.message };
        }
    },

    /** 온보딩 반려 (슈퍼어드민용) */
    async rejectOnboarding(pendingId: string, reason: string) {
        try {
            const pendingRef = doc(db, 'platform/registry/pending_studios', pendingId);
            await setDoc(pendingRef, { status: 'rejected', rejectReason: reason, rejectedAt: new Date().toISOString() }, { merge: true });
            return true;
        } catch (e) {
            console.error('[Registry] Reject failed:', e);
            return false;
        }
    }
};
