/**
 * Member Service Module
 * 회원 관련 CRUD 작업을 처리합니다.
 * 
 * @module memberModule
 * [Refactor] Extracted from storage.js
 */

import { db, functions } from "../../firebase";
import { collection, addDoc, getDocs, getDoc, doc, query, where, updateDoc, limit as firestoreLimit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

// Timeout wrapper
const withTimeout = (promise, timeoutMs = 10000, errorMsg = '서버 응답 시간 초과') => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs))
    ]);
};

/**
 * 전화번호 마지막 4자리로 회원 검색
 * @param {string} last4Digits - 검색할 전화번호 뒷자리
 * @param {Object} phoneLast4Index - O(1) 인덱스 (주입)
 * @param {Array} cachedMembers - 캐시된 회원 배열 (주입)
 */
export const findMembersByPhone = async (last4Digits, phoneLast4Index, cachedMembers) => {
    // 1. O(1) Index lookup
    if (phoneLast4Index[last4Digits]?.length > 0) {
        console.log(`[Member] Index hit for ${last4Digits}: ${phoneLast4Index[last4Digits].length} member(s)`);
        return phoneLast4Index[last4Digits];
    }
    
    // 2. O(n) filter on cache
    const cachedResults = cachedMembers.filter(m => 
        (m.phoneLast4 || (m.phone && m.phone.slice(-4))) === last4Digits
    );
    if (cachedResults.length > 0) {
        console.log(`[Member] Cache filter hit for ${last4Digits}: ${cachedResults.length} member(s)`);
        return cachedResults;
    }

    // 3. Cloud Function fallback
    console.warn(`[Member] Cache miss for ${last4Digits}, calling Cloud Function...`);
    try {
        const getSecureMember = httpsCallable(functions, 'getSecureMemberV2Call');
        const result = await withTimeout(
            getSecureMember({ phoneLast4: last4Digits }),
            10000,
            '회원 조회 시간 초과 - 네트워크를 확인해주세요'
        );
        return result.data.members || [];
    } catch (e) {
        console.warn("Using Firestore fallback:", e);
        const q = query(
            collection(db, 'members'),
            where("phoneLast4", "==", last4Digits),
            firestoreLimit(10)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

/**
 * 회원 로그인 (이름 + PIN)
 */
export const loginMember = async (name, last4Digits) => {
    try {
        const membersSnap = await getDocs(
            query(
                collection(db, 'members'),
                where('name', '==', name)
            )
        );

        const matches = membersSnap.docs.filter(doc => {
            const phone = doc.data().phone || '';
            return phone.slice(-4) === last4Digits;
        });

        if (matches.length === 1) {
            return { success: true, member: { id: matches[0].id, ...matches[0].data() } };
        } else if (matches.length > 1) {
            return { success: false, error: 'MULTIPLE_MATCHES', candidates: matches.map(m => ({ id: m.id, ...m.data() })) };
        } else {
            return { success: false, error: 'NOT_FOUND', message: '회원을 찾을 수 없습니다.' };
        }
    } catch (e) {
        console.error('Login failed:', e);
        return { success: false, error: 'SYSTEM_ERROR', message: '로그인 중 오류가 발생했습니다.' };
    }
};

/**
 * 회원 정보 수정
 */
export const updateMember = async (memberId, data) => {
    try {
        const memberRef = doc(db, 'members', memberId);
        await updateDoc(memberRef, { ...data, updatedAt: new Date().toISOString() });
        return { success: true };
    } catch (e) {
        console.error('Update member failed:', e);
        return { success: false, error: e.message };
    }
};

/**
 * 회원 추가
 */
export const addMember = async (data) => {
    try {
        // Check for duplicates
        const phoneQuery = query(collection(db, 'members'), where('phone', '==', data.phone));
        const phoneSnap = await getDocs(phoneQuery);
        if (!phoneSnap.empty) {
            throw new Error('이미 등록된 전화번호입니다.');
        }

        const docRef = await addDoc(collection(db, 'members'), {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            phoneLast4: data.phone.slice(-4)
        });
        console.log(`[Member] Member added: ${docRef.id}`);

        return { success: true, id: docRef.id };
    } catch (e) {
        console.error('Add member failed:', e);
        throw e;
    }
};

/**
 * ID로 회원 조회
 */
export const getMemberById = async (id, cachedMembers) => {
    // Cache lookup first
    const cached = cachedMembers.find(m => m.id === id);
    if (cached) return cached;

    // Firestore fallback
    try {
        const docSnap = await getDoc(doc(db, 'members', id));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (e) {
        console.error('Get member by ID failed:', e);
        return null;
    }
};

/**
 * 회원 연속 출석 수 계산
 */
export const getMemberStreak = (memberId, attendance) => {
    try {
        if (!attendance || attendance.length === 0) return 0;

        const dates = attendance.map(a => a.date).filter(Boolean).sort().reverse();
        const uniqueDates = [...new Set(dates)];

        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

        // Count consecutive days
        if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

        let streak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i - 1]);
            const currDate = new Date(uniqueDates[i]);
            const diffDays = Math.round((prevDate - currDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    } catch (e) {
        console.warn('getMemberStreak error:', e);
        return 0;
    }
};

/**
 * 회원 성실도 계산
 */
export const getMemberDiligence = (memberId, cachedAttendance, cachedMembers) => {
    const member = cachedMembers.find(m => m.id === memberId);
    if (!member) return 'normal';

    const logs = cachedAttendance.filter(a => a.memberId === memberId);
    const monthlyAvg = logs.length / 3; // Rough 3-month estimate
    
    if (monthlyAvg >= 12) return 'excellent';
    if (monthlyAvg >= 8) return 'good';
    if (monthlyAvg >= 4) return 'normal';
    return 'low';
};
