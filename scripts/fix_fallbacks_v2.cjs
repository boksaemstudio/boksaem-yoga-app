/**
 * LandingPage + diligence.js + AdminDashboard의 한국어 fallback → 영어 교체
 */
const fs = require('fs');
const path = require('path');

let totalFixed = 0;

// ═══ LandingPage ═══
const lpPath = path.join(__dirname, '..', 'src/pages/LandingPage.jsx');
let lp = fs.readFileSync(lpPath, 'utf8');

const lpFixes = [
    ["|| '세계 1등 비전 AI 안면인식 시스템'", "|| 'World\\'s #1 Vision AI Facial Recognition'"],
    [/\|\| '체육시설 무인화의 궁극적 완성,[^']*'/g, "|| 'The Ultimate Unmanned Studio Solution,<br /><span class=\"text-gold\">Powered by PassFlow AI.</span>'"],
    [/\|\| '안면인식 출석부터 다지점 회원 통합 관리[^']*'/g, "|| 'From facial recognition check-in to multi-location member management, class scheduling, and automated payroll. The only platform built exclusively for fitness, yoga, and pilates studios.'"],
    ["|| '관리/회원 앱 체험하기'", "|| 'Try the Live Demo'"],
    ["|| '도입 상담'", "|| 'Get Started'"],
    [/\|\| '최신 기술로 차별화된[^']*'/g, "|| 'Built Different with<br /><span class=\"text-gold\">Cutting-Edge Technology</span>'"],
    ["|| 'AI 안면인식 출석 자동화'", "|| 'AI Facial Recognition Check-in'"],
    [/\|\| '하나의 카메라만 있으면 회원의 얼굴을 0.2초[^']*'/g, "|| 'A single camera identifies and checks in members in 0.2 seconds — no extra hardware or apps needed. That\\'s the power of Edge AI.'"],
    ["|| '클래스 다지점 통합 관리'", "|| 'Multi-Location Class Management'"],
    [/\|\| '해외에도 미션과 메소드에 맞는 스튜디오[^']*'/g, "|| 'Manage mission-aligned studios worldwide. Unified scheduling, cross-location memberships, and centralized branch analytics — all from one dashboard.'"],
    ["|| '급여 관리 & 매출 자동화'", "|| 'Payroll & Revenue Automation'"],
    [/\|\| '강사 관리는 늘어나고 급여 마감은 쫓겨오고[^']*'/g, "|| 'Instructor management growing complex? Payroll deadlines closing in? Attendance-based auto-calculation and one-click settlement — focus on teaching, not spreadsheets.'"],
];

for (const [old, newVal] of lpFixes) {
    if (old instanceof RegExp) {
        if (old.test(lp)) {
            lp = lp.replace(old, newVal);
            totalFixed++;
        }
    } else if (lp.includes(old)) {
        lp = lp.replace(old, newVal);
        totalFixed++;
    }
}

fs.writeFileSync(lpPath, lp, 'utf8');
console.log(`✅ LandingPage — ${totalFixed}건 fallback 교체`);

// ═══ AdminDashboard "선생님" fallback ═══
const adPath = path.join(__dirname, '..', 'src/pages/AdminDashboard.jsx');
if (fs.existsSync(adPath)) {
    let ad = fs.readFileSync(adPath, 'utf8');
    if (ad.includes('|| "선생님"')) {
        ad = ad.replace(/\|\| "선생님"/g, '|| ""');
        fs.writeFileSync(adPath, ad, 'utf8');
        totalFixed++;
        console.log('✅ AdminDashboard — "선생님" fallback 교체');
    }
}

// ═══ diligence.js (출석 격려 메시지 — 핵심 현지화) ═══
const dilPath = path.join(__dirname, '..', 'src/utils/diligence.js');
if (fs.existsSync(dilPath)) {
    let dil = fs.readFileSync(dilPath, 'utf8');
    const dilFixes = [
        ['`${streak}일 연속 수련! 엄청난 에너지입니다!`', '`${streak} days in a row! Incredible dedication!`'],
        ['`이번 주 벌써 ${thisWeekCount}회! 뜨거운 열정입니다.`', "`${thisWeekCount} sessions this week! You're on fire!`"],
        ['"꾸준함이 돋보이는 수련 흐름입니다."', '"Your consistency really shows. Keep up the great work!"'],
        ['`${period}개월째 규칙적 수련 중! 끈기의 아이콘이세요.`', '`${period} months of regular practice! A paragon of perseverance.`'],
        ['"첫 발을 내디딘 자체가 이미 위대한 시작입니다."', '"Taking the first step is already great — welcome!"'],
        ['"최근 수련이 줄었지만, 다시 돌아올 힘이 있으실 겁니다."', `"Your practice has slowed down lately, but we know you'll be back stronger."`],
        ['"잠시 쉬고 계시네요. 스튜디오가 기다리고 있어요."', `"Taking a break? Your studio is here whenever you're ready."`],
        ['"매우 규칙적"', '"Highly Regular"'],
        ['"보통"', '"Average"'],
        ['"불규칙"', '"Irregular"'],
        ['"휴면"', '"Dormant"'],
        ['"기록 부족"', '"Insufficient Data"'],
    ];
    let fixCount = 0;
    for (const [old, newVal] of dilFixes) {
        if (dil.includes(old)) {
            dil = dil.replace(old, newVal);
            fixCount++;
        }
    }
    if (fixCount > 0) {
        fs.writeFileSync(dilPath, dil, 'utf8');
        console.log(`✅ diligence.js — ${fixCount}건 fallback 교체`);
        totalFixed += fixCount;
    }
}

// ═══ security.js fallback ═══
const secPath = path.join(__dirname, '..', 'src/init/security.js');
if (fs.existsSync(secPath)) {
    let sec = fs.readFileSync(secPath, 'utf8');
    const secFixes = [
        ['"마이그레이션"', '"migration"'],
        ['"삭제"', '"delete"'],
        ['"확인"', '"confirm"'],
    ];
    let fixCount = 0;
    for (const [old, newVal] of secFixes) {
        if (sec.includes(old)) {
            sec = sec.replace(old, newVal);
            fixCount++;
        }
    }
    if (fixCount > 0) {
        fs.writeFileSync(secPath, sec, 'utf8');
        console.log(`✅ security.js — ${fixCount}건 fallback 교체`);
        totalFixed += fixCount;
    }
}

// ═══ useMemberProfile fallback ═══
const umpPath = path.join(__dirname, '..', 'src/hooks/useMemberProfile.js');
if (fs.existsSync(umpPath)) {
    let ump = fs.readFileSync(umpPath, 'utf8');
    if (ump.includes('"매우 규칙적"')) {
        ump = ump.replace('"매우 규칙적"', '"Highly Regular"');
        fs.writeFileSync(umpPath, ump, 'utf8');
        console.log('✅ useMemberProfile — fallback 교체');
        totalFixed++;
    }
}

console.log(`\n총 ${totalFixed}건 fallback 교체 완료`);
