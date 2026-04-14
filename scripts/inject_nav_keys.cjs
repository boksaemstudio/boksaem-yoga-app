// Script to inject AdminNav translation keys into all language blocks
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
let content = fs.readFileSync(filePath, 'utf8');

const navKeys = {
  ko: `
        // Admin Nav Tabs
        navAttendance: "출석",
        navMembers: "회원",
        navRevenue: "매출",
        navSchedule: "시간표",
        navBookings: "예약",
        navNotices: "공지",
        navAlertHistory: "알림기록",
        navKiosk: "키오스크",
        navPricing: "가격표",
        navData: "데이터",
        navTrash: "휴지통",
        navAIAssistant: "AI비서",
        navGuide: "가이드",
        navSettings: "설정",`,

  en: `
        // Admin Nav Tabs
        navAttendance: "Attendance",
        navMembers: "Members",
        navRevenue: "Revenue",
        navSchedule: "Schedule",
        navBookings: "Bookings",
        navNotices: "Notices",
        navAlertHistory: "Alerts",
        navKiosk: "Kiosk",
        navPricing: "Pricing",
        navData: "Data",
        navTrash: "Trash",
        navAIAssistant: "AI Assistant",
        navGuide: "Guide",
        navSettings: "Settings",`,

  ja: `
        // Admin Nav Tabs
        navAttendance: "出席",
        navMembers: "会員",
        navRevenue: "売上",
        navSchedule: "時間割",
        navBookings: "予約",
        navNotices: "お知らせ",
        navAlertHistory: "通知履歴",
        navKiosk: "キオスク",
        navPricing: "料金表",
        navData: "データ",
        navTrash: "ゴミ箱",
        navAIAssistant: "AIアシスタント",
        navGuide: "ガイド",
        navSettings: "設定",`,

  ru: `
        // Admin Nav Tabs
        navAttendance: "Посещения",
        navMembers: "Участники",
        navRevenue: "Доходы",
        navSchedule: "Расписание",
        navBookings: "Бронирование",
        navNotices: "Объявления",
        navAlertHistory: "Уведомления",
        navKiosk: "Киоск",
        navPricing: "Тарифы",
        navData: "Данные",
        navTrash: "Корзина",
        navAIAssistant: "ИИ-помощник",
        navGuide: "Руководство",
        navSettings: "Настройки",`,

  zh: `
        // Admin Nav Tabs
        navAttendance: "签到",
        navMembers: "会员",
        navRevenue: "营收",
        navSchedule: "课程表",
        navBookings: "预约",
        navNotices: "公告",
        navAlertHistory: "通知记录",
        navKiosk: "自助终端",
        navPricing: "价目表",
        navData: "数据",
        navTrash: "回收站",
        navAIAssistant: "AI助手",
        navGuide: "指南",
        navSettings: "设置",`,

  es: `
        // Admin Nav Tabs
        navAttendance: "Asistencia",
        navMembers: "Miembros",
        navRevenue: "Ingresos",
        navSchedule: "Horario",
        navBookings: "Reservas",
        navNotices: "Avisos",
        navAlertHistory: "Historial",
        navKiosk: "Kiosco",
        navPricing: "Tarifas",
        navData: "Datos",
        navTrash: "Papelera",
        navAIAssistant: "Asistente IA",
        navGuide: "Guía",
        navSettings: "Ajustes",`,

  pt: `
        // Admin Nav Tabs
        navAttendance: "Presença",
        navMembers: "Membros",
        navRevenue: "Receita",
        navSchedule: "Horários",
        navBookings: "Reservas",
        navNotices: "Avisos",
        navAlertHistory: "Histórico",
        navKiosk: "Quiosque",
        navPricing: "Preços",
        navData: "Dados",
        navTrash: "Lixeira",
        navAIAssistant: "Assistente IA",
        navGuide: "Guia",
        navSettings: "Config.",`,

  fr: `
        // Admin Nav Tabs
        navAttendance: "Présences",
        navMembers: "Membres",
        navRevenue: "Revenus",
        navSchedule: "Planning",
        navBookings: "Réservations",
        navNotices: "Annonces",
        navAlertHistory: "Historique",
        navKiosk: "Kiosque",
        navPricing: "Tarifs",
        navData: "Données",
        navTrash: "Corbeille",
        navAIAssistant: "Assistant IA",
        navGuide: "Guide",
        navSettings: "Paramètres",`,

  de: `
        // Admin Nav Tabs
        navAttendance: "Anwesenheit",
        navMembers: "Mitglieder",
        navRevenue: "Umsatz",
        navSchedule: "Kursplan",
        navBookings: "Buchungen",
        navNotices: "Mitteilungen",
        navAlertHistory: "Verlauf",
        navKiosk: "Kiosk",
        navPricing: "Preise",
        navData: "Daten",
        navTrash: "Papierkorb",
        navAIAssistant: "KI-Assistent",
        navGuide: "Anleitung",
        navSettings: "Einstellungen",`,
};

let insertCount = 0;

for (const [lang, keys] of Object.entries(navKeys)) {
  // Find the management key we already inserted (as anchor point)
  const anchor = `allBranches:`;
  const langBlockStart = content.indexOf(`    ${lang}: {`);
  if (langBlockStart === -1) {
    // For 'ko', it's at the start
    const koStart = content.indexOf('    ko: {');
    if (lang === 'ko' && koStart !== -1) {
      const anchorIdx = content.indexOf(anchor, koStart);
      if (anchorIdx !== -1) {
        // Find end of that line
        const lineEnd = content.indexOf('\n', anchorIdx);
        if (lineEnd !== -1 && !content.substring(lineEnd, lineEnd + 200).includes('navAttendance')) {
          content = content.slice(0, lineEnd) + keys + content.slice(lineEnd);
          console.log(`[OK] ${lang}: inserted nav keys`);
          insertCount++;
        } else {
          console.log(`[SKIP] ${lang}: navAttendance already exists`);
        }
      }
    } else {
      console.log(`[SKIP] ${lang}: block not found`);
    }
    continue;
  }

  // Check if already inserted
  const blockEnd = content.indexOf('    },', langBlockStart);
  const blockContent = content.substring(langBlockStart, blockEnd);
  if (blockContent.includes('navAttendance')) {
    console.log(`[SKIP] ${lang}: navAttendance already exists`);
    continue;
  }

  // Find the allBranches anchor within this language block
  const anchorIdx = content.indexOf(anchor, langBlockStart);
  if (anchorIdx !== -1 && anchorIdx < blockEnd) {
    const lineEnd = content.indexOf('\n', anchorIdx);
    content = content.slice(0, lineEnd) + keys + content.slice(lineEnd);
    console.log(`[OK] ${lang}: inserted nav keys after allBranches`);
    insertCount++;
  } else {
    // Fallback: insert before closing
    content = content.slice(0, blockEnd) + keys + content.slice(blockEnd);
    console.log(`[OK] ${lang}: inserted nav keys before block end`);
    insertCount++;
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\nDone! Inserted nav keys into ${insertCount} language blocks.`);
