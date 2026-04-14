const fs = require('fs');
const path = require('path');

const koKeys = {
    member_mbti_step1_label: "에너지 방향",
    member_mbti_step1_opt1_title: "외향",
    member_mbti_step1_opt1_desc: "사람들과 어울리며 에너지 충전",
    member_mbti_step1_opt2_title: "내향",
    member_mbti_step1_opt2_desc: "혼자만의 시간으로 에너지 충전",
    member_mbti_step2_label: "인식 기능",
    member_mbti_step2_opt1_title: "감각",
    member_mbti_step2_opt1_desc: "현실적, 구체적 사실 중시",
    member_mbti_step2_opt2_title: "직관",
    member_mbti_step2_opt2_desc: "가능성과 아이디어 중시",
    member_mbti_step3_label: "판단 기능",
    member_mbti_step3_opt1_title: "사고",
    member_mbti_step3_opt1_desc: "논리와 원칙으로 판단",
    member_mbti_step3_opt2_title: "감정",
    member_mbti_step3_opt2_desc: "사람과 관계를 먼저 고려",
    member_mbti_step4_label: "생활 양식",
    member_mbti_step4_opt1_title: "판단",
    member_mbti_step4_opt1_desc: "계획적이고 체계적인 생활",
    member_mbti_step4_opt2_title: "인식",
    member_mbti_step4_opt2_desc: "유연하고 자유로운 생활",
    
    member_health_sync_title: "건강 데이터 연동",
    member_health_sync_on: "Apple/Samsung Health 연결됨",
    member_health_sync_off: "심박수·칼로리 기록 관리",
    
    member_mbti_title: "나의 MBTI",
    member_mbti_badge_desc_set: " — AI 인사말과 맞춤 코칭에 반영돼요",
    member_mbti_badge_desc_unset: "설정하면 나만의 AI 인사말과 코칭을 받아요 ✨",
    member_mbti_btn_complete: " 완료 ✓",
    member_mbti_btn_reselect: "다시 선택",
    
    member_footer_privacy: "개인정보처리방침"
};

const enKeys = {
    member_mbti_step1_label: "Energy Direction",
    member_mbti_step1_opt1_title: "Extraversion",
    member_mbti_step1_opt1_desc: "Recharging through socializing",
    member_mbti_step1_opt2_title: "Introversion",
    member_mbti_step1_opt2_desc: "Recharging through alone time",
    member_mbti_step2_label: "Perception Function",
    member_mbti_step2_opt1_title: "Sensing",
    member_mbti_step2_opt1_desc: "Focus on realistic, concrete facts",
    member_mbti_step2_opt2_title: "Intuition",
    member_mbti_step2_opt2_desc: "Focus on possibilities and ideas",
    member_mbti_step3_label: "Judgment Function",
    member_mbti_step3_opt1_title: "Thinking",
    member_mbti_step3_opt1_desc: "Judging by logic and principles",
    member_mbti_step3_opt2_title: "Feeling",
    member_mbti_step3_opt2_desc: "Considering people and relationships first",
    member_mbti_step4_label: "Lifestyle",
    member_mbti_step4_opt1_title: "Judging",
    member_mbti_step4_opt1_desc: "Planned and systematic life",
    member_mbti_step4_opt2_title: "Perceiving",
    member_mbti_step4_opt2_desc: "Flexible and free life",
    
    member_health_sync_title: "Health Data Sync",
    member_health_sync_on: "Apple/Samsung Health Connected",
    member_health_sync_off: "Manage heart rate & calorie records",
    
    member_mbti_title: "My MBTI",
    member_mbti_badge_desc_set: " — Reflected in AI greetings and custom coaching",
    member_mbti_badge_desc_unset: "Set it to receive your own AI greetings and coaching ✨",
    member_mbti_btn_complete: " Complete ✓",
    member_mbti_btn_reselect: "Reselect",
    
    member_footer_privacy: "Privacy Policy"
};

// 1. Write translations
const transFile = path.join(__dirname, '../src/utils/translations.js');
let transContent = fs.readFileSync(transFile, 'utf8');

if (!transContent.includes('member_mbti_title')) {
    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    for (const lang of langs) {
        const isEn = lang === 'en';
        const sourceKeys = isEn ? enKeys : koKeys;
        let injectStr = '\\n        // =============== MEMBER PROFILE EXTRA UI ===============\\n';
        for (const [k, v] of Object.entries(sourceKeys)) {
             injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }
        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        transContent = transContent.replace(regex, "$1" + injectStr);
    }
    fs.writeFileSync(transFile, transContent);
    console.log('[1] Translations written.');
}

// 2. Wrap MemberProfile.jsx
const pProfilePath = path.join(__dirname, '../src/pages/MemberProfile.jsx');
let content = fs.readFileSync(pProfilePath, 'utf8');

const replacements = [
    { regex: /label: '에너지 방향'/g, replace: "label: t('member_mbti_step1_label') || '에너지 방향'" },
    { regex: /title: '외향'/g, replace: "title: t('member_mbti_step1_opt1_title') || '외향'" },
    { regex: /desc: '사람들과 어울리며 에너지 충전'/g, replace: "desc: t('member_mbti_step1_opt1_desc') || '사람들과 어울리며 에너지 충전'" },
    { regex: /title: '내향'/g, replace: "title: t('member_mbti_step1_opt2_title') || '내향'" },
    { regex: /desc: '혼자만의 시간으로 에너지 충전'/g, replace: "desc: t('member_mbti_step1_opt2_desc') || '혼자만의 시간으로 에너지 충전'" },
    
    { regex: /label: '인식 기능'/g, replace: "label: t('member_mbti_step2_label') || '인식 기능'" },
    { regex: /title: '감각'/g, replace: "title: t('member_mbti_step2_opt1_title') || '감각'" },
    { regex: /desc: '현실적, 구체적 사실 중시'/g, replace: "desc: t('member_mbti_step2_opt1_desc') || '현실적, 구체적 사실 중시'" },
    { regex: /title: '직관'/g, replace: "title: t('member_mbti_step2_opt2_title') || '직관'" },
    { regex: /desc: '가능성과 아이디어 중시'/g, replace: "desc: t('member_mbti_step2_opt2_desc') || '가능성과 아이디어 중시'" },
    
    { regex: /label: '판단 기능'/g, replace: "label: t('member_mbti_step3_label') || '판단 기능'" },
    { regex: /title: '사고'/g, replace: "title: t('member_mbti_step3_opt1_title') || '사고'" },
    { regex: /desc: '논리와 원칙으로 판단'/g, replace: "desc: t('member_mbti_step3_opt1_desc') || '논리와 원칙으로 판단'" },
    { regex: /title: '감정'/g, replace: "title: t('member_mbti_step3_opt2_title') || '감정'" },
    { regex: /desc: '사람과 관계를 먼저 고려'/g, replace: "desc: t('member_mbti_step3_opt2_desc') || '사람과 관계를 먼저 고려'" },
    
    { regex: /label: '생활 양식'/g, replace: "label: t('member_mbti_step4_label') || '생활 양식'" },
    { regex: /title: '판단', desc: '계획적이고 체계적인 생활'/g, replace: "title: t('member_mbti_step4_opt1_title') || '판단', desc: t('member_mbti_step4_opt1_desc') || '계획적이고 체계적인 생활'" },
    { regex: /title: '인식', desc: '유연하고 자유로운 생활'/g, replace: "title: t('member_mbti_step4_opt2_title') || '인식', desc: t('member_mbti_step4_opt2_desc') || '유연하고 자유로운 생활'" },
    
    { regex: />건강 데이터 연동<\/span>/g, replace: ">{t('member_health_sync_title') || '건강 데이터 연동'}</span>" },
    { regex: /'Apple\/Samsung Health 연결됨'/g, replace: "(t('member_health_sync_on') || 'Apple/Samsung Health 연결됨')" },
    { regex: /'심박수·칼로리 기록 관리'/g, replace: "(t('member_health_sync_off') || '심박수·칼로리 기록 관리')" },
    
    { regex: />나의 MBTI<\/span>/g, replace: ">{t('member_mbti_title') || '나의 MBTI'}</span>" },
    { regex: /\`\$\{mbti\} — AI 인사말과 맞춤 코칭에 반영돼요\`/g, replace: "`${mbti}${t('member_mbti_badge_desc_set') || ' — AI 인사말과 맞춤 코칭에 반영돼요'}`" },
    { regex: /'설정하면 나만의 AI 인사말과 코칭을 받아요 ✨'/g, replace: "(t('member_mbti_badge_desc_unset') || '설정하면 나만의 AI 인사말과 코칭을 받아요 ✨')" },
    
    { regex: / 완료 ✓/g, replace: "{t('member_mbti_btn_complete') || ' 완료 ✓'}" },
    { regex: />다시 선택<\/button>/g, replace: ">{t('member_mbti_btn_reselect') || '다시 선택'}</button>" },
    { regex: />개인정보처리방침<\/a>/g, replace: ">{t('member_footer_privacy') || '개인정보처리방침'}</a>" }
];

let matchCount = 0;
for (const r of replacements) {
    const originalContent = content;
    content = content.replace(r.regex, r.replace);
    if (content !== originalContent) {
        matchCount++;
    } else {
        console.log("NOT FOUND REGEX: ", r.regex);
    }
}

fs.writeFileSync(pProfilePath, content);
console.log(`[2] MemberProfile.jsx replaced ${matchCount}/${replacements.length} regexes.`);
