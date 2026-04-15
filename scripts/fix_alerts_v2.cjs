/**
 * 남은 confirm/alert 한국어 하드코딩 14건 일괄 교체 (2차)
 */
const fs = require('fs');
const path = require('path');

const fixes = [
    // SuperAdminPage L326
    {
        file: 'src/pages/SuperAdminPage.jsx',
        old: "if (!window.confirm(`정말로 [${studio.name}]을 레지스트리에서 삭제하시겠습니까?\\\\n\\\\n(실제 데이터는 보존됩니다)`)) return;",
        regex: /window\.confirm\(`정말로 \[\$\{studio\.name\}\]을 레지스트리에서 삭제하시겠습니까\?\\n\\n\(실제 데이터는 보존됩니다\)`\)/,
        new: "window.confirm((t('confirm_remove_studio') || `Remove [${studio.name}] from the registry?\\n\\n(Actual data will be preserved)`).replace('{name}', studio.name))",
    },
    // SuperAdminPage L341
    {
        file: 'src/pages/SuperAdminPage.jsx',
        regex: /window\.confirm\(`시작 날짜를 \$\{newDateStr\} 로 변경하시겠습니까\?`\)/,
        new: "window.confirm((t('confirm_change_start_date') || `Change start date to ${newDateStr}?`).replace('{date}', newDateStr))",
    },
    // useScheduleData L121
    {
        file: 'src/hooks/useScheduleData.js',
        regex: /confirm\(`\$\{prevYear\}년 \$\{prevMonth\}월의 스케줄 패턴을 복사하여[^`]*`\)/,
        new: "confirm((t('confirm_copy_schedule') || `Copy schedule from ${prevYear}/${prevMonth} to ${year}/${month}?\\n\\n(Weekend schedules will also be copied.)`).replace('{prevYear}', prevYear).replace('{prevMonth}', prevMonth).replace('{year}', year).replace('{month}', month))",
    },
    // useScheduleData L200
    {
        file: 'src/hooks/useScheduleData.js',
        regex: /window\.confirm\(`해당 날짜\(\$\{selectedDate\}\)의 수업명이나 강사명이 변경되었습니다[^)]*\)/,
        new: "window.confirm((t('confirm_update_past_attendance') || `Class or instructor name has changed for ${selectedDate}.\\n\\nApply this change to existing attendance records?\\n(Member credits and periods will not be affected.)`).replace('{date}', selectedDate))",
    },
    // useScheduleData L219
    {
        file: 'src/hooks/useScheduleData.js',
        regex: /window\.confirm\(`이번 달의 모든[^`]*`\)/,
        new: "window.confirm((t('confirm_bulk_update_day') || `Update all [${targetDayName}] schedules this month (${datesToUpdate.length} days)?`).replace('{day}', targetDayName).replace('{count}', datesToUpdate.length))",
    },
    // useAdminMemberDetail L234
    {
        file: 'src/hooks/useAdminMemberDetail.js',
        regex: /confirm\(`\$\{change\.label\}을\(를\)[^`]*`\)/,
        new: "confirm((t('confirm_field_change') || `Change ${change.label} from \"${change.oldValue}\" to \"${change.newValue}\"?`).replace('{label}', change.label).replace('{old}', change.oldValue).replace('{new}', change.newValue))",
    },
    // ScheduleHelpers L373
    {
        file: 'src/components/ScheduleHelpers.jsx',
        regex: /window\.confirm\(`'\$\{inst\.name\}' 선생님을 삭제하시겠습니까\?`\)/,
        new: "window.confirm((t('confirm_delete_instructor') || `Delete instructor '${inst.name}'?`).replace('{name}', inst.name))",
    },
    // ScheduleHelpers L446
    {
        file: 'src/components/ScheduleHelpers.jsx',
        regex: /window\.confirm\(`'\$\{ct\}' 수업 종류를 삭제하시겠습니까\?`\)/,
        new: "window.confirm((t('confirm_delete_class_type') || `Delete class type '${ct}'?`).replace('{name}', ct))",
    },
    // ScheduleHelpers L528
    {
        file: 'src/components/ScheduleHelpers.jsx',
        regex: /window\.confirm\(`Lv\.\$\{level\}을\(를\) 삭제하시겠습니까\?`\)/,
        new: "window.confirm((t('confirm_delete_level') || `Delete Lv.${level}?`).replace('{level}', level))",
    },
    // InstructorHome L365
    {
        file: 'src/components/instructor/InstructorHome.jsx',
        regex: /confirm\(`\$\{record\.memberName\}님의 안면 인식 데이터를 삭제하시겠습니까[^`]*`\)/,
        new: "confirm((t('confirm_delete_face_data') || `Delete facial recognition data for ${record.memberName}?\\n\\nThey can re-register at the kiosk.`).replace('{name}', record.memberName))",
    },
    // StudioSettingsTab L1098
    {
        file: 'src/components/admin/tabs/StudioSettingsTab.jsx',
        regex: /window\.confirm\(`"\$\{branch\.name\}" 지점을 삭제하시겠습니까[^`]*`\)/,
        new: 'window.confirm((t(\'confirm_delete_branch\') || `Delete branch "${branch.name}"?\\n\\n⚠️ Warning: Attendance, revenue, and schedule records linked to this branch may lose their branch data.\\n\\nThis action cannot be undone.`).replace(\'{name}\', branch.name))',
    },
    // KioskSettingsTab L192
    {
        file: 'src/components/admin/tabs/KioskSettingsTab.jsx',
        regex: /window\.confirm\(`이 \$\{item\.type[^`]*`\)/,
        new: "window.confirm(t('confirm_delete_media') || `Delete this ${item.type === 'video' ? 'video' : 'image'}?`)",
    },
    // BookingsTab L56
    {
        file: 'src/components/admin/tabs/BookingsTab.jsx',
        regex: /window\.confirm\(`\$\{booking\.memberName\}님의 예약을 취소하시겠습니까\?`\)/,
        new: "window.confirm((t('confirm_cancel_booking') || `Cancel booking for ${booking.memberName}?`).replace('{name}', booking.memberName))",
    },
    // BulkMessageModal L82
    {
        file: 'src/components/admin/modals/BulkMessageModal.jsx',
        regex: /confirm\(`\$\{memberCount\}명에게 \$\{modeLabel\} 방식으로 전송하시겠습니까[^`]*`\)/,
        new: "confirm((t('confirm_bulk_send') || `Send to ${memberCount} members via ${modeLabel}?\\nEstimated cost: ${costText}`).replace('{count}', memberCount).replace('{mode}', modeLabel).replace('{cost}', costText))",
    },
];

let totalFixed = 0;
for (const fix of fixes) {
    const filePath = path.join(__dirname, '..', fix.file);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ 파일 없음: ${fix.file}`);
        continue;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (fix.regex && fix.regex.test(content)) {
        content = content.replace(fix.regex, fix.new);
        fs.writeFileSync(filePath, content, 'utf8');
        totalFixed++;
        console.log(`✅ ${fix.file} — 교체 완료`);
    } else {
        console.log(`ℹ️  ${fix.file} — 패턴 미매칭`);
    }
}

console.log(`\n총 ${totalFixed}건 교체 완료 (2차)`);
