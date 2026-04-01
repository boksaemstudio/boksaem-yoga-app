const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key not found:', serviceAccountPath);
    process.exit(1);
}
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();
const STUDIO_ID = 'demo-yoga'; // Target Tenant
const tenantDb = db.collection('studios').doc(STUDIO_ID);

const FIRST_NAMES = ['김','??,'�?,'�?,'??,'�?,'�?,'??,'??,'??,'??,'??,'??,'??,'�?,'??,'??,'??,'??,'??];
const LAST_NAMES = ['민�?','?��?','?�윤','?��?','?�우','?��?','지??,'주원','지??,'준??,'?�연','?�윤','지??,'?�현','?��?','?�윤','민서','지??,'?�서','지�?,'?�아','지??];

function getRandomName() {
    return FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] + LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function deleteCollection(collectionRef) {
    let count = 0;
    while (true) {
        const snapshot = await collectionRef.limit(100).get();
        if (snapshot.empty) break;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        count += snapshot.size;
    }
    return count;
}

async function seedData() {
    console.log(`?�� [SaaS Demo] Seeding data for tenant: ${STUDIO_ID}`);

    console.log('Clearing old demo data...');
    const collections = ['members', 'daily_classes', 'attendance', 'sales', 'notices', 'push_messages'];
    for (const coll of collections) {
        await deleteCollection(tenantDb.collection(coll));
    }
    await deleteCollection(tenantDb.collection('settings'));
    console.log('??Old data cleared');

    // 1. Studio Configuration
    const configData = {
        name: 'PassFlow Ai Yoga & Pilates',
        ownerEmail: 'demo@passflow.app',
        plan: 'pro',
        status: 'active',
        settings: {
            IDENTITY: {
                NAME: 'PassFlow Ai Yoga & Pilates',
                SLOGAN: '최고???��? ?�튜?�오 ?�동???�루??
            },
            THEME: {
                PRIMARY_COLOR: '#8B5CF6', 
                SKELETON_COLOR: '#1a1a1a'
            },
            ASSETS: {
                LOGO: {
                    SQUARE: 'https://passflow-demo.web.app/assets/passflow_logo.png',
                    WIDE: 'https://passflow-demo.web.app/assets/passflow_logo.png'
                },
                MEMBER_BG: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop'
            },
            BRANCHES: [
                { id: 'A', name: '강남본점', color: '#8B5CF6' },
                { id: 'B', name: '?��?DI??, color: '#3B82F6' }
            ],
            MEMBERSHIP: {
                TYPES: { 'MTypeA': '기구?�라?�스 30?�권', 'MTypeB': '?�라?�요가 1개월�?, 'MTypeC': '빈야??무제???�스', 'MTypeD': '?�데???�래?? }
            },
            POLICIES: { ENABLE_EXPIRATION_BLOCK: true, ENABLE_NEGATIVE_CREDITS: false }
        },
        updatedAt: new Date().toISOString()
    };
    await tenantDb.set(configData, { merge: true });
    console.log('??1. Config seeded');

    // 1-1. Settings
    const pricingData = {
        "group": {
            "label": "그룹 ?�슨",
            "branches": ["A", "B"],
            "options": [
                { "id": "1month", "label": "1개월 무제??, "price": 180000, "duration": 1, "popular": true, "discount": "" },
                { "id": "3months", "label": "3개월 30??, "price": 450000, "duration": 3, "credits": 30, "popular": false, "discount": "20% ?�인" }
            ]
        },
        "private": {
            "label": "1:1 집중 ?�슨",
            "branches": ["A", "B"],
            "options": [
                { "id": "10sessions", "label": "10?�권", "price": 700000, "duration": 3, "credits": 10, "popular": true, "discount": "" }
            ]
        }
    };
    await tenantDb.collection('settings').doc('pricing').set(pricingData);
    
    await tenantDb.collection('settings').doc('instructors').set({
        list: [
            { name: "?�마 ?�장", role: "admin", photo: "" },
            { name: "?�피 지?�장", role: "manager", photo: "" },
            { name: "루시 강사", role: "instructor", photo: "" },
            { name: "?�리비아 강사", role: "instructor", photo: "" }
        ]
    });

    await tenantDb.collection('settings').doc('classTypes').set({
        list: ["빈야??, "?��?", "?�쉬?��?", "기구?�라?�스", "?�요가", "?�링?��?"]
    });

    await tenantDb.collection('notices').doc('demo_notice_1').set({
        title: "[공�?] 봄맞???�스?�로???�모 ?�데?�트 ?�내",
        content: "?�녕?�세?? ?�벽???�튜?�오 관리�? ?�는 ?�스?�로?�입?�다. ?�로??AI 브리??기능??추�??�었?�니??",
        author: "관리자",
        createdAt: new Date().toISOString(),
        isPinned: true
    });
    console.log('??1-1. Settings & Notices seeded');


    // 2. Members
    const batchList = [];
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

    console.log('Generating 150 Members...');
    const memberIdsA = [];
    const memberIdsB = [];
    const today = new Date();
    const threeMonthsAgo = new Date(today); threeMonthsAgo.setMonth(today.getMonth() - 3);
    const threeMonthsFuture = new Date(today); threeMonthsFuture.setMonth(today.getMonth() + 3);

    for (let i = 0; i < 150; i++) {
        const id = tenantDb.collection('members').doc().id;
        const branchId = Math.random() > 0.6 ? 'B' : 'A';
        if (branchId === 'A') memberIdsA.push(id); else memberIdsB.push(id);
        
        const name = getRandomName();
        const typeRand = Math.random();
        const type = typeRand > 0.7 ? 'MTypeA' : typeRand > 0.4 ? 'MTypeB' : 'MTypeC';
        const isUnlimited = type === 'MTypeC';
        const credits = isUnlimited ? 999 : Math.floor(Math.random() * 30);
        
        const status = Math.random() > 0.8 ? 'expired' : 'active';
        
        await addOp(() => {
            currentBatch.set(tenantDb.collection('members').doc(id), {
                id,
                name: name,
                homeBranch: branchId,
                phone: `010-0000-${String(1000+i).padStart(4, '0')}`,
                membershipType: type,
                credits: credits,
                originalCredits: isUnlimited ? 999 : (credits > 10 ? 30 : 10),
                regDate: getRandomDate(threeMonthsAgo, new Date()).toISOString().split('T')[0],
                endDate: status === 'expired' ? getRandomDate(threeMonthsAgo, new Date()).toISOString().split('T')[0] : getRandomDate(new Date(), threeMonthsFuture).toISOString().split('T')[0],
                hasFaceDescriptor: Math.random() > 0.2, // 80% have face data
                status: status,
                createdAt: new Date().toISOString()
            });
        });
    }

    // 3. Classes
    console.log('Generating Classes for past 30 days...');
    const classNames = ['모닝 빈야??, '기구 ?�라?�스', '?�라???��?', '?�???��?', '?�링 ?�라??, '코어 ?�텐?�브'];
    const classTimes = ['07:00', '10:00', '14:00', '19:00', '21:00'];
    const instructors = ['?�마 ?�장', '?�피 지?�장', '루시 강사', '?�리비아 강사'];
    
    for (let d = -30; d <= 7; d++) {
        const date = new Date(today); date.setDate(today.getDate() + d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        
        for (const branchId of ['A', 'B']) {
            const memberIds = branchId === 'A' ? memberIdsA : memberIdsB;
            
            for (let i = 0; i < 4; i++) { // 4 classes per day per branch
                const classId = tenantDb.collection('daily_classes').doc().id;
                const time = classTimes[i % classTimes.length];
                const attendeesCount = Math.floor(Math.random() * 15) + 3; // 3 to 17 attendees
                const attendees = [...memberIds].sort(() => 0.5 - Math.random()).slice(0, attendeesCount);
                
                const cName = classNames[Math.floor(Math.random() * classNames.length)];
                const cInst = instructors[Math.floor(Math.random() * instructors.length)];

                await addOp(() => {
                    currentBatch.set(tenantDb.collection('daily_classes').doc(classId), {
                        id: classId,
                        branchId: branchId,
                        date: dateStr,
                        time: time,
                        name: cName,
                        instructor: cInst,
                        capacity: 20,
                        attendees: attendees,
                        createdAt: new Date().toISOString()
                    });
                });
                
                if (d <= 0) {
                    for (const memberId of attendees) {
                        if (Math.random() > 0.8) continue; // 20% no-show
                        const logId = tenantDb.collection('attendance').doc().id;
                        const timestamp = new Date(`${dateStr}T${time}:00+09:00`);
                        timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 15));
                        
                        await addOp(() => {
                            currentBatch.set(tenantDb.collection('attendance').doc(logId), {
                                id: logId,
                                memberId: memberId,
                                branchId: branchId,
                                timestamp: admin.firestore.Timestamp.fromDate(timestamp),
                                className: cName,
                                instructor: cInst,
                                status: 'approved'
                            });
                        });
                    }
                }
            }
        }
    }

    // 4. Sales Data
    console.log('Generating Sales Data...');
    for (const branchId of ['A', 'B']) {
        const memberIds = branchId === 'A' ? memberIdsA : memberIdsB;
        for (let m = 0; m < 5; m++) { // last 5 months
            for (let i = 0; i < 30; i++) { // 30 sales per month per branch
                const saleId = tenantDb.collection('sales').doc().id;
                const saleDate = new Date(today);
                saleDate.setMonth(today.getMonth() - m);
                saleDate.setDate(Math.floor(Math.random() * 28) + 1);
                
                await addOp(() => {
                    currentBatch.set(tenantDb.collection('sales').doc(saleId), {
                        id: saleId,
                        date: saleDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
                        timestamp: saleDate.toISOString(),
                        branchId: branchId,
                        itemType: Math.random() > 0.7 ? 'MTypeA' : 'MTypeB',
                        itemName: '?�강�?결제',
                        memberName: getRandomName(),
                        memberId: memberIds[Math.floor(Math.random() * memberIds.length)],
                        paymentMethod: Math.random() > 0.5 ? 'card' : 'cash',
                        amount: (Math.floor(Math.random() * 5) + 10) * 10000,
                        status: 'completed',
                        createdAt: new Date().toISOString()
                    });
                });
            }
        }
    }

    await commitBatch();
    console.log('?�� SaaS Platform Seeding successfully completed for ZenFlow Yoga (Active Branch: A & B)!');
}

seedData().catch(console.error).finally(() => process.exit(0));
