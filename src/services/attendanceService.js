import { db, functions, app } from '../firebase';
import { collection, doc, query, where, orderBy, getDocs, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, limit as firestoreLimit, increment } from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { memberService } from './memberService';
import { tenantDb } from '../utils/tenantDb';

// [NETWORK] Timeout wrapper for Cloud Function calls
const withTimeout = (promise, timeoutMs = 10000, errorMsg = '서버 응답 시간 초과') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs))
  ]);
};

// --- Local Cache ---
let cachedAttendance = [];
let notifyCallback = () => {};
let attendanceListenerUnsubscribe = null; // [FIX] Declare missing variable
let deps = {
  getCurrentClass: async () => null,
  logError: async () => {} 
};

export const attendanceService = {
  setNotifyCallback(callback) {
    notifyCallback = callback;
  },

  setDependencies(dependencies) {
    deps = { ...deps, ...dependencies };
  },

  setupAttendanceListener() {
    console.log("[attendanceService] setupAttendanceListener called - optimized to avoid global onSnapshot read spikes.");
    try {
      if (attendanceListenerUnsubscribe) {
        console.log("[attendanceService] Cleaning up existing attendance listener...");
        attendanceListenerUnsubscribe();
      }
      attendanceListenerUnsubscribe = onSnapshot(
        query(tenantDb.collection('attendance'), orderBy("timestamp", "desc"), firestoreLimit(500)),
        (snapshot) => {
          cachedAttendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          notifyCallback();
        },
        (error) => console.warn(`[attendanceService] Listener error:`, error)
      );
      return attendanceListenerUnsubscribe;
    } catch (e) {
      console.error(`[attendanceService] Failed to subscribe:`, e);
      return null;
    }
  },

  getAttendance() {
    return cachedAttendance;
  },

  async clearAllAttendance() {
    try {
      const { writeBatch } = await import('firebase/firestore');
      const snapshot = await getDocs(tenantDb.collection('attendance'));
      if (snapshot.empty) return { success: true, count: 0 };

      // [PHASE 3 AUDIT FIX] Bulk delete using batches (limit 500 per batch)
      const docs = snapshot.docs;
      const CHUNK_SIZE = 500;
      let deletedCount = 0;

      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
        deletedCount += chunk.length;
        console.log(`[attendanceService] Batch deleted ${deletedCount}/${docs.length} records...`);
      }

      cachedAttendance = [];
      notifyCallback();
      return { success: true, count: deletedCount };
    } catch (e) {
      console.error("Clear all attendance failed:", e);
      return { success: false, message: e.message };
    }
  },

  async getAttendanceByMemberId(memberId) {
    // 캐시에서 먼저 조회
    let results = cachedAttendance
      .filter(log => log.memberId === memberId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 캐시가 비어있으면 Firestore에서 직접 쿼리
    if (results.length === 0) {
      try {
        const q = query(
          tenantDb.collection('attendance'),
          where('memberId', '==', memberId)
        );
        const snapshot = await getDocs(q);
        results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      } catch (e) {
        console.warn('[Attendance] Firestore fallback failed:', e);
      }
    }
    return results;
  },

  async getAttendanceByDate(dateStr, branchId = null) {
    try {
      let q = query(
        tenantDb.collection('attendance'),
        where("date", "==", dateStr)
      );

      const snapshot = await getDocs(q);
      let records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // [FIX] Sort in memory instead of Firestore orderBy to avoid missing index errors
      records.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      if (branchId) {
        records = records.filter(r => r.branchId === branchId);
      }
      return records;
    } catch (e) {
      console.warn("Get attendance by date failed:", e);
      return [];
    }
  },

  subscribeAttendance(dateStr, branchId = null, callback) {
    try {
      let q = query(
        tenantDb.collection('attendance'),
        where("date", "==", dateStr)
      );

      return onSnapshot(q, (snapshot) => {
        let records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // [FIX] Sort in memory
        records.sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA;
        });
        if (branchId) {
          records = records.filter(r => r.branchId === branchId);
        }
        callback(records);
      }, (error) => {
        console.warn('[attendanceService] Attendance listener error:', error);
      });
    } catch (e) {
      console.error('[attendanceService] Failed to subscribe to attendance:', e);
      return () => {};
    }
  },

  async deleteAttendance(logId, restoreCredit = true) {
    try {
      const logRef = tenantDb.doc('attendance', logId);
      const logSnap = await getDoc(logRef);

      // [FIX] writeBatch로 원자적 처리 — 크레딧 복원과 출석 삭제를 한 번에
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      if (logSnap.exists()) {
        const logData = logSnap.data();
        
        const lowerStatus = (logData.status || '').toLowerCase();
        const wasValid = lowerStatus === 'valid' || lowerStatus === 'success' || (!logData.status && !logData.denialReason);
        
        if (restoreCredit && logData.memberId && wasValid && (logData.type === 'checkin' || logData.type === 'manual' || !logData.type || logData.type === 'attendance')) {
          const creditsToRestore = logData.sessionCount || 1;
          const memberRef = tenantDb.doc('members', logData.memberId);
          // [FIX] batch에 크레딧 복원을 포함 (기존: 별도 await로 원자성 깨짐)
          batch.update(memberRef, {
            credits: increment(creditsToRestore),
            attendanceCount: increment(-creditsToRestore)
          });
        }
      }

      // [FIX] batch에 출석 삭제를 포함 — 크레딧 복원과 동시에 커밋
      batch.delete(logRef);
      await batch.commit();

      // [NEW] 출석 기록이 성공적으로 삭제(commit)된 후, 연관된 사진 파일이 있으면 Storage에서 삭제
      if (logSnap.exists()) {
        const logData = logSnap.data();
        if (logData.photoUrl) {
          try {
            const storage = getStorage(app);
            // URL에서 경로 추출 로직 (Firebase Storage 다운로드 URL 패턴 대응)
            // ex: https://firebasestorage.googleapis.com/v0/b/boksaem-yoga.firebasestorage.app/o/attendance-photos%2F2026-03-06%2Fphoto_1741235332306.webp?alt=media...
            const urlObj = new URL(logData.photoUrl);
            const pathParts = urlObj.pathname.split('/o/');
            if (pathParts.length > 1) {
              const filePath = decodeURIComponent(pathParts[1]);
              const photoRef = ref(storage, filePath);
              await deleteObject(photoRef);
              console.log(`[attendanceService] Deleted associated photo: ${filePath}`);
            }
          } catch (photoErr) {
            console.warn(`[attendanceService] Failed to delete associated photo:`, photoErr);
            // 사진 삭제 실패가 전체 출석 삭제 실패로 이어지지 않도록 예외 무시
          }
        }
      }

      // Rely on onSnapshot listener for UI update (prevents race condition / double-increment)
      const deletedLog = logSnap.exists() ? logSnap.data() : null;
      cachedAttendance = cachedAttendance.filter(l => l.id !== logId);

      notifyCallback();
      return { success: true };
    } catch (e) {
      console.error("Delete attendance failed:", e);
      await deps.logError(e, { context: 'deleteAttendance', logId });
      return { success: false, message: e.message };
    }
  },

  async syncPendingCheckins() {
    if (!navigator.onLine) return { successCount: 0, remainingCount: 0 };

    const queue = JSON.parse(localStorage.getItem('pending_checkins_queue') || '[]');
    if (queue.length === 0) return { successCount: 0, remainingCount: 0 };

    console.log(`[attendanceService] Syncing ${queue.length} pending check-ins...`);
    const pendingRef = tenantDb.collection('pending_attendance');
    
    const remainingQueue = [];
    let successCount = 0;

    for (const item of queue) {
        try {
            await addDoc(pendingRef, item);
            successCount++;
        } catch (e) {
            console.error("[attendanceService] Failed to sync pending record:", e);
            remainingQueue.push(item);
        }
    }

    if (remainingQueue.length > 0) {
        localStorage.setItem('pending_checkins_queue', JSON.stringify(remainingQueue));
    } else {
        localStorage.removeItem('pending_checkins_queue');
    }
    
    console.log(`[attendanceService] Synced ${successCount} records. Remaining: ${remainingQueue.length}`);
    return { successCount, remainingCount: remainingQueue.length };
  },

  async checkInById(memberId, branchId, force = false, eventId = null, facialMatched = false) {
    try {
      const checkInMember = httpsCallable(functions, 'checkInMemberV2Call');
      const currentClassInfo = await deps.getCurrentClass(branchId);
      const classTitle = currentClassInfo?.title || '자율수련';
      const instructor = currentClassInfo?.instructor || '미지정';
      
      let lastErr = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[attendanceService] Check-in attempt ${attempt}/2... (force: ${force})`);
          const safeUUID = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
          const response = await withTimeout(
            checkInMember({ 
                memberId, 
                branchId, 
                classTitle, 
                instructor, 
                classTime: currentClassInfo?.time || null, 
                force,
                eventId: eventId || safeUUID(), // [FIX] Generate UUID safely to prevent crashes on older iPads/tablets
                facialMatched
            }),
            12000,
            'timeout'
          );

          if (response.data.success) {
            // Updated member data will flow via Firebase onSnapshot listener
            const { newCredits, startDate, endDate, attendanceCount, streak, isMultiSession, sessionCount } = response.data;

            return {
              success: true,
              message: isMultiSession ? `[${classTitle}] ${sessionCount}회차 출석되었습니다!` : `[${classTitle}] 출석되었습니다!`,
              attendanceId: response.data.attendanceId,
              attendanceStatus: response.data.attendanceStatus,
              denialReason: response.data.denialReason,
              isDuplicate: response.data.isDuplicate,
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
          } else {
            console.warn(`[attendanceService] Check-in denied by server: ${response.data.message}`);
            return { success: false, message: response.data.message || 'Check-in failed' };
          }
        } catch (error) {
          lastErr = error;
          const errCode = error.code;
          const errMsg = error.message || '';
          const logicErrorCodes = ['invalid-argument', 'failed-precondition', 'out-of-range', 'unauthenticated', 'permission-denied', 'not-found', 'already-exists', 'resource-exhausted', 'aborted', 'cancelled', 'unknown'];

          if (errCode && logicErrorCodes.includes(errCode)) {
            console.warn(`[attendanceService] Logic error returned: ${errCode} - ${errMsg}`);
            return { success: false, message: errMsg };
          }

          if (attempt === 1 && navigator.onLine) {
            console.warn(`[attendanceService] Attempt 1 failed (${errMsg}). Retrying immediately...`);
            continue; 
          }
          break;
        }
      }

      console.warn(`[attendanceService] Offline mode triggered. Reason: ${lastErr?.message || 'Unknown'}`);
      
      const member = memberService.getMemberById(memberId);
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
      const now = new Date().toISOString();

      // [FIX] Offline Expiry Validation & upcomingMembership fallback
      if (member) {
          let isExpired = false;
          let denialReason = null;
          
          if (member.endDate) {
              const todayDate = new Date(today);
              const endDate = new Date(member.endDate);
              if (todayDate > endDate) {
                  isExpired = true;
                  denialReason = 'expired';
              }
          }
          if (!isExpired && (member.credits || 0) <= 0) {
              isExpired = true;
              denialReason = 'no_credits';
          }

          // [NEW] Offline fallback: Activate upcomingMembership if current is exhausted
          if (isExpired && member.upcomingMembership && member.upcomingMembership.startDate) {
              const isTBD = member.upcomingMembership.startDate === 'TBD';
              let shouldActivate = false;
              let newStartDate = member.upcomingMembership.startDate;
              let newEndDate = member.upcomingMembership.endDate;

              if (isTBD) {
                  shouldActivate = true;
                  newStartDate = today;
                  const durationMonths = member.upcomingMembership.durationMonths || 1;
                  if (durationMonths === 9999) {
                      const end = new Date(today);
                      end.setMonth(end.getMonth() + 1);
                      end.setDate(end.getDate() - 1);
                      newEndDate = end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                  } else {
                      const end = new Date(today);
                      end.setMonth(end.getMonth() + durationMonths);
                      end.setDate(end.getDate() - 1);
                      newEndDate = end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                  }
              } else {
                  const upcomingStart = new Date(member.upcomingMembership.startDate);
                  const todayDate = new Date(today);
                  if (todayDate >= upcomingStart) {
                      shouldActivate = true;
                  }
              }

              if (shouldActivate) {
                  console.log(`[attendanceService] Activating upcoming membership for ${memberId} in offline mode`);
                  // Modify the in-memory member object. The actual update will happen in memberService._updateLocalMemberCache later.
                  member.membershipType = member.upcomingMembership.membershipType;
                  member.credits = member.upcomingMembership.credits;
                  member.startDate = newStartDate;
                  member.endDate = newEndDate;
                  
                  // Reset expiration since we just activated a new one
                  isExpired = false;
                  denialReason = null;
              }
          }

          if (isExpired) {
              return {
                 success: true,
                 isOffline: true,
                 attendanceStatus: 'denied',
                 denialReason,
                 message: '기간 혹은 횟수가 만료되었습니다. (오프라인)',
                 member
              };
          }
      }

      const safeUUIDFallback = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      const pendingRef = tenantDb.collection('pending_attendance');
      const pendingData = {
          memberId,
          branchId,
          classTitle,
          instructor,
          classTime: currentClassInfo?.time || null,
          date: today,
          timestamp: now,
          status: 'pending-offline',
          eventId: eventId || safeUUIDFallback(),
          facialMatched: facialMatched,
          // [NEW] 만약 오프라인에서 회원권이 활성화되었다면 해당 정보 포함 (서버 동기화 시 필요)
          activatedUpcomingMembership: member && member.startDate === today ? {
              membershipType: member.membershipType,
              startDate: member.startDate,
              endDate: member.endDate,
              credits: member.credits // 차감 전 혹은 후의 크레딧 (서버에서 최종 결정하겠지만 참고용)
          } : null
      };

      try {
          await addDoc(pendingRef, pendingData);
          console.log("[attendanceService] Pending record saved to Firestore (Offline mode)");
      } catch (firestoreErr) {
          console.error("[attendanceService] Firestore write failed. Using LocalStorage fallback:", firestoreErr.message);
          const localQueue = JSON.parse(localStorage.getItem('pending_checkins_queue') || '[]');
          localQueue.push(pendingData);
          localStorage.setItem('pending_checkins_queue', JSON.stringify(localQueue));
      }

      const newCredits = (member?.credits || 0) > 0 ? ((member?.credits || 0) - 1) : 0;
      const newCount = (member?.attendanceCount || 0) + 1;
      
      const updatePayload = {
          credits: newCredits,
          attendanceCount: newCount,
          lastAttendance: now
      };

      // [NEW] If upcomingMembership was activated, include those changes in the local cache update
      if (pendingData.activatedUpcomingMembership) {
          updatePayload.membershipType = member?.membershipType;
          updatePayload.startDate = member?.startDate;
          updatePayload.endDate = member?.endDate;
          updatePayload.upcomingMembership = null; 
      }

      if (member) {
          memberService._updateLocalMemberCache(memberId, updatePayload);
      }

      return {
        success: true,
        isOffline: true,
        message: `[${classTitle}] 출석되었습니다!`,
        member: {
          ...(member || {}),
          name: member?.name || '회원',
          credits: newCredits,
          attendanceCount: newCount,
          membershipType: updatePayload.membershipType || member?.membershipType,
          startDate: updatePayload.startDate || member?.startDate,
          endDate: updatePayload.endDate || member?.endDate
        }
      };
    } catch (error) {
    return { success: false, message: error.message };
  }
  },

  async addManualAttendance(memberId, date, branchId, className = "수동 확인", instructor = "관리자", { skipCreditDeduction = false } = {}) {
    try {
      const memberDoc = await getDoc(tenantDb.doc('members', memberId));
      const memberData = memberDoc.exists() ? memberDoc.data() : null;
      const memberName = memberData ? memberData.name : '알 수 없음';

      let finalDate = new Date(date);
      if (isNaN(finalDate.getTime())) {
        finalDate = new Date();
      }
      const timestamp = finalDate.toISOString();
      const dateStr = finalDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

      let finalClassName = className;
      let finalInstructor = instructor;

      const kstH = String(finalDate.getHours()).padStart(2, '0');
      const kstM = String(finalDate.getMinutes()).padStart(2, '0');
      let finalClassTime = `${kstH}:${kstM}`;

      if (className === "수동 확인") {
        try {
          const scheduleDocId = `${branchId}_${dateStr}`;
          const scheduleDoc = await getDoc(tenantDb.doc('daily_classes', scheduleDocId));

          if (scheduleDoc.exists()) {
            const scheduleData = scheduleDoc.data();
            const dayClasses = scheduleData.classes || [];

            const hour = finalDate.getHours();
            const minute = finalDate.getMinutes();
            const requestTimeMins = hour * 60 + minute;

            // [FIX] Prefer exact hour:minute match first to avoid fuzzy grouping errors (e.g. 14:00 matching to 14:20 class)
            let matchedClass = dayClasses.find(cls => cls.time === finalClassTime && cls.status !== 'cancelled');

            if (!matchedClass) {
              matchedClass = dayClasses.find(cls => {
                if (!cls.time || cls.status === 'cancelled') return false;
                const [classHour, classMinute] = cls.time.split(':').map(Number);
                const classStartMins = classHour * 60 + classMinute;
                const classDuration = cls.duration || 60;
                const classEndMins = classStartMins + classDuration;
                return requestTimeMins >= classStartMins - 30 && requestTimeMins <= classEndMins + 30;
              });
            }

            if (matchedClass) {
              finalClassName = matchedClass.title || matchedClass.name || "수업";
              finalInstructor = matchedClass.instructor || "선생님";
              finalClassTime = matchedClass.time; // Use the matched class's official time
            } else {
              finalClassName = "자율수련";
              finalInstructor = "회원";
            }
          } else {
            finalClassName = "자율수련";
            finalInstructor = "회원";
          }
        } catch (scheduleError) {
          console.warn("Schedule lookup failed, using default:", scheduleError);
          finalClassName = "자율수련";
          finalInstructor = "회원";
        }
      }

      // [FIX] upcomingMembership 활성화 로직 (Cloud Function과 동일)
      // 수동 출석 시에도 선등록 회원권이 활성화되어야 함
      let membershipUpdate = null;
      if (memberData && memberData.upcomingMembership && memberData.upcomingMembership.startDate) {
        const upcoming = memberData.upcomingMembership;
        const isTBD = upcoming.startDate === 'TBD';
        let shouldActivate = false;
        let newStartDate = upcoming.startDate;
        let newEndDate = upcoming.endDate;

        if (isTBD) {
          // TBD: 현재 회원권이 소진/만료 시 활성화
          const currentCredits = memberData.credits || 0;
          const isCurrentExpired = memberData.endDate ? (new Date(dateStr) > new Date(memberData.endDate)) : false;
          const isCurrentExhausted = currentCredits <= 0 || isCurrentExpired;

          if (isCurrentExhausted) {
            shouldActivate = true;
            newStartDate = dateStr;
            const durationMonths = upcoming.durationMonths || 1;
            const end = new Date(dateStr);
            end.setMonth(end.getMonth() + durationMonths);
            end.setDate(end.getDate() - 1);
            newEndDate = end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
          }
        } else {
          // 시작일이 지정된 경우: 출석일 >= 시작일이면 활성화
          const upcomingStart = new Date(upcoming.startDate);
          const attendanceDate = new Date(dateStr);
          if (attendanceDate >= upcomingStart) {
            shouldActivate = true;
          }
        }

        if (shouldActivate) {
          console.log(`[Manual Attendance] Activating upcoming membership for ${memberId}`);
          membershipUpdate = {
            membershipType: upcoming.membershipType,
            credits: upcoming.credits,
            startDate: newStartDate,
            endDate: newEndDate,
            upcomingMembership: null // Firestore에서 삭제
          };
        }
      }

      // [FIX] writeBatch로 출석 생성 + 크레딧 차감을 원자적으로 처리
      const { writeBatch, deleteField } = await import('firebase/firestore');
      const batch = writeBatch(db);

      const newAttRef = doc(tenantDb.collection('attendance'));
      const attendanceData = {
        memberId,
        memberName,
        timestamp,
        branchId,
        className: finalClassName,
        instructor: finalInstructor,
        classTime: finalClassTime,
        type: 'manual',
        date: dateStr
      };

      batch.set(newAttRef, attendanceData);

      const memberRef = tenantDb.doc('members', memberId);

      if (membershipUpdate) {
        // 선등록 회원권 활성화 + 크레딧 차감 (새 크레딧에서 -1)
        batch.update(memberRef, {
          membershipType: membershipUpdate.membershipType,
          credits: membershipUpdate.credits - 1,
          startDate: membershipUpdate.startDate,
          endDate: membershipUpdate.endDate,
          upcomingMembership: deleteField(),
          attendanceCount: increment(1),
          lastAttendance: timestamp
        });
      } else if (skipCreditDeduction) {
        // [FIX] 등록 시 includeToday로 이미 크레딧 차감된 경우, 크레딧은 건드리지 않고 출석 기록만 추가
        batch.update(memberRef, {
          attendanceCount: increment(1),
          lastAttendance: timestamp
        });
      } else {
        // 기존 로직: 단순 크레딧 차감
        batch.update(memberRef, {
          credits: increment(-1),
          attendanceCount: increment(1),
          lastAttendance: timestamp
        });
      }

      // [FIX] 원자적 커밋 — 출석 기록과 크레딧 차감이 동시에 성공하거나 동시에 실패
      await batch.commit();

      const newLog = {
        id: newAttRef.id,
        ...attendanceData
      };

      // Member credits and log additions will flow via real-time Firestore listeners

      notifyCallback();

      return { success: true, id: newAttRef.id };
    } catch (e) {
      console.error("Add manual attendance failed:", e);
      return { success: false, message: e.message };
    }
  },

  // [NEW] Update Past Attendance Records when Schedule Changes
  async updatePastAttendanceRecords(branchId, dateStr, oldClasses, newClasses) {
    try {
      console.log(`[attendanceService] Checking retroactive updates for ${dateStr} at ${branchId}`);
      if (!oldClasses || !newClasses) return { success: true, count: 0 };

      // Find changed classes
      const changedClasses = [];
      newClasses.forEach(newCls => {
        if (!newCls.time) return;
        
        // Find matching class in old schedule (by time)
        const oldCls = oldClasses.find(c => c.time === newCls.time);
        
        // If not found, it's totally new (no past attendance to update).
        // If found, check if instructor or title changed.
        if (oldCls) {
           const isTitleChanged = (oldCls.title || oldCls.className) !== (newCls.title || newCls.className);
           const isInstChanged = oldCls.instructor !== newCls.instructor;
           
           if (isTitleChanged || isInstChanged) {
               changedClasses.push({
                   time: newCls.time,
                   duration: newCls.duration || 60,
                   oldTitle: oldCls.title || oldCls.className,
                   oldInst: oldCls.instructor,
                   newTitle: newCls.title || newCls.className,
                   newInst: newCls.instructor
               });
           }
        }
      });

      if (changedClasses.length === 0) {
        console.log('[attendanceService] No relevant class changes found for retroactive update.');
        return { success: true, count: 0 };
      }

      // Fetch attendance for that date
      const q = query(
          tenantDb.collection('attendance'),
          where("date", "==", dateStr),
          where("branchId", "==", branchId)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return { success: true, count: 0 };

      // Batch update references
      let updateCount = 0;
      const batchRef = window.firebaseWriteBatch || (await import('firebase/firestore')).writeBatch;
      const batch = batchRef(db);

      snapshot.docs.forEach(docSnap => {
          const log = docSnap.data();
          
          Object.values(changedClasses).forEach(changedCls => {
              // Time matching logic: -30 mins ~ End time + 30 mins
              const [classH, classM] = changedCls.time.split(':').map(Number);
              const classStartMins = classH * 60 + classM;
              const classEndMins = classStartMins + changedCls.duration;

              // Extract hour/min from attendance timestamp
              const logDate = new Date(log.timestamp);
              const logMins = logDate.getHours() * 60 + logDate.getMinutes();

               // If the attendance was recorded roughly during the time window of the exchanged class
              if (logMins >= classStartMins - 30 && logMins <= classEndMins + 30) {
                  
                  // Double check: if it still holds the OLD text, update it.
                  if (log.className === changedCls.oldTitle || log.instructor === changedCls.oldInst) {
                      const docRef = tenantDb.doc('attendance', docSnap.id);
                      batch.update(docRef, {
                          className: changedCls.newTitle,
                          instructor: changedCls.newInst
                      });
                      updateCount++;
                  }
              }
          });
      });

      if (updateCount > 0) {
          await batch.commit();
          console.log(`[attendanceService] Retroactively updated ${updateCount} attendance records.`);
      }

      return { success: true, count: updateCount };
    } catch (e) {
      console.error("[attendanceService] Failed retroactive update:", e);
      return { success: false, message: e.message };
    }
  }
};
