const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('./functions/service-account-key.json');

if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// Simulation of storage.js utility
const getKSTTotalMinutes = (customHour, customMinute) => {
    return customHour * 60 + customMinute;
};

async function simulateMatch(hour, minute) {
    const branchId = 'gwangheungchang';
    const today = '2026-02-15';
    const cacheKey = `${branchId}_${today}`;
    
    const docSnap = await db.collection('daily_classes').doc(cacheKey).get();
    const allDetailClasses = docSnap.data().classes;
    
    let classes = allDetailClasses.filter(c => c.status !== 'cancelled');
    classes.sort((a, b) => a.time.localeCompare(b.time));
    
    const currentMinutes = getKSTTotalMinutes(hour, minute);
    let selectedClass = null;
    let logicReason = "No Match";

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

    if (!selectedClass) {
      for (let i = classes.length - 1; i >= 0; i--) {
        const cls = classes[i];
        const duration = cls.duration || 60;
        const [h, m] = cls.time.split(':').map(Number);
        const endMinutes = (h * 60 + m) + duration;
        if (currentMinutes >= endMinutes && currentMinutes <= endMinutes + 30) {
          selectedClass = cls;
          logicReason = `수업 종료 직후: ${cls.time}`;
          break;
        }
      }
    }

    if (selectedClass) {
        console.log(`Time ${hour}:${minute} -> Matched: ${selectedClass.title} | Instructor: ${selectedClass.instructor} | Reason: ${logicReason}`);
    } else {
        console.log(`Time ${hour}:${minute} -> No match`);
    }
}

async function run() {
    await simulateMatch(13, 14); // Member 하정은
    await simulateMatch(13, 53); // Member 강영진
}

run().catch(console.error);
