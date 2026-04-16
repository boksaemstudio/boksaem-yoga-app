const fs = require('fs');
const TRANSLATIONS_PATH = './src/utils/translations.js';

// Extremely careful manual translation by Gemini Ultra to preserve {variables} exactly!
const manualPatchPT_Vars = {
  pt: {
    "totalSessions": "Total {n}",
    "insight_milestone_50": "Você já acumulou {n} práticas intensas. Agora, sinta a textura da sua respiração em vez da perfeição do movimento e experimente o 'Sati (atenção plena)' despertar em cada momento. 🙏",
    "insight_user_pattern": "Você é um **'{type}'** que pratica principalmente no(s) dia(s) **{day} às {time}**. {desc}",
    "holdElapsed": "Desde {start}, decorreram {elapsed} dias (Solicitado: {requested} dias)",
    "holdExtended": "Data de término estendida em {days} dias",
    "holdRemaining": "Restante: {n} vezes",
    "holdModalDesc": "Máximo {weeks} semanas · {count} vezes",
    "holdWeekDays": "{w} sem ({d} dias)",
    "holdStartBtn": "Iniciar Pausa de {days} dias",
    "normalCount": "Válido {n}",
    "expiredCancelCount": "Cancelado {n}",
    "sessionN": "Sessão {n}",
    "sessionComplete": "Sessão {n} Concluída!",
    "analyzedRecent": "Foram analisados {n} registros de prática recentes."
  }
};

let contentPT = fs.readFileSync(TRANSLATIONS_PATH, 'utf8');
let patchesAppliedPT = 0;

for (const [key, translatedValue] of Object.entries(manualPatchPT_Vars.pt)) {
    const safeVal = JSON.stringify(translatedValue);
    const searchRegex = new RegExp(`("${key}":\\s*)".*?"`, 'g');

    let found = false;
    contentPT = contentPT.replace(searchRegex, (match, p1) => {
        found = true;
        return `${p1}${safeVal}`;
    });
    
    if (found) patchesAppliedPT++;
}

fs.writeFileSync(TRANSLATIONS_PATH, contentPT, 'utf8');
console.log(`✅ Phase 3 [Variables]: Hand-translated ${patchesAppliedPT} critical variable strings in PT.`);
