/**
 * 🧘 쌍문요가 테넌트 초기 설정 스크립트
 * 
 * 이미지에서 추출한 데이터:
 * - 로고: SSANGMUN YOGA (Ashtanga, Hatha, Vinyasa)
 * - 가격표: 일반(60분) + 마이솔(90분)
 * - 강사: 혜경, 지유, 하영, 예선, 나라
 * - 수업: 아쉬탕가, 하타, 빈야사, 마이솔
 */
const admin = require('firebase-admin');
const sa = require('./service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'boksaem-yoga' });
const db = admin.firestore();

const STUDIO_ID = 'ssangmun-yoga';

const config = {
    // === 브랜드 ===
    IDENTITY: {
        NAME: "쌍문요가",
        NAME_ENGLISH: "Ssangmun Yoga",
        LOGO_TEXT: "SSANGMUN YOGA",
        SLOGAN: "Ashtanga · Hatha · Vinyasa",
        DESCRIPTION: "쌍문역 아쉬탕가 요가 전문 스튜디오",
        APP_VERSION: "2026.03.24",
    },

    // === 운영 정책 ===
    POLICIES: {
        DORMANT_THRESHOLD_DAYS: 14,
        EXPIRING_THRESHOLD_DAYS: 7,
        CHECKIN_TIMEOUT_MS: 10000,
        SESSION_AUTO_CLOSE_SEC: 25,
        ALLOW_SELF_HOLD: false,
        HOLD_RULES: [
            { durationMonths: 3, maxCount: 1, maxWeeks: 2 },
            { durationMonths: 6, maxCount: 2, maxWeeks: 4 }
        ],
        ALLOW_BOOKING: false,
        CREDIT_RULES: { mode: 'total', weeklyResetDay: 1, allowCarryOver: false, weeklyLimitSource: 'plan' },
        SHOW_CAMERA_PREVIEW: false,
        FACE_RECOGNITION_ENABLED: false,
    },

    // === 이미지 ===
    ASSETS: {
        LOGO: {
            WIDE: '/assets/logo_wide.webp',
            SQUARE: '/assets/logo_square.webp',
            RYS200: '/assets/RYS200.webp',
        },
        MEMBER_BG: '/assets/default_member_bg.webp',
        BACKGROUNDS: {
            MORNING: '/assets/bg_morning.webp',
            AFTERNOON: '/assets/bg_afternoon.webp',
            EVENING: '/assets/bg_evening.webp',
            NIGHT: '/assets/bg_night.webp'
        }
    },

    // === 수업 종류 (시간표 색상) ===
    SCHEDULE_LEGEND: [
        { label: '하타', color: '#FFFFFF', border: '#DDDDDD' },
        { label: '아쉬탕가', color: '#FFF9C4', border: '#F9A825' },
        { label: '빈야사', color: '#E8F5E9', border: '#66BB6A' },
        { label: '마이솔', color: '#FFECB3', border: '#FF8F00' },
    ],

    // === 회원권 유형 ===
    MEMBERSHIP_TYPE_MAP: {
        'general': '일반(60분)',
        'mysore': '마이솔(90분)',
    },

    // === AI ===
    AI_CONFIG: {
        NAME: "AI",
        PERSONALITY: "Guide",
        TONE: "Traditional & Warm",
        KEYWORDS: ["나마스테", "프라나", "아쉬탕가", "빈야사", "수리야 나마스카라"],
        ENABLE_ENHANCED_MESSAGES: true,
        FALLBACK_QUOTES: [
            "프라나야마로 시작하는 오늘, 새로운 수련이 기다리고 있습니다.",
            "매트 위에서 호흡과 함께하는 진정한 나를 만나세요.",
            "꾸준한 수련이 최고의 스승입니다.",
        ]
    },

    // === 지점 ===
    BRANCHES: [
        { id: 'main', name: '쌍문점', color: '#D4A843' },
    ],

    // === 테마 ===
    THEME: {
        PRIMARY_COLOR: "#D4A843",
        ACCENT_COLOR: "#1B4F72",
        SKELETON_COLOR: "rgba(212, 168, 67, 0.1)",
    },

    FEATURES: {
        ENABLE_DATA_MIGRATION: false,
    },

    // === 강사 (시간표에서 추출) ===
    INSTRUCTORS: [
        { id: 'hk', name: '혜경' },
        { id: 'jy', name: '지유' },
        { id: 'hy', name: '하영' },
        { id: 'ys', name: '예선' },
        { id: 'nr', name: '나라' },
    ],

    SOCIAL: {},
    DEFAULT_SCHEDULE_TEMPLATE: {},
};

// === 가격표 (이미지에서 추출) ===
const PRICING = {
    // ─── 일반(60분) ───
    general_drop: {
        label: '일반 1회권', type: 'general', price: 25000,
        credits: 1, durationMonths: 0, weeklyCredits: 0, category: 'general',
    },
    general_10: {
        label: '일반 10회권', type: 'general', price: 200000,
        credits: 10, durationMonths: 3, weeklyCredits: 0, category: 'general',
    },
    general_1m_8: {
        label: '일반 월8회(1개월)', type: 'general', price: 130000,
        credits: 8, durationMonths: 1, weeklyCredits: 2, category: 'general',
    },
    general_1m_12: {
        label: '일반 월12회(1개월)', type: 'general', price: 160000,
        credits: 12, durationMonths: 1, weeklyCredits: 3, category: 'general',
    },
    general_1m_16: {
        label: '일반 월16회(1개월)', type: 'general', price: 180000,
        credits: 16, durationMonths: 1, weeklyCredits: 4, category: 'general',
    },
    general_1m_unlim: {
        label: '일반 무제한(1개월)', type: 'general', price: 200000,
        credits: 999, durationMonths: 1, weeklyCredits: 0, category: 'general',
    },
    general_3m_8: {
        label: '일반 월8회(3개월)', type: 'general', price: 370000,
        credits: 24, durationMonths: 3, weeklyCredits: 2, category: 'general',
        discount: '10%',
    },
    general_3m_12: {
        label: '일반 월12회(3개월)', type: 'general', price: 460000,
        credits: 36, durationMonths: 3, weeklyCredits: 3, category: 'general',
        discount: '10%', cashPrice: 393300,
    },
    general_3m_16: {
        label: '일반 월16회(3개월)', type: 'general', price: 520000,
        credits: 48, durationMonths: 3, weeklyCredits: 4, category: 'general',
        discount: '10%', cashPrice: 444600,
    },
    general_3m_unlim: {
        label: '일반 무제한(3개월)', type: 'general', price: 580000,
        credits: 999, durationMonths: 3, weeklyCredits: 0, category: 'general',
        discount: '10%', cashPrice: 495900,
    },
    general_6m_8: {
        label: '일반 월8회(6개월)', type: 'general', price: 730000,
        credits: 48, durationMonths: 6, weeklyCredits: 2, category: 'general',
        discount: '15%', cashPrice: 589470,
    },
    general_6m_12: {
        label: '일반 월12회(6개월)', type: 'general', price: 910000,
        credits: 72, durationMonths: 6, weeklyCredits: 3, category: 'general',
        discount: '15%', cashPrice: 734820,
    },
    general_6m_16: {
        label: '일반 월16회(6개월)', type: 'general', price: 1030000,
        credits: 96, durationMonths: 6, weeklyCredits: 4, category: 'general',
        discount: '15%', cashPrice: 831720,
    },
    general_6m_unlim: {
        label: '일반 무제한(6개월)', type: 'general', price: 1150000,
        credits: 999, durationMonths: 6, weeklyCredits: 0, category: 'general',
        discount: '15%', cashPrice: 928620,
    },

    // ─── 마이솔(90분) ───
    mysore_drop: {
        label: '마이솔 1회권', type: 'mysore', price: 35000,
        credits: 1, durationMonths: 0, weeklyCredits: 0, category: 'mysore',
    },
    mysore_10: {
        label: '마이솔 10회권', type: 'mysore', price: 300000,
        credits: 10, durationMonths: 3, weeklyCredits: 0, category: 'mysore',
    },
    mysore_1m_8: {
        label: '마이솔 월8회(1개월)', type: 'mysore', price: 140000,
        credits: 8, durationMonths: 1, weeklyCredits: 2, category: 'mysore',
    },
    mysore_1m_12: {
        label: '마이솔 월12회(1개월)', type: 'mysore', price: 170000,
        credits: 12, durationMonths: 1, weeklyCredits: 3, category: 'mysore',
    },
    mysore_1m_16: {
        label: '마이솔 월16회(1개월)', type: 'mysore', price: 190000,
        credits: 16, durationMonths: 1, weeklyCredits: 4, category: 'mysore',
    },
    mysore_1m_20: {
        label: '마이솔 월20회(1개월)', type: 'mysore', price: 210000,
        credits: 20, durationMonths: 1, weeklyCredits: 5, category: 'mysore',
    },
    mysore_1m_unlim: {
        label: '마이솔 무제한(1개월)', type: 'mysore', price: 250000,
        credits: 999, durationMonths: 1, weeklyCredits: 0, category: 'mysore',
    },
    mysore_3m_8: {
        label: '마이솔 월8회(3개월)', type: 'mysore', price: 400000,
        credits: 24, durationMonths: 3, weeklyCredits: 2, category: 'mysore',
        discount: '10%', cashPrice: 342000,
    },
    mysore_3m_12: {
        label: '마이솔 월12회(3개월)', type: 'mysore', price: 490000,
        credits: 36, durationMonths: 3, weeklyCredits: 3, category: 'mysore',
        discount: '10%', cashPrice: 418950,
    },
    mysore_3m_16: {
        label: '마이솔 월16회(3개월)', type: 'mysore', price: 550000,
        credits: 48, durationMonths: 3, weeklyCredits: 4, category: 'mysore',
        discount: '10%', cashPrice: 470250,
    },
    mysore_3m_20: {
        label: '마이솔 월20회(3개월)', type: 'mysore', price: 610000,
        credits: 60, durationMonths: 3, weeklyCredits: 5, category: 'mysore',
        discount: '10%', cashPrice: 521550,
    },
    mysore_3m_unlim: {
        label: '마이솔 무제한(3개월)', type: 'mysore', price: 730000,
        credits: 999, durationMonths: 3, weeklyCredits: 0, category: 'mysore',
        discount: '10%', cashPrice: 624150,
    },
    mysore_6m_8: {
        label: '마이솔 월8회(6개월)', type: 'mysore', price: 790000,
        credits: 48, durationMonths: 6, weeklyCredits: 2, category: 'mysore',
        discount: '15%', cashPrice: 637920,
    },
    mysore_6m_12: {
        label: '마이솔 월12회(6개월)', type: 'mysore', price: 970000,
        credits: 72, durationMonths: 6, weeklyCredits: 3, category: 'mysore',
        discount: '15%', cashPrice: 783270,
    },
    mysore_6m_16: {
        label: '마이솔 월16회(6개월)', type: 'mysore', price: 1090000,
        credits: 96, durationMonths: 6, weeklyCredits: 4, category: 'mysore',
        discount: '15%', cashPrice: 880170,
    },
    mysore_6m_20: {
        label: '마이솔 월20회(6개월)', type: 'mysore', price: 1210000,
        credits: 120, durationMonths: 6, weeklyCredits: 5, category: 'mysore',
        discount: '15%', cashPrice: 977075,
    },
    mysore_6m_unlim: {
        label: '마이솔 무제한(6개월)', type: 'mysore', price: 1450000,
        credits: 999, durationMonths: 6, weeklyCredits: 0, category: 'mysore',
        discount: '15%', cashPrice: 1170870,
    },
};

(async () => {
    console.log('🧘 쌍문요가 테넌트 설정 시작...\n');

    // 1. 스튜디오 설정 저장
    console.log('1️⃣ 스튜디오 설정(studios/ssangmun-yoga) 저장...');
    await db.doc(`studios/${STUDIO_ID}`).set(config);
    console.log('   ✅ 설정 완료\n');

    // 2. 가격표 저장
    console.log('2️⃣ 가격표 저장...');
    const pricingBatch = db.batch();
    const pricingRef = db.doc(`studios/${STUDIO_ID}`).collection('pricing');
    for (const [id, plan] of Object.entries(PRICING)) {
        pricingBatch.set(pricingRef.doc(id), plan);
    }
    await pricingBatch.commit();
    console.log(`   ✅ ${Object.keys(PRICING).length}개 요금제 저장 완료\n`);

    // 3. 요약
    console.log('═══════════════════════════════════════');
    console.log('🎉 쌍문요가 테넌트 생성 완료!');
    console.log('═══════════════════════════════════════');
    console.log(`🏠 Studio ID: ${STUDIO_ID}`);
    console.log(`💰 요금제: ${Object.keys(PRICING).length}개`);
    console.log(`👩‍🏫 강사: ${config.INSTRUCTORS.map(i => i.name).join(', ')}`);
    console.log(`🎨 테마: ${config.THEME.PRIMARY_COLOR}`);
    console.log(`🔗 접속: https://ssangmun-yoga.web.app`);
    console.log(`🔗 로컬: http://localhost:5173/?studio=ssangmun-yoga`);
    console.log('═══════════════════════════════════════');

    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
