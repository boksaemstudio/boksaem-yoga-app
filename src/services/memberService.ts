/**
 * Member Service — Member CRUD, Cache, Biometrics
 * TypeScript version — Full type annotations
 */
import { db, functions } from '../firebase';
import { doc, query, where, getDocs, getDoc, addDoc, updateDoc, setDoc, deleteDoc, onSnapshot, Unsubscribe, orderBy, deleteField } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { tenantDb } from '../utils/tenantDb';
import { safeLocalStorage } from '../utils/safeLocalStorage';
import { getCurrentStudioId } from '../utils/resolveStudioId';

// ── Types ──
export interface Member {
    id: string;
    name: string;
    phone?: string;
    phoneLast4?: string;
    branchId?: string;
    homeBranch?: string;
    credits?: number;
    attendanceCount?: number;
    lastAttendance?: string;
    streak?: number;
    pushEnabled?: boolean;
    membershipType?: string;
    startDate?: string;
    endDate?: string;
    hasFaceDescriptor?: boolean;
    faceDescriptor?: Record<string, number> | Float32Array | number[] | null;
    faceUpdatedAt?: string | null;
    upcomingMembership?: {
        membershipType?: string;
        credits?: number;
        startDate?: string;
        endDate?: string;
        durationMonths?: number;
        price?: number;
    } | null;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface DiligenceData {
    score?: number;
    level?: string;
    [key: string]: unknown;
}

// ── Helpers ──
const withTimeout = <T>(promise: Promise<T>, timeoutMs = 10000, errorMsg = '서버 응답 시간 초과'): Promise<T> => {
    return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs))]);
};

// ── State ──
let cachedMembers: Member[] = [];
let phoneLast4Index: Record<string, Member[]> = {};
let memberListenerUnsubscribe: Unsubscribe | null = null;
let notifyCallback: () => void = () => {};

// ── Service ──
export const memberService = {
    async triggerKioskSync(): Promise<void> {
        try {
            const syncRef = tenantDb.doc('system_state', 'kiosk_sync');
            await setDoc(syncRef, { lastMemberUpdate: new Date().toISOString() }, { merge: true });
        } catch (e) { console.warn('[memberService] Failed to trigger kiosk sync:', e); }
    },

    setNotifyCallback(callback: () => void): void { notifyCallback = callback; },

    setupMemberListener(): Unsubscribe | null {
        // Load from LocalStorage for immediate UI response (Optimistic)
        const stored = safeLocalStorage.getItem('kiosk_member_cache');
        if (stored && cachedMembers.length === 0) {
            try { cachedMembers = JSON.parse(stored); this._buildPhoneLast4Index(); }
            catch { console.warn('[memberService] Local cache corrupt'); }
        }

        try {
            if (memberListenerUnsubscribe) memberListenerUnsubscribe();
            memberListenerUnsubscribe = onSnapshot(tenantDb.collection('members'), (snapshot) => {
                const members: Member[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member)).filter(m => !(m as Record<string, unknown>).deletedAt);
                cachedMembers = members;
                try { safeLocalStorage.setItem('kiosk_member_cache', JSON.stringify(cachedMembers)); }
                catch { console.warn('[memberService] Cache persistence failed'); }
                this._buildPhoneLast4Index();
                notifyCallback();
            }, (error) => { console.warn("[memberService] Member listener error:", error); });
            return memberListenerUnsubscribe;
        } catch (e) { console.error("[memberService] Failed to setup member listener:", e); return null; }
    },

    getMembers(): Member[] { return cachedMembers; },

    async loadAllMembers(force = false): Promise<Member[]> {
        if (!force && cachedMembers.length > 0) return cachedMembers;
        try {
            console.time('[memberService] Force Fetch Members');
            const snapshot = await getDocs(tenantDb.collection('members'));
            cachedMembers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member)).filter(m => !(m as Record<string, unknown>).deletedAt);
            try { safeLocalStorage.setItem('kiosk_member_cache', JSON.stringify(cachedMembers)); }
            catch { console.warn('[memberService] Local cache save failed (Storage full?)'); }
            this._buildPhoneLast4Index();
            console.timeEnd('[memberService] Force Fetch Members');
            return cachedMembers;
        } catch (e) { console.error("Force fetch members failed:", e); return []; }
    },

    _buildPhoneLast4Index(): void {
        const newIndex: Record<string, Member[]> = {};
        cachedMembers.forEach(m => {
            const last4 = m.phoneLast4 || (m.phone && m.phone.slice(-4));
            if (last4) { if (!newIndex[last4]) newIndex[last4] = []; newIndex[last4].push(m); }
        });
        phoneLast4Index = newIndex;
    },

    async findMembersByPhone(last4Digits: string): Promise<Member[]> {
        let members: Member[] = [];
        if (phoneLast4Index[last4Digits]?.length > 0) {
            members = phoneLast4Index[last4Digits];
        } else {
            const cachedResults = cachedMembers.filter(m => (m.phoneLast4 || (m.phone && m.phone.slice(-4))) === last4Digits);
            if (cachedResults.length > 0) { members = cachedResults; }
            else {
                try {
                    const getSecureMember = httpsCallable(functions, 'getSecureMemberV2Call');
                    const result = await withTimeout(getSecureMember({ phoneLast4: last4Digits, studioId: getCurrentStudioId() }), 15000, '회원 조회 시간 초과');
                    let fetchedMembers = ((result.data as { members?: Member[] }).members || []) as Member[];
                    // 백엔드 반환 결과 중 소프트 삭제된 멤버 클라이언트단에서 2중 차단
                    members = fetchedMembers.filter(m => !(m as Record<string, unknown>).deletedAt);
                } catch (e) { console.error('[memberService] Cloud Function member lookup failed:', e); members = []; }
            }
        }

        // Fetch biometrics for members who have the flag but not the descriptor
        const bioTasks = members
            .filter(m => m.hasFaceDescriptor && !m.faceDescriptor)
            .map(async m => {
                try {
                    const bioSnap = await getDoc(tenantDb.doc('face_biometrics', m.id));
                    if (bioSnap.exists()) {
                        const bioData = bioSnap.data() as { descriptor?: number[]; descriptors?: number[][] };
                        m.faceDescriptor = bioData.descriptor;
                        if (bioData.descriptors) { (m as Record<string, unknown>).faceDescriptors = bioData.descriptors; }
                    }
                } catch { console.warn(`[memberService] Bio load failed for ${m.id}`); }
            });
        if (bioTasks.length > 0) await Promise.all(bioTasks);
        return members;
    },

    getMemberById(id: string): Member | null {
        if (!id) return null;
        return cachedMembers.find(m => m.id === id) || null;
    },

    async fetchMemberById(id: string): Promise<Member | null> {
        if (!id) return null;
        const cached = this.getMemberById(id);
        if (cached) return cached;
        try {
            const docSnap = await getDoc(tenantDb.doc('members', id));
            if (docSnap.exists()) {
                const data: Member = { id: docSnap.id, ...docSnap.data() } as Member;
                // [보안] 소프트 삭제된 회원이라면 캐시에 담지 않고 즉시 null 반환 (조회 불가 처리)
                if ((data as Record<string, unknown>).deletedAt) return null;
                
                if (!cachedMembers.some(m => m.id === id)) { cachedMembers.push(data); this._buildPhoneLast4Index(); }
                return data;
            }
            return null;
        } catch (e) { console.error('Fetch member failed:', e); return null; }
    },

    async updateMember(memberId: string, data: Partial<Member>): Promise<{ success: boolean; error?: string }> {
        try {
            // [ROOT FIX] Firestore silently drops fields with undefined values.
            // This caused upcomingMembership to be lost if any nested field was undefined.
            const sanitized = this._stripUndefined({ ...data, updatedAt: new Date().toISOString() });
            await updateDoc(tenantDb.doc('members', memberId), sanitized);
            this.triggerKioskSync();
            return { success: true };
        } catch (e) { console.error('Update member failed:', e); return { success: false, error: (e as Error).message }; }
    },

    /** Recursively strip undefined values from an object before Firestore write */
    _stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value === undefined) continue;
            if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                result[key] = this._stripUndefined(value as Record<string, unknown>);
            } else {
                result[key] = value;
            }
        }
        return result;
    },

    async updateFaceDescriptor(memberId: string, descriptor: Float32Array | null): Promise<{ success: boolean; error?: string }> {
        const MAX_DESCRIPTORS = 10;
        try {
            if (!descriptor) return { success: false };
            const bioRef = tenantDb.doc('face_biometrics', memberId);
            const descriptorArray = Array.from(descriptor);

            // 기존 데이터 로드하여 다중 디스크립터 축적
            let existingDescriptors: number[][] = [];
            try {
                const bioSnap = await getDoc(bioRef);
                if (bioSnap.exists()) {
                    const data = bioSnap.data() as { descriptors?: unknown[]; descriptor?: number[] };
                    const rawDescriptors = data.descriptors || (data.descriptor ? [data.descriptor] : []);
                    
                    // [CRITICAL FIX] Firestore에서 가져온 데이터가 중첩 배열일 수 있음
                    // 각 디스크립터가 flat number[]인지 검증하고, 아니면 flatten 처리
                    existingDescriptors = rawDescriptors
                        .map((d: any) => {
                            if (d !== null && typeof d === 'object' && Array.isArray(d.vector)) return d.vector as number[];
                            if (!Array.isArray(d)) return null;
                            // 이미 flat number[] 인 경우
                            if (d.length > 0 && typeof d[0] === 'number') return d as number[];
                            // 중첩 배열 [[number]] 인 경우 → flat
                            if (d.length > 0 && Array.isArray(d[0])) return (d as number[][]).flat() as number[];
                            return null;
                        })
                        .filter((d): d is number[] => d !== null && d.length > 0);
                }
            } catch { /* 첫 등록 시 무시 */ }

            // 중복 방지: 기존 디스크립터와 너무 비슷하면 (거리 < 0.3) 교체 대신 스킵
            const isDuplicate = existingDescriptors.some(existing => {
                let sum = 0;
                for (let i = 0; i < Math.min(existing.length, descriptorArray.length); i++) {
                    const diff = existing[i] - descriptorArray[i];
                    sum += diff * diff;
                }
                return Math.sqrt(sum) < 0.3;
            });

            let updatedDescriptors: number[][];
            if (isDuplicate) {
                // 너무 비슷한 건 추가 안 함 (같은 조건에서 반복 촬영)
                updatedDescriptors = existingDescriptors;
                console.log(`[memberService] Face descriptor too similar, skipping accumulation (${existingDescriptors.length} stored)`);
            } else {
                // FIFO: 최대 개수 초과 시 가장 오래된 것 제거
                updatedDescriptors = [...existingDescriptors, descriptorArray];
                if (updatedDescriptors.length > MAX_DESCRIPTORS) {
                    updatedDescriptors = updatedDescriptors.slice(-MAX_DESCRIPTORS);
                }
                console.log(`[memberService] Face descriptor accumulated: ${updatedDescriptors.length}/${MAX_DESCRIPTORS}`);
            }

            // [근본 수정] Firestore 저장 전 데이터 무결성 검증
            // Firestore는 nested arrays를 지원하지 않으므로, 저장 직전에 반드시 검증
            const sanitizeDescriptor = (d: unknown): number[] | null => {
                if (!Array.isArray(d) || d.length === 0) return null;
                if (typeof d[0] === 'number') return d as number[];           // 정상: [0.1, 0.2, ...]
                if (Array.isArray(d[0])) return (d as number[][]).flat();     // 중첩: [[0.1, 0.2, ...]] → flatten
                return null;
            };

            const safeDescriptor = sanitizeDescriptor(descriptorArray);
            const safeDescriptors = updatedDescriptors
                .map(sanitizeDescriptor)
                .filter((d): d is number[] => d !== null);

            if (!safeDescriptor || safeDescriptors.length === 0) {
                console.error('[memberService] Descriptor validation failed — aborting save');
                return { success: false, error: 'descriptor_validation_failed' };
            }

            await setDoc(bioRef, {
                memberId,
                descriptor: safeDescriptor,               // 최신값 (하위호환) — 반드시 flat number[]
                descriptors: safeDescriptors.map(d => ({ vector: d })), // 배열 안의 Object 구조로 변환하여 Firestore 중첩 배열 에러 원천 차단
                descriptorCount: safeDescriptors.length,
                updatedAt: new Date().toISOString()
            });
            await updateDoc(tenantDb.doc('members', memberId), { hasFaceDescriptor: true, faceUpdatedAt: new Date().toISOString() });
            this._updateLocalMemberCache(memberId, { faceDescriptor: descriptorArray, hasFaceDescriptor: true });
            return { success: true };
        } catch (e) { console.error('[memberService] Bio hardening failed:', e); return { success: false, error: (e as Error).message }; }
    },

    async deleteFaceDescriptor(memberId: string): Promise<{ success: boolean; error?: string }> {
        try {
            await deleteDoc(tenantDb.doc('face_biometrics', memberId));
            await updateDoc(tenantDb.doc('members', memberId), { hasFaceDescriptor: false, faceUpdatedAt: null, updatedAt: new Date().toISOString() });
            this._updateLocalMemberCache(memberId, { faceDescriptor: null, hasFaceDescriptor: false, faceUpdatedAt: null });
            return { success: true };
        } catch (e) { console.error('[memberService] Face biometrics deletion failed:', e); return { success: false, error: (e as Error).message }; }
    },

    _updateLocalMemberCache(memberId: string, updates: Partial<Member>): void {
        const idx = cachedMembers.findIndex(m => m.id === memberId);
        if (idx !== -1) {
            const newMembers = [...cachedMembers];
            newMembers[idx] = { ...newMembers[idx], ...updates };
            cachedMembers = newMembers;
            try { safeLocalStorage.setItem('kiosk_member_cache', JSON.stringify(cachedMembers)); }
            catch { console.warn('[memberService] Cache persistence failed (Storage full?)'); }
            notifyCallback();
            this._buildPhoneLast4Index();
        }
    },

    async addMember(data: Partial<Member> & { phone: string }): Promise<{ success: boolean; id: string }> {
        try {
            const phoneQuery = query(tenantDb.collection('members'), where('phone', '==', data.phone));
            const phoneSnap = await getDocs(phoneQuery);
            if (!phoneSnap.empty) throw new Error('이미 등록된 전화번호입니다.');
            const docRef = await addDoc(tenantDb.collection('members'), { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), phoneLast4: data.phone.slice(-4) });
            this.triggerKioskSync();
            return { success: true, id: docRef.id };
        } catch (e) { console.error('Add member failed:', e); throw e; }
    },

    getMemberStreak(memberId: string, attendance: Array<{ date?: string }>): number {
        try {
            if (!attendance || attendance.length === 0) return 0;
            const dates = attendance.map(a => a.date).filter(Boolean) as string[];
            dates.sort().reverse();
            const uniqueDates = [...new Set(dates)];
            const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            const yesterdayDate = new Date(); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterday = yesterdayDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;
            let streak = 1; let lastDate = new Date(uniqueDates[0]);
            for (let i = 1; i < uniqueDates.length; i++) {
                const currentDate = new Date(uniqueDates[i]);
                const diff = Math.round((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
                if (diff === 1) { streak++; lastDate = currentDate; } else break;
            }
            return streak;
        } catch { return 0; }
    },

    async getMemberDiligence(memberId: string): Promise<DiligenceData | null> {
        try { const docSnap = await getDoc(tenantDb.doc('member_diligence', memberId)); return docSnap.exists() ? (docSnap.data() as DiligenceData) : null; }
        catch { return null; }
    },

    _safeGetItem(key: string): string | null { return safeLocalStorage.getItem(key); },
    _safeSetItem(key: string, value: string): void { safeLocalStorage.setItem(key, value); },

    getGreetingCache(memberId: string): Record<string, unknown> | null {
        const cached = this._safeGetItem(`greeting_${memberId}`);
        return cached ? JSON.parse(cached) : null;
    },

    setGreetingCache(memberId: string, data: Record<string, unknown>): void {
        this._safeSetItem(`greeting_${memberId}`, JSON.stringify(data));
    },

    // ═══ SOFT DELETE ═══
    async softDeleteMember(memberId: string): Promise<{ success: boolean; error?: string }> {
        try {
            await updateDoc(tenantDb.doc('members', memberId), {
                deletedAt: new Date().toISOString(),
                _deletedBy: 'admin'
            });
            // 로컬 캐시에서 즉시 제거
            cachedMembers = cachedMembers.filter(m => m.id !== memberId);
            this._buildPhoneLast4Index();
            notifyCallback();
            this.triggerKioskSync();
            return { success: true };
        } catch (e) {
            console.error('[memberService] Soft-delete member failed:', e);
            return { success: false, error: (e as Error).message };
        }
    },

    async restoreMember(memberId: string): Promise<{ success: boolean; error?: string }> {
        try {
            await updateDoc(tenantDb.doc('members', memberId), {
                deletedAt: deleteField(),
                _deletedBy: deleteField(),
                _restoredAt: new Date().toISOString(),
                _restoredBy: 'admin'
            });
            this.triggerKioskSync();
            return { success: true };
        } catch (e) {
            console.error('[memberService] Restore member failed:', e);
            return { success: false, error: (e as Error).message };
        }
    },

    async getDeletedMembers(): Promise<Member[]> {
        try {
            const q = query(tenantDb.collection('members'), where('deletedAt', '!=', null), orderBy('deletedAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member));
        } catch (e) {
            console.warn('[memberService] getDeletedMembers failed:', e);
            return [];
        }
    },

    async permanentDeleteMember(memberId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // 영구 삭제 전 audit_log에 백업
            const memberSnap = await getDoc(tenantDb.doc('members', memberId));
            if (memberSnap.exists()) {
                try {
                    await addDoc(tenantDb.collection('audit_log'), {
                        action: 'permanent_delete_member',
                        memberId,
                        memberData: memberSnap.data(),
                        timestamp: new Date().toISOString(),
                        performedBy: 'admin'
                    });
                } catch (auditErr) {
                    console.warn('[memberService] Audit log save failed:', auditErr);
                }
            }
            await deleteDoc(tenantDb.doc('members', memberId));
            this.triggerKioskSync();
            return { success: true };
        } catch (e) {
            console.error('[memberService] Permanent delete member failed:', e);
            return { success: false, error: (e as Error).message };
        }
    }
};
