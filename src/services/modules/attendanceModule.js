/**
 * Attendance Service Module
 * 출석 관련 CRUD 작업을 처리합니다.
 * 
 * @module attendanceModule
 * [Refactor] Extracted from storage.js
 */

import { db, functions } from "../../firebase";
import { collection, addDoc, deleteDoc, getDocs, getDoc, doc, query, where, orderBy, limit as firestoreLimit, increment, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

// Timeout wrapper for network calls
const withTimeout = (promise, timeoutMs = 10000, errorMsg = '서버 응답 시간 초과') => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs))
    ]);
};

/**
 * 회원 출석 체크 (Cloud Function 호출)
 * @param {string} memberId 
 * @param {string} branchId 
 * @param {Function} getCurrentClass - storage.js에서 주입
 * @param {Array} cachedMembers - 캐시된 회원 배열 (주입)
 * @param {Function} notifyListeners - 리스너 알림 콜백
 */
export const checkInById = async (memberId, branchId, getCurrentClass, cachedMembers, notifyListeners) => {
    try {
        const checkInMember = httpsCallable(functions, 'checkInMemberV2Call');
        const currentClassInfo = await getCurrentClass(branchId);
        const classTitle = currentClassInfo?.title || '자율수련';
        const instructor = currentClassInfo?.instructor || '관리자';
        
        const response = await withTimeout(
            checkInMember({ memberId, branchId, classTitle, instructor }),
            10000,
            '출석 처리 시간 초과 - 다시 시도해주세요'
        );

        if (!response.data.success) throw new Error(response.data.message || 'Check-in failed');

        const { newCredits, startDate, endDate, attendanceCount, streak, isMultiSession, sessionCount } = response.data;
        
        // 캐시 업데이트
        const idx = cachedMembers.findIndex(m => m.id === memberId);
        if (idx !== -1) {
            cachedMembers[idx].credits = newCredits;
            cachedMembers[idx].attendanceCount = attendanceCount;
            cachedMembers[idx].streak = streak;
            cachedMembers[idx].startDate = startDate;
            cachedMembers[idx].endDate = endDate;
            cachedMembers[idx].lastAttendance = new Date().toISOString();
            if (notifyListeners) notifyListeners();
        }
        
        return {
            success: true,
            message: isMultiSession ? `[${classTitle}] ${sessionCount}회차 출석되었습니다!` : `[${classTitle}] 출석되었습니다!`,
            member: {
                id: memberId,
                name: response.data.memberName,
                credits: newCredits,
                attendanceCount,
                streak,
                startDate,
                endDate,
                isMultiSession,
                sessionCount
            }
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

/**
 * 회원별 출석 기록 조회
 */
export const getAttendanceByMemberId = async (memberId) => {
    try {
        console.log('[Attendance] getAttendanceByMemberId:', memberId);
        const q = query(
            collection(db, 'attendance'),
            where('memberId', '==', memberId),
            orderBy('timestamp', 'desc'),
            firestoreLimit(50)
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('[Attendance] Results:', results.length);
        return results;
    } catch (e) {
        console.error('[Attendance] Failed to fetch:', e);
        return [];
    }
};

/**
 * 날짜별 출석 기록 조회
 */
export const getAttendanceByDate = async (dateStr, branchId = null) => {
    try {
        let q;
        if (branchId) {
            q = query(
                collection(db, 'attendance'),
                where('date', '==', dateStr),
                where('branchId', '==', branchId),
                orderBy('timestamp', 'desc')
            );
        } else {
            q = query(
                collection(db, 'attendance'),
                where('date', '==', dateStr),
                orderBy('timestamp', 'desc')
            );
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error('[Attendance] getAttendanceByDate failed:', e);
        return [];
    }
};

/**
 * 출석 기록 삭제
 */
export const deleteAttendance = async (logId, cachedMembers, notifyListeners) => {
    try {
        const logRef = doc(db, 'attendance', logId);
        const logSnap = await getDoc(logRef);
        
        if (!logSnap.exists()) {
            throw new Error("Log not found");
        }

        const logData = logSnap.data();
        const memberId = logData.memberId;
        
        // Delete the log
        await deleteDoc(logRef);
        
        // Update member's attendance count and credits
        if (memberId) {
            const memberRef = doc(db, 'members', memberId);
            await updateDoc(memberRef, {
                attendanceCount: increment(-1),
                credits: increment(1)
            });
            
            // Update cache
            const idx = cachedMembers.findIndex(m => m.id === memberId);
            if (idx !== -1) {
                cachedMembers[idx].attendanceCount = (cachedMembers[idx].attendanceCount || 1) - 1;
                cachedMembers[idx].credits = (cachedMembers[idx].credits || 0) + 1;
                if (notifyListeners) notifyListeners();
            }
        }
        
        return { success: true };
    } catch (e) {
        console.error("Delete attendance failed:", e);
        throw e;
    }
};

/**
 * 수동 출석 추가
 */
export const addManualAttendance = async (memberId, date, branchId, className = "수동 확인", instructor = "관리자", cachedMembers, notifyListeners) => {
    try {
        // Add attendance record
        await addDoc(collection(db, 'attendance'), {
            memberId,
            branchId,
            date,
            className,
            instructor,
            type: 'manual',
            timestamp: new Date().toISOString()
        });
        
        // Update member stats
        const memberRef = doc(db, 'members', memberId);
        await updateDoc(memberRef, {
            attendanceCount: increment(1),
            credits: increment(-1),
            lastAttendance: new Date().toISOString()
        });
        
        // Update cache
        const idx = cachedMembers.findIndex(m => m.id === memberId);
        if (idx !== -1) {
            cachedMembers[idx].attendanceCount = (cachedMembers[idx].attendanceCount || 0) + 1;
            cachedMembers[idx].credits = (cachedMembers[idx].credits || 1) - 1;
            cachedMembers[idx].lastAttendance = new Date().toISOString();
            if (notifyListeners) notifyListeners();
        }
        
        return { success: true };
    } catch (e) {
        console.error("Add manual attendance failed:", e);
        throw e;
    }
};
