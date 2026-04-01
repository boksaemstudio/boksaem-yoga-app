import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json", "utf8"));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const STATIC_CONFIG = {
    IDENTITY: {
        NAME: "복샘요가",
        NAME_ENGLISH: "Boksaem Yoga",
        LOGO_TEXT: "BOKSAEM",
        SLOGAN: "나를 만나는 고요한 시간",
        DESCRIPTION: "전통 요가의 깊이를 현대적 감각으로 전달하는 프리미엄 요가 스튜디오",
        APP_VERSION: "1.3.0.v12",
        FAVICON: "/favicon.ico",
    },
    POLICIES: {
        DORMANT_THRESHOLD_DAYS: 14,
        EXPIRING_THRESHOLD_DAYS: 7,
        CHECKIN_TIMEOUT_MS: 10000,
        SESSION_AUTO_CLOSE_SEC: 25,
    },
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
    THEME: {
        PRIMARY_COLOR: "#D4AF37",
        SKELETON_COLOR: "rgba(212, 175, 55, 0.1)",
    },
    BRANCHES: [
        { id: 'gwangheungchang', name: '광흥창점', color: '#D4AF37' },
        { id: 'mapo', name: '마포점', color: '#60a5fa' },
    ],
    // ... other fields as needed
};

async function seed() {
    console.log("=== 🚀 EMERGENCY SEEDING START ===");
    await db.collection('studios').doc('default').set(STATIC_CONFIG);
    console.log("✅ Seeded studios/default successfully.");
}

seed().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
