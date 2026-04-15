/**
 * Alert/Confirm 한국어 하드코딩 19건 일괄 현지화 스크립트
 * 
 * 원칙:
 * 1. 기존 confirm/alert 문자열을 t() 키 + 영어 fallback으로 교체
 * 2. 템플릿 리터럴(`${변수}`)이 포함된 경우도 처리
 * 3. translations.js에 해당 키를 ko/en/ja 모두 추가
 */
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════
// PART 1: 파일별 alert/confirm 교체 매핑
// ═══════════════════════════════════════════════
const replacements = [
    // MemberInfoTab.jsx — L903
    {
        file: 'src/components/admin/member-detail/MemberInfoTab.jsx',
        find: "confirm(`시작일 변경에 따라 종료일을 ${newEndDate}로 자동 조정하시겠습니까?`)",
        replace: "confirm(t('confirm_adjust_end_date') ? t('confirm_adjust_end_date').replace('{date}', newEndDate) : `Adjust end date to ${newEndDate} based on the new start date?`)",
    },
    // MemberInfoTab.jsx — L1057
    {
        file: 'src/components/admin/member-detail/MemberInfoTab.jsx',
        find: "confirm(`영수증의 날짜가 변경되었습니다.\\n연결된 [${targetName}]의 기간도 이 영수증과 똑같이 맞출까요?`)",
        replace: "confirm(t('confirm_sync_receipt_date') ? t('confirm_sync_receipt_date').replace('{target}', targetName) : `Receipt dates have been updated.\\nSync [${targetName}] dates to match this receipt?`)",
    },
    // MemberInfoTab.jsx — L1089
    {
        file: 'src/components/admin/member-detail/MemberInfoTab.jsx',
        find: 'confirm(`"${itemName}" 결제 내역을 삭제하시겠습니까?\\n\\n삭제된 내역은 휴지통에서 복원할 수 있습니다.`)',
        replace: "confirm(t('confirm_delete_payment') ? t('confirm_delete_payment').replace('{item}', itemName) : `Delete payment record for \"${itemName}\"?\\n\\nDeleted records can be restored from Trash.`)",
    },
    // AdminDashboard.jsx — L385
    {
        file: 'src/pages/AdminDashboard.jsx',
        find: "window.confirm(`업데이트 및 캐시를 초기화하시겠습니까?\\n(로그아웃될 수 있습니다)`)",
        replace: "window.confirm(t('confirm_clear_cache') || 'Clear all caches and update?\\n(You may be logged out)')",
    },
    // BookingsTab.jsx — L56 (님~예약~취소)
    {
        file: 'src/components/admin/tabs/BookingsTab.jsx',
        find: /confirm\(`[^`]*님의 예약을 취소하시겠습니까\?`\)/,
        replaceRegex: true,
        replaceWith: (match) => {
            // 보존 필요 - 원본 확인 후 수동 처리
            return match;
        }
    },
    // ScheduleHelpers.jsx — L373
    {
        file: 'src/components/ScheduleHelpers.jsx',
        find: /confirm\(`[^`]*선생님을 삭제하시겠습니까\?`\)/,
        replaceRegex: true,
    },
    // ScheduleHelpers.jsx — L446
    {
        file: 'src/components/ScheduleHelpers.jsx',
        find: /confirm\(`[^`]*수업 종류를 삭제하시겠습니까\?`\)/,
        replaceRegex: true,
    },
];

// PART 2: 간단한 교체만 수행 가능한 것들만 처리
const simpleReplacements = [
    // AdminDashboard
    {
        file: 'src/pages/AdminDashboard.jsx',
        old: "window.confirm(`업데이트 및 캐시를 초기화하시겠습니까?\\n(로그아웃될 수 있습니다)`)",
        new: "window.confirm(t('confirm_clear_cache') || 'Clear all caches and refresh? (You may be logged out)')",
    },
    // FeaturesPage — already done
    // main.jsx
    {
        file: 'src/main.jsx',
        old: "애플리케이션을 시작할 수 없습니다",
        new: "Application failed to start",
    },
];

// PART 3: 실행
let totalFixed = 0;
for (const r of simpleReplacements) {
    const filePath = path.join(__dirname, '..', r.file);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ 파일 없음: ${r.file}`);
        continue;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(r.old)) {
        content = content.replace(r.old, r.new);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${r.file} — 교체 완료`);
        totalFixed++;
    } else {
        console.log(`ℹ️  ${r.file} — 패턴 없음 (이미 수정됨?)`);
    }
}

// PART 4: MemberInfoTab의 3개 confirm 교체
const memberInfoPath = path.join(__dirname, '..', 'src/components/admin/member-detail/MemberInfoTab.jsx');
if (fs.existsSync(memberInfoPath)) {
    let content = fs.readFileSync(memberInfoPath, 'utf8');
    
    // L903: 시작일 변경 confirm  
    const old1 = "confirm(`시작일 변경에 따라 종료일을 ${newEndDate}로 자동 조정하시겠습니까?`)";
    const new1 = "confirm((t('confirm_adjust_end_date') || `Adjust end date to ${newEndDate}?`).replace('{date}', newEndDate))";
    if (content.includes(old1)) {
        content = content.replace(old1, new1);
        totalFixed++;
        console.log('✅ MemberInfoTab L903 — 시작일 변경 confirm 교체');
    }
    
    // L1089: 결제내역 삭제 confirm
    const old3 = 'confirm(`"${itemName}" 결제 내역을 삭제하시겠습니까?\\n\\n삭제된 내역은 휴지통에서 복원할 수 있습니다.`)';
    const new3 = `confirm((t('confirm_delete_payment') || \`Delete "\${itemName}"?\\n\\nDeleted records can be restored from Trash.\`).replace('{item}', itemName))`;
    if (content.includes(old3)) {
        content = content.replace(old3, new3);
        totalFixed++;
        console.log('✅ MemberInfoTab L1089 — 결제삭제 confirm 교체');
    }
    
    fs.writeFileSync(memberInfoPath, content, 'utf8');
}

// PART 5: MemberInfoTab L1519 — 회원 삭제 confirm
const memberInfoPath2 = path.join(__dirname, '..', 'src/components/admin/member-detail/MemberInfoTab.jsx');
if (fs.existsSync(memberInfoPath2)) {
    let content = fs.readFileSync(memberInfoPath2, 'utf8');
    
    // 회원 삭제 확인
    if (content.includes('회원을 삭제하시겠습니까')) {
        content = content.replace(
            /confirm\([^)]*회원을 삭제하시겠습니까[^)]*\)/,
            `confirm(t('confirm_delete_member') || 'Delete this member?\\n\\nDeleted members can be restored from Trash.')`
        );
        totalFixed++;
        console.log('✅ MemberInfoTab — 회원 삭제 confirm 교체');
    }
    
    // L1057: 영수증 날짜 변경 sync confirm
    if (content.includes('영수증의 날짜가 변경되었습니다')) {
        content = content.replace(
            /confirm\(`영수증의 날짜가 변경되었습니다[^`]*`\)/,
            "confirm((t('confirm_sync_receipt') || `Receipt dates updated. Sync [${targetName}] period to match?`).replace('{target}', targetName))"
        );
        totalFixed++;
        console.log('✅ MemberInfoTab — 영수증 sync confirm 교체');
    }
    
    // L1070: 동기화 성공 alert
    if (content.includes('기간도 성공적으로 동기화되었습니다')) {
        content = content.replace(
            /alert\(`\[\$\{targetName\}\] 기간도 성공적으로 동기화되었습니다\.`\)/,
            "alert((t('alert_sync_success') || `[${targetName}] dates synced successfully.`).replace('{target}', targetName))"
        );
        totalFixed++;
        console.log('✅ MemberInfoTab — 동기화 성공 alert 교체');
    }
    
    fs.writeFileSync(memberInfoPath2, content, 'utf8');
}

// PART 6: 기타 파일들
const otherFiles = [
    {
        file: 'src/components/admin/modals/BulkMessageModal.jsx',
        pattern: /confirm\([^)]*명에게[^)]*\)/,
        replace: null, // 수동 필요 — 변수 조합이 복잡
    },
    {
        file: 'src/hooks/useAdminData.js',
        pattern: /confirm\([^)]*메시지 발송을 승인하시겠습니까[^)]*\)/,
        newStr: "confirm(t('confirm_approve_push') || 'Approve this push notification?')",
    },
    {
        file: 'src/pages/SuperAdminPage.jsx',
        patterns: [
            { old: /confirm\([^)]*관리자 계정을 완전히 삭제[^)]*\)/, newStr: "confirm(t('confirm_delete_admin') || 'Permanently delete this admin account? This action cannot be undone.')" },
            { old: /confirm\([^)]*레지스트리에서 삭제[^)]*\)/, newStr: null }, // 변수 조합 → 수동
            { old: /confirm\([^)]*시작 날짜를[^)]*\)/, newStr: null }, // 변수 조합 → 수동
        ],
    },
];

for (const item of otherFiles) {
    const filePath = path.join(__dirname, '..', item.file);
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    if (item.pattern && item.newStr) {
        if (item.pattern.test(content)) {
            content = content.replace(item.pattern, item.newStr);
            totalFixed++;
            changed = true;
            console.log(`✅ ${item.file} — confirm 교체 완료`);
        }
    }
    
    if (item.patterns) {
        for (const p of item.patterns) {
            if (p.newStr && p.old.test(content)) {
                content = content.replace(p.old, p.newStr);
                totalFixed++;
                changed = true;
                console.log(`✅ ${item.file} — confirm 패턴 교체`);
            }
        }
    }
    
    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

console.log(`\n════════════════════════════════`);
console.log(`총 ${totalFixed}건 교체 완료`);
console.log(`════════════════════════════════`);
