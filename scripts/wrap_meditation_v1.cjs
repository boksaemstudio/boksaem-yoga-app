const fs = require('fs');
const path = require('path');

const srcFiles = [
    'components/meditation/views/PreparationView.jsx',
    'components/meditation/views/IntentionView.jsx',
    'components/meditation/views/DiagnosisChatView.jsx',
    'components/meditation/views/ActiveSessionView.jsx',
    'components/meditation/views/InitialPrepView.jsx',
    'components/meditation/views/WeatherView.jsx',
    'components/meditation/ui/FeedbackView.jsx',
    'components/meditation/ui/ChatDialog.jsx',
    'components/meditation/ui/VolumeControlPanel.jsx',
    'pages/MeditationPage.jsx'
];

function wrapKoreanStrings(filePath) {
    const fullPath = path.join(__dirname, '../src', filePath);
    if (!fs.existsSync(fullPath)) return;
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let matchCount = 0;
    
    // Inject hook if not present (simple injection after imports for these components)
    if (!content.includes('useLanguageStore')) {
        content = content.replace(/(import .* from 'react';)/, "$1\\nimport { useLanguageStore } from '../../stores/useLanguageStore';");
        // adjust path depth if needed
        if (filePath.includes('views/') || filePath.includes('ui/')) {
            content = content.replace("../../stores/", "../../../stores/");
        } else if (filePath.includes('pages/')) {
            content = content.replace("../../stores/", "../stores/");
        }
    }
    
    // Inject const t = useLanguageStore(s => s.t);
    if (!content.match(/const t = useLanguageStore/)) {
        content = content.replace(/(const [A-Za-z0-9_]+ = \([^=]*\) => \{)/, "$1\\n    const t = useLanguageStore(s => s.t);");
        // fallback for function declaration
        content = content.replace(/(export function [A-Za-z0-9_]+\([^=]*\) \{)/, "$1\\n    const t = useLanguageStore(s => s.t);");
    }

    // List of common replacements for Meditation
    const replacements = [
        // PreparationView
        { r: />명상 시작하기</g, t: ">{t('med_prep_btn_start') || '명상 시작하기'}<" },
        { r: />명상을 취소하시겠습니까\?</g, t: ">{t('med_prep_cancel_title') || '명상을 취소하시겠습니까?'}<" },
        { r: />계속 진행하기</g, t: ">{t('med_prep_cancel_no') || '계속 진행하기'}<" },
        { r: />네, 취소합니다</g, t: ">{t('med_prep_cancel_yes') || '네, 취소합니다'}<" },
        { r: />지금 바로 시작</g, t: ">{t('med_prep_btn_jump') || '지금 바로 시작'}<" },
        { r: />눈을 감고 편안한 호흡을 시작하세요\.</g, t: ">{t('med_prep_desc') || '눈을 감고 편안한 호흡을 시작하세요.'}<" },

        // ActiveSessionView
        { r: />명상을 종료하시겠습니까\?</g, t: ">{t('med_session_end_confirm') || '명상을 종료하시겠습니까?'}<" },
        { r: />중간에 종료하더라도 여기까지의 명상 기록은 저장됩니다\.</g, t: ">{t('med_session_end_desc') || '중간에 종료하더라도 여기까지의 명상 기록은 저장됩니다.'}<" },
        { r: />계속 명상하기</g, t: ">{t('med_session_end_no') || '계속 명상하기'}<" },
        { r: />명상 종료</g, t: ">{t('med_session_end_yes') || '명상 종료'}<" },
        { r: />명상 시작 전\.\.\.</g, t: ">{t('med_session_waiting') || '명상 시작 전...'}<" },
        
        // DiagnosisChatView / ChatDialog
        { r: /'오늘 하루 어떠셨나요\?'/g, t: "(t('med_chat_greeting') || '오늘 하루 어떠셨나요?')" },
        { r: />마음을 읽는 중\.\.\.</g, t: ">{t('med_chat_reading') || '마음을 읽는 중...'}<" },
        { r: /'마음을 읽는 중\.\.\.'/g, t: "(t('med_chat_reading') || '마음을 읽는 중...')" },
        { r: /'조금만 더 자세히 들려주시겠어요\?'/g, t: "(t('med_chat_prompt_more') || '조금만 더 자세히 들려주시겠어요?')" },
        { r: /'AI 명상 처방 받기'/g, t: "(t('med_chat_btn_prescribe') || 'AI 명상 처방 받기')" },
        { r: />메시지를 입력하세요\.\.\.</g, t: ">{t('med_chat_placeholder') || '메시지를 입력하세요...'}<" },
        { r: /'메시지가 너무 짧습니다\.'/g, t: "(t('med_chat_too_short') || '메시지가 너무 짧습니다.')" },
        
        // VolumeControlPanel
        { r: />소리 설정</g, t: ">{t('med_vol_title') || '소리 설정'}<" },
        { r: />자연음 \(배경\)</g, t: ">{t('med_vol_ambient') || '자연음 (배경)'}<" },
        { r: />주파수 \(싱잉볼\)</g, t: ">{t('med_vol_frequency') || '주파수 (싱잉볼)'}<" },
        { r: />AI 보이스</g, t: ">{t('med_vol_voice') || 'AI 보이스'}<" },
        
        // FeedbackView
        { r: />오늘 명상은 어떠셨나요\?</g, t: ">{t('med_feedback_title') || '오늘 명상은 어떠셨나요?'}<" },
        { r: />느낀 점을 자유롭게 남겨주세요 \(선택\)</g, t: ">{t('med_feedback_placeholder') || '느낀 점을 자유롭게 남겨주세요 (선택)'}<" },
        { r: />기록 저장 및 종료</g, t: ">{t('med_feedback_submit') || '기록 저장 및 종료'}<" },
        
        // IntentionView
        { r: />오늘의 마음 상태</g, t: ">{t('med_intent_title_status') || '오늘의 마음 상태'}<" },
        { r: />어떤 명상이 필요하신가요\?</g, t: ">{t('med_intent_title_need') || '어떤 명상이 필요하신가요?'}<" },
        
        // InitialPrepView
        { r: />스튜디오의 편안한 공간에 자리를 잡아주세요\.</g, t: ">{t('med_init_prep_desc') || '스튜디오의 편안한 공간에 자리를 잡아주세요.'}<" },
        { r: />준비완료</g, t: ">{t('med_init_prep_btn') || '준비완료'}<" },

        // WeatherView
        { r: />현재 날씨</g, t: ">{t('med_weather_title') || '현재 날씨'}<" }
    ];

    for (const rep of replacements) {
        const prev = content;
        content = content.replace(rep.r, rep.t);
        if (content !== prev) {
            matchCount += (content.match(rep.r) || []).length + 1; // Approximate
        }
    }
    
    // String attributes replacement
    const attrReplacements = [
        { r: /placeholder="메시지를 입력하세요\.\.\."/g, t: "placeholder={t('med_chat_placeholder') || '메시지를 입력하세요...'}" }
    ];
    for (const rep of attrReplacements) {
         content = content.replace(rep.r, rep.t);
    }

    if (matchCount > 0 || attrReplacements.some(rep => content.includes(rep.t))) {
        fs.writeFileSync(fullPath, content);
        console.log(`[Meditation] ${path.basename(filePath)} replaced strings.`);
    }
}

srcFiles.forEach(wrapKoreanStrings);
console.log('Meditation AST quick-wrapper complete.');
