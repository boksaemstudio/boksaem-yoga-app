/**
 * 데모앱 출석 로그 생성 (별도 실행)
 * - 기존 회원 데이터를 읽어서 출석 로그 생성
 * - batch 크기를 250으로 제한
 */
const admin = require('firebase-admin');
const sa = require('./service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'boksaem-yoga' });
const db = admin.firestore();
const studioRef = db.doc('studios/demo-yoga');

function randEl(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(start, end) { return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())); }
function fmtDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function addMonths(d, m) { const r = new Date(d); r.setMonth(r.getMonth() + m); return r; }

const CLASS_TYPES = ['하타', '빈야사', '아쉬탕가', '파워', '음양', '명상'];
const INSTRUCTORS = ['김서연', '이하은', '박지윤', '최민지', '정수빈'];
const CLASS_TIMES = ['10:00', '12:00', '14:00', '18:30', '20:00'];

(async () => {
    console.log('📋 기존 회원 읽기...');
    const snap = await studioRef.collection('members').get();
    const members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`   ${members.length}명 로드`);

    const now = new Date();
    const logs = [];

    members.forEach(m => {
        if (m.status === 'expired' && Math.random() < 0.3) return;
        
        const regDate = new Date(m.regDate);
        const endDate = new Date(m.endDate);
        const actualEnd = endDate > now ? now : endDate;
        
        let weeklyRate;
        if (m.status === 'active') weeklyRate = randInt(2, 4);
        else if (m.status === 'new') weeklyRate = randInt(1, 3);
        else if (m.status === 'expired') weeklyRate = randInt(1, 2);
        else weeklyRate = randInt(0, 1);
        
        const daysBetween = Math.max(1, Math.floor((actualEnd.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24)));
        const totalSessions = Math.min(Math.floor((daysBetween / 7) * weeklyRate), 60);
        
        for (let s = 0; s < totalSessions; s++) {
            const logDate = randDate(regDate, actualEnd);
            if (logDate.getDay() === 0) continue;
            
            logs.push({
                memberName: m.name,
                memberId: (m.phone || '').replace(/-/g, '').slice(-4),
                phone: m.phone,
                date: fmtDate(logDate),
                time: randEl(CLASS_TIMES),
                classType: randEl(CLASS_TYPES),
                instructor: randEl(INSTRUCTORS),
                branch: m.branch || 'gangnam',
                checkInMethod: Math.random() < 0.7 ? 'phone' : 'face',
                createdAt: admin.firestore.Timestamp.fromDate(logDate),
            });
        }
    });

    console.log(`\n📊 ${logs.length}건 출석 로그 생성`);
    console.log('   Firestore에 저장 중...');

    const BATCH_SIZE = 200;
    for (let i = 0; i < logs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = logs.slice(i, i + BATCH_SIZE);
        chunk.forEach(l => {
            batch.set(studioRef.collection('logs').doc(), l);
        });
        await batch.commit();
        console.log(`   batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(logs.length / BATCH_SIZE)} 완료`);
    }

    console.log(`\n✅ 출석 로그 ${logs.length}건 저장 완료!`);
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
