const fs = require('fs');

const TRANSLATIONS_PATH = './src/utils/translations.js';
let content = fs.readFileSync(TRANSLATIONS_PATH, 'utf8');

// Gemini Ultra Manual Translation Payload for Phase 1
const manualPatch = {
  ja: {
    "navAIAssistant": "AIアシスタント",
    "aiAnalysisShort": "AI分析",
    "admin_tab_churn_desc1": "AIが最近出席率の低いアクティブ会員を分析します。",
    "admin_tab_churn_analyzing": "AIが会員データを分析しています...",
    "admin_tab_ai_risk_member": "AI 離脱リスク会員",
    "insight_user_pattern": "あなたは主に**{day}の{time}**に練習する**「{type}」**です。{desc}",
    "g_3ce813": "確認"
  },
  th: {
    "feat_hero_sub": "PassFlow ไม่มีคำว่า \"เราไม่รองรับ\" เรานำเสนอเครื่องมือ AI อันทรงพลังที่ปรับให้เข้ากับปรัชญาการทำงานของคุณ 100%—ออกแบบมาเพื่อ<em>คุณ</em>โดยเฉพาะ",
    "navAIAssistant": "ผู้ช่วย AI",
    "aiAnalysisShort": "การวิเคราะห์ AI",
    "admin_tab_churn_desc1": "AI วิเคราะห์สมาชิกปัจจุบันที่มีประวัติการเข้าใช้งานน้อยเมื่อเร็วๆ นี้",
    "admin_tab_churn_analyzing": "AI กำลังวิเคราะห์ข้อมูลสมาชิก...",
    "admin_tab_ai_risk_member": "สมาชิกที่มีความเสี่ยงตาม AI",
    "AI 이탈 경고": "คำเตือนการเลิกใช้งานจาก AI",
    "AI가 회원 데이터를 분석하고 있습니다...": "AI กำลังวิเคราะห์ข้อมูลสมาชิก...",
    "AI & 자동화": "AI และระบบอัตโนมัติ",
    "AI 대시보드 브리핑": "สรุปแดชบอร์ด AI",
    "AI는 제공된 데이터의 정확한 수치만 사용하며, 임의의 숫자를 생성하지 않습니다.": "AI ใช้ตัวเลขที่ถูกต้องจากข้อมูลที่ให้ไว้เท่านั้น และไม่สร้างตัวเลขสุ่มใดๆ",
    "insight_user_pattern": "คุณคือ **'{type}'** ที่มักจะฝึกฝนใน **{day} เวลา {time}**. {desc}",
    "g_3ce813": "ยืนยัน",
    "g_79cc63": "Yeouido Yoga",
    "g_55dfb0": "Yeouido Yoga (เพิ่มเติม)",
    "g_14858e": "PassFlow Landing"
  },
  es: {
    "feat_hero_sub": "PassFlow nunca dice \"no soportamos eso\". Adaptamos nuestras potentes herramientas impulsadas por IA al 100% a tu filosofía operativa—construidas en torno a cómo <em>tú</em> diriges tu negocio.",
    "navAIAssistant": "Asistente de IA",
    "aiAnalysisShort": "Análisis de IA",
    "admin_tab_churn_desc1": "La IA analiza activamente a los miembros con baja asistencia reciente.",
    "admin_tab_churn_analyzing": "La IA está analizando los datos de los miembros...",
    "admin_tab_ai_risk_member": "Miembros en riesgo (IA)",
    "AI 이탈 경고": "Advertencia de baja (IA)",
    "AI가 회원 데이터를 분석하고 있습니다...": "La IA está analizando datos...",
    "AI & 자동화": "IA y automatización",
    "AI 대시보드 브리핑": "Resumen del panel de IA",
    "AI는 제공된 데이터의 정확한 수치만 사용하며, 임의의 숫자를 생성하지 않습니다.": "La IA utiliza valores exactos de los datos proporcionados y no genera números arbitrarios.",
    "insight_user_pattern": "Eres un **'{type}'** que practica principalmente los **{day} a las {time}**. {desc}",
    "g_0cb522": "Admin",
    "g_b79ea4": "Individual",
    "g_ec873c": "Admin",
    "g_3ce813": "Confirmar",
    "g_9b4f13": "Admin",
    "g_f23416": "Incorporación",
    "g_79cc63": "Yeouido Yoga",
    "g_55dfb0": "Yeouido Yoga (Append)",
    "g_14858e": "PassFlow Landing",
    "g_b59a09": "💬 Original"
  },
  fr: {
    "feat_hero_sub": "PassFlow ne dit jamais « nous ne le supportons pas ». Nous adaptons 100 % de nos puissants outils d'IA à votre philosophie de gestion.",
    "navAIAssistant": "Assistant IA",
    "aiAnalysisShort": "Analyse IA",
    "admin_tab_churn_desc1": "L'IA analyse les membres actifs avec une faible participation récente.",
    "admin_tab_churn_analyzing": "L'IA analyse les données des membres...",
    "admin_tab_ai_risk_member": "Membres à risque (IA)",
    "insight_user_pattern": "Vous êtes un(e) **'{type}'** qui pratique principalement le **{day} à {time}**. {desc}",
    "g_3ce813": "Confirmer"
  },
  de: {
    "feat_hero_sub": "PassFlow sagt niemals „das unterstützen wir nicht“. Wir passen unsere leistungsstarken KI-Tools zu 100 % an Ihre Betriebsführung an.",
    "navAIAssistant": "KI-Assistent",
    "aiAnalysisShort": "KI-Analyse",
    "admin_tab_churn_desc1": "Die KI analysiert aktive Mitglieder mit zuletzt geringer Teilnahme.",
    "admin_tab_churn_analyzing": "KI analysiert Mitgliedsdaten...",
    "admin_tab_ai_risk_member": "Gefährdete Mitglieder (KI)",
    "insight_user_pattern": "Sie sind ein **'{type}'**, der hauptsächlich am **{day} um {time}** praktiziert. {desc}",
    "g_3ce813": "Bestätigen"
  },
  ru: {
    "feat_hero_sub": "PassFlow никогда не говорит «мы это не поддерживаем». Наши ИИ-инструменты на 100% адаптируются под ваш стиль управления.",
    "navAIAssistant": "ИИ-ассистент",
    "aiAnalysisShort": "ИИ-анализ",
    "admin_tab_churn_desc1": "ИИ анализирует активных участников с низкой посещаемостью.",
    "admin_tab_churn_analyzing": "ИИ анализирует данные...",
    "admin_tab_ai_risk_member": "Участники в зоне риска (ИИ)",
    "insight_user_pattern": "Вы — **'{type}'**, который обычно тренируется **{day} в {time}**. {desc}",
    "g_3ce813": "Подтвердить"
  },
  vi: {
    "feat_hero_sub": "PassFlow không bao giờ nói \"chúng tôi không hỗ trợ\". Chúng tôi điều chỉnh các công cụ AI mạnh mẽ 100% theo phong cách quản lý riêng của bạn.",
    "navAIAssistant": "Trợ lý AI",
    "aiAnalysisShort": "Phân tích AI",
    "admin_tab_churn_desc1": "AI phân tích các thành viên giảm tần suất tham gia gần đây.",
    "admin_tab_churn_analyzing": "AI đang phân tích dữ liệu...",
    "admin_tab_ai_risk_member": "Hội viên có nguy cơ (AI)",
    "insight_user_pattern": "Bạn là một **'{type}'** thường tập vào **{day} lúc {time}**. {desc}",
    "g_3ce813": "Xác nhận"
  }
};

let patchesApplied = 0;

// Apply AST-based regex patching
for (const lang of Object.keys(manualPatch)) {
    for (const [key, translatedValue] of Object.entries(manualPatch[lang])) {
        // Safe string injection
        const safeVal = JSON.stringify(translatedValue);
        const searchRegex = new RegExp(`("${key}":\\s*)".*?"`, 'g');
        const fallbackSearchRegex = new RegExp(`("${key}":\\s*)'{0,1}.*?'{0,1},`, 'g'); // if it's currently without quotes or something
        
        let found = false;

        // Try replacing existing strict match
        content = content.replace(searchRegex, (match, p1) => {
            found = true;
            return `${p1}${safeVal}`;
        });
        
        if (found) patchesApplied++;
    }
}

fs.writeFileSync(TRANSLATIONS_PATH, content, 'utf8');
console.log(`✅ Phase 1: successfully manually translated & patched ${patchesApplied} Minor Language records.`);
