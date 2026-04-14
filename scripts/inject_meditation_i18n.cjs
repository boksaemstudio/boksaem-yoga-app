const fs = require('fs');
const path = require('path');
const TRANSLATIONS_PATH = path.resolve(__dirname, '..', 'src', 'utils', 'translations.js');

const medTranslations = {
    "med_wiz_default_summary": { en: "We looked deeply into your mind.", ru: "Мы заглянули глубоко в ваш разум.", zh: "我们深入了解了您的心境。", ja: "あなたの心を深く見つめました。", ko: "당신의 마음 상태를 깊이 들여다보았습니다." },
    "med_wiz_title_ai_analysis": { en: "AI Mind Analysis", ru: "ИИ-Анализ Разума", zh: "AI心灵分析", ja: "AIマインド分析", ko: "AI 마음 분석" },
    "med_wiz_btn_select_mode": { en: "Select Meditation Mode", ru: "Выбрать режим медитации", zh: "选择冥想模式", ja: "瞑想モードを選択", ko: "명상 모드 선택하기" },
    "med_wiz_title_select_intent": { en: "What kind of meditation do you want?", ru: "Какую медитацию вы хотите?", zh: "您想进行哪种冥想？", ja: "どのような瞑想をご希望ですか？", ko: "어떤 명상을 원하시나요?" },
    "med_wiz_desc_select_intent": { en: "Select the mode you need most", ru: "Выберите режим, который вам нужнее всего", zh: "选择最适合您的模式", ja: "一番必要なモードをご選択ください", ko: "나에게 가장 필요한 모드를 선택하세요" },
    "med_wiz_duration_title": { en: "Meditation Time", ru: "Время медитации", zh: "冥想时间", ja: "瞑想時間", ko: "명상 시간" },
    "med_wiz_ambient_title": { en: "Ambient (On/Off)", ru: "Окружение (Вкл/Выкл)", zh: "环境音 (开/关)", ja: "環境音 (ON/OFF)", ko: "자연음 배경 (켜기/끄기)" },
    "med_wiz_btn_start_prep": { en: "Prepare for Meditation", ru: "Подготовиться к медитации", zh: "准备冥想", ja: "瞑想の準備をする", ko: "명상 준비하기" },
    "med_wiz_btn_need_selection": { en: "Please select a meditation", ru: "Пожалуйста, выберите медитацию", zh: "请选择冥想类型", ja: "瞑想を選択してください", ko: "원하시는 명상을 선택해주세요" },
    "med_wiz_title_ai_prescription": { en: "AI Meditation Prescription", ru: "ИИ Рецепт медитации", zh: "AI冥想处方", ja: "AI瞑想処方", ko: "명상 전문 AI 처방" },
    "med_wiz_ai_analysis_res": { en: "AI Phycological Analysis Result", ru: "Результат ИИ-анализа психологии", zh: "AI心理状态分析结果", ja: "AI心理分析結果", ko: "AI 심리 분석 결과" },
    "med_wiz_ai_recommendation": { en: "AI Recommendation", ru: "ИИ Рекомендация", zh: "AI强力推荐", ja: "AI強力推薦", ko: "AI 강력 추천" },
    "med_wiz_type_bodyscan": { en: "Full Body Relaxation Guide", ru: "Гид по расслаблению тела", zh: "全身放松指南", ja: "全身リラックスガイド", ko: "온몸 이완 가이드" },
    "med_wiz_type_breath": { en: "Breath Immersion", ru: "Погружение в дыхание", zh: "呼吸沉浸", ja: "呼吸への没入", ko: "호흡 몰입" },
    "med_wiz_type_posture": { en: "Posture Correction", ru: "Коррекция осанки", zh: "姿势矫正", ja: "姿勢矯正", ko: "자세 교정" },
    "med_wiz_change_options": { en: "Change Options", ru: "Изменить опции", zh: "更改选项", ja: "オプション変更", ko: "옵션 변경하기" },
    "med_wiz_type_v1": { en: "Body Scan", ru: "Скан тела", zh: "身体扫描", ja: "ボディスキャン", ko: "바디스캔" },
    "med_wiz_type_v2": { en: "Breath", ru: "Дыхание", zh: "呼吸", ja: "呼吸", ko: "호흡" },
    "med_wiz_type_v3": { en: "Posture", ru: "Осанка", zh: "姿势", ja: "姿勢", ko: "자세" },
    "med_wiz_ambient_title_short": { en: "Ambient", ru: "Фон.звук", zh: "背景音", ja: "環境音", ko: "배경음" },
    "med_wiz_btn_start_now": { en: "Start Now", ru: "Начать", zh: "立即开始", ja: "今すぐ開始", ko: "시작하기" },
    "med_wiz_btn_reselect": { en: "Reselect (Return to Chat)", ru: "Перевыбрать (К чату)", zh: "重新选择 (返回对话)", ja: "再選択 (対話に戻る)", ko: "다시 선택 (대화로 돌아가기)" },
    "med_prep_chair_title": { en: "Chair Meditation", ru: "Медитация на стуле", zh: "椅子冥想", ja: "椅子瞑想", ko: "의자 명상" },
    "med_prep_chair_desc": { en: "Easy to do at work or home", ru: "Легко сделать на работе или дома", zh: "随时随地轻松进行", ja: "会社や家で手軽に", ko: "회사나 집에서 간편하게" },
    "med_prep_chair_s1": { en: "Sit on the edge of the chair with back straight.", ru: "Сядьте на край стула с прямой спиной.", zh: "坐在椅子前半部，挺直腰背。", ja: "椅子の端に座り、背筋を伸ばします。", ko: "의자 앞쪽에 걸터앉아 허리를 세웁니다." },
    "med_prep_chair_s2": { en: "Place feet shoulder-width apart.", ru: "Поставьте ноги на ширине плеч.", zh: "双脚与肩同宽平放于地。", ja: "両足は肩幅に広げて地面につけます。", ko: "양발은 어깨너비로 벌려 지면에 닿게 합니다." },
    "med_prep_chair_s3": { en: "Rest hands comfortably on your knees.", ru: "Положите руки удобно на колени.", zh: "双手自然放在膝盖上。", ja: "両手は楽に膝の上に置きます。", ko: "손은 편안하게 무릎 위에 올립니다." },
    "med_prep_floor_title": { en: "Floor Meditation", ru: "Медитация на полу", zh: "地板冥想", ja: "床瞑想", ko: "바닥 명상" },
    "med_prep_floor_desc": { en: "In a quiet and stable space", ru: "В тихом спокойном месте", zh: "在安静稳定的空间", ja: "静かで安定した空間で", ko: "조용하고 안정적인 공간에서" },
    "med_prep_floor_s1": { en: "Sit cross-legged.", ru: "Сядьте скрестив ноги.", zh: "盘腿或以舒适坐姿坐下。", ja: "あぐらまたは楽な姿勢で座ります。", ko: "가부좌 또는 편한 책상다리를 합니다." },
    "med_prep_floor_s2": { en: "Use a cushion to lower knees below hips.", ru: "Используйте подушку, чтобы колени были ниже бёдер.", zh: "使用坐垫使膝盖低于臀部。", ja: "クッションを使用し、膝を尻より低くします。", ko: "쿠션을 활용해 무릎이 엉덩이보다 낮게 합니다." },
    "med_prep_floor_s3": { en: "Keep spine straight, pull the crown towards sky.", ru: "Держите спину прямой, тянитесь макушкой вверх.", zh: "挺直脊柱，头顶朝天。", ja: "背筋を真っ直ぐにし、頭頂部を空へ向けます。", ko: "척추를 곧게 펴고 정수리를 하늘로 당깁니다." },
    "med_prep_lying_title": { en: "Lying Meditation", ru: "Медитация лёжа", zh: "平躺冥想", ja: "横たわる瞑想", ko: "누운 명상" },
    "med_prep_lying_desc": { en: "For deep relaxation and sleep", ru: "Для глубокого расслабления и сна", zh: "为了深度放松和深度睡眠", ja: "深いリラックスと睡眠のために", ko: "깊은 이완과 수면을 위해" },
    "med_prep_lying_s1": { en: "Lie comfortably on your back.", ru: "Удобно лягте на спину.", zh: "平躺，选择舒适的姿势。", ja: "仰向けに寝てリラックスします。", ko: "등을 대고 편안하게 눕습니다." },
    "med_prep_lying_s2": { en: "Legs shoulder-width apart, toes dropping naturally.", ru: "Ноги на ширине плеч, пальцы расслаблены.", zh: "双腿与肩同宽，脚尖自然下垂。", ja: "足は肩幅に広げ、つま先を自然に落とします。", ko: "다리는 어깨 너비로 벌리고 발끝을 툭 떨어뜨립니다." },
    "med_prep_lying_s3": { en: "Arms by your side, palms facing up.", ru: "Руки вдоль тела, ладони смотрят вверх.", zh: "双手放两侧，掌心向上。", ja: "腕は体の横に置き、手のひらを上に向けます。", ko: "팔은 몸 옆에 두고 손바닥이 하늘을 향하게 합니다." },
    "med_prep_header": { en: "Preparation ({step}/3)", ru: "Подготовка ({step}/3)", zh: "准备阶段({step}/3)", ja: "準備ステップ ({step}/3)", ko: "준비 단계 ({step}/3)" },
    "med_prep_title": { en: "Meditation Prep", ru: "Подготовка", zh: "冥想准备", ja: "瞑想の準備", ko: "명상 준비" },
    "med_prep_s1_title": { en: "Quiet Surroundings", ru: "Тишина вокруг", zh: "宁静环境", ja: "静かな環境", ko: "주변을 고요하게" },
    "med_prep_s1_desc_html": { en: "To avoid interruptions, <br/>have you set your device to 'Mute' or 'Do Not Disturb'?", ru: "Во избежание отвлечений, <br/>вы включили режим 'Не беспокоить'?", zh: "为了不被打扰，<br/>您是否将设备设为“静音”或“勿扰”模式？", ja: "邪魔が入らないように、<br/>端末を「マナー」や「おやすみ」モードに<br/>設定しましたか？", ko: "방해받지 않도록 <br/>기기를 '무음' 또는 '방해금지' 모드로 <br/>설정해주셨나요?" },
    "med_prep_s1_alert_title": { en: "Rest assured", ru: "Будьте спокойны", zh: "请放心", ja: "ご安心ください", ko: "안심하세요" },
    "med_prep_s1_alert_desc": { en: "In 'Mute' or 'DND' modes, **guides and sounds will still play normally.** Only external app notifications are blocked.", ru: "В 'Беззвучном' или 'Не беспокоить' **голос и фоновая музыка продолжат играть.**", zh: "在“静音”或“勿扰”模式下，\n**冥想指南和背景音正常播放。**\n仅屏蔽外部通知。", ja: "「マナー」や「おやすみ」モード中でも、**ガイドや環境音は正常に流れます。**", ko: "'무음'이나 '방해금지' 모드에서도 **명상 가이드와 배경음은 정상적으로 들립니다.** 외부 알림만 차단되니 안심하고 설정해주세요." },
    "med_prep_btn_confirmed": { en: "Got it", ru: "Понятно", zh: "已确认", ja: "確認しました", ko: "확인했습니다" },
    "med_prep_s3_title": { en: "Find your most comfortable posture", ru: "Найдите самую удобную позу", zh: "寻找最舒适的姿势", ja: "最も快適な姿勢を見つけてください", ko: "가장 편한 자세를 찾아보세요" },
    "med_prep_posture_format": { en: "{title} Posture", ru: "Поза: {title}", zh: "{title}姿势", ja: "{title}の姿勢", ko: "{title} 자세" },
    "med_prep_btn_goto_device": { en: "Set device positioning", ru: "Позиционирование устройства", zh: "设备位置设置", ja: "機器の配置設定へ", ko: "기기 위치 설정으로" },
    "med_prep_s2_title": { en: "Device Placement", ru: "Размещение устройства", zh: "设备摆放位置", ja: "スマホの配置", ko: "핸드폰 위치 설정" },
    "med_prep_s2_cam": { en: "Place your phone about 2m away for full-body tracking.", ru: "Разместите телефон на расстоянии ~2м для съёмки в полный рост.", zh: "将手机放于2m距离，以进行全身跟踪。", ja: "全身撮影のため、スマホを約2m離しておいてください。", ko: "전신 촬영을 위해 핸드폰을 약 2m 거리에 세워두세요." },
    "med_prep_s2_mic": { en: "Place your phone near your mouth (<30cm) to detect breathing.", ru: "Разместите телефон рядом со ртом (<30см).", zh: "将手机放置在嘴边(30cm内)以检测呼吸声。", ja: "呼吸音を感知するため、口の近く(30cm以内)に置いてください。", ko: "숨소리 감지를 위해 핸드폰을 입 근처(30cm 내)에 비스듬히 세워두세요." },
    "med_prep_s2_base": { en: "Place your phone somewhere comfortable within reach.", ru: "Удобно положите телефон.", zh: "将手机放在触手可及的地方。", ja: "手の届く快適な場所に置いてください。", ko: "핸드폰을 손이 닿는 편한 곳에 두세요." },
    "med_prep_s2_tip_mic": { en: "Using earphones with a mic significantly improves breathing detection.", ru: "Наушники с микрофоном улучшат определение дыхания.", zh: "使用带有麦克风的耳机可大大提高呼吸检测准确度。", ja: "マイク付きイヤホンを使うと、呼吸音の感知精度がさらに向上します。", ko: "마이크가 포함된 이어폰을 사용하시면 숨소리를 훨씬 더 정확하게 감지할 수 있어요." },
    "med_prep_btn_ready": { en: "Ready (Start)", ru: "Готово (Старт)", zh: "准备就绪(开始)", ja: "準備完了(スタート)", ko: "준비 완료 (명상 시작)" },
    "med_chat_ai_subtitle": { en: "(Mindfulness)", ru: "(Осознанность)", zh: "(专注守护者)", ja: "(マインドフルネス)", ko: "(마음 챙김이)" },
    "med_chat_analyzing": { en: "Analyzing...", ru: "Анализирую...", zh: "分析中...", ja: "分析中...", ko: "분석 중..." },
    "med_chat_thinking": { en: "Thinking...", ru: "Думаю...", zh: "思考中...", ja: "思考中...", ko: "생각하는 중..." },
    "med_chat_voice_on": { en: "Voice Active", ru: "Голос Активен", zh: "语音对话中", ja: "音声対話中", ko: "음성 대화 중" },
    "med_chat_btn_start_immediate": { en: "Start Now", ru: "Начать Сразу", zh: "立即开始", ja: "すぐ開始", ko: "바로 시작" },
    "med_chat_default_greeting": { en: "How was your day today?", ru: "Как прошел ваш день?", zh: "今天一天过得怎样？", ja: "今日一日はどうでしたか？", ko: "오늘 하루는 어떠셨나요?" },
    "med_chat_ai_listening": { en: "AI {name} is listening to your mind...", ru: "ИИ {name} слушает ваш разум...", zh: "AI {name}正在聆听您的心声...", ja: "AI {name}があなたの心に寄り添っています...", ko: "AI {name}가 당신의 마음을 듣고 있어요..." },
    "med_chat_btn_start": { en: "Start Meditation", ru: "Начать Медитацию", zh: "开始冥想", ja: "瞑想開始", ko: "명상 시작하기" },
    "med_chat_prepared_desc": { en: "We prepared a meditation suited for you", ru: "Мы подготовили вам медитацию", zh: "为您准备了适合现在的冥想", ja: "あなたにピッタリの瞑想をご準備しました", ko: "당신에게 맞는 명상을 준비했어요" },
    "med_chat_waiting_reply": { en: "Waiting for reply...", ru: "Ожидаю ответ...", zh: "等待回复中...", ja: "返答待ち...", ko: "답변을 기다리는 중..." },
    "med_chat_input_placeholder": { en: "Type your mind state...", ru: "Введите ваше состояние разума...", zh: "请直接输入您的心态...", ja: "今の状態を直接入力してください...", ko: "직접 마음 상태를 입력하세요..." },
    "med_intent_title_today": { en: "Today's Meditation", ru: "Медитация Сегодня", zh: "今日冥想", ja: "今日の瞑想", ko: "오늘의 명상" },
    "med_intent_btn_exit": { en: "Exit", ru: "Выход", zh: "退出", ja: "退出", ko: "나가기" },
    "med_intent_q1_html": { en: "Where is your mind<br/>heading right now?", ru: "Куда направлен<br/>ваш разум сейчас?", zh: "您此刻的心<br/>正走向何方？", ja: "今、あなたの心は<br/>どこに向かっていますか？", ko: "지금 당신의 마음은<br/>어디를 향하고 있나요?" },
    "med_intent_desc1": { en: "Choose the broad direction of today's meditation", ru: "Выберите общее направление медитации", zh: "选择今日冥想的宏观方向", ja: "今日の瞑想の方向性を選んでください", ko: "오늘 명상의 큰 방향을 선택해보세요" },
    "med_intent_q2": { en: "Shall we look closer?", ru: "Давайте посмотрим детальнее?", zh: "想深入探讨一下吗？", ja: "もう少し詳しく見てみましょうか？", ko: "조금 더 구체적으로 들여다볼까요?" },
    "med_session_detecting": { en: "Detecting...", ru: "Обнаружение...", zh: "正在检测中...", ja: "感知中...", ko: "감지 중..." },
    "med_session_voice_on": { en: "Voice Guide is playing", ru: "Голосовой гид включен", zh: "正在进行语音指导", ja: "音声案内が進行中です", ko: "음성 안내가 진행 중입니다" },
    "med_session_data_local": { en: "Data is processed strictly on-device", ru: "Данные обрабатываются локально", zh: "数据仅在设备端处理", ja: "データは端末内でのみ処理されます", ko: "데이터는 기기 내에서만 처리됩니다" },
    "med_session_volume": { en: "Volume", ru: "Громкость", zh: "音量调节", ja: "音量調節", ko: "소리 조절" },
    "med_session_volume_hint": { en: "🔊 Press icon to adjust volume", ru: "🔊 Нажмите для звука", zh: "🔊 点击图标调节音量", ja: "🔊 アイコンを押して音量調節", ko: "🔊 스피커 아이콘을 눌러 볼륨을 조절하세요" },
    "med_weather_title": { en: "Ambience Sense", ru: "Чувство окружения", zh: "环境感应", ja: "環境感知", ko: "환경 감지" },
    "med_weather_q1": { en: "How is the weather outside?", ru: "Как погода за окном?", zh: "现在窗外是什么天气？", ja: "今、外の天気はいかがですか？", ko: "지금 창밖의 날씨는 어떤가요?" },
    "med_weather_desc1": { en: "Brain resonance patterns shift with weather", ru: "Резонанс мозга меняется с погодой", zh: "不同天气影响大脑反应", ja: "天気によって脳の反応パターンは変化します", ko: "날씨에 따라 뇌의 반응 패턴이 달라집니다" },
    "med_diag_manual_title": { en: "Select Meditation", ru: "Выбор Медитации", zh: "冥想选择", ja: "瞑想の選択", ko: "명상 선택" },
    "med_diag_manual_desc": { en: "Please select how you currently feel", ru: "Выберите ваше состояние", zh: "请选择您当前的感受", ja: "今の感覚に合うものをお選びください", ko: "지금 느껴지는 상태를 선택해주세요" },
    "med_feedback_title": { en: "Practice Complete", ru: "Практика завершена", zh: "冥想修习完成", ja: "瞑想修練完了", ko: "명상 수련 완료" },
    "med_feedback_ai_log": { en: "AI Mindfulness Log", ru: "ИИ Журнал Осознанности", zh: "AI心灵观察日志", ja: "AIの心観察レポート", ko: "AI의 마음 관찰 일지" },
    "med_feedback_no_log": { en: "Could not summarize meditation data.", ru: "Не удалось резюмировать.", zh: "无法总结冥想数据。", ja: "データ要約できませんでした。", ko: "명상 데이터 분석 내용을 요약하지 못했습니다." },
    "med_feedback_stability": { en: "Breath Stability", ru: "Стабильность дыхания", zh: "呼吸稳定度", ja: "呼吸安定度", ko: "호흡 안정도" },
    "med_feedback_energy": { en: "Energy Shift", ru: "Сдвиг Энергии", zh: "能量变化", ja: "エネルギー変化", ko: "에너지 변화" },
    "med_feedback_analyzing": { en: "Analyzing meditation data...", ru: "Анализирую данные...", zh: "正在分析冥想数据...", ja: "冥想データを分析しています...", ko: "명상 데이터를 분석하고 있습니다..." },
    "med_feedback_btn_close": { en: "Conclude Practice & Return", ru: "Завершить и Вернуться", zh: "结束专注并返回", ja: "マインドフルネスを終えて戻る", ko: "마음 챙김 마치고 돌아가기" },
    "med_vol_title": { en: "Volume Control", ru: "Громкость", zh: "音量控制", ja: "音量調整", ko: "볼륨 조절" },
    "med_vol_voice": { en: "Voice Guide", ru: "Голос гида", zh: "语音向导", ja: "音声案内", ko: "음성 안내" },
    "med_vol_ambient": { en: "Ambience", ru: "Окружение", zh: "环境音", ja: "環境音", ko: "환경음" },
    "med_vol_frequency": { en: "Frequency", ru: "Частота", zh: "频率音", ja: "周波数", ko: "주파수" },
    "med_vol_mute": { en: "🔇 Mute All", ru: "🔇 Без звука", zh: "🔇 全局静音", ja: "🔇 全てミュート", ko: "🔇 전체 음소거" },
    "med_vol_unmute": { en: "🔊 Sound On", ru: "🔊 Звук вкл", zh: "🔊 开启声音", ja: "🔊 サウンドON", ko: "🔊 소리 켜기" },
};

function injectMeditationTranslations() {
    let content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
    const existingLangs = ['ko', 'en', 'ru', 'zh', 'ja', 'es', 'pt', 'fr', 'de'];
    
    // We will append to each block
    for (const lang of existingLangs) {
        const langHeaderRegex = new RegExp(`^(\\s{4}${lang}:\\s*\\{)`, 'm');
        const langMatch = content.match(langHeaderRegex);
        if (!langMatch) continue;

        let braceCount = 0;
        let closingBracePos = -1;
        
        for (let i = langMatch.index; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    closingBracePos = i;
                    break;
                }
            }
        }
        
        if (closingBracePos === -1) continue;
        
        let toInsert = `\n        // ═══ Meditation App (AI) ═══\n`;
        let addedCount = 0;
        for (const [key, mapping] of Object.entries(medTranslations)) {
            // Check if key already exists using basic RegExp to avoid duplicate injection
            const keyRegex = new RegExp(`"${key}"\\s*:`);
            if (!content.slice(langMatch.index, closingBracePos).match(keyRegex)) {
                // If the language doesn't have a mapping, fallback to English then Korean
                const val = mapping[lang] || mapping['en'] || mapping['ko'];
                toInsert += `        "${key}": "${val}",\n`;
                addedCount++;
            }
        }
        
        if (addedCount > 0) {
            content = content.slice(0, closingBracePos) + toInsert + '    ' + content.slice(closingBracePos);
            console.log(`[${lang}] Injected ${addedCount} meditation keys.`);
        } else {
            console.log(`[${lang}] All keys already exist.`);
        }
    }
    
    fs.writeFileSync(TRANSLATIONS_PATH, content, 'utf8');
}

injectMeditationTranslations();
