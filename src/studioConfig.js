// Yoga Studio Configuration
// 이 파일은 각 요가원마다 달라지는 설정값들을 모아둔 곳입니다.
// 다른 요가원에 적용할 때는 이 파일의 내용만 수정하면 됩니다.

export const STUDIO_CONFIG = {
    // 1. 기본 정보
    NAME: "복샘요가",
    NAME_ENGLISH: "복샘요가",
    LOGO_TEXT: "BOKSAEM",

    // 2. 지점 설정 (ID는 영어, NAME은 한글 표시용)
    // ID는 데이터베이스 저장용 키로 사용되므로 변경 시 주의가 필요합니다.
    BRANCHES: [
        { id: 'gwangheungchang', name: '광흥창점', color: 'var(--primary-gold)' },
        { id: 'mapo', name: '마포점', color: 'var(--text-secondary)' },
        // 새로운 지점 추가 예시:
        // { id: 'gangnam', name: '강남점' }
    ],

    // [New] Branch Constants for Code Usage
    BRANCH_IDS: {
        GWANGHEUNGCHANG: 'gwangheungchang',
        MAPO: 'mapo'
    },

    // 3. 브랜딩 및 테마 (기본값)
    THEME: {
        PRIMARY_COLOR: "#D4AF37", // Gold
        ACCENT_COLOR: "#FF6B6B",  // Coral
    },

    // [New] 기능 활성화 제어
    FEATURES: {
        ENABLE_DATA_MIGRATION: true // 출시 전 마지막 마이그레이션 완료 후 false로 변경하면 관리자 탭에서 사라집니다.
    },

    // 4. 소셜 미디어 링크
    SOCIAL: {
        Instagram_Gwangheungchang: "https://www.instagram.com/boksaemyoga_ghc",
        Instagram_Mapo: "https://www.instagram.com/reel/DTT2iORE7th/?utm_source=ig_web_copy_link",
        Youtube: "https://www.youtube.com/@boksaemyoga_ghc",
        Blog: "https://blog.naver.com/boksaemyoga"
    },

    // 5. 기본 스케줄 템플릿 (초기 세팅용)
    DEFAULT_SCHEDULE_TEMPLATE: {
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
                    label: 'TTC 6개월 과정',
                    basePrice: 3520000,
                    cashPrice: 3200000,
                    credits: 9999,
                    months: 6,
                    type: 'ticket',
                    isCourse: true
                }
            ]
        }
    }
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

export const getAllBranches = () => STUDIO_CONFIG.BRANCHES;
