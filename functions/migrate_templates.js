const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = getFirestore();

// [COPIED FROM studioConfig.js]
const DEFAULT_SCHEDULE_TEMPLATE = {
    'gwangheungchang': [
        { days: ['월'], startTime: '10:00', className: '하타', instructor: '원장' },
        { days: ['월'], startTime: '14:00', className: '마이솔', instructor: '원장' },
        { days: ['월'], startTime: '19:00', className: '하타', instructor: '원장' },
        { days: ['월'], startTime: '20:20', className: '아쉬탕가', instructor: '원장' },
        { days: ['화'], startTime: '10:00', className: '아쉬탕가', instructor: '원장' },
        { days: ['화'], startTime: '14:00', className: '마이솔', instructor: '희정' },
        { days: ['화'], startTime: '19:00', className: '하타', instructor: '보윤' },
        { days: ['화'], startTime: '20:20', className: '인요가', instructor: '보윤' },
        { days: ['수'], startTime: '10:00', className: '하타+인', instructor: '미선' },
        { days: ['수'], startTime: '14:20', className: '하타인텐시브', instructor: '한아' },
        { days: ['수'], startTime: '19:00', className: '아쉬탕가', instructor: '정연' },
        { days: ['수'], startTime: '20:20', className: '하타', instructor: '정연' },
        { days: ['목'], startTime: '10:00', className: '하타', instructor: '미선' },
        { days: ['목'], startTime: '14:00', className: '마이솔', instructor: '희정' },
        { days: ['목'], startTime: '19:00', className: '하타', instructor: '미선' },
        { days: ['목'], startTime: '20:20', className: '아쉬탕가', instructor: '미선' },
        { days: ['금'], startTime: '10:00', className: '하타', instructor: '소영' },
        { days: ['금'], startTime: '14:20', className: '하타인텐시브', instructor: '은혜' },
        { days: ['금'], startTime: '19:00', className: '인요가', instructor: '한아' },
        { days: ['금'], startTime: '20:20', className: '하타', instructor: '한아' },
        { days: ['토'], startTime: '10:00', className: '하타', instructor: '원장' }, // Rotational
        { days: ['토'], startTime: '11:20', className: '아쉬탕가', instructor: '원장' },
        { days: ['일'], startTime: '11:20', className: '마이솔', instructor: '원장' },
        { days: ['일'], startTime: '14:00', className: '하타인텐시브', instructor: '원장' },
        { days: ['일'], startTime: '19:00', className: '하타', instructor: '혜실' },
    ],
    'mapo': [
        { days: ['월'], startTime: '10:00', className: '하타', instructor: '세연' },
        { days: ['월'], startTime: '11:50', className: '임신부요가', instructor: 'anu' },
        { days: ['월'], startTime: '18:40', className: '인요가', instructor: '한아' },
        { days: ['월'], startTime: '19:50', className: '하타', instructor: '한아' },
        { days: ['월'], startTime: '21:00', className: '플라잉', instructor: '송미', level: '1' },
        { days: ['화'], startTime: '10:00', className: '하타', instructor: '정연' },
        { days: ['화'], startTime: '11:50', className: '임신부요가', instructor: 'anu' },
        { days: ['화'], startTime: '18:40', className: '플라잉', instructor: '송미', level: '1.5' },
        { days: ['화'], startTime: '19:50', className: '아쉬탕가', instructor: '다나' },
        { days: ['화'], startTime: '21:00', className: '하타', instructor: '다나' },
        { days: ['수'], startTime: '10:00', className: '하타', instructor: '원장' },
        { days: ['수'], startTime: '17:00', className: '키즈플라잉', instructor: '송미', level: '0.5' },
        { days: ['수'], startTime: '18:40', className: '하타', instructor: '원장' },
        { days: ['수'], startTime: '19:50', className: '플라잉', instructor: '리안', level: '2' },
        { days: ['수'], startTime: '21:00', className: '빈야사', instructor: '리안' },
        { days: ['목'], startTime: '10:00', className: '빈야사', instructor: '정연' },
        { days: ['목'], startTime: '11:50', className: '임신부요가', instructor: 'anu' },
        { days: ['목'], startTime: '18:40', className: '플라잉', instructor: '성희', level: '1' },
        { days: ['목'], startTime: '19:50', className: '플라잉', instructor: '성희', level: '1.5' },
        { days: ['목'], startTime: '21:00', className: '인양요가', instructor: '송미' },
        { days: ['금'], startTime: '10:00', className: '힐링', instructor: '세연' },
        { days: ['금'], startTime: '18:40', className: '아쉬탕가', instructor: '정연' },
        { days: ['금'], startTime: '19:50', className: '하타', instructor: '정연' },
        { days: ['금'], startTime: '21:00', className: '로우플라잉', instructor: '효원' },
        { days: ['토'], startTime: '10:00', className: '하타', instructor: '리안' },
        { days: ['토'], startTime: '11:20', className: '플라잉', instructor: '리안', level: '2' },
        { days: ['토'], startTime: '13:30', className: '하타인텐시브', instructor: '희연' },
        { days: ['일'], startTime: '10:00', className: '하타', instructor: '효원' },
        { days: ['일'], startTime: '18:40', className: '하타', instructor: '소영' },
    ]
};

async function migrate() {
    console.log("Starting Migration of Weekly Templates...");

    // Gwangheungchang
    await db.collection('weekly_templates').doc('gwangheungchang').set({
        classes: DEFAULT_SCHEDULE_TEMPLATE['gwangheungchang'],
        updatedAt: new Date().toISOString()
    });
    console.log("Migrated Gwangheungchang.");

    // Mapo
    await db.collection('weekly_templates').doc('mapo').set({
        classes: DEFAULT_SCHEDULE_TEMPLATE['mapo'],
        updatedAt: new Date().toISOString()
    });
    console.log("Migrated Mapo.");

    console.log("Migration Complete.");
}

migrate().catch(console.error);
