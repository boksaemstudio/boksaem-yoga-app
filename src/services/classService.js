/**
 * Class Service — Smart Class Matching & Daily Class Cache
 * Extracted from storage.js
 */
import { getDoc } from 'firebase/firestore';
import { tenantDb } from '../utils/tenantDb';
import { getKSTTotalMinutes } from '../utils/dates';

let cachedDailyClasses = {};
const DAILY_CLASS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const classService = {
  async _refreshDailyClassCache(branchId, date = null) {
    const targetDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `${branchId}_${targetDate}`;
    try {
      const docRef = tenantDb.doc('daily_classes', cacheKey);
      const docSnap = await getDoc(docRef);
      cachedDailyClasses[cacheKey] = { 
        classes: docSnap.exists() ? (docSnap.data().classes || []) : [], 
        fetchedAt: Date.now() 
      };
    } catch (e) {
      console.warn(`[Class] Failed to refresh daily classes for ${cacheKey}:`, e);
    }
  },

  async getCurrentClass(branchId, instructorName = null, membershipTypeHint = null) {
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `${branchId}_${today}`;
    
    const cached = cachedDailyClasses[cacheKey];
    const now = Date.now();
    const isStale = !cached || !cached.classes || cached.classes.length === 0 || (now - (cached.fetchedAt || 0)) > DAILY_CLASS_CACHE_TTL;

    if (isStale) {
      try {
        const docRef = tenantDb.doc('daily_classes', cacheKey);
        const docSnap = await getDoc(docRef);
        const classes = docSnap.exists() ? (docSnap.data().classes || []) : [];
        cachedDailyClasses[cacheKey] = { classes, fetchedAt: Date.now() };
      } catch (e) { 
        console.warn("[Class] Failed to fetch classes:", e);
        return null; 
      }
    }
    
    let classes = (cachedDailyClasses[cacheKey]?.classes || [])
      .filter(c => c.status !== 'cancelled');

    if (instructorName) {
      const q = instructorName.trim();
      classes = classes.filter(c => {
        const target = (c.instructor || '').trim();
        return target === q || target.includes(q) || q.includes(target);
      });
    }

    classes.sort((a, b) => a.time.localeCompare(b.time));
    if (classes.length === 0) return null;

    const currentMinutes = getKSTTotalMinutes();
    let selectedClass = null;
    let logicReason = "No Match";

    // === Priority 0: Membership Type Hint Matching ===
    if (membershipTypeHint) {
        const keyword = membershipTypeHint.trim().toLowerCase();
        const ignoredHints = ['일반', '심화', 'ttc (지도자과정)'];
        
        if (!ignoredHints.includes(keyword)) {
            const hintMatchedClass = classes.find(c => {
                const title = (c.title || c.className || '').toLowerCase();
                return title.includes(keyword) || keyword.includes(title);
            });

            if (hintMatchedClass) {
                return {
                    title: hintMatchedClass.title || hintMatchedClass.className,
                    instructor: hintMatchedClass.instructor,
                    time: hintMatchedClass.time,
                    debugReason: `회원권 기반 매칭: ${membershipTypeHint}`
                };
            }
        }
    }

    // === Smart Matching Algorithm ===
    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      const duration = cls.duration || 60;
      const [h, m] = cls.time.split(':').map(Number);
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + duration;

      // Rule 1: 30-min Pre-class Zone
      if (currentMinutes >= startMinutes - 30 && currentMinutes < startMinutes) {
        selectedClass = cls;
        logicReason = `수업 예정: ${cls.time}`;
        break;
      }

      // Rule 2: Ongoing Class
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        const nextCls = classes[i+1];
        if (nextCls) {
           const [nh, nm] = nextCls.time.split(':').map(Number);
           const nextStart = nh * 60 + nm;
           if (currentMinutes >= nextStart - 30) {
              selectedClass = nextCls;
              logicReason = `다음 수업 우선: ${nextCls.time}`;
              break; 
           }
        }
        selectedClass = cls;
        logicReason = `수업 진행 중: ${cls.time}`;
        break; 
      }

      // Rule 3: 1-Hour Early Bird
      if (currentMinutes >= startMinutes - 60 && currentMinutes < startMinutes - 30) {
         const prevCls = classes[i-1];
         let isBlocked = false;
         if (prevCls) {
            const [ph, pm] = prevCls.time.split(':').map(Number);
            const prevEnd = (ph * 60 + pm) + (prevCls.duration || 60);
            if (currentMinutes < prevEnd) isBlocked = true;
         }
         if (!isBlocked) {
            selectedClass = cls;
            logicReason = `조기 출석: ${cls.time}`;
            break;
         }
      }
    }

    // Rule 4: Post-Class Grace Period
    if (!selectedClass) {
      for (let i = classes.length - 1; i >= 0; i--) {
        const cls = classes[i];
        const duration = cls.duration || 60;
        const [h, m] = cls.time.split(':').map(Number);
        const endMinutes = (h * 60 + m) + duration;

        if (currentMinutes >= endMinutes && currentMinutes <= endMinutes + 30) {
          selectedClass = cls;
          logicReason = `수업 종료 직후: ${cls.time} (종료 ${currentMinutes - endMinutes}분 경과)`;
          break;
        }
      }
    }

    if (selectedClass) {
       console.log(`[SmartAttendance] Matched: ${selectedClass.title || selectedClass.className} (${logicReason})`);
       return { 
         title: selectedClass.title || selectedClass.className, 
         instructor: selectedClass.instructor,
         time: selectedClass.time,
         debugReason: logicReason
       };
    }

    return null;
  },

  async getDailyClasses(branchId, instructorName = null, date = null) {
    const targetDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const cacheKey = `${branchId}_${targetDate}`;
    
    const cached = cachedDailyClasses[cacheKey];
    if (!cached || !cached.classes) {
      try {
        const docRef = tenantDb.doc('daily_classes', cacheKey);
        const docSnap = await getDoc(docRef);
        const classes = docSnap.exists() ? (docSnap.data().classes || []) : [];
        cachedDailyClasses[cacheKey] = { classes, fetchedAt: Date.now() };
      } catch { return []; }
    }
    
    let classes = (cachedDailyClasses[cacheKey]?.classes || [])
      .filter(c => c.status !== 'cancelled');

    if (instructorName) {
      const target = instructorName.trim();
      classes = classes.filter(c => (c.instructor || '').trim() === target);
    }

    return classes.sort((a, b) => a.time.localeCompare(b.time));
  }
};
