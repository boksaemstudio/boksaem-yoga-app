// Yoga Studio Configuration
// 이 파일은 각 요가원마다 달라지는 설정값들을 모아둔 곳입니다.
// 다른 요가원에 적용할 때는 이 파일의 내용만 수정하면 됩니다.

export const STUDIO_CONFIG = {
    // 1. Identity Module (브랜드 정체성)
    IDENTITY: {
        NAME: "복샘요가",
        NAME_ENGLISH: "Boksaem Yoga",
        LOGO_TEXT: "BOKSAEM",
        SLOGAN: "나를 만나는 고요한 시간",
        DESCRIPTION: "전통 요가의 깊이를 현대적 감각으로 전달하는 프리미엄 요가 스튜디오",
        APP_VERSION: "2026.03.12 07:16",
        FAVICON: "/favicon.ico",
    },

    // 2. Operational Policy Engine (운영 정책)
    POLICIES: {
        DORMANT_THRESHOLD_DAYS: 14,      // 잠든 회원 기준 (14일 미출석)
        EXPIRING_THRESHOLD_DAYS: 7,      // 만료 임박 알림 기준
        CHECKIN_TIMEOUT_MS: 10000,       // 동일인 중복 출석 방지 쿨다운 (10초)
        SESSION_AUTO_CLOSE_SEC: 25,      // 중복 확인 모달 자동 닫기
    },

    // 3. Asset Nexus (이미지 및 자원 매핑)
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

    // 4. UI 및 표시 정책
    SCHEDULE_LEGEND: [
        { label: '일반', color: '#FFFFFF', border: '#DDDDDD', branches: ['gwangheungchang', 'mapo'] },
        { label: '심화', color: 'rgba(255, 190, 118, 0.9)', border: 'rgba(255, 190, 118, 1)', branches: ['gwangheungchang'] },
        { label: '심화/플라잉', color: 'rgba(255, 190, 118, 0.9)', border: 'rgba(255, 190, 118, 1)', branches: ['mapo'] },
        { label: '키즈', color: 'rgba(255, 234, 167, 0.4)', border: 'rgba(255, 234, 167, 0.6)', branches: ['mapo'] },
        { label: '임산부', color: 'rgba(196, 252, 239, 0.9)', border: 'rgba(129, 236, 236, 1)', branches: ['mapo'] },
        { label: '토요하타/별도등록', color: 'rgba(224, 86, 253, 0.7)', border: 'rgba(224, 86, 253, 0.9)', branches: ['mapo'] },
    ],

    MEMBERSHIP_TYPE_MAP: {
        'general': '일반', 
        'intensive': '심화', 
        'kids': '키즈',
        'pregnancy': '임신부', 
        'sat_hatha': '토요하타', 
        'ttc': 'TTC'
    },

    // 5. AI Persona Layer (AI 성격 설정)
    AI_CONFIG: {
        NAME: "AI",
        PERSONALITY: "Guide",
        TONE: "Traditional & Warm",
        KEYWORDS: ["나마스테", "프라나", "타파스", "사티", "사다나"],
        ENABLE_ENHANCED_MESSAGES: true,
        FALLBACK_QUOTES: [
            "매트 위에서 나를 만나는 소중한 시간입니다.",
            "오늘도 회원들에게 따뜻한 에너지를 전해주세요.",
            "호흡을 통해 마음의 평온을 찾으세요.",
            "오늘 하루도 즐거운 수련 되세요!"
        ]
    },

    // 5. 지점 설정 (ID는 영어, NAME은 한글 표시용)
    BRANCHES: [
        { id: 'gwangheungchang', name: '광흥창점', color: 'var(--primary-theme-color)' },
        { id: 'mapo', name: '마포점', color: '#3B82F6' },
    ],

    // Branch Constants mapping
    BRANCH_IDS: {
        BRANCH_1: 'gwangheungchang',
        BRANCH_2: 'mapo'
    },

    // 6. 브랜딩 및 테마
    THEME: {
        PRIMARY_COLOR: "#D4AF37", // Gold (Generic theme color)
        ACCENT_COLOR: "#3B82F6",  // Blue
        SKELETON_COLOR: "rgba(212, 175, 55, 0.1)",
    },

    // [New] 기능 활성화 제어
    FEATURES: {
        ENABLE_DATA_MIGRATION: false
    },

    // [New] 강사 목록
    INSTRUCTORS: [
        { id: 'lead', name: '강사1', branches: ['branch_1', 'branch_2'] },
    ],

    // 4. 소셜 미디어 링크
    SOCIAL: {
        Instagram_광흥창점: "https://www.instagram.com/boksaemyoga_ghc",
        Instagram_마포점: "https://www.instagram.com/reel/DTT2iORE7th/?utm_source=ig_web_copy_link",
        Youtube: "https://www.youtube.com/@boksaemyoga_ghc",
        Blog: "https://blog.naver.com/boksaemyoga"
    },

    // 5. 기본 스케줄 템플릿 (초기 세팅용)
    DEFAULT_SCHEDULE_TEMPLATE: {
        'branch_1': [
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
            { days: ['토'], startTime: '10:00', className: '하타', instructor: '한아' }, // Rotational
            { days: ['토'], startTime: '11:20', className: '아쉬탕가', instructor: '원장' },
            { days: ['일'], startTime: '11:20', className: '마이솔', instructor: '원장' },
            { days: ['일'], startTime: '14:00', className: '하타인텐시브', instructor: '원장' },
            { days: ['일'], startTime: '19:00', className: '하타', instructor: '혜실' },
        ],
        'branch_2': [
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
    },

    // 6. 가격표 데이터 (기본값)
    PRICING: {
        'intensive': {
            label: '심화',
            branches: ['gwangheungchang', 'mapo'],
            options: [
                { id: '10_session', label: '10회권 (3개월)', basePrice: 300000, credits: 10, months: 3, type: 'ticket' },
                { id: 'month_4', label: '월 4회', basePrice: 120000, credits: 4, months: 1, type: 'subscription' },
                { id: 'month_8', label: '월 8회', basePrice: 154000, credits: 8, months: 1, type: 'subscription', discount3: 439000, discount6: 832000 },
                { id: 'month_12', label: '월 12회', basePrice: 187000, credits: 12, months: 1, type: 'subscription', discount3: 533000, discount6: 1010000 },
                { id: 'month_16', label: '월 16회', basePrice: 209000, credits: 16, months: 1, type: 'subscription', discount3: 596000, discount6: 1129000 },
                { id: 'month_20', label: '월 20회', basePrice: 231000, credits: 20, months: 1, type: 'subscription', discount3: 659000, discount6: 1248000 },
                { id: 'unlimited', label: '월 무제한', basePrice: 275000, credits: 9999, months: 1, type: 'subscription', discount3: 784000, discount6: 1485000 },
            ]
        },
        'general': {
            label: '일반',
            branches: ['gwangheungchang', 'mapo'],
            options: [
                { id: '10_session', label: '10회권 (3개월)', basePrice: 200000, credits: 10, months: 3, type: 'ticket' },
                { id: 'month_8', label: '월 8회', basePrice: 143000, credits: 8, months: 1, type: 'subscription', discount3: 408000, discount6: 773000 },
                { id: 'month_12', label: '월 12회', basePrice: 176000, credits: 12, months: 1, type: 'subscription', discount3: 502000, discount6: 951000 },
                { id: 'month_16', label: '월 16회', basePrice: 198000, credits: 16, months: 1, type: 'subscription', discount3: 565000, discount6: 1070000 },
                { id: 'unlimited', label: '월 무제한', basePrice: 220000, credits: 9999, months: 1, type: 'subscription', discount3: 627000, discount6: 1188000 },
            ]
        },
        'pregnancy': {
            label: '임산부',
            branches: ['mapo'],
            options: [
                { id: '8_session', label: '8회권 (3개월)', basePrice: 180000, credits: 8, months: 3, type: 'ticket' }
            ]
        },
        'kids': {
            label: '키즈플라잉',
            branches: ['mapo'],
            options: [
                { id: '10_session', label: '10회권 (3개월)', basePrice: 220000, credits: 10, months: 3, type: 'ticket' }
            ]
        },
        'sat_hatha': {
            label: '토요하타',
            branches: ['mapo'],
            options: [
                { id: '4_session', label: '4회권 (1개월)', basePrice: 180000, credits: 4, months: 1, type: 'ticket' }
            ]
        },
        'ttc': {
            label: 'TTC (지도자과정)',
            branches: ['gwangheungchang', 'mapo'],
            options: [
                {
                    id: 'ttc_standard',
                    label: 'TTC',
                    basePrice: 0,
                    cashPrice: 0,
                    credits: 9999,
                    months: 6,
                    type: 'ticket',
                    isCourse: true
                }
            ]
        }
    },

    // 7. 솔라피 알림톡 템플릿
    ALIMTALK_TEMPLATES: [
        { 
            id: '', 
            name: '일반 문자 (LMS/SMS)',
            content: ''
        },
        { 
            id: 'KA01TP260219025216404VfhzWLRH3F5', 
            name: '휴무일 오늘 수업변경안내 (수업과목단축)', 
            content: '[#{studio}] 수업 안내드립니다.\n금일 오전 10시 하타 / 오후 2시 아쉬탕가 수업만 진행됩니다.\n이용에 참고 부탁드립니다.' 
        },
        { 
            id: 'KA01TP260219025023679E4NxugsIDNd', 
            name: '휴무일 내일 수업변경안내 (수업과목단축)', 
            content: '[#{studio}] 내일 수업 안내드립니다.\n내일 오전 10시 하타 / 오후 2시 아쉬탕가 수업만 진행됩니다.\n이용에 참고 부탁드립니다.' 
        },
        { 
            id: 'KA01TP260219024739217NOCrSlZrNo0', 
            name: '휴무일 수업안내 (전수업휴강)', 
            content: '[#{studio}] 공휴일 휴강 안내\n#{date} 공휴일로 인해 전 수업 휴강합니다.' 
        }
    ]
};

export const getBranchName = (id) => {
    // Return ID if it's used for translation lookup elsewhere, 
    // but keep original for backward compatibility where 'getBranchName' is expected to return Display Name.
    // However, to fix translation, we should use ID in t('branch' + id).
    const branch = STUDIO_CONFIG.BRANCHES.find(b => b.id === id);
    return branch ? branch.name : id;
};

// Add a helper to get branch ID for translation
export const getBranchId = (id) => {
    const branch = STUDIO_CONFIG.BRANCHES.find(b => b.id === id);
    return branch ? branch.id : id;
};

export const getBranchColor = (id) => {
    const branch = STUDIO_CONFIG.BRANCHES.find(b => b.id === id);
    return branch?.color || 'var(--text-secondary)';
};

export const getBranchThemeColor = (id) => {
    const branch = STUDIO_CONFIG.BRANCHES.find(b => b.id === id);
    if (!branch) return 'var(--text-secondary)';
    if (branch.id === 'gwangheungchang') return 'var(--primary-gold)';
    if (branch.id === 'mapo') return '#60a5fa';
    return branch.color || 'var(--primary-gold)';
};

export const getAllBranches = () => STUDIO_CONFIG.BRANCHES;
