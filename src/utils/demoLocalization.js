/**
 * 데모 더미 데이터 현지화 유틸리티
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

const LOCALIZED_BRANCHES = {
    en: { '광흥창점': 'Gwangheungchang', '마포점': 'Mapo' },
    ja: { '광흥창점': '光興倉店', '마포점': '麻浦店' },
    zh: { '광흥창점': '光兴仓店', '마포점': '麻浦店' },
};

const LOCALIZED_CURRENCY = {
    en: { code: 'USD', symbol: '$', rate: 0.00075 },
    ja: { code: 'JPY', symbol: '¥', rate: 0.11 },
    zh: { code: 'CNY', symbol: '¥', rate: 0.0054 },
    es: { code: 'EUR', symbol: '€', rate: 0.00068 },
    fr: { code: 'EUR', symbol: '€', rate: 0.00068 },
    de: { code: 'EUR', symbol: '€', rate: 0.00068 },
    ru: { code: 'RUB', symbol: '₽', rate: 0.07 },
    pt: { code: 'BRL', symbol: 'R$', rate: 0.0037 },
};

const LOCALIZED_PRICING_NAMES = {
    en: { 'MTypeC (Pass)': 'Unlimited Pass', '정규권(3개월)': 'Regular (3 Months)', '쿠폰(10회)': 'Drop-in (10 Class)', '원데이 클래스': 'One-Day Class' },
    ja: { 'MTypeC (Pass)': '通い放題パス', '정규권(3개월)': 'レギュラー(3ヶ月)', '쿠폰(10회)': 'クーポン(10回)', '원데이 클래스': 'ワンデークラス' },
    zh: { 'MTypeC (Pass)': '无限次通票', '정규권(3개월)': '定期通票(3个月)', '쿠폰(10회)': '次卡(10次)', '원데이 클래스': '单次体验课' },
};

const LOCALIZED_INSIGHTS = {
    en: { '근면성실도': 'Diligence', '주간 출석': 'Weekly Check-ins', '수간 출석': 'Weekly Check-ins', '규칙성': 'Regularity', '꾸준함': 'Consistency', '최근 활력': 'Recent Vitality', '호흡해요! 꾸준함이 빛나는 수련자': 'Breathe! A practitioner shining with consistency' },
    ja: { '근면성실도': '勤勉性', '주간 출석': '週間出席', '수간 출석': '週間出席', '규칙성': '規則性', '꾸준함': '着実さ', '최근 활력': '最近の活力', '호흡해요! 꾸준함이 빛나는 수련자': '呼吸して！着実さが輝く修練者' },
    zh: { '근면성실도': '勤奋度', '주간 출석': '每周出勤', '수간 출석': '每周出勤', '규칙성': '规律性', '꾸준함': '坚持度', '최근 활력': '近期活力', '호흡해요! 꾸준함이 빛나는 수련자': '呼吸吧！坚持不懈的练习者' },
};

const nameCache = {};

export function localizeKoreanName(koreanName, lang) {
    if (!koreanName || lang === 'ko') return koreanName;
    const names = LOCALIZED_NAMES[lang] || LOCALIZED_NAMES.en;
    const cacheKey = `${lang}:${koreanName}`;
    if (nameCache[cacheKey]) return nameCache[cacheKey];
    const isKorean = /[\uAC00-\uD7AF]/.test(koreanName);
    if (!isKorean) return koreanName;
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

export function localizeClassName(koreanName, lang) {
    if (!koreanName || lang === 'ko') return koreanName;
    const classMap = LOCALIZED_CLASSES[lang] || LOCALIZED_CLASSES.en;
    return classMap[koreanName] || koreanName;
}

export function localizeBranchName(branchName, lang) {
    if (!branchName || lang === 'ko') return branchName;
    const branchMap = LOCALIZED_BRANCHES[lang] || LOCALIZED_BRANCHES.en;
    return branchMap[branchName] || branchName;
}

export function isDemoEnvironment() {
    if (typeof window === 'undefined') return false;
    return window.location.hostname.includes('passflow') ||
           window.location.hostname.includes('demo') ||
           localStorage.getItem('lastStudioId')?.startsWith('demo') ||
           localStorage.getItem('lastStudioId') === 'passflowai';
}

export function localizeMember(member, lang) {
    if (!member || lang === 'ko' || !isDemoEnvironment()) return member;
    return {
        ...member,
        name: localizeKoreanName(member.name, lang),
        memo: member.memo ? '...' : '',
    };
}

export function localizeMembers(members, lang) {
    if (!members || lang === 'ko' || !isDemoEnvironment()) return members;
    return members.map(m => localizeMember(m, lang));
}

// === NEW PROXY FUNCTIONS ===

export function localizeConfig(config, lang) {
    if (!config || lang === 'ko' || !isDemoEnvironment()) return config;
    const newConfig = JSON.parse(JSON.stringify(config));
    
    // Identity details localization
    const STRINGS = {
        en: { name: 'Lotus Yoga Studio', intro: 'A quiet time to meet my inner self' },
        ja: { name: 'ロータスヨガスタジオ', intro: '自分自身に出会う静かな時間' },
        zh: { name: '莲花瑜伽工作室', intro: '与自己相遇的安静时光' }
    };
    const s = STRINGS[lang] || STRINGS.en;
    if (newConfig.IDENTITY) {
        newConfig.IDENTITY.STUDIO_NAME = s.name;
        newConfig.IDENTITY.ONE_LINE_INTRO = s.intro;
    }
    return newConfig;
}

export function localizeScheduleItem(item, lang) {
    if (!item || lang === 'ko' || !isDemoEnvironment()) return item;
    const modified = { ...item };
    modified.classType = localizeClassName(item.classType, lang);
    if (modified.instructor) {
        modified.instructor = localizeKoreanName(modified.instructor, lang);
    }
    // Remove image if localization makes it weird
    if (modified.imageUrl) {
        modified.imageUrl = null;
    }
    return modified;
}

export function localizeSchedules(schedules, lang) {
    if (!schedules || !Array.isArray(schedules)) return schedules;
    return schedules.map(s => localizeScheduleItem(s, lang));
}

export function localizePricingItem(item, lang) {
    if (!item || lang === 'ko' || !isDemoEnvironment()) return item;
    const modified = { ...item };
    
    const nameMap = LOCALIZED_PRICING_NAMES[lang] || LOCALIZED_PRICING_NAMES.en;
    if (modified.title && nameMap[modified.title]) {
        modified.title = nameMap[modified.title];
    }

    if (modified.imageUrl) {
        modified.imageUrl = null; 
    }

    // Currency Conversion
    const currency = LOCALIZED_CURRENCY[lang] || LOCALIZED_CURRENCY.en;
    if (modified.price && typeof modified.price === 'number') { // original is KRW
        const rawConverted = modified.price * currency.rate;
        // Make nice numbers (e.g., 59.99 for USD)
        if (currency.code === 'JPY') {
            modified.price = Math.round(rawConverted / 100) * 100; // round to 100 yens
            modified.priceFormatted = currency.symbol + modified.price.toLocaleString();
        } else if (currency.code === 'CNY') {
            modified.price = Math.round(rawConverted);
            modified.priceFormatted = currency.symbol + modified.price;
        } else {
            modified.price = Math.floor(rawConverted) + 0.99;
            modified.priceFormatted = currency.symbol + modified.price;
        }
    }
    return modified;
}

export function localizePricings(pricings, lang) {
    if (!pricings || !Array.isArray(pricings)) return pricings;
    return pricings.map(p => localizePricingItem(p, lang));
}

export function localizeInsightObject(insight, lang) {
    if (!insight || lang === 'ko' || !isDemoEnvironment()) return insight;
    // Walk the insight object and replace keys/values
    const newInsight = JSON.parse(JSON.stringify(insight));
    const dict = LOCALIZED_INSIGHTS[lang] || LOCALIZED_INSIGHTS.en;
    
    const translateDeep = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                for (const kr in dict) {
                    if (obj[key].includes(kr)) {
                        obj[key] = obj[key].replace(new RegExp(kr, 'g'), dict[kr]);
                    }
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                translateDeep(obj[key]);
            }
        }
    };
    translateDeep(newInsight);
    return newInsight;
}

export function localizeNoticeItem(item, lang) {
    if (!item || lang === 'ko' || !isDemoEnvironment()) return item;
    const modified = { ...item };
    
    // Replace hardcoded korean strings with language equivalents
    const noticesMap = {
        en: { title: 'Welcome to PassFlow Demo', content: 'Explore the powerful features of our Global SaaS Yoga Studio Management System.' },
        ja: { title: 'PassFlowデモへようこそ', content: 'グローバルSaaSヨガスタジオ管理システムの強力な機能をご覧ください。' },
        zh: { title: '欢迎来到PassFlow演示', content: '探索我们全球SaaS瑜伽工作室管理系统的强大功能。' },
        es: { title: 'Bienvenido al demo de PassFlow', content: 'Explore las poderosas funciones de nuestro sistema.' },
        fr: { title: 'Bienvenue dans la démo PassFlow', content: 'Explorez les puissantes fonctionnalités de notre système.' },
    };
    const s = noticesMap[lang] || noticesMap.en;
    modified.title = s.title || noticesMap.en.title;
    modified.content = s.content || noticesMap.en.content;
    modified.imageUrl = null; // Removed images to prevent awkward korean texts on demo images
    return modified;
}

export function localizeNotices(notices, lang) {
    if (!notices || !Array.isArray(notices)) return notices;
    return notices.map(n => localizeNoticeItem(n, lang));
}

export function localizeInstructorItem(instructor, lang) {
    if (!instructor || lang === 'ko' || !isDemoEnvironment()) return instructor;
    return {
        ...instructor,
        name: localizeKoreanName(instructor.name, lang),
        bio: instructor.bio ? '...' : instructor.bio,
    };
}

export function localizeInstructors(instructors, lang) {
    if (!instructors || !Array.isArray(instructors)) return instructors;
    return instructors.map(i => localizeInstructorItem(i, lang));
}
