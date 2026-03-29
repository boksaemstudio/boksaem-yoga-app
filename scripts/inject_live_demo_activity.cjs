const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

const TARGET = 'demo-yoga';

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function run() {
    try {
        console.log(`🚀 [SaaS Demo] Injecting live demo activity for ${TARGET}...`);
        
        const now = new Date();
        const dateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const currentHour = now.getUTCHours() + 9; // KST hour
        
        // 1. Fetch active members
        const membersSnap = await db.collection(`studios/${TARGET}/members`).where('status', '==', 'active').get();
        const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (members.length === 0) {
            console.log('No active members found. Run seed script first.');
            process.exit(1);
        }

        let batch = db.batch();
        let ops = 0;
        
        const addOp = async () => {
            ops++;
            if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
        };

        // 2. Clear today's simulated classes first (to prevent duplicates if run multiple times)
        const oldClasses = await db.collection(`studios/${TARGET}/daily_classes`).where('date', '==', dateStr).get();
        for (const c of oldClasses.docs) {
            if (c.data().isSimulated) {
                batch.delete(c.ref);
                await addOp();
            }
        }
        await batch.commit(); batch = db.batch(); ops = 0;

        // 3. Generate Classes for Today
        const branchIds = ['A', 'B']; // 강남점, 홍대점
        const classTimes = [
            { t: '10:00', h: 10, title: '모닝 빈야사', instructor: '엠마 원장' },
            { t: '14:00', h: 14, title: '기구 필라테스', instructor: '루시 강사' },
            { t: '18:30', h: 18, title: '힐링 테라피', instructor: '소피 지점장' },
            { t: '20:00', h: 20, title: '코어 인텐시브', instructor: '올리비아 강사' },
            { t: '21:30', h: 21, title: '저녁 하타', instructor: '올리비아 강사' }
        ];

        console.log(`Generating classes and check-ins for today (${dateStr})...`);

        for (const branch of branchIds) {
            const branchMembers = members.filter(m => m.homeBranch === branch || !m.homeBranch);
            
            for (const c of classTimes) {
                const classId = `sim_${branch}_${c.t.replace(':','')}`;
                const attendeesCount = Math.floor(Math.random() * 8) + 5; // 5 to 12
                const attendees = [...branchMembers].sort(() => 0.5 - Math.random()).slice(0, attendeesCount);
                const attendeeIds = attendees.map(m => m.id);

                batch.set(db.collection(`studios/${TARGET}/daily_classes`).doc(classId), {
                    id: classId,
                    branchId: branch,
                    date: dateStr,
                    time: c.t,
                    title: c.title,
                    instructor: c.instructor,
                    capacity: 15,
                    attendees: attendeeIds,
                    createdAt: now.toISOString(),
                    isSimulated: true
                });
                await addOp();

                // If class has started or is starting soon, generate attendance
                if (currentHour >= c.h - 1) {
                    const checkInRate = currentHour > c.h ? 0.9 : (currentHour === c.h ? 0.5 : 0.2); // Depending on time
                    const checkInCount = Math.floor(attendees.length * checkInRate);
                    const checkedInMembers = attendees.slice(0, checkInCount);

                    for (const m of checkedInMembers) {
                        const logId = `sim_log_${classId}_${m.id}`;
                        const logTime = new Date(now);
                        logTime.setUTCHours(c.h - 9, Math.floor(Math.random() * 25) - 20, 0, 0); 
                        const finalLogTime = logTime > now ? now : logTime;

                        batch.set(db.collection(`studios/${TARGET}/attendance`).doc(logId), {
                            id: logId,
                            memberId: m.id,
                            memberName: m.name,
                            branchId: branch,
                            timestamp: admin.firestore.Timestamp.fromDate(finalLogTime),
                            className: c.title,
                            instructor: c.instructor,
                            status: 'approved',
                            isSimulated: true
                        });
                        await addOp();
                    }
                }
            }
        }

        // 4. Generate some sales for today
        const salesCount = Math.floor(Math.random() * 2) + 1; // 1 to 2 sales today per branch? Let's just do total
        console.log(`Generating ${salesCount} sales for today...`);
        for (let i=0; i<salesCount; i++) {
            const saleId = `sim_sale_${Date.now()}_${i}`;
            const m = members[Math.floor(Math.random() * members.length)];
            const saleDate = new Date(now);
            saleDate.setHours(saleDate.getHours() - Math.floor(Math.random() * 8));

            batch.set(db.collection(`studios/${TARGET}/sales`).doc(saleId), {
                id: saleId,
                branchId: m.homeBranch || (Math.random() > 0.5 ? 'A' : 'B'),
                memberId: m.id,
                memberName: m.name,
                itemType: 'ticket',
                itemName: Math.random() > 0.5 ? '1개월 무제한' : '10회권',
                paymentMethod: Math.random() > 0.3 ? 'card' : 'cash',
                amount: Math.floor(Math.random() * 20 + 10) * 10000, // 100k to 300k
                date: dateStr,
                timestamp: saleDate.toISOString(),
                status: 'completed',
                isSimulated: true,
                createdAt: saleDate.toISOString()
            });
            await addOp();
        }

        // 5. Generate a Push Notification alert for today
        const pushId = `sim_push_${Date.now()}`;
        batch.set(db.collection(`studios/${TARGET}/push_messages`).doc(pushId), {
            id: pushId,
            branchId: 'all',
            title: 'SaaS 데모 시스템 공지',
            body: '오늘 오후 4시, 새로운 출석 확인 시스템이 업데이트됩니다.',
            status: 'sent',
            sentAt: new Date(now.getTime() - 3600000).toISOString(),
            targetType: 'all',
            successCount: Math.floor(members.length * 0.8),
            isSimulated: true
        });
        await addOp();

        await batch.commit();
        console.log('✅ Live SaaS demo activity successfully injected!');
        process.exit(0);

    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

run();
