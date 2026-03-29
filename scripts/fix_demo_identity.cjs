const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function fix() {
    // 1. Force overwrite ALL identity & branding in demo-yoga
    await db.doc('studios/demo-yoga').set({
        name: 'PassFlow Yoga & Pilates',
        ownerEmail: 'demo@passflow.app',
        plan: 'pro',
        status: 'active',
        settings: {
            IDENTITY: {
                NAME: 'PassFlow Yoga & Pilates',
                NAME_ENGLISH: 'PassFlow Yoga & Pilates',
                SLOGAN: '최고의 요가 스튜디오 자동화 솔루션',
                LOGO_TEXT: 'PF',
            },
            THEME: {
                PRIMARY_COLOR: '#8B5CF6',
                SKELETON_COLOR: '#1a1a1a'
            },
            ASSETS: {
                LOGO: {
                    SQUARE: '/assets/passflow_logo.png',
                    WIDE: '/assets/passflow_logo.png'
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
            POLICIES: { 
                ENABLE_EXPIRATION_BLOCK: true, 
                ENABLE_NEGATIVE_CREDITS: false,
                PHOTO_ENABLED: false,
                SHOW_CAMERA_PREVIEW: false
            }
        },
        updatedAt: new Date().toISOString()
    }, { merge: false }); // merge: false = FULL OVERWRITE, wipe any old boksaem traces
    console.log('✅ 1. Studio config FORCE overwritten (no merge)');

    // 2. Instructors
    await db.doc('studios/demo-yoga/settings/instructors').set({
        list: [
            { name: "엠마 원장", role: "admin" },
            { name: "소피 지점장", role: "manager" },
            { name: "루시 강사", role: "instructor" },
            { name: "올리비아 강사", role: "instructor" }
        ],
        updatedAt: new Date().toISOString()
    });
    console.log('✅ 2. Instructors set');

    // 3. Class Types & Levels
    await db.doc('studios/demo-yoga/settings/classTypes').set({
        list: ["빈야사", "하타", "아쉬탕가", "기구필라테스", "인요가", "힐링요가"],
        updatedAt: new Date().toISOString()
    });
    await db.doc('studios/demo-yoga/settings/classLevels').set({
        list: ["0.5", "1", "1.5", "2"],
        updatedAt: new Date().toISOString()
    });
    console.log('✅ 3. Class types & levels set');

    // 4. Pricing
    await db.doc('studios/demo-yoga/settings/pricing').set({
        "group": {
            "label": "그룹 레슨",
            "branches": ["A", "B"],
            "options": [
                { "id": "1month", "label": "1개월 무제한", "price": 180000, "duration": 1, "popular": true },
                { "id": "3months", "label": "3개월 30회", "price": 450000, "duration": 3, "credits": 30, "discount": "20% 할인" },
                { "id": "6months", "label": "6개월 60회", "price": 780000, "duration": 6, "credits": 60, "discount": "35% 할인" }
            ]
        },
        "private": {
            "label": "1:1 집중 레슨",
            "branches": ["A", "B"],
            "options": [
                { "id": "10sessions", "label": "10회권", "price": 700000, "duration": 3, "credits": 10, "popular": true },
                { "id": "20sessions", "label": "20회권", "price": 1200000, "duration": 6, "credits": 20, "discount": "15% 할인" }
            ]
        },
        "_meta": {
            "payment": "카드, 현금, 계좌이체 가능",
            "holdRules": "3개월 이상 등록 시 1회 홀딩 가능 (최대 2주)",
            "discountNote": "장기 등록 시 추가 할인 적용"
        }
    });
    console.log('✅ 4. Pricing set');

    // 5. Notices 
    await db.doc('studios/demo-yoga/notices/demo_notice_1').set({
        title: "[공지] 봄맞이 패스플로우 데모 업데이트 안내",
        content: "안녕하세요. 완벽한 스튜디오 관리를 돕는 패스플로우입니다.\n\n새로운 AI 브리핑 기능이 추가되었습니다. 대시보드에서 'AI분석' 버튼을 눌러보세요.\n\n문의사항은 demo@passflow.app으로 연락주세요.",
        author: "관리자",
        createdAt: new Date().toISOString(),
        isPinned: true
    });
    await db.doc('studios/demo-yoga/notices/demo_notice_2').set({
        title: "[안내] 4월 수업 시간표 변경 공지",
        content: "4월부터 '모닝 빈야사' 수업이 07:00 → 06:30으로 변경됩니다.\n\n'코어 인텐시브' 수업이 신설됩니다 (매주 화, 목 20:00).\n\n자세한 시간은 주간시간표를 참고해주세요.",
        author: "엠마 원장",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isPinned: false
    });
    console.log('✅ 5. Notices set');

    // 6. Generate daily_classes for past 7 days + today + future 7 days
    const now = new Date();
    const classTpl = [
        { time: '07:00', title: '모닝 빈야사', instructor: '엠마 원장', level: '1', duration: 60 },
        { time: '10:00', title: '기구 필라테스', instructor: '루시 강사', level: '1.5', duration: 60 },
        { time: '14:00', title: '힐링요가', instructor: '소피 지점장', level: '0.5', duration: 60 },
        { time: '19:00', title: '코어 인텐시브', instructor: '올리비아 강사', level: '2', duration: 60 },
        { time: '21:00', title: '저녁 하타', instructor: '올리비아 강사', level: '1', duration: 60 }
    ];

    let batch = db.batch();
    let ops = 0;
    const flush = async () => { if (ops > 0) { await batch.commit(); batch = db.batch(); ops = 0; } };

    for (let d = -7; d <= 7; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() + d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const dayOfWeek = date.getDay(); // 0=Sun

        for (const branchId of ['A', 'B']) {
            // Skip some classes on Sunday
            const classes = dayOfWeek === 0 ? classTpl.slice(0, 2) : classTpl;
            
            for (const cls of classes) {
                const docId = `sched_${branchId}_${dateStr}_${cls.time.replace(':','')}`;
                batch.set(db.doc(`studios/demo-yoga/daily_classes/${docId}`), {
                    id: docId,
                    branchId,
                    date: dateStr,
                    startTime: cls.time,
                    className: cls.title,
                    instructor: cls.instructor,
                    level: cls.level,
                    duration: cls.duration,
                    capacity: 15,
                    attendees: [],
                    status: 'normal',
                    createdAt: now.toISOString()
                });
                ops++;
                if (ops >= 400) await flush();
            }
        }
    }
    await flush();
    console.log('✅ 6. Daily classes (schedules) set for 15 days');

    console.log('\n🎉 Demo identity, settings, schedules, notices ALL fixed!');
    process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
