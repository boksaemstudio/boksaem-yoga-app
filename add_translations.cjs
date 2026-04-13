const fs = require('fs');
let content = fs.readFileSync('src/utils/translations.js', 'utf8');

// New translation keys to add to each language
const newKeys = {
    ko: `
        settingUp: "설정 중...",
        healthDataSync: "건강 데이터 연동",
        healthConnected: "Apple/Samsung Health 연결됨",
        healthDescription: "심박수·칼로리 기록 관리",
        myMBTI: "나의 MBTI",
        mbtiApplied: "AI 인사말과 맞춤 코칭에 반영돼요",
        mbtiPrompt: "설정하면 나만의 AI 인사말과 코칭을 받아요 ✨",
        complete: "완료",
        reselect: "다시 선택",
        privacyPolicy: "개인정보처리방침",`,
    en: `
        settingUp: "Setting up...",
        healthDataSync: "Health Data Sync",
        healthConnected: "Apple/Samsung Health Connected",
        healthDescription: "Heart rate & calorie tracking",
        myMBTI: "My MBTI",
        mbtiApplied: "Applied to AI greeting & coaching",
        mbtiPrompt: "Set your MBTI for personalized AI greetings ✨",
        complete: "Done",
        reselect: "Reselect",
        privacyPolicy: "Privacy Policy",`,
    ja: `
        settingUp: "設定中...",
        healthDataSync: "ヘルスデータ連携",
        healthConnected: "Apple/Samsung Health 接続済み",
        healthDescription: "心拍数・カロリー記録管理",
        myMBTI: "マイMBTI",
        mbtiApplied: "AI挨拶とコーチングに反映されます",
        mbtiPrompt: "設定するとAIが個別の挨拶とコーチングを提供します ✨",
        complete: "完了",
        reselect: "やり直す",
        privacyPolicy: "プライバシーポリシー",`,
    ru: `
        settingUp: "Настройка...",
        healthDataSync: "Синхронизация данных",
        healthConnected: "Apple/Samsung Health подключено",
        healthDescription: "Пульс и калории",
        myMBTI: "Мой MBTI",
        mbtiApplied: "Применяется в AI-приветствии",
        mbtiPrompt: "Настройте для персонального AI ✨",
        complete: "Готово",
        reselect: "Выбрать снова",
        privacyPolicy: "Политика конфиденциальности",`,
    zh: `
        settingUp: "设置中...",
        healthDataSync: "健康数据同步",
        healthConnected: "Apple/Samsung Health 已连接",
        healthDescription: "心率和卡路里记录",
        myMBTI: "我的MBTI",
        mbtiApplied: "已应用于AI问候和指导",
        mbtiPrompt: "设置后获得个性化AI问候 ✨",
        complete: "完成",
        reselect: "重新选择",
        privacyPolicy: "隐私政策",`,
    es: `
        settingUp: "Configurando...",
        healthDataSync: "Datos de salud",
        healthConnected: "Apple/Samsung Health conectado",
        healthDescription: "Ritmo cardíaco y calorías",
        myMBTI: "Mi MBTI",
        mbtiApplied: "Aplicado al saludo de IA",
        mbtiPrompt: "Configura para saludos personalizados ✨",
        complete: "Hecho",
        reselect: "Reelegir",
        privacyPolicy: "Política de privacidad",`,
    pt: `
        settingUp: "Configurando...",
        healthDataSync: "Dados de saúde",
        healthConnected: "Apple/Samsung Health conectado",
        healthDescription: "Frequência cardíaca e calorias",
        myMBTI: "Meu MBTI",
        mbtiApplied: "Aplicado à saudação da IA",
        mbtiPrompt: "Configure para saudações personalizadas ✨",
        complete: "Pronto",
        reselect: "Reescolher",
        privacyPolicy: "Política de privacidade",`,
    fr: `
        settingUp: "Configuration...",
        healthDataSync: "Données de santé",
        healthConnected: "Apple/Samsung Health connecté",
        healthDescription: "Fréquence cardiaque et calories",
        myMBTI: "Mon MBTI",
        mbtiApplied: "Appliqué à l'accueil IA",
        mbtiPrompt: "Configurez pour des accueils personnalisés ✨",
        complete: "Terminé",
        reselect: "Réessayer",
        privacyPolicy: "Politique de confidentialité",`,
    de: `
        settingUp: "Einrichten...",
        healthDataSync: "Gesundheitsdaten",
        healthConnected: "Apple/Samsung Health verbunden",
        healthDescription: "Herzfrequenz und Kalorien",
        myMBTI: "Mein MBTI",
        mbtiApplied: "In KI-Begrüßung angewendet",
        mbtiPrompt: "Einrichten für personalisierte KI ✨",
        complete: "Fertig",
        reselect: "Neu wählen",
        privacyPolicy: "Datenschutzerklärung",`,
};

// For ko - find end of ko block (before 'en:')
for (const [lang, keys] of Object.entries(newKeys)) {
    // Find the language block. For 'ko', it's the start. For others, search for `langCode: {`
    let searchPattern;
    if (lang === 'ko') {
        // ko block ends before "en: {" — find the right spot
        searchPattern = /(\n\s+),\n(\s+en:\s*\{)/;
        content = content.replace(searchPattern, (match, p1, p2) => {
            return `${p1},${keys}\n${p2}`;
        });
    } else {
        // Find the closing of the language block preceding the next one
        // Pattern: find `bannerInstallDesc: "..."` for each lang, then add before the `,\n` or `\n    },`
        const bannerPattern = new RegExp(`(bannerInstallDesc:\\s*"[^"]*",?)\\s*\\n(\\s+\\},?\\s*\\n\\s+(?:\\w+:|\\};))`, 'm');
        const bannerMatch = content.match(bannerPattern);
        
        // Simpler: just find the bannerInstallDesc line for each lang and add after it
        // We need to be smarter. Let's find each language's closing `},`
        
        // Find langCode: { ... } block
        // Insert before the closing },
        const langStart = content.indexOf(`    ${lang}: {`);
        if (langStart === -1) {
            console.log(`Language ${lang} not found, skipping`);
            continue;
        }
        
        // Find the bannerInstallDesc line within this language block
        const bannerIdx = content.indexOf('bannerInstallDesc:', langStart);
        if (bannerIdx === -1) {
            console.log(`bannerInstallDesc not found for ${lang}, skipping`);
            continue;
        }
        
        // Find end of that line
        const lineEnd = content.indexOf('\n', bannerIdx);
        content = content.slice(0, lineEnd) + keys + content.slice(lineEnd);
    }
}

fs.writeFileSync('src/utils/translations.js', content, 'utf8');
console.log('Done! All translation keys added.');