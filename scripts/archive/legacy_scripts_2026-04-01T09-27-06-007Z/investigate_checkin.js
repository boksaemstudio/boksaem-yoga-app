const { db } = require('./src/firebase.js'); // Assuming commonjs or we need dynamic import for esm
// Since it's an ESM project, I should use dynamic import.

async function run() {
  const { db } = await import('./src/firebase.js');
  const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');

  try {
    console.log("--- Member Search ---");
    const membersRef = collection(db, 'members');
    
    // Search for 박문선
    const q1 = query(membersRef, where('name', '==', '박문선'));
    const snap1 = await getDocs(q1);
    snap1.forEach(d => console.log('박문선:', d.id, d.data().phone, d.data().phoneLast4));

    // Search for 장민정
    const q2 = query(membersRef, where('name', '==', '장민정'));
    const snap2 = await getDocs(q2);
    snap2.forEach(d => console.log('장민정:', d.id, d.data().phone, d.data().phoneLast4));

    console.log("\n--- Attendance Search (Today) ---");
    const today = '2026-03-06';
    const attRef = collection(db, 'attendance');
    const q3 = query(attRef, where('date', '==', today));
    const snap3 = await getDocs(q3);
    
    snap3.forEach(d => {
        const data = d.data();
        const time = new Date(data.timestamp).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul'});
        if (time.includes('13:5') || time.includes('14:0')) {
            console.log(`Time: ${time}, Name: ${data.memberName}, PhoneLast4 (if any): ${data.phoneLast4}, MemberId: ${data.memberId}, Method: ${data.method || 'unknown'}`);
        }
    });

  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
