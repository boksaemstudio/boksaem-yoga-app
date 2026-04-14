// Script to inject LogsTab-specific translation keys
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
let content = fs.readFileSync(filePath, 'utf8');

const keys = {
  ko: `
        // LogsTab
        noAttendanceRecords: "출석 기록이 없습니다.",
        todayActivityLog: "오늘 활동 로그",
        activityLog: "활동 로그",
        attendance: "출석",`,

  en: `
        // LogsTab
        noAttendanceRecords: "No attendance records found.",
        todayActivityLog: "Today's Activity Log",
        activityLog: "Activity Log",
        attendance: "Attendance",`,

  ja: `
        // LogsTab
        noAttendanceRecords: "出席記録がありません。",
        todayActivityLog: "本日のアクティビティログ",
        activityLog: "アクティビティログ",
        attendance: "出席",`,

  ru: `
        // LogsTab
        noAttendanceRecords: "Записи о посещении не найдены.",
        todayActivityLog: "Журнал активности за сегодня",
        activityLog: "Журнал активности",
        attendance: "Посещение",`,

  zh: `
        // LogsTab
        noAttendanceRecords: "没有签到记录。",
        todayActivityLog: "今日活动日志",
        activityLog: "活动日志",
        attendance: "签到",`,

  es: `
        // LogsTab
        noAttendanceRecords: "No se encontraron registros de asistencia.",
        todayActivityLog: "Registro de actividad de hoy",
        activityLog: "Registro de actividad",
        attendance: "Asistencia",`,

  pt: `
        // LogsTab
        noAttendanceRecords: "Nenhum registro de presença encontrado.",
        todayActivityLog: "Log de atividade de hoje",
        activityLog: "Log de atividade",
        attendance: "Presença",`,

  fr: `
        // LogsTab
        noAttendanceRecords: "Aucun enregistrement de présence trouvé.",
        todayActivityLog: "Journal d'activité d'aujourd'hui",
        activityLog: "Journal d'activité",
        attendance: "Présence",`,

  de: `
        // LogsTab
        noAttendanceRecords: "Keine Anwesenheitseinträge gefunden.",
        todayActivityLog: "Heutiges Aktivitätsprotokoll",
        activityLog: "Aktivitätsprotokoll",
        attendance: "Anwesenheit",`,
};

let insertCount = 0;

for (const [lang, keysToInsert] of Object.entries(keys)) {
  const langStart = content.indexOf(`    ${lang}: {`);
  if (langStart === -1) continue;

  const blockEnd = content.indexOf('\n    },', langStart + 10);
  if (blockEnd === -1 && lang === 'de') {
    // de is the last block, has \n    } instead of \n    },
    const deEnd = content.indexOf('\n    }', langStart + 10);
    if (deEnd === -1) { console.log(`[SKIP] ${lang}: block end not found`); continue; }
    const blockContent = content.substring(langStart, deEnd);
    if (blockContent.includes('noAttendanceRecords')) { console.log(`[SKIP] ${lang}: already exists`); continue; }
    content = content.slice(0, deEnd) + keysToInsert + content.slice(deEnd);
    console.log(`[OK] ${lang}: inserted LogsTab keys`);
    insertCount++;
    continue;
  }
  if (blockEnd === -1) { console.log(`[SKIP] ${lang}: block end not found`); continue; }

  const blockContent = content.substring(langStart, blockEnd);
  if (blockContent.includes('noAttendanceRecords')) { console.log(`[SKIP] ${lang}: already exists`); continue; }

  content = content.slice(0, blockEnd) + keysToInsert + content.slice(blockEnd);
  console.log(`[OK] ${lang}: inserted LogsTab keys`);
  insertCount++;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\nDone! Inserted LogsTab keys into ${insertCount} language blocks.`);
