// Script to inject MembersTab-specific translation keys
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
let content = fs.readFileSync(filePath, 'utf8');

const keys = {
  ko: `
        // MembersTab revenue & common
        "월 매출 현황": "월 매출 현황",
        "원": "원",
        "현재 매출": "현재 매출",
        "일 경과": "일 경과",
        "잔여": "잔여",
        "일": "일",
        "결제 회원": "결제 회원",
        "최근3개월": "최근3개월",
        "이탈 위험 회원": "이탈 위험 회원",
        "명 감지됨": "명 감지됨",
        "앱 설치 회원": "앱 설치 회원",`,

  en: `
        // MembersTab revenue & common
        "월 매출 현황": " Monthly Revenue",
        "원": "",
        "현재 매출": "Current Revenue",
        "일 경과": " days elapsed",
        "잔여": "Remaining",
        "일": " days",
        "결제 회원": "Paying members",
        "최근3개월": "Last 3 months",
        "이탈 위험 회원": "At-risk members",
        "명 감지됨": " detected",
        "앱 설치 회원": "App installed",`,

  ja: `
        // MembersTab revenue & common
        "월 매출 현황": "月 売上状況",
        "원": "",
        "현재 매출": "現在の売上",
        "일 경과": "日経過",
        "잔여": "残り",
        "일": "日",
        "결제 회원": "決済会員",
        "최근3개월": "直近3ヶ月",
        "이탈 위험 회원": "離脱リスク会員",
        "명 감지됨": "名検出",
        "앱 설치 회원": "アプリインストール",`,

  ru: `
        // MembersTab revenue & common
        "월 매출 현황": " Ежемесячный доход",
        "원": "",
        "현재 매출": "Текущий доход",
        "일 경과": " дней прошло",
        "잔여": "Осталось",
        "일": " дн.",
        "결제 회원": "Платящие",
        "최근3개월": "Последние 3 мес.",
        "이탈 위험 회원": "Участники в зоне риска",
        "명 감지됨": " обнаружено",
        "앱 설치 회원": "Приложение установлено",`,

  zh: `
        // MembersTab revenue & common
        "월 매출 현황": "月营收概况",
        "원": "",
        "현재 매출": "当前营收",
        "일 경과": "天已过",
        "잔여": "剩余",
        "일": "天",
        "결제 회원": "付费会员",
        "최근3개월": "近3个月",
        "이탈 위험 회원": "流失风险会员",
        "명 감지됨": "人检测到",
        "앱 설치 회원": "已安装应用",`,

  es: `
        // MembersTab revenue & common
        "월 매출 현황": " Ingresos mensuales",
        "원": "",
        "현재 매출": "Ingresos actuales",
        "일 경과": " días transcurridos",
        "잔여": "Restante",
        "일": " días",
        "결제 회원": "Miembros de pago",
        "최근3개월": "Últimos 3 meses",
        "이탈 위험 회원": "Miembros en riesgo",
        "명 감지됨": " detectados",
        "앱 설치 회원": "App instalada",`,

  pt: `
        // MembersTab revenue & common
        "월 매출 현황": " Receita mensal",
        "원": "",
        "현재 매출": "Receita atual",
        "일 경과": " dias passados",
        "잔여": "Restante",
        "일": " dias",
        "결제 회원": "Membros pagantes",
        "최근3개월": "Últimos 3 meses",
        "이탈 위험 회원": "Membros em risco",
        "명 감지됨": " detectados",
        "앱 설치 회원": "App instalado",`,

  fr: `
        // MembersTab revenue & common
        "월 매출 현황": " Revenus mensuels",
        "원": "",
        "현재 매출": "Revenus actuels",
        "일 경과": " jours écoulés",
        "잔여": "Restant",
        "일": " jours",
        "결제 회원": "Membres payants",
        "최근3개월": "3 derniers mois",
        "이탈 위험 회원": "Membres à risque",
        "명 감지됨": " détectés",
        "앱 설치 회원": "App installée",`,

  de: `
        // MembersTab revenue & common
        "월 매출 현황": " Monatsumsatz",
        "원": "",
        "현재 매출": "Aktueller Umsatz",
        "일 경과": " Tage vergangen",
        "잔여": "Verbleibend",
        "일": " Tage",
        "결제 회원": "Zahlende Mitglieder",
        "최근3개월": "Letzte 3 Monate",
        "이탈 위험 회원": "Gefährdete Mitglieder",
        "명 감지됨": " erkannt",
        "앱 설치 회원": "App installiert",`,
};

let insertCount = 0;

for (const [lang, keysToInsert] of Object.entries(keys)) {
  const langStart = content.indexOf(`    ${lang}: {`);
  if (langStart === -1) continue;

  const blockEnd = content.indexOf('\n    },', langStart + 10);
  if (blockEnd === -1 && lang === 'de') {
    const deEnd = content.indexOf('\n    }', langStart + 10);
    if (deEnd === -1) continue;
    const blockContent = content.substring(langStart, deEnd);
    if (blockContent.includes('"월 매출 현황"')) continue;
    content = content.slice(0, deEnd) + keysToInsert + content.slice(deEnd);
    console.log(`[OK] ${lang}`);
    insertCount++;
    continue;
  }
  if (blockEnd === -1) continue;

  const blockContent = content.substring(langStart, blockEnd);
  if (blockContent.includes('"월 매출 현황"')) { console.log(`[SKIP] ${lang}`); continue; }

  content = content.slice(0, blockEnd) + keysToInsert + content.slice(blockEnd);
  console.log(`[OK] ${lang}`);
  insertCount++;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\nDone! Inserted into ${insertCount} blocks.`);
