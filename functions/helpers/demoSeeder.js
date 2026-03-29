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

    // 1. Wipe Old Data
    const collections = ['members', 'classes', 'daily_classes', 'attendance', 'sales', 'instructors', 'board_notices', 'notification_logs', 'pricing'];
    for (const coll of collections) {
        await deleteCollection(db, tenantDb.collection(coll));
    }

    // 2. Studio Configuration
    const configData = {
        name: '패스플로우 데모 플랫폼',
        ownerEmail: 'demo@passflow.kr',
        plan: 'pro',
        status: 'active',
        settings: {
            IDENTITY: {
                NAME: '패스플로우 데모',
                NAME_ENGLISH: 'PassFlow Studio Demo',
                LOGO_TEXT: 'PassFlow',
                SLOGAN: '최고의 관리를 경험해보세요'
            },
            THEME: { PRIMARY_COLOR: '#d4af37', SKELETON_COLOR: '#1a1a1a' },
            ASSETS: {
                LOGO: {
                    SQUARE: '/assets/passflow_logo.png',
                    WIDE: '/assets/passflow_logo.png'
                },
                MEMBER_BG: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop',
                SCHEDULE_IMAGES: {
                    'main': 'https://firebasestorage.googleapis.com/v0/b/passflow-0324.appspot.com/o/system_assets%2Fdemo_schedule.jpg?alt=media&token=487d7f95-bb04-4504-bd4b-01a2384a28f8'
                },
                PRICING_IMAGES: [
                    'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=1200&auto=format&fit=crop'
                ]
            },
            MEMBERSHIP: {
                TYPES: { 'yoga_basic': '요가 기본반', 'pilates_equipment': '기구 필라테스', 'flying_yoga': '플라잉 요가', 'unlimited': '무제한 패스' }
            },
            BRANCHES: [
                { id: 'main', name: '본점', color: '#d4af37' },
                { id: 'branch2', name: '강남점', color: '#8B5CF6' }
            ],
            POLICIES: { ENABLE_EXPIRATION_BLOCK: true, ENABLE_NEGATIVE_CREDITS: false },
            INSTRUCTORS: ['김지수 원장', '박사라 강사', '이보미 강사']
        },
        updatedAt: new Date().toISOString()
    };
    await tenantDb.set(configData, { merge: true });

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

    const today = new Date();
    const todayStr = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const threeMonthsAgo = new Date(today); threeMonthsAgo.setMonth(today.getMonth() - 3);

    // 3. Notices & Board
    const notices = [
        { title: `[필독] ${today.getMonth()+1}월 수강 스케줄 안내`, content: `안녕하세요. 이번 달 수강 스케줄이 확정되었습니다.\n\n앱에서 바로 예약 가능합니다.`, type: 'notice', isImportant: true },
        { title: '봄맞이 요가 특강 프로모션', content: '선착순 10명 한정으로 요가 심화 특강이 열립니다.', type: 'event', isImportant: false },
        { title: '원내 코로나 방역 지침 안내', content: '마스크 착용 등을 준수해주시기 바랍니다.', type: 'notice', isImportant: false }
    ];
    for (const notice of notices) {
        const id = tenantDb.collection('board_notices').doc().id;
        await addOp(() => currentBatch.set(tenantDb.collection('board_notices').doc(id), {
            id, ...notice,
            author: '김지수 원장', createdAt: new Date(today.getTime() - Math.random()*86400000*3).toISOString()
        }));
    }

    // 4. Notifications History
    const notifications = [
        { title: '결제 완료', message: '박민준님의 요가 기본반 30회권 결제가 완료되었습니다.', type: 'payment', link: '/admin?tab=revenue' },
        { title: '출석 확인', message: '이서현님이 자동 얼굴 인식으로 출석했습니다.', type: 'attendance', link: '/admin?tab=attendance' },
        { title: '예약 알림', message: '김지민님이 내일 저녁 하타요가 수업을 예약했습니다.', type: 'booking', link: '/admin?tab=members' }
    ];
    for (const noti of notifications) {
        const id = tenantDb.collection('notification_logs').doc().id;
        await addOp(() => currentBatch.set(tenantDb.collection('notification_logs').doc(id), {
            id, ...noti,
            isRead: false,
            createdAt: new Date(today.getTime() - Math.random()*86400000).toISOString()
        }));
    }

    // 5. Pricing
    const prices = [
        { name: '1개월 무제한권', category: 'yoga', price: 150000, validDays: 30, useCount: 999 },
        { name: '3개월 30회권', category: 'pilates', price: 390000, validDays: 90, useCount: 30 },
        { name: '1일 체험권', category: 'yoga', price: 30000, validDays: 7, useCount: 1 }
    ];
    for (const p of prices) {
        const id = tenantDb.collection('pricing').doc().id;
        await addOp(() => currentBatch.set(tenantDb.collection('pricing').doc(id), {
            id, ...p, isPublished: true, createdAt: new Date().toISOString()
        }));
    }

    // 6. Instructors
    const instructors = [
        { id: 'ins-1234', name: '김지수 원장', phone: '010-1111-1111', role: '원장' }, // 데모 로그인용!
        { id: 'ins-5678', name: '박사라 강사', phone: '010-2222-2222', role: '전임강사' },
        { id: 'ins-9012', name: '이보미 강사', phone: '010-3333-3333', role: '파트타임' }
    ];
    for (const ins of instructors) {
        await addOp(() => currentBatch.set(tenantDb.collection('instructors').doc(ins.id), {
            ...ins, profileImageUrl: '', status: 'active', createdAt: new Date().toISOString()
        }));
    }

    // 7. Members
    const memberIds = [];
    for (let i = 0; i < 50; i++) {
        const isDemo = i === 0; 
        const id = isDemo ? 'demo-member' : tenantDb.collection('members').doc().id;
        memberIds.push(id);
        const name = isDemo ? '우수회원 (데모)' : getRandomName();
        // 데모계정 비번(핀번호)는 0000
        const phone = isDemo ? '010-0000-0000' : `010-0000-${String(1000+i).padStart(4, '0')}`;
        const type = Math.random() > 0.6 ? 'yoga_basic' : Math.random() > 0.5 ? 'pilates_equipment' : 'unlimited';
        const isUnlimited = type === 'unlimited';
        const credits = isUnlimited ? 999 : Math.floor(Math.random() * 30) + 1; // 1~30
        
        await addOp(() => {
            currentBatch.set(tenantDb.collection('members').doc(id), {
                id, name, phone, membershipType: type, credits, 
                originalCredits: isUnlimited ? 999 : (credits > 10 ? 30 : 10),
                regDate: getRandomDate(threeMonthsAgo, new Date()).toISOString().split('T')[0],
                hasFaceDescriptor: Math.random() > 0.2, 
                status: 'active', createdAt: new Date().toISOString(), branchId: 'main'
            });
        });
    }

    // 8. Classes & Attendance
    const classNames = ['모닝 빈야사', '기구 필라테스 종합', '플라잉 요가', '저녁 하타요가', '파워 요가'];
    const classTimes = ['07:00', '10:00', '14:00', '19:00', '21:00'];
    
    for (let d = -15; d <= 7; d++) {
        const date = new Date(today); date.setDate(today.getDate() + d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        
        for (let i = 0; i < 3; i++) {
            const classId = tenantDb.collection('daily_classes').doc().id;
            const time = classTimes[i % classTimes.length];
            const attendeesCount = Math.floor(Math.random() * 10) + 2; 
            const attendees = [...memberIds].sort(() => 0.5 - Math.random()).slice(0, attendeesCount);
            
            // 데모계정 예약 무조건 할당
            if (d >= 0 && i === 1 && !attendees.includes('demo-member')) {
                attendees.push('demo-member');
            }

            const instructorName = instructors[Math.floor(Math.random() * instructors.length)].name;

            await addOp(() => {
                currentBatch.set(tenantDb.collection('daily_classes').doc(classId), {
                    id: classId, date: dateStr, time, 
                    name: classNames[Math.floor(Math.random() * classNames.length)],
                    instructor: instructorName, 
                    capacity: 20, attendees, branchId: 'main',
                    createdAt: new Date().toISOString()
                });
            });
            
            if (d < 0 || (d === 0 && parseInt(time.split(':')[0]) <= today.getHours())) {
                for (const memberId of attendees) {
                    if (Math.random() > 0.8) continue; // No-show
                    const logId = tenantDb.collection('attendance').doc().id;
                    const timestamp = new Date(`${dateStr}T${time}:00+09:00`);
                    timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 15));
                    
                    await addOp(() => {
                        currentBatch.set(tenantDb.collection('attendance').doc(logId), {
                            id: logId, memberId,
                            timestamp: admin.firestore.Timestamp.fromDate(timestamp),
                            className: classNames[Math.floor(Math.random() * classNames.length)],
                            instructor: instructorName, status: 'approved', branchId: 'main'
                        });
                    });
                }
            }
        }
    }

    // 9. Sales Data (Graphs)
    for (let m = 0; m < 4; m++) {
        for (let i = 0; i < 15; i++) {
            const saleId = tenantDb.collection('sales').doc().id;
            const saleDate = new Date(today);
            saleDate.setMonth(today.getMonth() - m);
            saleDate.setDate(Math.floor(Math.random() * 28) + 1);
            
            await addOp(() => {
                currentBatch.set(tenantDb.collection('sales').doc(saleId), {
                    id: saleId,
                    date: saleDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
                    timestamp: saleDate.toISOString(),
                    itemType: Math.random() > 0.7 ? 'yoga_basic' : 'unlimited',
                    itemName: '수강권 결제',
                    memberName: getRandomName(),
                    memberId: memberIds[Math.floor(Math.random() * memberIds.length)],
                    paymentMethod: Math.random() > 0.5 ? 'card' : 'cash',
                    amount: (Math.floor(Math.random() * 5) + 10) * 10000, 
                    status: 'completed', branchId: 'main',
                    createdAt: new Date().toISOString()
                });
            });
        }
    }

    await commitBatch();
    console.log('🎉 Super-realistic seeding successfully completed for passflow-demo!');
}

module.exports = { refreshDemoData };
