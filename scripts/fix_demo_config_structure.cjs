const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TARGET = 'demo-yoga';

async function fix() {
    console.log('🔧 Fixing studio config to use TOP-LEVEL structure (matching STUDIO_CONFIG)...');

    // The app expects top-level keys like IDENTITY, BRANCHES, THEME etc.
    // NOT nested under "settings".
    await db.doc(`studios/${TARGET}`).set({
        // Basic tenant metadata
        name: 'PassFlow Yoga & Pilates',
        ownerEmail: 'demo@passflow.app',
        plan: 'pro',
        status: 'active',
        
        // Config keys matching studioConfig.js structure (TOP-LEVEL)
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
        MEMBERSHIP_TYPE_MAP: {
            'MTypeA': '기구필라테스 30회권',
            'MTypeB': '플라잉요가 1개월권',
            'MTypeC': '빈야사 무제한 패스',
            'MTypeD': '원데이 클래스'
        },
        POLICIES: { 
            ENABLE_EXPIRATION_BLOCK: true, 
            ENABLE_NEGATIVE_CREDITS: false, 
            PHOTO_ENABLED: false, 
            SHOW_CAMERA_PREVIEW: false,
            DORMANT_THRESHOLD_DAYS: 14,
            EXPIRING_THRESHOLD_DAYS: 7,
            CHECKIN_TIMEOUT_MS: 10000,
            SESSION_AUTO_CLOSE_SEC: 25,
        },
        AI_CONFIG: {
            NAME: "AI",
            PERSONALITY: "Guide",
            TONE: "Professional & Warm",
            ENABLE_ENHANCED_MESSAGES: true,
            FALLBACK_QUOTES: [
                "매트 위에서 나를 만나는 소중한 시간입니다.",
                "오늘도 회원들에게 따뜻한 에너지를 전해주세요."
            ]
        },
        INSTRUCTORS: ["엠마 원장", "소피 지점장", "루시 강사", "올리비아 강사"],
        
        updatedAt: new Date().toISOString()
    }, { merge: false }); // FULL OVERWRITE

    console.log('✅ Studio config fixed with TOP-LEVEL keys');
    process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
