const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TARGET = 'demo-yoga';

async function fix() {
    console.log('?”§ Fixing studio config to use TOP-LEVEL structure (matching STUDIO_CONFIG)...');

    // The app expects top-level keys like IDENTITY, BRANCHES, THEME etc.
    // NOT nested under "settings".
    await db.doc(`studios/${TARGET}`).set({
        // Basic tenant metadata
        name: 'PassFlow Ai Yoga & Pilates',
        ownerEmail: 'demo@passflow.app',
        plan: 'pro',
        status: 'active',
        
        // Config keys matching studioConfig.js structure (TOP-LEVEL)
        IDENTITY: {
            NAME: 'PassFlow Ai Yoga & Pilates',
            NAME_ENGLISH: 'PassFlow Ai Yoga & Pilates',
            SLOGAN: 'ìµœê³ ???”ê? ?¤íŠœ?”ì˜¤ ?ë™???”ë£¨??,
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
            { id: 'A', name: 'ê°•ë‚¨ë³¸ì ', color: '#8B5CF6' },
            { id: 'B', name: '?ë?DI??, color: '#3B82F6' }
        ],
        MEMBERSHIP_TYPE_MAP: {
            'MTypeA': 'ê¸°êµ¬?„ë¼?ŒìŠ¤ 30?Œê¶Œ',
            'MTypeB': '?Œë¼?‰ìš”ê°€ 1ê°œì›”ê¶?,
            'MTypeC': 'ë¹ˆì•¼??ë¬´ì œ???¨ìŠ¤',
            'MTypeD': '?ë°???´ëž˜??
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
                "ë§¤íŠ¸ ?„ì—???˜ë? ë§Œë‚˜???Œì¤‘???œê°„?…ë‹ˆ??",
                "?¤ëŠ˜???Œì›?¤ì—ê²??°ëœ»???ë„ˆì§€ë¥??„í•´ì£¼ì„¸??"
            ]
        },
        INSTRUCTORS: ["? ë§ˆ ?ìž¥", "?Œí”¼ ì§€?ìž¥", "ë£¨ì‹œ ê°•ì‚¬", "?¬ë¦¬ë¹„ì•„ ê°•ì‚¬"],
        
        updatedAt: new Date().toISOString()
    }, { merge: false }); // FULL OVERWRITE

    console.log('??Studio config fixed with TOP-LEVEL keys');
    process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
