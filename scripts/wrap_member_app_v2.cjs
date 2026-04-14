const fs = require('fs');
const path = require('path');

const miPath = path.join(__dirname, '../src/components/profile/MembershipInfo.jsx');
let content = fs.readFileSync(miPath, 'utf8');

const replacements = [
    { regex: /💠 AI 출석 등록/g, replace: "{t('member_ai_badge') || '💠 AI 출석 등록'}" },
    { regex: /<span style={{ color: '#818CF8', fontWeight: 'bold' }}>AI 출석 안내<\/span>/g, replace: "<span style={{ color: '#818CF8', fontWeight: 'bold' }}>{t('member_ai_notice_title') || 'AI 출석 안내'}</span>" },
    { regex: /회원님의 사진은 <b style={{ color: 'rgba\(255,255,255,0\.85\)' }}>저장되지 않습니다\.<\/b> 얼굴 특징이 128차원 숫자\(벡터\)로 변환되어 안전하게 보관되며, 원본 이미지는 즉시 삭제됩니다\. 숫자 데이터로는 얼굴을 복원할 수 없습니다\./g, replace: "{t('member_ai_notice_desc1') || '회원님의 사진은 '}<b style={{ color: 'rgba(255,255,255,0.85)' }}>{t('member_ai_notice_desc2') || '저장되지 않습니다.'}</b>{t('member_ai_notice_desc3') || ' 얼굴 특징이 128차원 숫자(벡터)로 변환되어 안전하게 보관되며, 원본 이미지는 즉시 삭제됩니다. 숫자 데이터로는 얼굴을 복원할 수 없습니다.'}" },
    
    // Hold Info
    { regex: /\`\$\{holdInfo\.startDate\}부터 정지 중 \(\$\{holdInfo\.elapsed\}일째\)\`/g, replace: "(t('member_hold_admin_elapsed', { start: holdInfo.startDate, elapsed: holdInfo.elapsed }) || `${holdInfo.startDate}부터 정지 중 (${holdInfo.elapsed}일째)`)" },
    { regex: /'첫 출석 시 재시작'/g, replace: "(t('member_hold_admin_auto_release') || '첫 출석 시 재시작')" },

    // Pace
    { regex: /paceStatus = '빠름';/g, replace: "paceStatus = t('member_pace_fast_status') || '빠름';" },
    { regex: /paceMessage = '열심히 하고 계세요! 이 페이스로 꾸준히!';/g, replace: "paceMessage = t('member_pace_fast_msg') || '열심히 하고 계세요! 이 페이스로 꾸준히!';" },
    { regex: /paceStatus = '적절';/g, replace: "paceStatus = t('member_pace_good_status') || '적절';" },
    { regex: /paceMessage = '완벽한 페이스예요! 꾸준함이 건강의 비결!';/g, replace: "paceMessage = t('member_pace_good_msg') || '완벽한 페이스예요! 꾸준함이 건강의 비결!';" },
    { regex: /paceStatus = '조금 느림';/g, replace: "paceStatus = t('member_pace_slow_status') || '조금 느림';" },
    { regex: /paceMessage = '조금 더 분발하면 수강권을 알차게 쓸 수 있어요!';/g, replace: "paceMessage = t('member_pace_slow_msg') || '조금 더 분발하면 수강권을 알차게 쓸 수 있어요!';" },
    { regex: /paceStatus = '느림';/g, replace: "paceStatus = t('member_pace_vslow_status') || '느림';" },
    { regex: /paceMessage = '수련하러 오세요! 남은 기간에 아직 충분히 할 수 있어요!';/g, replace: "paceMessage = t('member_pace_vslow_msg') || '수련하러 오세요! 남은 기간에 아직 충분히 할 수 있어요!';" },
    
    { regex: /<span style={{ fontSize: '0\.85rem', fontWeight: '700', color: 'white' }}>수강 페이스<\/span>/g, replace: "<span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>{t('member_pace_title') || '수강 페이스'}</span>" },
    { regex: /\{attendanceCount\}회 사용 \/ \{totalCredits\}회 중/g, replace: "{t('member_pace_usage', { count: attendanceCount, total: totalCredits }) || `${attendanceCount}회 사용 / ${totalCredits}회 중`}" },
    
    { regex: /수강 \{usageRatio\}%/g, replace: "{t('member_pace_used', { ratio: usageRatio }) || `수강 ${usageRatio}%`}" },
    { regex: /기간 \{timeRatio\}%/g, replace: "{t('member_pace_period', { ratio: timeRatio }) || `기간 ${timeRatio}%`}" },
    { regex: /잔여 \{remainingCredits\}회/g, replace: "{t('member_pace_remaining', { count: remainingCredits }) || `잔여 ${remainingCredits}회`}" },

    // Diligence
    { regex: /'완벽한 근면성실! 당신은 요가 마스터 🧘';/g, replace: "t('member_diligence_s') || '완벽한 근면성실! 당신은 요가 마스터 🧘';" },
    { regex: /'훌륭해요! 꾸준함이 빛나는 수련자';/g, replace: "t('member_diligence_a') || '훌륭해요! 꾸준함이 빛나는 수련자';" },
    { regex: /'좋은 페이스! 조금만 더 규칙적으로';/g, replace: "t('member_diligence_b') || '좋은 페이스! 조금만 더 규칙적으로';" },
    { regex: /'가능성이 있어요! 습관을 만들어보세요';/g, replace: "t('member_diligence_c') || '가능성이 있어요! 습관을 만들어보세요';" },
    { regex: /'다시 시작해봐요! 작은 한 걸음부터';/g, replace: "t('member_diligence_d') || '다시 시작해봐요! 작은 한 걸음부터';" },

    { regex: /label: '주간 출석'/g, replace: "label: t('member_diligence_ind_week') || '주간 출석'" },
    { regex: /label: '규칙성'/g, replace: "label: t('member_diligence_ind_reg') || '규칙성'" },
    { regex: /label: '꾸준함'/g, replace: "label: t('member_diligence_ind_cons') || '꾸준함'" },
    { regex: /label: '최근 활력'/g, replace: "label: t('member_diligence_ind_vit') || '최근 활력'" },

    { regex: /\`주 \$\{weeklyAvg\.toFixed\(1\)\}회\`/g, replace: "(t('member_diligence_ind_week_desc', { avg: weeklyAvg.toFixed(1) }) || `주 ${weeklyAvg.toFixed(1)}회`)" },
    { regex: /'매우 규칙적'/g, replace: "(t('member_diligence_ind_reg_vgood') || '매우 규칙적')" },
    { regex: /'규칙적'/g, replace: "(t('member_diligence_ind_reg_good') || '규칙적')" },
    { regex: /'불규칙'/g, replace: "(t('member_diligence_ind_reg_bad') || '불규칙')" },
    { regex: /\`최근 4주 중 \$\{recentWeeks\.reduce\(\(a, b\) => a \+ b, 0\)\}주 출석\`/g, replace: "(t('member_diligence_ind_cons_desc', { count: recentWeeks.reduce((a, b) => a + b, 0) }) || `최근 4주 중 ${recentWeeks.reduce((a, b) => a + b, 0)}주 출석`)" },
    { regex: /\`최근 2주 \$\{recentCount\}회\`/g, replace: "(t('member_diligence_ind_vit_desc', { count: recentCount }) || `최근 2주 ${recentCount}회`)" },

    { regex: /<span style={{ fontSize: '0\.85rem', fontWeight: '700', color: 'white' }}>근면성실도<\/span>/g, replace: "<span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>{t('member_diligence_title') || '근면성실도'}</span>" },
    { regex: /\{totalScore\}점 \/ 100/g, replace: "{t('member_diligence_score', { score: totalScore }) || `${totalScore}점 / 100`}" }
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

fs.writeFileSync(miPath, content);
console.log(`[2] MembershipInfo.jsx replaced ${matchCount}/${replacements.length} regexes.`);
