// Script to inject admin translation keys into all language blocks
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'utils', 'translations.js');
let content = fs.readFileSync(filePath, 'utf8');

// Admin header keys for each language
const adminKeys = {
  en: `
        // Admin Header UI
        management: "Management",
        addToHomeScreen: "Add to Home Screen",
        addToHomeShort: "Install",
        collapseAll: "Collapse",
        expandAll: "Expand",
        collapseAllCards: "Collapse All Cards",
        expandAllCards: "Expand All Cards",
        collapseAllCardsDesc: "Collapse all cards to see summaries only.",
        expandAllCardsDesc: "Expand all cards to see full details.",
        aiAnalysisShort: "AI Analysis",
        aiRefreshConfirm: "Refresh AI analysis with latest data? (Takes ~5-10 sec)",
        aiRefreshTitle: "Refresh AI Analysis",
        aiRefreshDesc: "Generate a fresh AI briefing based on the latest synced data.",
        aiRemainingToday: "Remaining today: {count}",
        notificationsOn: "Alerts On",
        notificationsOff: "Alerts Off",
        pushNotificationTitle: "Real-time Push Notifications",
        pushNotificationDesc: "Get instant alerts when members check in or make payments.",
        allBranches: "All",`,

  ja: `
        // Admin Header UI
        management: "管理",
        addToHomeScreen: "ホーム画面に追加",
        addToHomeShort: "追加",
        collapseAll: "全て折りたたむ",
        expandAll: "全て展開",
        collapseAllCards: "全カード折りたたみ",
        expandAllCards: "全カード展開",
        collapseAllCardsDesc: "すべてのカードを折りたたんで概要のみ表示します。",
        expandAllCardsDesc: "すべてのカードを展開して詳細を表示します。",
        aiAnalysisShort: "AI分析",
        aiRefreshConfirm: "最新データでAI分析を再実行しますか？（約5〜10秒）",
        aiRefreshTitle: "AI分析を更新",
        aiRefreshDesc: "同期されたデータに基づいてAIブリーフィングを新たに生成します。",
        aiRemainingToday: "本日残り: {count}回",
        notificationsOn: "通知ON",
        notificationsOff: "通知OFF",
        pushNotificationTitle: "リアルタイムプッシュ通知",
        pushNotificationDesc: "会員がチェックインや決済した際に、デバイスに即座にポップアップ通知を受け取れます。",
        allBranches: "全店舗",`,

  ru: `
        // Admin Header UI
        management: "Управление",
        addToHomeScreen: "Добавить на главный экран",
        addToHomeShort: "Установить",
        collapseAll: "Свернуть",
        expandAll: "Развернуть",
        collapseAllCards: "Свернуть все карточки",
        expandAllCards: "Развернуть все карточки",
        collapseAllCardsDesc: "Свернуть все карточки для просмотра сводки.",
        expandAllCardsDesc: "Развернуть все карточки для просмотра деталей.",
        aiAnalysisShort: "ИИ-анализ",
        aiRefreshConfirm: "Обновить ИИ-анализ последними данными? (~5-10 сек)",
        aiRefreshTitle: "Обновить ИИ-анализ",
        aiRefreshDesc: "Создать новый ИИ-брифинг на основе последних синхронизированных данных.",
        aiRemainingToday: "Осталось сегодня: {count}",
        notificationsOn: "Уведомления вкл.",
        notificationsOff: "Уведомления выкл.",
        pushNotificationTitle: "Push-уведомления в реальном времени",
        pushNotificationDesc: "Получайте мгновенные оповещения при регистрации или оплате участников.",
        allBranches: "Все",`,

  zh: `
        // Admin Header UI
        management: "管理",
        addToHomeScreen: "添加到主屏幕",
        addToHomeShort: "安装",
        collapseAll: "全部收起",
        expandAll: "全部展开",
        collapseAllCards: "收起所有卡片",
        expandAllCards: "展开所有卡片",
        collapseAllCardsDesc: "收起所有卡片，仅显示摘要。",
        expandAllCardsDesc: "展开所有卡片以查看详细信息。",
        aiAnalysisShort: "AI分析",
        aiRefreshConfirm: "用最新数据刷新AI分析？（约5-10秒）",
        aiRefreshTitle: "刷新AI分析",
        aiRefreshDesc: "基于最新同步数据生成新的AI简报。",
        aiRemainingToday: "今日剩余: {count}次",
        notificationsOn: "通知已开启",
        notificationsOff: "通知已关闭",
        pushNotificationTitle: "实时推送通知",
        pushNotificationDesc: "会员签到或支付时，即时在您的设备上收到弹窗通知。",
        allBranches: "全部",`,

  es: `
        // Admin Header UI
        management: "Gestión",
        addToHomeScreen: "Agregar a pantalla de inicio",
        addToHomeShort: "Instalar",
        collapseAll: "Contraer",
        expandAll: "Expandir",
        collapseAllCards: "Contraer todas las tarjetas",
        expandAllCards: "Expandir todas las tarjetas",
        collapseAllCardsDesc: "Contraer todas las tarjetas para ver solo resúmenes.",
        expandAllCardsDesc: "Expandir todas las tarjetas para ver detalles completos.",
        aiAnalysisShort: "Análisis IA",
        aiRefreshConfirm: "Actualizar análisis IA con datos más recientes? (~5-10 seg)",
        aiRefreshTitle: "Actualizar análisis IA",
        aiRefreshDesc: "Generar un nuevo informe IA basado en los últimos datos sincronizados.",
        aiRemainingToday: "Restantes hoy: {count}",
        notificationsOn: "Alertas activadas",
        notificationsOff: "Alertas desactivadas",
        pushNotificationTitle: "Notificaciones push en tiempo real",
        pushNotificationDesc: "Reciba alertas instantáneas cuando los miembros registren asistencia o realicen pagos.",
        allBranches: "Todas",`,

  pt: `
        // Admin Header UI
        management: "Gestão",
        addToHomeScreen: "Adicionar à tela inicial",
        addToHomeShort: "Instalar",
        collapseAll: "Recolher",
        expandAll: "Expandir",
        collapseAllCards: "Recolher todos os cartões",
        expandAllCards: "Expandir todos os cartões",
        collapseAllCardsDesc: "Recolher todos os cartões para ver apenas resumos.",
        expandAllCardsDesc: "Expandir todos os cartões para ver detalhes completos.",
        aiAnalysisShort: "Análise IA",
        aiRefreshConfirm: "Atualizar análise IA com dados mais recentes? (~5-10 seg)",
        aiRefreshTitle: "Atualizar análise IA",
        aiRefreshDesc: "Gerar um novo briefing de IA com base nos dados sincronizados mais recentes.",
        aiRemainingToday: "Restantes hoje: {count}",
        notificationsOn: "Alertas ativados",
        notificationsOff: "Alertas desativados",
        pushNotificationTitle: "Notificações push em tempo real",
        pushNotificationDesc: "Receba alertas instantâneos quando membros fizerem check-in ou pagamentos.",
        allBranches: "Todas",`,

  fr: `
        // Admin Header UI
        management: "Gestion",
        addToHomeScreen: "Ajouter à l'écran d'accueil",
        addToHomeShort: "Installer",
        collapseAll: "Réduire",
        expandAll: "Développer",
        collapseAllCards: "Réduire toutes les cartes",
        expandAllCards: "Développer toutes les cartes",
        collapseAllCardsDesc: "Réduire toutes les cartes pour ne voir que les résumés.",
        expandAllCardsDesc: "Développer toutes les cartes pour voir tous les détails.",
        aiAnalysisShort: "Analyse IA",
        aiRefreshConfirm: "Actualiser l'analyse IA avec les dernières données ? (~5-10 sec)",
        aiRefreshTitle: "Actualiser l'analyse IA",
        aiRefreshDesc: "Générer un nouveau briefing IA basé sur les dernières données synchronisées.",
        aiRemainingToday: "Restant aujourd'hui : {count}",
        notificationsOn: "Alertes activées",
        notificationsOff: "Alertes désactivées",
        pushNotificationTitle: "Notifications push en temps réel",
        pushNotificationDesc: "Recevez des alertes instantanées lorsque les membres s'enregistrent ou effectuent des paiements.",
        allBranches: "Toutes",`,

  de: `
        // Admin Header UI
        management: "Verwaltung",
        addToHomeScreen: "Zum Startbildschirm hinzufügen",
        addToHomeShort: "Installieren",
        collapseAll: "Alle einklappen",
        expandAll: "Alle aufklappen",
        collapseAllCards: "Alle Karten einklappen",
        expandAllCards: "Alle Karten aufklappen",
        collapseAllCardsDesc: "Alle Karten einklappen, um nur Zusammenfassungen zu sehen.",
        expandAllCardsDesc: "Alle Karten aufklappen, um alle Details zu sehen.",
        aiAnalysisShort: "KI-Analyse",
        aiRefreshConfirm: "KI-Analyse mit neuesten Daten aktualisieren? (~5-10 Sek.)",
        aiRefreshTitle: "KI-Analyse aktualisieren",
        aiRefreshDesc: "Erstellen Sie ein neues KI-Briefing basierend auf den neuesten synchronisierten Daten.",
        aiRemainingToday: "Verbleibend heute: {count}",
        notificationsOn: "Benachrichtigungen an",
        notificationsOff: "Benachrichtigungen aus",
        pushNotificationTitle: "Echtzeit-Push-Benachrichtigungen",
        pushNotificationDesc: "Erhalten Sie sofortige Benachrichtigungen, wenn Mitglieder einchecken oder Zahlungen leisten.",
        allBranches: "Alle",`,
};

// Inject keys for each language
// Find the marker (demoPreparing for en, demoPreparing for ja, etc.) and insert after
const langMarkers = {
  en: 'demoPreparing: "Preparing demo site...",',
  ja: 'demoPreparing: "デモ準備中...",',
  ru: 'demoPreparing: "Подготовка демо...",',
  zh: 'demoPreparing: "正在准备演示...",',
  es: 'demoPreparing: "Preparando demo...",',
  pt: 'demoPreparing: "Preparando demo...",',
  fr: 'demoPreparing: "Préparation de la démo...",',
  de: 'demoPreparing: "Demo wird vorbereitet...",',
};

// Check for es/pt/fr/de - they might not have demoPreparing
// Let's check each language's actual last key before },
const checkLangs = ['es', 'pt', 'fr', 'de'];

let insertCount = 0;

for (const [lang, keys] of Object.entries(adminKeys)) {
  const marker = langMarkers[lang];
  
  // First, check if management key already exists in this language block
  // Find the language block
  const langBlockStart = content.indexOf(`    ${lang}: {`);
  if (langBlockStart === -1) {
    console.log(`[SKIP] ${lang}: block not found`);
    continue;
  }
  
  // Find the next closing `    },` after this block start
  const afterStart = content.indexOf('    },', langBlockStart);
  const blockContent = content.substring(langBlockStart, afterStart);
  
  if (blockContent.includes('management:')) {
    console.log(`[SKIP] ${lang}: management key already exists`);
    continue;
  }

  if (marker) {
    const markerIdx = content.indexOf(marker, langBlockStart);
    if (markerIdx !== -1 && markerIdx < afterStart) {
      const insertPos = markerIdx + marker.length;
      content = content.slice(0, insertPos) + keys + content.slice(insertPos);
      console.log(`[OK] ${lang}: inserted after "${marker.substring(0, 30)}..."`);
      insertCount++;
      continue;
    }
  }
  
  // Fallback: insert before the closing `    },` of this language block
  // Find the actual block end for this specific language
  const langBlock2Start = content.indexOf(`    ${lang}: {`);
  if (langBlock2Start === -1) continue;
  
  // Find matching closing braces
  const blockEnd = content.indexOf('\n    },', langBlock2Start + 10);
  if (blockEnd === -1) continue;
  
  // Insert before \n    },
  content = content.slice(0, blockEnd) + keys + content.slice(blockEnd);
  console.log(`[OK] ${lang}: inserted before block end`);
  insertCount++;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\nDone! Inserted admin keys into ${insertCount} language blocks.`);
