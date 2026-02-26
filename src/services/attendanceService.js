import { db, functions } from '../firebase';
import { collection, doc, query, where, orderBy, getDocs, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, limit as firestoreLimit, increment } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { memberService } from './memberService';

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
    try {
      return onSnapshot(
        query(collection(db, 'attendance'), orderBy("timestamp", "desc"), firestoreLimit(500)),
        (snapshot) => {
          cachedAttendance = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          notifyCallback();
        },
        (error) => console.warn(`[attendanceService] Listener error:`, error)
      );
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
      if (!window.confirm('정말로 모든 출석 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return { success: false, message: '취소되었습니다.' };
      }
      const snapshot = await getDocs(collection(db, 'attendance'));
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      cachedAttendance = [];
      notifyCallback();
      return { success: true, count: snapshot.docs.length };
    } catch (e) {
      console.error("Clear all attendance failed:", e);
      return { success: false, message: e.message };
    }
  },

  getAttendanceByMemberId(memberId) {
    return cachedAttendance
      .filter(log => log.memberId === memberId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  async getAttendanceByDate(dateStr, branchId = null) {
    try {
      let q = query(
        collection(db, 'attendance'),
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
        collection(db, 'attendance'),
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
      const logRef = doc(db, 'attendance', logId);
      const logSnap = await getDoc(logRef);

      if (logSnap.exists()) {
        const logData = logSnap.data();
        
        const lowerStatus = (logData.status || '').toLowerCase();
        const wasValid = lowerStatus === 'valid' || lowerStatus === 'success' || (!logData.status && !logData.denialReason);
        
        // [FIX] Support explicit restoreCredit flag and calculate credits to restore.
        // A multi-session check-in might use more than 1 credit.
        if (restoreCredit && logData.memberId && wasValid && (logData.type === 'checkin' || logData.type === 'manual' || !logData.type || logData.type === 'attendance')) {
          const creditsToRestore = logData.sessionCount || 1;
          const memberRef = doc(db, 'members', logData.memberId);
          await updateDoc(memberRef, {
            credits: increment(creditsToRestore),
            attendanceCount: increment(-creditsToRestore)
          });
          // [FIX] Do NOT manually update local cache here.
          // The memberService real-time listener (onSnapshot) will automatically
          // pick up the Firestore increment and sync the correct value.
          // Previously, manual cache update + listener update caused a +2 → +1 flicker.
        }
      }

      await deleteDoc(logRef);
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
    const pendingRef = collection(db, 'pending_attendance');
    
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

  async checkInById(memberId, branchId, force = false) {
    try {
      const checkInMember = httpsCallable(functions, 'checkInMemberV2Call');
      const currentClassInfo = await deps.getCurrentClass(branchId);
      const classTitle = currentClassInfo?.title || '자율수련';
      const instructor = currentClassInfo?.instructor || '미지정';
      
      let lastErr = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[attendanceService] Check-in attempt ${attempt}/2... (force: ${force})`);
          const response = await withTimeout(
            checkInMember({ 
                memberId, 
                branchId, 
                classTitle, 
                instructor, 
                classTime: currentClassInfo?.time || null, 
                force 
            }),
            5000,
            'timeout'
          );

          if (response.data.success) {
            const { newCredits, startDate, endDate, attendanceCount, streak, isMultiSession, sessionCount } = response.data;
            memberService._updateLocalMemberCache(memberId, { 
              credits: newCredits, 
              attendanceCount, 
              streak, 
              startDate, 
              endDate,
              lastAttendance: new Date().toISOString()
            });

            return {
              success: true,
              message: isMultiSession ? `[${classTitle}] ${sessionCount}회차 출석되었습니다!` : `[${classTitle}] 출석되었습니다!`,
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

      const pendingRef = collection(db, 'pending_attendance');
      const pendingData = {
          memberId,
          branchId,
          classTitle,
          instructor,
          classTime: currentClassInfo?.time || null,
          date: today,
          timestamp: now,
          status: 'pending-offline'
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

      const newCredits = (member?.credits || 0) > 0 ? (member.credits - 1) : 0;
      const newCount = (member?.attendanceCount || 0) + 1;
      
      const updatePayload = {
          credits: newCredits,
          attendanceCount: newCount,
          lastAttendance: now
      };

      // [NEW] If upcomingMembership was activated, include those changes in the local cache update
      if (member && !member.upcomingMembership && Object.keys(member).includes('upcomingMembership') === false || (member && member.upcomingMembership && member.startDate !== 'TBD' && member.startDate === today)) {
          // It was activated if we modified the in-memory member object
          updatePayload.membershipType = member.membershipType;
          updatePayload.startDate = member.startDate;
          updatePayload.endDate = member.endDate;
          updatePayload.upcomingMembership = null; // Clear the upcoming membership locally
      }

      memberService._updateLocalMemberCache(memberId, updatePayload);

      return {
        success: true,
        isOffline: true,
        message: `[${classTitle}] 출석되었습니다!`,
        member: {
          ...member,
          credits: newCredits,
          attendanceCount: newCount
        }
      };
    } catch (error) {
    return { success: false, message: error.message };
  }
  },

  async addManualAttendance(memberId, date, branchId, className = "수동 확인", instructor = "관리자") {
    try {
      const memberDoc = await getDoc(doc(db, 'members', memberId));
      const memberName = memberDoc.exists() ? memberDoc.data().name : '알 수 없음';

      let finalDate = new Date(date);
      if (isNaN(finalDate.getTime())) {
        finalDate = new Date();
      }
      const timestamp = finalDate.toISOString();

      let finalClassName = className;
      let finalInstructor = instructor;

      if (className === "수동 확인") {
        try {
          const dateStr = finalDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
          const scheduleDocId = `${branchId}_${dateStr}`;
          const scheduleDoc = await getDoc(doc(db, 'daily_classes', scheduleDocId));

          if (scheduleDoc.exists()) {
            const scheduleData = scheduleDoc.data();
            const dayClasses = scheduleData.classes || [];

            const hour = finalDate.getHours();
            const minute = finalDate.getMinutes();
            const requestTimeMins = hour * 60 + minute;

            const matchedClass = dayClasses.find(cls => {
              if (!cls.time || cls.status === 'cancelled') return false;
              const [classHour, classMinute] = cls.time.split(':').map(Number);
              const classStartMins = classHour * 60 + classMinute;
              const classDuration = cls.duration || 60;
              const classEndMins = classStartMins + classDuration;
              return requestTimeMins >= classStartMins - 30 && requestTimeMins <= classEndMins + 30;
            });

            if (matchedClass) {
              finalClassName = matchedClass.title || matchedClass.name || "수업";
              finalInstructor = matchedClass.instructor || "선생님";
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

      const docRef = await addDoc(collection(db, 'attendance'), {
        memberId,
        memberName,
        timestamp,
        branchId,
        className: finalClassName,
        instructor: finalInstructor,
        type: 'manual',
        date: finalDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
      });

      const memberRef = doc(db, 'members', memberId);
      await updateDoc(memberRef, {
        credits: increment(-1),
        attendanceCount: increment(1),
        lastAttendance: timestamp
      });

      const newLog = {
        id: docRef.id,
        memberId,
        memberName,
        timestamp,
        branchId,
        className: finalClassName,
        instructor: finalInstructor,
        type: 'manual',
        date: finalDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
      };

      const alreadyExists = cachedAttendance.some(l => l.id === docRef.id);
      if (!alreadyExists) {
        cachedAttendance.push(newLog);
        cachedAttendance.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }

      memberService._updateLocalMemberCache(memberId, {
        credits: (Number(memberService.getMemberById(memberId)?.credits) || 0) - 1,
        attendanceCount: (Number(memberService.getMemberById(memberId)?.attendanceCount) || 0) + 1,
        lastAttendance: timestamp
      });

      notifyCallback();

      return { success: true, id: docRef.id };
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
          collection(db, 'attendance'),
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
                      const docRef = doc(db, 'attendance', docSnap.id);
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
