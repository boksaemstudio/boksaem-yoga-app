const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key not found:', serviceAccountPath);
    process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();
const STUDIO_ID = 'ssangmun-yoga'; // Target Tenant
const tenantDb = db.collection('studios').doc(STUDIO_ID);

const FIRST_NAMES = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','전','홍'];
const LAST_NAMES = ['민준','서준','도윤','예준','시우','하준','지호','주원','지훈','준우','서연','서윤','지우','서현','하은','하윤','민서','지유','윤서','지민','수아','지아'];

function getRandomName() {
    return FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] + LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
}
function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedData() {
    console.log(`🌱 Seeding data for tenant: ${STUDIO_ID}`);

    const configData = {
        name: '쌍문요가',
        ownerEmail: 'ssangmun@yoga.com',
        plan: 'pro',
        status: 'active',
        settings: {
            IDENTITY: { NAME: '쌍문요가', SLOGAN: '도봉구 쌍문동 최고의 요가 공간, 나를 만나는 고요한 시간' },
            THEME: { PRIMARY_COLOR: '#d4af37', SKELETON_COLOR: '#1a1a1a' },
            ASSETS: {
                LOGO: { SQUARE: 'https://passflow-0324.web.app/assets/demo_logo.png', WIDE: 'https://passflow-0324.web.app/assets/demo_logo.png' },
                MEMBER_BG: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop'
            },
            MEMBERSHIP: { TYPES: { 'MTypeA': '기구필라테스 30회권', 'MTypeB': '플라잉요가 1개월권', 'MTypeC': '빈야사 무제한 패스' } },
            POLICIES: { ENABLE_EXPIRATION_BLOCK: true, ENABLE_NEGATIVE_CREDITS: false },
            NOTIFICATIONS: { KAKAO_ALIMTALK: true, SMS_FALLBACK: true }
        },
        updatedAt: new Date().toISOString()
    };
    
    // Default branch for the generic demo app
    configData.branches = [
        { id: 'main', name: '본점' }
    ];
    

    await tenantDb.set(configData, { merge: true });
    
    // Seed assets subcollections properly
    await tenantDb.collection('assets').doc('schedule').set({
        currentUrl: '/assets/demo_schedule.png',
        nextUrl: '/assets/demo_schedule.png',
        updatedAt: new Date().toISOString()
    }, { merge: true });

    await tenantDb.collection('assets').doc('pricing').set({
        mainUrl: '/assets/demo_pricing.png',
        subUrl: '/assets/demo_pricing.png',
        updatedAt: new Date().toISOString()
    }, { merge: true });

    await tenantDb.collection('assets').doc('logo').set({
        url: '/assets/demo_logo.png',
        updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log('✅ 1. Config & Assets seeded');

    let currentBatch = db.batch(); let batchCount = 0;
    const commitBatch = async () => { if (batchCount > 0) { await currentBatch.commit(); currentBatch = db.batch(); batchCount = 0; } };
    const addOp = async (opFunc) => { opFunc(); batchCount++; if (batchCount >= 400) await commitBatch(); };

    console.log('Generating 50 Members...');
    const memberIds = [];
    const today = new Date();
    const threeMonthsAgo = new Date(today); threeMonthsAgo.setMonth(today.getMonth() - 3);

    for (let i = 0; i < 50; i++) {
        const id = tenantDb.collection('members').doc().id;
        memberIds.push(id);
        const type = Math.random() > 0.6 ? 'MTypeA' : Math.random() > 0.5 ? 'MTypeB' : 'MTypeC';
        const isUnlimited = type === 'MTypeC';
        const credits = isUnlimited ? 999 : Math.floor(Math.random() * 30);
        await addOp(() => {
            currentBatch.set(tenantDb.collection('members').doc(id), {
                id, name: getRandomName(), phone: `010-0000-${String(1000+i).padStart(4, '0')}`,
                membershipType: type, credits: credits, originalCredits: isUnlimited ? 999 : 30,
                regDate: getRandomDate(threeMonthsAgo, today).toISOString().split('T')[0],
                hasFaceDescriptor: Math.random() > 0.2, status: 'active', createdAt: new Date().toISOString()
            });
        });
    }

    console.log('Generating Classes for today...');
    const classNames = ['모닝 빈야사', '기구 필라테스', '플라잉 요가', '저녁 하타요가'];
    const classTimes = ['07:00', '10:00', '14:00', '19:00', '21:00'];
    const instructors = ['지수 원장', '사라 강사', '보미 선생님'];
    
    for (let d = -30; d <= 30; d++) {
        const date = new Date(today); date.setDate(today.getDate() + d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        for (let i = 0; i < 3; i++) {
            const classId = tenantDb.collection('daily_classes').doc().id;
            const time = classTimes[i % classTimes.length];
            const attendeesCount = Math.floor(Math.random() * 15) + 3;
            const attendees = [...memberIds].sort(() => 0.5 - Math.random()).slice(0, attendeesCount);
            const className = classNames[Math.floor(Math.random() * classNames.length)];
            const instructor = instructors[Math.floor(Math.random() * instructors.length)];
            
            await addOp(() => {
                currentBatch.set(tenantDb.collection('daily_classes').doc(classId), {
                    id: classId, date: dateStr, time: time, name: className, instructor: instructor,
                    capacity: 20, attendees: attendees, createdAt: new Date().toISOString()
                });
            });
            
            if (d <= 0) {
                for (const memberId of attendees) {
                    if (Math.random() > 0.8) continue;
                    const logId = tenantDb.collection('attendance').doc().id;
                    const timestamp = new Date(`${dateStr}T${time}:00+09:00`);
                    timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 15));
                    await addOp(() => {
                        currentBatch.set(tenantDb.collection('attendance').doc(logId), {
                            id: logId, memberId: memberId, timestamp: admin.firestore.Timestamp.fromDate(timestamp),
                            className: className, instructor: instructor, status: 'approved', branchId: 'main'
                        });
                    });
                }
            }
        }
    }

    console.log('Generating Sales Data...');
    for (let m = 0; m < 4; m++) {
        for (let i = 0; i < 15; i++) {
            const saleId = tenantDb.collection('sales').doc().id;
            const saleDate = new Date(today); saleDate.setMonth(today.getMonth() - m); saleDate.setDate(Math.floor(Math.random() * 28) + 1);
            await addOp(() => {
                currentBatch.set(tenantDb.collection('sales').doc(saleId), {
                    id: saleId, date: saleDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
                    timestamp: saleDate.toISOString(), itemType: Math.random() > 0.7 ? 'MTypeA' : 'MTypeB',
                    itemName: '수강권 결제', memberName: getRandomName(), memberId: memberIds[0],
                    paymentMethod: Math.random() > 0.5 ? 'card' : 'cash', amount: (Math.floor(Math.random() * 5) + 10) * 10000,
                    status: 'completed', createdAt: new Date().toISOString()
                });
            });
        }
    }

    await commitBatch();
    console.log(`🎉 Seeding successfully completed for ${STUDIO_ID}!`);
}

seedData().catch(console.error).finally(() => process.exit(0));
