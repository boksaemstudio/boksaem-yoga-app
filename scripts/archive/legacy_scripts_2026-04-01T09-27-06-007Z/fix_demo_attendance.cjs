const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TARGET = 'demo-yoga';

async function fix() {
    console.log('📊 Fixing attendance data with correct format...');

    // 1. Delete old attendance
    const oldSnap = await db.collection(`studios/${TARGET}/attendance`).get();
    let batch = db.batch();
    let ops = 0;
    const flush = async () => { if (ops > 0) { await batch.commit(); batch = db.batch(); ops = 0; } };
    
    for (const d of oldSnap.docs) { batch.delete(d.ref); ops++; if (ops >= 400) await flush(); }
    await flush();
    console.log(`Deleted ${oldSnap.size} old attendance docs`);

    // 2. Get member IDs
    const membersSnap = await db.collection(`studios/${TARGET}/members`).where('status', '==', 'active').limit(100).get();
    const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`Found ${members.length} active members`);
    if (members.length === 0) { console.log('No members!'); process.exit(0); }

    // 3. Create attendance records with CORRECT fields: date, timestamp (ISO string), memberId, branchId, className, instructor, status, type
    const now = new Date();
    const classNames = ['모닝 빈야사', '기구 필라테스', '힐링요가', '코어 인텐시브', '저녁 하타'];
    const instructors = ['엠마 원장', '소피 지점장', '루시 강사', '올리비아 강사'];
    const classTimes = ['07:00', '10:00', '14:00', '19:00', '21:00'];
    let totalRecords = 0;

    for (let d = -30; d <= 0; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() + d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const dayOfWeek = date.getDay();

        // Weekend: fewer, weekday: more, with realistic variation
        const baseCount = dayOfWeek === 0 || dayOfWeek === 6 ? 6 : 15;
        const variation = Math.floor(Math.random() * 8) - 2;
        const trendBoost = Math.floor((d + 30) / 8); // older=less, recent=more
        const todayCount = Math.max(3, baseCount + variation + trendBoost);

        const shuffled = [...members].sort(() => 0.5 - Math.random()).slice(0, todayCount);

        for (let i = 0; i < shuffled.length; i++) {
            const member = shuffled[i];
            const branchId = i % 2 === 0 ? 'A' : 'B';
            const timeIdx = Math.floor(Math.random() * classTimes.length);
            const hour = parseInt(classTimes[timeIdx].split(':')[0]);
            const minute = Math.floor(Math.random() * 30);

            // Create proper ISO timestamp
            const ts = new Date(dateStr + 'T' + String(hour).padStart(2,'0') + ':' + String(minute).padStart(2,'0') + ':00+09:00');
            const tsISO = ts.toISOString();

            const logId = `att_${dateStr.replace(/-/g,'')}_${branchId}_${member.id.slice(-6)}_${timeIdx}`;

            batch.set(db.doc(`studios/${TARGET}/attendance/${logId}`), {
                memberId: member.id,
                memberName: member.name || '회원',
                branchId: branchId,
                date: dateStr,  // CRITICAL: attendance service uses this for date-based queries
                timestamp: tsISO,  // ISO string, not Firestore Timestamp
                className: classNames[timeIdx],
                instructor: instructors[Math.floor(Math.random() * instructors.length)],
                classTime: classTimes[timeIdx],
                status: 'valid',
                type: 'checkin'
            });
            ops++;
            totalRecords++;
            if (ops >= 400) await flush();
        }
    }
    await flush();
    console.log(`✅ ${totalRecords} attendance records inserted`);
    console.log('🎉 Done! Chart should now show data.');
    process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
