import { useLanguageStore } from './stores/useLanguageStore';
// Yoga Studio Configuration (범용 기본값)
// 이 파일은 새로운 요가원의 기본 설정 템플릿입니다.
// 실제 운영 데이터는 Firestore(studios/{studioId})에서 실시간으로 로드되어 이 값을 덮어씁니다.
// → StudioContext.jsx의 deepMerge + auto-seeding 참조

export const STUDIO_CONFIG = {
  // 1. Identity Module (브랜드 정체성) — 새 요가원 기본값
  IDENTITY: {
    NAME: t("g_76cf3b") || t("g_76cf3b") || t("g_76cf3b") || t("g_76cf3b") || t("g_76cf3b") || "\uC694\uAC00 \uC2A4\uD29C\uB514\uC624",
    NAME_ENGLISH: "Yoga Studio",
    LOGO_TEXT: "YOGA",
    SLOGAN: t("g_0b9a13") || t("g_0b9a13") || t("g_0b9a13") || t("g_0b9a13") || t("g_0b9a13") || "\uB098\uB97C \uB9CC\uB098\uB294 \uACE0\uC694\uD55C \uC2DC\uAC04",
    DESCRIPTION: t("g_b54e96") || t("g_b54e96") || t("g_b54e96") || t("g_b54e96") || t("g_b54e96") || "\uC694\uAC00\uC640 \uD568\uAED8\uD558\uB294 \uAC74\uAC15\uD55C \uC77C\uC0C1",
    APP_VERSION: "2026.04.14 12:23",
    FAVICON: "/favicon.ico"
  },
  // 2. Operational Policy Engine (운영 정책) — 합리적 기본값
  POLICIES: {
    DORMANT_THRESHOLD_DAYS: 14,
    // 잠든 회원 기준 (14일 미출석)
    EXPIRING_THRESHOLD_DAYS: 7,
    // 만료 임박 알림 기준
    CHECKIN_TIMEOUT_MS: 10000,
    // 동일인 중복 출석 방지 쿨다운 (10초)
    SESSION_AUTO_CLOSE_SEC: 25,
    // 중복 확인 모달 자동 닫기
    ALLOW_SELF_HOLD: false,
    // 회원 자가 홀딩 기능 (기본 OFF)
    HOLD_RULES: [{
      durationMonths: 3,
      maxCount: 1,
      maxWeeks: 2
    }, {
      durationMonths: 6,
      maxCount: 2,
      maxWeeks: 4
    }],
    ALLOW_BOOKING: false,
    // 수업 예약 기능 (기본 OFF)
    BOOKING_RULES: {
      defaultCapacity: 15,
      // 수업당 기본 최대 인원
      windowDays: 7,
      // 예약 가능 기간 (일)
      deadlineHours: 1,
      // 예약 마감 (수업 N시간 전)
      cancelDeadlineHours: 3,
      // 취소 마감 (수업 N시간 전)
      maxActiveBookings: 3,
      // 동시 예약 한도
      maxDailyBookings: 2,
      // 하루 최대 예약
      noshowCreditDeduct: 1,
      // 노쇼 시 횟수 차감
      enableWaitlist: true // 대기열 기능
    },
    CREDIT_RULES: {
      mode: 'total',
      // 'total' | 'weekly'
      weeklyResetDay: 1,
      // 0=일, 1=월, ..., 6=토
      allowCarryOver: false,
      // 미사용 주간 크레딧 이월 여부
      weeklyLimitSource: 'plan' // 'plan' = 요금제 기준, 'member' = 회원별 수동
    },
    PHOTO_ENABLED: false,
    // 배경 무음 촬영 모드 (기본 OFF)
    SHOW_CAMERA_PREVIEW: false // 키오스크 카메라 프리뷰 (기본 OFF)
  },
  // 3. Asset Nexus (이미지 및 자원 매핑) — SaaS 중립적 기본 경로
  ASSETS: {
    LOGO: {
      WIDE: '/assets/passflow_logo.png',
      SQUARE: '/assets/passflow_square_logo.png'
      // [SaaS] RYS200은 복샘요가 전용 — Firestore에서 개별 설정
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
  SCHEDULE_LEGEND: [{
    label: t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || "\uC77C\uBC18",
    color: '#FFFFFF',
    border: '#DDDDDD'
  }],
  MEMBERSHIP_TYPE_MAP: {
    'general': t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || t("g_8209e5") || "\uC77C\uBC18",
    'intensive': t("g_75bba0") || t("g_75bba0") || t("g_75bba0") || t("g_75bba0") || t("g_75bba0") || "\uC2EC\uD654",
    'advanced': t("g_75bba0") || t("g_75bba0") || t("g_75bba0") || t("g_75bba0") || t("g_75bba0") || "\uC2EC\uD654",
    'kids': t("g_94eab8") || t("g_94eab8") || t("g_94eab8") || t("g_94eab8") || t("g_94eab8") || "\uD0A4\uC988",
    'kids_flying': t("g_036602") || t("g_036602") || t("g_036602") || t("g_036602") || t("g_036602") || "\uD0A4\uC988\uD50C\uB77C\uC789",
    'pregnancy': t("g_e65f07") || t("g_e65f07") || t("g_e65f07") || t("g_e65f07") || t("g_e65f07") || "\uC784\uC0B0\uBD80",
    'prenatal': t("g_55b818") || t("g_55b818") || t("g_55b818") || t("g_55b818") || t("g_55b818") || "\uC784\uC0B0\uBD80\uC694\uAC00",
    'sat_hatha': t("g_b130cf") || t("g_b130cf") || t("g_b130cf") || t("g_b130cf") || t("g_b130cf") || "\uD558\uD0C0\uC778\uD150\uC2DC\uBE0C",
    'saturday_hatha': t("g_b130cf") || t("g_b130cf") || t("g_b130cf") || t("g_b130cf") || t("g_b130cf") || "\uD558\uD0C0\uC778\uD150\uC2DC\uBE0C",
    'ttc': 'TTC',
    'TTC': t("g_fc0473") || t("g_fc0473") || t("g_fc0473") || t("g_fc0473") || t("g_fc0473") || "TTC (\uC9C0\uB3C4\uC790\uACFC\uC815)"
  },
  // 5. AI Persona Layer (AI 성격 설정) — 범용
  AI_CONFIG: {
    NAME: "AI",
    PERSONALITY: "Guide",
    TONE: "Traditional & Warm",
    KEYWORDS: [t("g_dacc84") || t("g_dacc84") || t("g_dacc84") || t("g_dacc84") || t("g_dacc84") || "\uB098\uB9C8\uC2A4\uD14C", t("g_98ed1d") || t("g_98ed1d") || t("g_98ed1d") || t("g_98ed1d") || t("g_98ed1d") || "\uD504\uB77C\uB098", t("g_6f531d") || t("g_6f531d") || t("g_6f531d") || t("g_6f531d") || t("g_6f531d") || "\uD0C0\uD30C\uC2A4", t("g_5476c3") || t("g_5476c3") || t("g_5476c3") || t("g_5476c3") || t("g_5476c3") || "\uC0AC\uD2F0", t("g_2dcbae") || t("g_2dcbae") || t("g_2dcbae") || t("g_2dcbae") || t("g_2dcbae") || "\uC0AC\uB2E4\uB098"],
    ENABLE_ENHANCED_MESSAGES: true,
    FALLBACK_QUOTES: [t("g_e68c8a") || t("g_e68c8a") || t("g_e68c8a") || t("g_e68c8a") || t("g_e68c8a") || "\uB9E4\uD2B8 \uC704\uC5D0\uC11C \uB098\uB97C \uB9CC\uB098\uB294 \uC18C\uC911\uD55C \uC2DC\uAC04\uC785\uB2C8\uB2E4.", t("g_677d22") || t("g_677d22") || t("g_677d22") || t("g_677d22") || t("g_677d22") || "\uC624\uB298\uB3C4 \uD68C\uC6D0\uB4E4\uC5D0\uAC8C \uB530\uB73B\uD55C \uC5D0\uB108\uC9C0\uB97C \uC804\uD574\uC8FC\uC138\uC694.", t("g_80042a") || t("g_80042a") || t("g_80042a") || t("g_80042a") || t("g_80042a") || "\uD638\uD761\uC744 \uD1B5\uD574 \uB9C8\uC74C\uC758 \uD3C9\uC628\uC744 \uCC3E\uC73C\uC138\uC694.", t("g_0dac94") || t("g_0dac94") || t("g_0dac94") || t("g_0dac94") || t("g_0dac94") || "\uC624\uB298 \uD558\uB8E8\uB3C4 \uC990\uAC70\uC6B4 \uC218\uB828 \uB418\uC138\uC694!"]
  },
  // 6. 지점 설정 — 기본 1개 지점
  BRANCHES: [{
    id: 'main',
    name: t("g_5d12a6") || t("g_5d12a6") || t("g_5d12a6") || t("g_5d12a6") || t("g_5d12a6") || "\uBCF8\uC810",
    isMain: true
  }],
  // 7. 브랜딩 및 테마
  THEME: {
    PRIMARY_COLOR: "var(--primary-gold)",
    ACCENT_COLOR: "#3B82F6",
    SKELETON_COLOR: "rgba(var(--primary-rgb), 0.1)"
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
  DEFAULT_SCHEDULE_TEMPLATE: {}
};
export const getBranchName = id => {
  const branch = STUDIO_CONFIG.BRANCHES.find(b => b.id === id);
  return branch ? branch.name : id;
};
export const getBranchId = id => {
  const branch = STUDIO_CONFIG.BRANCHES.find(b => b.id === id);
  return branch ? branch.id : id;
};
export const getBranchColor = id => {
  const branch = STUDIO_CONFIG.BRANCHES.find(b => b.id === id);
  return branch?.color || 'var(--text-secondary)';
};
export const getBranchThemeColor = id => {
  const branch = STUDIO_CONFIG.BRANCHES.find(b => b.id === id);
  if (!branch) return 'var(--text-secondary)';
  return branch.color || 'var(--primary-gold)';
};
export const getAllBranches = () => STUDIO_CONFIG.BRANCHES;