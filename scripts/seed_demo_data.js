const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'boksaem-yoga-firebase-adminsdk.json');
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

async function deleteCollection(collectionRef) {
    const batchSize = 100;
    while (true) {
        const snapshot = await collectionRef.limit(batchSize).get();
        if (snapshot.empty) break;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
    }
}

async function seedData() {
    console.log(`🌱 [SaaS Demo] Seeding data for tenant: ${STUDIO_ID}`);

    console.log('Clearing old demo data...');
    const collections = ['members', 'daily_classes', 'attendance', 'sales', 'notices', 'push_messages'];
    for (const coll of collections) {
        await deleteCollection(tenantDb.collection(coll));
    }
    await deleteCollection(tenantDb.collection('settings')); // Including pricing, instructors
    console.log('✅ Old data cleared');

    // 1. Studio Configuration
    const configData = {
        name: 'PassFlow Yoga & Pilates',
        ownerEmail: 'demo@passflow.app',
        plan: 'pro',
        status: 'active',
        settings: {
            IDENTITY: {
                NAME: 'PassFlow Yoga & Pilates',
                SLOGAN: '최고의 요가 스튜디오 자동화 솔루션'
            },
            THEME: {
                PRIMARY_COLOR: '#8B5CF6', 
                SKELETON_COLOR: '#1a1a1a'
            },
            ASSETS: {
                LOGO: {
                    SQUARE: 'https://passflow-demo-0324.web.app/assets/passflow_logo.png',
                    WIDE: 'https://passflow-demo-0324.web.app/assets/passflow_logo.png'
                },
                MEMBER_BG: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop'
            },
            BRANCHES: [
                { id: 'A', name: '강남본점', color: '#8B5CF6' },
                { id: 'B', name: '홍대DI점', color: '#3B82F6' }
            ],
            MEMBERSHIP: {
                TYPES: { 'MTypeA': '기구필라테스 30회권', 'MTypeB': '플라잉요가 1개월권', 'MTypeC': '빈야사 무제한 패스', 'MTypeD': '원데이 클래스' }
            },
            POLICIES: { ENABLE_EXPIRATION_BLOCK: true, ENABLE_NEGATIVE_CREDITS: false }
        },
        updatedAt: new Date().toISOString()
    };
    await tenantDb.set(configData, { merge: true });
    console.log('✅ 1. Config seeded');

    // 1-1. Settings (Pricing, Instructors, App Settings)
    const pricingData = {
        "group": {
            "label": "그룹 레슨",
            "branches": ["A", "B"],
            "options": [
                { "id": "1month", "label": "1개월 무제한", "price": 180000, "duration": 1, "popular": true, "discount": "" },
                { "id": "3months", "label": "3개월 30회", "price": 450000, "duration": 3, "credits": 30, "popular": false, "discount": "20% 할인" }
            ]
        },
        "private": {
            "label": "1:1 집중 레슨",
            "branches": ["A", "B"],
            "options": [
                { "id": "10sessions", "label": "10회권", "price": 700000, "duration": 3, "credits": 10, "popular": true, "discount": "" }
            ]
        }
    };
    await tenantDb.collection('settings').doc('pricing').set(pricingData);
    
    const instructorData = {
        list: [
            { name: "엠마 원장", role: "admin", photo: "" },
            { name: "소피 지점장", role: "manager", photo: "" },
            { name: "루시 강사", role: "instructor", photo: "" },
            { name: "올리비아 강사", role: "instructor", photo: "" }
        ]
    };
    await tenantDb.collection('settings').doc('instructors').set(instructorData);

    const classTypesData = {
        list: ["빈야사", "하타", "아쉬탕가", "기구필라테스", "인요가", "힐링요가"]
    };
    await tenantDb.collection('settings').doc('classTypes').set(classTypesData);

    // Insert a Notice
    await tenantDb.collection('notices').doc('demo_notice_1').set({
        title: "[공지] 봄맞이 패스플로우 데모 업데이트 안내",
        content: "안녕하세요. 완벽한 스튜디오 관리를 돕는 패스플로우입니다. 새로운 AI 브리핑 기능이 추가되었습니다.",
        author: "관리자",
        createdAt: new Date().toISOString(),
        isPinned: true
    });
    console.log('✅ 1-1. Settings & Notices seeded');


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
    const classNames = ['모닝 빈야사', '기구 필라테스', '플라잉 요가', '저녁 하타', '힐링 테라피', '코어 인텐시브'];
    const classTimes = ['07:00', '10:00', '14:00', '19:00', '21:00'];
    const instructors = ['엠마 원장', '소피 지점장', '루시 강사', '올리비아 강사'];
    
    // Generate classes for past 30 days and future 7 days
    for (let d = -30; d <= 7; d++) {
        const date = new Date(today); date.setDate(today.getDate() + d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        
        // Loop branches
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
                
                // If past class, generate attendance logs
                if (d <= 0) {
                    for (const memberId of attendees) {
                        if (Math.random() > 0.8) continue; // 20% no-show
                        const logId = tenantDb.collection('attendance').doc().id;
                        const timestamp = new Date(`${dateStr}T${time}:00+09:00`);
                        timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 15)); // Attend 0-15 mins before
                        
                        await addOp(() => {
                            currentBatch.set(tenantDb.collection('attendance').doc(logId), {
                                id: logId,
                                memberId: memberId,
                                branchId: branchId,
                                timestamp: admin.firestore.Timestamp.fromDate(timestamp), // Timestamp format
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
                        itemName: '수강권 결제',
                        memberName: getRandomName(),
                        memberId: memberIds[Math.floor(Math.random() * memberIds.length)],
                        paymentMethod: Math.random() > 0.5 ? 'card' : 'cash',
                        amount: (Math.floor(Math.random() * 5) + 10) * 10000, // 100,000 ~ 150,000
                        status: 'completed',
                        createdAt: new Date().toISOString()
                    });
                });
            }
        }
    }

    await commitBatch();
    console.log('🎉 SaaS Platform Seeding successfully completed for ZenFlow Yoga (Active Branch: A & B)!');
}

seedData().catch(console.error).finally(() => process.exit(0));
