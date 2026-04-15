/**
 * 데모 더미 데이터 현지화 유틸리티
 * 
 * 데모 모드에서 회원 이름, 클래스명 등을 현재 선택된 언어에 맞춰
 * 현지화된 가상 데이터로 표시합니다.
 * 
 * 실제 Firestore 데이터는 건드리지 않고, 프론트엔드 표시만 변환합니다.
 */

/**
 * 언어별 현지화된 데모 회원 이름 풀
 * 미국/영어: 일반적인 미국 이름
 * 일본어: 일반적인 일본 이름
 * 한국어: 원본 그대로
 * 중국어: 일반적인 중국 이름
 */
const LOCALIZED_NAMES = {
    en: [
        'Emma Johnson', 'Sophia Williams', 'Olivia Brown', 'Ava Davis',
        'Isabella Wilson', 'Mia Anderson', 'Charlotte Thomas', 'Amelia Taylor',
        'Harper Martinez', 'Evelyn Robinson', 'Luna Clark', 'Camila Lewis',
        'Gianna Walker', 'Elizabeth Hall', 'Eleanor Allen', 'Abigail Young',
        'Sofia King', 'Avery Wright', 'Scarlett Hill', 'Emily Scott',
        'Aria Green', 'Penelope Adams', 'Chloe Baker', 'Layla Nelson',
        'Riley Carter', 'Zoey Mitchell', 'Nora Roberts', 'Lily Collins',
        'Grace Stewart', 'Hannah Morgan', 'Stella Cooper', 'Violet Reed',
        'Aurora Cox', 'Savannah Ward', 'Brooklyn Bailey', 'Bella Rivera',
        'Claire Sullivan', 'Skylar Russell', 'Lucy Griffin', 'Paisley Hayes',
    ],
    ja: [
        '山田 花子', '佐藤 美咲', '鈴木 陽子', '田中 真理',
        '高橋 千尋', '伊藤 さくら', '渡辺 結衣', '中村 愛',
        '小林 理恵', '加藤 優子', '吉田 美紀', '山口 智子',
        '松本 恵子', '井上 麻衣', '木村 綾', '石井 瞳',
        '前田 由美', '藤田 奈々', '後藤 翔子', '岡田 真由美',
        '長谷川 舞', '近藤 千春', '村上 亜希', '遠藤 涼子',
        '青木 香織', '坂本 明美', '斎藤 裕子', '福田 桃子',
        '太田 彩花', '三浦 詩織', '森 由紀子', '池田 菜々子',
        '橋本 茜', '阿部 礼子', '石田 美穂', '山崎 春香',
        '中島 友美', '横山 直美', '宮崎 絵里', '西村 久美子',
    ],
    zh: [
        '王芳', '李娜', '张伟', '刘洋', '陈静', '杨丽',
        '赵敏', '黄蕾', '周婷', '吴秀英', '徐佳', '孙悦',
        '胡雪', '朱玲', '高晓', '林清', '何梅', '郭芳',
        '马丽', '罗琴', '梁洁', '宋雅', '郑琳', '谢颖',
        '韩丹', '唐薇', '冯蓓', '许萌', '邓慧', '曹岚',
        '彭晶', '曾欢', '萧静', '田园', '董雪', '潘美',
        '蒋芸', '蔡莉', '余霞', '杜鹃',
    ],
};

/**
 * 언어별 클래스명 매핑
 */
const LOCALIZED_CLASSES = {
    en: {
        '하타': 'Hatha', '아쉬탕가': 'Ashtanga', '마이솔': 'Mysore',
        '빈야사': 'Vinyasa', '힐링': 'Healing', '인요가': 'Yin Yoga',
        '인양요가': 'Yin Yang', '플라잉': 'Aerial', '로우플라잉': 'Low Aerial',
        '키즈플라잉': 'Kids Aerial', '임신부요가': 'Prenatal',
        '하타 인텐시브': 'Hatha Intensive', '심화': 'Advanced',
        '일반': 'General', '자율수련': 'Self Practice',
        '지도자과정': 'Teacher Training',
    },
    ja: {
        '하타': 'ハタ', '아쉬탕가': 'アシュタンガ', '마이솔': 'マイソール',
        '빈야사': 'ヴィンヤサ', '힐링': 'ヒーリング', '인요가': '陰ヨガ',
        '인양요가': '陰陽ヨガ', '플라잉': 'エアリアル', '로우플라잉': 'ローエアリアル',
        '키즈플라잉': 'キッズエアリアル', '임신부요가': 'マタニティ',
        '하타 인텐시브': 'ハタインテンシブ', '심화': 'アドバンス',
        '일반': '一般', '자율수련': '自主練習',
        '지도자과정': '指導者コース',
    },
    zh: {
        '하타': '哈他', '아쉬탕가': '阿斯汤加', '마이솔': '迈索尔',
        '빈야사': '流瑜伽', '힐링': '疗愈', '인요가': '阴瑜伽',
        '인양요가': '阴阳瑜伽', '플라잉': '空中瑜伽', '로우플라잉': '低空瑜伽',
        '키즈플라잉': '儿童空中', '임신부요가': '孕妇瑜伽',
        '하타 인텐시브': '哈他强化', '심화': '进阶',
        '일반': '普通', '자율수련': '自主练习',
        '지도자과정': '教师培训',
    },
};

/**
 * 언어별 지점명 매핑
 */
const LOCALIZED_BRANCHES = {
    en: {
        '광흥창점': 'Gwangheungchang',
        '마포점': 'Mapo',
        'gwangheungchang': 'Gwangheungchang',
        'mapo': 'Mapo',
    },
    ja: {
        '광흥창점': '光興倉店',
        '마포점': '麻浦店',
        'gwangheungchang': '光興倉店',
        'mapo': '麻浦店',
    },
    zh: {
        '광흥창점': '光兴仓店',
        '마포점': '麻浦店',
        'gwangheungchang': '光兴仓店',
        'mapo': '麻浦店',
    },
};

/**
 * 한국어 이름을 현지화된 이름으로 일관되게 매핑
 * 같은 한국어 이름은 항상 같은 현지 이름으로 변환됩니다.
 */
const nameCache = {};

export function localizeKoreanName(koreanName, lang) {
    if (!koreanName || lang === 'ko') return koreanName;
    
    const names = LOCALIZED_NAMES[lang] || LOCALIZED_NAMES.en;
    const cacheKey = `${lang}:${koreanName}`;
    
    if (nameCache[cacheKey]) return nameCache[cacheKey];
    
    // 한국어 이름인지 확인
    const isKorean = /[\uAC00-\uD7AF]/.test(koreanName);
    if (!isKorean) return koreanName;
    
    // 해시 함수로 일관된 인덱스 생성 (같은 이름 → 같은 결과)
    let hash = 0;
    for (let i = 0; i < koreanName.length; i++) {
        hash = ((hash << 5) - hash) + koreanName.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % names.length;
    
    const localizedName = names[index];
    nameCache[cacheKey] = localizedName;
    return localizedName;
}

/**
 * 한국어 클래스명을 현지화된 버전으로 변환
 */
export function localizeClassName(koreanName, lang) {
    if (!koreanName || lang === 'ko') return koreanName;
    
    const classMap = LOCALIZED_CLASSES[lang] || LOCALIZED_CLASSES.en;
    return classMap[koreanName] || koreanName;
}

/**
 * 한국어 지점명을 현지화된 버전으로 변환
 */
export function localizeBranchName(branchName, lang) {
    if (!branchName || lang === 'ko') return branchName;
    
    const branchMap = LOCALIZED_BRANCHES[lang] || LOCALIZED_BRANCHES.en;
    return branchMap[branchName] || branchName;
}

/**
 * 데모 모드인지 확인하는 유틸리티
 */
export function isDemoEnvironment() {
    if (typeof window === 'undefined') return false;
    return window.location.hostname.includes('passflow') ||
           window.location.hostname.includes('demo') ||
           localStorage.getItem('lastStudioId')?.startsWith('demo');
}

/**
 * 회원 객체의 이름을 현지화 (데모 모드에서만 동작)
 * 원본 객체를 변경하지 않고 새 객체를 반환합니다.
 */
export function localizeMember(member, lang) {
    if (!member || lang === 'ko' || !isDemoEnvironment()) return member;
    
    return {
        ...member,
        name: localizeKoreanName(member.name, lang),
        // 메모 등 한국어 텍스트도 숨김 처리
        memo: member.memo ? '...' : '',
    };
}

/**
 * 회원 배열을 일괄 현지화
 */
export function localizeMembers(members, lang) {
    if (!members || lang === 'ko' || !isDemoEnvironment()) return members;
    return members.map(m => localizeMember(m, lang));
}
