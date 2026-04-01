const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'boksaem-yoga' });
const db = admin.firestore();

(async () => {
    try {
        const STUDIO_ID = 'demo-yoga';
        const studioRef = db.doc(`studios/${STUDIO_ID}`);
        
        const now = new Date();
        const dateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        
        const INSTRUCTORS = ['김서연', '이하은', '박지윤', '최민지', '정수빈'];
        const CLASS_TYPES = ['하타', '빈야사', '아쉬탕가', '파워', '음양', '명상'];
        const CLASS_TIMES = ['07:00', '10:00', '12:00', '14:00', '18:30', '19:00', '20:00', '20:30'];
        const BRANCHES = [{id: 'gangnam', name: '강남점'}, {id: 'hongdae', name: '홍대점'}];
        
        let batch = db.batch();
        let classCount = 0;
        
        for (const branch of BRANCHES) {
            for (let i = 0; i < 5; i++) {
                const classId = studioRef.collection('daily_classes').doc().id;
                batch.set(studioRef.collection('daily_classes').doc(classId), {
                    id: classId,
                    date: dateStr,
                    time: CLASS_TIMES[Math.floor(Math.random() * CLASS_TIMES.length)],
                    name: CLASS_TYPES[Math.floor(Math.random() * CLASS_TYPES.length)],
                    instructor: INSTRUCTORS[i], // Each instructor gets a class
                    branchId: branch.id,
                    capacity: 20,
                    attendees: [],
                    createdAt: new Date().toISOString()
                });
                classCount++;
            }
        }
        
        // Ensure instructors collection has these instructors so login works
        for (const inst of INSTRUCTORS) {
            batch.set(studioRef.collection('instructors').doc(inst), {
                name: inst,
                phone: '01012345678',
                active: true
            }, { merge: true });
        }
        
        await batch.commit();
        console.log(`✅ ${classCount} classes created for today (${dateStr}) and instructors registered.`);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
