// Yoga Studio Configuration (범용 기본값)
// 이 파일은 새로운 요가원의 기본 설정 템플릿입니다.
// 실제 운영 데이터는 Firestore(studios/{studioId})에서 실시간으로 로드되어 이 값을 덮어씁니다.
// → StudioContext.jsx의 deepMerge + auto-seeding 참조

export const STUDIO_CONFIG = {
    // 1. Identity Module (브랜드 정체성) — 새 요가원 기본값
    IDENTITY: {
        NAME: "요가 스튜디오",
        NAME_ENGLISH: "Yoga Studio",
        LOGO_TEXT: "YOGA",
        SLOGAN: "나를 만나는 고요한 시간",
        DESCRIPTION: "요가와 함께하는 건강한 일상",
        APP_VERSION: "2026.03.28 21:03",
        FAVICON: "/favicon.ico",
    },

    // 2. Operational Policy Engine (운영 정책) — 합리적 기본값
    POLICIES: {
        DORMANT_THRESHOLD_DAYS: 14,      // 잠든 회원 기준 (14일 미출석)
        EXPIRING_THRESHOLD_DAYS: 7,      // 만료 임박 알림 기준
        CHECKIN_TIMEOUT_MS: 10000,       // 동일인 중복 출석 방지 쿨다운 (10초)
        SESSION_AUTO_CLOSE_SEC: 25,      // 중복 확인 모달 자동 닫기
        ALLOW_SELF_HOLD: false,          // 회원 자가 홀딩 기능 (기본 OFF)
        HOLD_RULES: [
            { durationMonths: 3, maxCount: 1, maxWeeks: 2 },
            { durationMonths: 6, maxCount: 2, maxWeeks: 4 }
        ],
        ALLOW_BOOKING: false,            // 수업 예약 기능 (기본 OFF)
        BOOKING_RULES: {
            defaultCapacity: 15,         // 수업당 기본 최대 인원
            windowDays: 7,               // 예약 가능 기간 (일)
            deadlineHours: 1,            // 예약 마감 (수업 N시간 전)
            cancelDeadlineHours: 3,      // 취소 마감 (수업 N시간 전)
            maxActiveBookings: 3,        // 동시 예약 한도
            maxDailyBookings: 2,         // 하루 최대 예약
            noshowCreditDeduct: 1,       // 노쇼 시 횟수 차감
            enableWaitlist: true         // 대기열 기능
        },
        CREDIT_RULES: {
            mode: 'total',               // 'total' | 'weekly'
            weeklyResetDay: 1,           // 0=일, 1=월, ..., 6=토
            allowCarryOver: false,       // 미사용 주간 크레딧 이월 여부
            weeklyLimitSource: 'plan'    // 'plan' = 요금제 기준, 'member' = 회원별 수동
        },
        PHOTO_ENABLED: false,            // 배경 무음 촬영 모드 (기본 OFF)
        SHOW_CAMERA_PREVIEW: false       // 키오스크 카메라 프리뷰 (기본 OFF)
    },

    // 3. Asset Nexus (이미지 및 자원 매핑) — SaaS 중립적 기본 경로
    ASSETS: {
        LOGO: {
            WIDE: '/assets/passflow_logo.png',
            SQUARE: '/assets/passflow_logo.png',
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

    // 4. UI 및 표시 정책 — 기본 수업 유형
    SCHEDULE_LEGEND: [
        { label: '일반', color: '#FFFFFF', border: '#DDDDDD' },
    ],

    MEMBERSHIP_TYPE_MAP: {
        'general': '일반',
        'intensive': '심화',
        'advanced': '심화',
        'kids': '키즈',
        'kids_flying': '키즈플라잉',
        'pregnancy': '임산부',
        'prenatal': '임산부요가',
        'sat_hatha': '토요하타',
        'saturday_hatha': '토요하타',
        'ttc': 'TTC',
        'TTC': 'TTC (지도자과정)',
    },

    // 5. AI Persona Layer (AI 성격 설정) — 범용
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

    // 6. 지점 설정 — 기본 1개 지점
    BRANCHES: [
        { id: 'main', name: '본점', color: 'var(--primary-theme-color)' },
    ],

    // 7. 브랜딩 및 테마
    THEME: {
        PRIMARY_COLOR: "var(--primary-gold)",
        ACCENT_COLOR: "#3B82F6",
        SKELETON_COLOR: "rgba(var(--primary-rgb), 0.1)",
    },

    // 8. 기능 활성화 제어
    FEATURES: {
        ENABLE_DATA_MIGRATION: false
    },

    // 9. 강사 목록 — 기본 빈 목록 (Firestore settings/instructors에서 관리)
    INSTRUCTORS: [],

    // 10. 소셜 미디어 링크 — 빈 기본값 (관리자 설정에서 추가)
    SOCIAL: {},

    // 11. 기본 스케줄 템플릿 — 빈 기본값 (관리자가 시간표에서 직접 설정)
    DEFAULT_SCHEDULE_TEMPLATE: {},


};

export const getBranchName = (id) => {
    const branch = STUDIO_CONFIG.BRANCHES.find(b => b.id === id);
    return branch ? branch.name : id;
};

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
    return branch.color || 'var(--primary-gold)';
};

export const getAllBranches = () => STUDIO_CONFIG.BRANCHES;
