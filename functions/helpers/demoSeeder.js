const { admin } = require('./common');

async function deleteCollection(db, collectionRef) {
    const batchSize = 100;
    while (true) {
        const snapshot = await collectionRef.limit(batchSize).get();
        if (snapshot.empty) break;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
    }
}

const FIRST_NAMES = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','전','홍'];
const LAST_NAMES = ['민준','서준','도윤','예준','시우','하준','지호','주원','지훈','준우','서연','서윤','지우','서현','하은','하윤','민서','지유','윤서','지민','수아','지아'];

function getRandomName() {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return first + last;
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function refreshDemoData() {
    const db = admin.firestore();
    const STUDIO_ID = 'demo-yoga';
    const tenantDb = db.collection('studios').doc(STUDIO_ID);

    console.log(`🌱 Refreshing demo data for tenant: ${STUDIO_ID}`);

    // Clearing
    const collections = ['members', 'daily_classes', 'attendance', 'sales', 'instructors'];
    for (const coll of collections) {
        await deleteCollection(db, tenantDb.collection(coll));
    }

    // 1. Studio Configuration
    const configData = {
        name: '패스플로우 요가원',
        ownerEmail: 'demo@passflow.kr',
        plan: 'pro',
        status: 'active',
        settings: {
            IDENTITY: {
                NAME: '패스플로우 요가원',
                NAME_ENGLISH: 'PassFlow Yoga Studio',
                LOGO_TEXT: 'PassFlow',
                SLOGAN: '요가원 통합 관리 시스템',
                DESCRIPTION: 'AI가 함께하는 스마트 요가원 관리'
            },
            THEME: { PRIMARY_COLOR: '#8B5CF6', SKELETON_COLOR: '#1a1a1a' },
            ASSETS: {
                LOGO: {
                    SQUARE: '/assets/passflow_logo.png',
                    WIDE: '/assets/passflow_logo.png'
                },
                MEMBER_BG: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop'
            },
            MEMBERSHIP: {
                TYPES: { 'yoga_basic': '요가 기본반', 'pilates_equipment': '기구 필라테스', 'flying_yoga': '플라잉 요가', 'unlimited': '무제한 패스' }
            },
            BRANCHES: [
                { id: 'main', name: '본점', color: '#8B5CF6' }
            ],
            POLICIES: { ENABLE_EXPIRATION_BLOCK: true, ENABLE_NEGATIVE_CREDITS: false },
            INSTRUCTORS: ['김지수 원장', '박사라 강사', '이보미 강사'],
            AI_CONFIG: {
                NAME: 'AI',
                PERSONALITY: 'Guide',
                TONE: 'Warm & Professional',
                KEYWORDS: ['나마스테', '프라나', '호흡', '명상', '수련']
            }
        },
        updatedAt: new Date().toISOString()
    };
    await tenantDb.set(configData, { merge: true });

    // 2. Members
    let currentBatch = db.batch();
    let batchCount = 0;

    const commitBatch = async () => {
        if (batchCount > 0) {
            await currentBatch.commit();
            currentBatch = db.batch();
            batchCount = 0;
        }
    };
    const addOp = async (opFunc) => {
        opFunc();
        batchCount++;
        if (batchCount >= 400) await commitBatch();
    };

    const memberIds = [];
    const today = new Date();
    const threeMonthsAgo = new Date(today); threeMonthsAgo.setMonth(today.getMonth() - 3);

    for (let i = 0; i < 50; i++) {
        const id = tenantDb.collection('members').doc().id;
        memberIds.push(id);
        const name = getRandomName();
        const type = Math.random() > 0.6 ? 'yoga_basic' : Math.random() > 0.5 ? 'pilates_equipment' : Math.random() > 0.3 ? 'flying_yoga' : 'unlimited';
        const isUnlimited = type === 'unlimited';
        const credits = isUnlimited ? 999 : Math.floor(Math.random() * 30);
        const regDate = getRandomDate(threeMonthsAgo, new Date());
        const startDate = regDate.toISOString().split('T')[0];
        const endMs = regDate.getTime() + (Math.random() > 0.5 ? 90 : 30) * 24 * 60 * 60 * 1000;
        const endDate = new Date(endMs).toISOString().split('T')[0];
        
        await addOp(() => {
            currentBatch.set(tenantDb.collection('members').doc(id), {
                id, name, phone: `010-0000-${String(1000+i).padStart(4, '0')}`,
                membershipType: type, credits, originalCredits: isUnlimited ? 999 : (credits > 10 ? 30 : 10),
                regDate: startDate, startDate, endDate,
                hasFaceDescriptor: Math.random() > 0.2, status: 'active', createdAt: new Date().toISOString()
            });
        });
    }

    // 3. Classes
    const classNames = ['모닝 빈야사', '기구 필라테스 종합', '플라잉 요가', '저녁 하타요가', '파워 요가'];
    const classTimes = ['07:00', '10:00', '14:00', '19:00', '21:00'];
    const instructors = ['김지수 원장', '박사라 강사', '이보미 강사'];
    
    for (let d = -7; d <= 7; d++) {
        const date = new Date(today); date.setDate(today.getDate() + d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        for (let i = 0; i < 3; i++) {
            const classId = tenantDb.collection('daily_classes').doc().id;
            const time = classTimes[i % classTimes.length];
            const attendeesCount = Math.floor(Math.random() * 15) + 3;
            const attendees = [...memberIds].sort(() => 0.5 - Math.random()).slice(0, attendeesCount);
            
            await addOp(() => {
                currentBatch.set(tenantDb.collection('daily_classes').doc(classId), {
                    id: classId, date: dateStr, time, name: classNames[Math.floor(Math.random() * classNames.length)],
                    instructor: instructors[Math.floor(Math.random() * instructors.length)], capacity: 20, attendees, createdAt: new Date().toISOString()
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
                            id: logId, memberId, timestamp: admin.firestore.Timestamp.fromDate(timestamp),
                            className: classNames[Math.floor(Math.random() * classNames.length)],
                            instructor: instructors[Math.floor(Math.random() * instructors.length)], status: 'approved', branchId: 'main'
                        });
                    });
                }
            }
        }
    }

    // 4. Sales Data
    for (let m = 0; m < 4; m++) {
        for (let i = 0; i < 15; i++) {
            const saleId = tenantDb.collection('sales').doc().id;
            const saleDate = new Date(today);
            saleDate.setMonth(today.getMonth() - m);
            saleDate.setDate(Math.floor(Math.random() * 28) + 1);
            
            await addOp(() => {
                currentBatch.set(tenantDb.collection('sales').doc(saleId), {
                    id: saleId, date: saleDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
                    timestamp: saleDate.toISOString(), itemType: Math.random() > 0.7 ? 'yoga_basic' : Math.random() > 0.5 ? 'pilates_equipment' : 'flying_yoga',
                    itemName: '수강권 결제', memberName: getRandomName(), memberId: memberIds[Math.floor(Math.random() * memberIds.length)],
                    paymentMethod: Math.random() > 0.5 ? 'card' : 'cash', amount: (Math.floor(Math.random() * 5) + 10) * 10000,
                    status: 'completed', createdAt: new Date().toISOString()
                });
            });
        }
    }

    await commitBatch();
    console.log('✅ Demo data refreshed successfully.');
}

module.exports = { refreshDemoData };
