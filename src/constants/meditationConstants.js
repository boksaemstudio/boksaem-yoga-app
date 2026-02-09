
// ==========================================
// 🧘 AI 복순 명상 가이드 - CONFIG
// "지금의 당신을 듣고, 지금의 명상을 만듭니다."
// ==========================================

// 🎯 Step 1: Meditation Categories - 큰 방향 (비움 vs 채움)
export const MEDITATION_CATEGORIES = [
    {
        id: 'healing',
        label: '지친 마음을 비우고 싶어요',
        subtitle: '치유와 이완',
        description: '비워냄으로써 비로소 평온해지는 시간입니다.',
        emoji: '🌊',
        direction: 'negative_to_zero' // 회복 모드
    },
    {
        id: 'growth',
        label: '밝은 에너지를 채우고 싶어요',
        subtitle: '성장과 연결',
        description: '당신의 내면이 가진 본연의 빛을 깨우는 시간입니다.',
        emoji: '✨',
        direction: 'zero_to_positive' // 성장 모드
    }
];

// 🎯 Step 2: Meditation Intentions - 구체적 의도 (총 8가지)
export const MEDITATION_INTENTIONS = [
    // === A그룹: 비움과 치유 (Healing) ===
    {
        id: 'body_rest',
        category: 'healing',
        label: '지친 몸에 깊은 휴식을 선물하고 싶어요',
        tag: '신체',
        emoji: '😌',
        focus: 'body',
        keywords: ['근육 이완', '안전 신호', '바디스캔']
    },
    {
        id: 'mind_calm',
        category: 'healing',
        label: '폭풍 같은 생각들을 잠재우고 고요해지고 싶어요',
        tag: '생각',
        emoji: '🍃',
        focus: 'mind',
        keywords: ['인지 과부하', '생각 분리', '호흡 집중']
    },
    {
        id: 'emotion_release',
        category: 'healing',
        label: '내 안에 쌓인 감정의 찌꺼기를 흘려보내고 싶어요',
        tag: '감정',
        emoji: '🌧️',
        focus: 'emotion',
        keywords: ['감정 배출', '정서적 공간 확보']
    },
    {
        id: 'let_go',
        category: 'healing',
        label: '통제할 수 없는 불안을 그만 내려놓고 싶어요',
        tag: '내려놓기',
        emoji: '🕊️',
        focus: 'detachment',
        keywords: ['집착 내려놓기', '심리적 거리두기']
    },
    
    // === B그룹: 채움과 성장 (Growth) ===
    {
        id: 'inner_voice',
        category: 'growth',
        label: '외부의 소음은 끄고, 내 안의 목소리에 귀 기울일래요',
        tag: '몰입',
        emoji: '🧘',
        focus: 'sensation',
        keywords: ['감각 회수', '내면 몰입', '고요']
    },
    {
        id: 'self_compassion',
        category: 'growth',
        label: '애쓰지 않고, 지금의 나를 있는 그대로 안아줄래요',
        tag: '수용',
        emoji: '💚',
        focus: 'acceptance',
        keywords: ['비판단적 수용', '자기 연민', '현존']
    },
    {
        id: 'energy_recharge',
        category: 'growth',
        label: '방전된 에너지를 채우고, 다시 나아갈 힘을 얻고 싶어요',
        tag: '활력',
        emoji: '⚡',
        focus: 'vitality',
        keywords: ['에너지 순환', '회복 탄력성', '의욕']
    },
    {
        id: 'gratitude',
        category: 'growth',
        label: '당연했던 것들 속에서 소중한 의미를 발견하고 싶어요',
        tag: '감사',
        emoji: '🌟',
        focus: 'gratitude',
        keywords: ['긍정 편향', '관계의 연결', '자존감']
    }
];

export const MEDITATION_MODES = [
    { id: 'breath', label: '3분 숨 고르기', time: 3 * 60, iconName: 'Wind', color: '#48dbfb', desc: '잠깐의 호흡으로 균형 찾기', freq: 10 },
    { id: 'calm', label: '7분 마음 정돈', time: 7 * 60, iconName: 'Brain', color: '#FFD700', desc: '흐트러진 마음 돌보기', freq: 8 },
    { id: 'deep', label: '15분 깊은 이완', time: 15 * 60, iconName: 'Sparkle', color: '#a29bfe', desc: '깊은 명상의 세계로', freq: 6 },
];

// Interaction Types - Bio-Feedback Loop
export const INTERACTION_TYPES = {
    v1: { id: 'v1', label: '바디스캔 가이드', desc: '몸의 감각을 깨우는 편안한 안내', iconName: 'Wind' },
    v2: { id: 'v2', label: '호흡 몰입', desc: '숨소리에 반응하는 인터랙티브 명상', iconName: 'Microphone' },
    v3: { id: 'v3', label: '자세 교정', desc: 'AI가 실시간으로 자세를 잡아줍니다', iconName: 'VideoCamera' }
};

export const DIAGNOSIS_OPTIONS = [
    { id: 'stress', label: '머리가 복잡해요', iconName: 'Lightning', color: '#FF6B6B', prescription: { modeId: 'calm', type: 'v2' } },
    { id: 'stiff', label: '몸이 찌뿌둥해요', iconName: 'Barbell', color: '#4ECDC4', prescription: { modeId: 'breath', type: 'v3' } },
    { id: 'anxious', label: '마음이 불안해요', iconName: 'Heartbeat', color: '#FFD93D', prescription: { modeId: 'deep', type: 'v2' } },
    { id: 'tired', label: '무기력해요', iconName: 'SmileySad', color: '#A8A4CE', prescription: { modeId: 'calm', type: 'v1' } },
    { id: 'overthink', label: '생각이 꼬리에 꼬리를 물어요', iconName: 'Brain', color: '#a29bfe', prescription: { modeId: 'calm', type: 'v2' } },
    { id: 'frustrated', label: '가슴이 답답해요', iconName: 'Wind', color: '#48dbfb', prescription: { modeId: 'breath', type: 'v2' } },
    { id: 'low_energy', label: '에너지가 바닥났어요', iconName: 'Sparkle', color: '#FFD32A', prescription: { modeId: 'breath', type: 'v1' } },
    { id: 'distracted', label: '집중이 안 돼요', iconName: 'Lightning', color: '#32ff7e', prescription: { modeId: 'calm', type: 'v2' } }
];

export const WEATHER_OPTIONS = [
    { id: 'sun', label: '맑음', iconName: 'Sun', color: '#FFD23F' },
    { id: 'cloud', label: '흐림', iconName: 'Cloud', color: '#B0C4DE' },
    { id: 'rain', label: '비', iconName: 'CloudRain', color: '#4895EF' },
    { id: 'snow', label: '눈', iconName: 'CloudSnow', color: '#A8E6CF' },
];

// 🎵 Ambient Sound Options - Multi-layer audio for immersive meditation
export const AMBIENT_SOUNDS = [
    { 
        id: 'none', 
        label: '주파수만', 
        desc: '순수한 binaural beats',
        iconName: 'Wind',
        color: '#48dbfb',
        audioUrl: null 
    },
    { 
        id: 'rain', 
        label: '빗소리', 
        desc: '부드러운 빗소리와 함께',
        iconName: 'CloudRain',
        color: '#4895EF',
        // Free ambient audio from Pixabay (CC0)
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_7e3e9d3f44.mp3?filename=rain-and-thunder-sounds-for-sleeping-black-screen-126699.mp3'
    },
    { 
        id: 'ocean', 
        label: '파도소리', 
        desc: '바다의 리듬에 맡기기',
        iconName: 'Waves',
        color: '#00d2d3',
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_f0a69b3d97.mp3?filename=ocean-waves-112906.mp3'
    },
    { 
        id: 'forest', 
        label: '숲속 새소리', 
        desc: '자연의 품에서 쉬기',
        iconName: 'Plant',
        color: '#32ff7e',
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=forest-wind-and-birds-sounds-nature-sounds-8013.mp3'
    },
    { 
        id: 'singingbowl', 
        label: '싱잉볼', 
        desc: '티벳 싱잉볼의 울림',
        iconName: 'Sparkle',
        color: '#a29bfe',
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/18/audio_69a97e72c8.mp3?filename=singing-bowl-sound-1-123051.mp3'
    }
];

export const SPECIALIST_QUESTIONS = {
    morning: [
        { 
            q: "아까 알람 소리 들었을 때, 솔직히 어떤 기분이었어요?",
            sub: "첫 반응이 하루를 말해줘요",
            insight: "짜증 → 피로 누적, 불안 → 과제 압박, 무덤덤 → 무기력"
        },
        { 
            q: "지금 이 순간, 가장 하고 싶은 게 뭐예요?",
            sub: "숨겨진 욕구가 현재 상태를 알려줘요",
            insight: "자고 싶다 → 피로, 도망치고 싶다 → 스트레스, 아무것도 → 무기력"
        },
        {
            q: "오늘 누군가를 만나야 한다면, 기대돼요 아니면 피하고 싶어요?",
            sub: "사회적 에너지 상태를 체크해요",
            insight: "피하고 싶다면 혼자만의 명상이 맞아요"
        },
        {
            q: "지금 5초간 가만히 있어보세요... 무슨 생각이 먼저 왔어요?",
            sub: "무의식이 가장 먼저 보내는 신호예요",
            insight: "걱정 → 불안, 할 일 → 스트레스, 아무것도 → 좋은 상태"
        }
    ],
    afternoon: [
        { 
            q: "지금 뭔가에 집중하라고 하면... 솔직히 가능해요?",
            sub: "오후의 정신 상태를 직접 물어봐요",
            insight: "불가능 → 과부하, 억지로 가능 → 스트레스, 가능 → 양호"
        },
        { 
            q: "오늘 아직 웃은 적 있어요?",
            sub: "감정의 온도를 체크해요",
            insight: "기억 안 남 → 무감각, 없음 → 긴장/스트레스"
        },
        {
            q: "지금 가장 신경 쓰이는 게 뭐예요? 한 단어로요.",
            sub: "단어 하나가 마음의 핵심을 보여줘요",
            insight: "그 단어가 오늘의 명상 주제가 될 거예요"
        },
        {
            q: "몸 어디가 가장 불편해요? 손으로 만져보세요.",
            sub: "몸은 거짓말을 안 해요",
            insight: "어깨→책임감, 허리→지지 부족, 목→표현 억압"
        }
    ],
    night: [
        { 
            q: "오늘 하루, 한 문장으로 하면 뭐였어요?",
            sub: "무의식이 하루를 정리하는 방식이에요",
            insight: "부정적 문장 → 정화 필요, 중립 → 마무리 필요"
        },
        { 
            q: "지금 뇌가 '꺼졌으면 좋겠다' 싶어요?",
            sub: "정신적 과부하 정도를 알아봐요",
            insight: "강하게 공감 → 깊은 이완 필요"
        },
        {
            q: "오늘 나한테 '수고했다' 말해줬어요?",
            sub: "자기 위로 능력을 체크해요",
            insight: "아니요 → 자기 연민 명상 추천"
        },
        {
            q: "지금 눈 감으면 바로 잘 수 있을 것 같아요?",
            sub: "수면 준비 상태를 알아봐요",
            insight: "아니요 → 생각 정리 명상 필요"
        }
    ]
};

export const AI_SESSION_MESSAGES = {
    v1: [
        "편안한 자세를 찾아보세요. 완벽할 필요 없어요.",
        "코로 천천히 들이마시고... 4초... 참고... 7초... 내쉬고... 8초...",
        "생각이 떠오르면 판단하지 말고 그냥 바라보세요. 구름처럼 지나갈 거예요.",
        "어깨를 귀에서 멀리 떨어뜨려보세요. 아, 그렇죠.",
        "이 순간, 당신은 아무것도 해야 할 필요가 없어요.",
        "호흡이 당신을 데려가는 곳으로 따라가보세요.",
        "지금 이 공간은 안전해요. 모든 것을 내려놓아도 괜찮아요.",
        "매 호흡마다 긴장이 조금씩 녹아내리고 있어요.",
        "잘하고 있어요. 이 순간에 있는 것만으로 충분해요.",
        "마지막으로, 오늘 하루 나에게 '수고했다'고 말해주세요."
    ],
    v2: [
        "당신의 호흡 소리가 들려요. 자연스러운 리듬이네요.",
        "내쉴 때마다 어깨가 조금씩 내려가는 것을 느껴보세요.",
        "호흡이 깊어지고 있어요. 좋은 신호예요.",
        "숨이 들어오고 나가는 그 사이의 고요함을 느껴보세요.",
        "지금 호흡은 파도와 같아요. 밀려오고, 밀려가고.",
        "숨소리 외에 아무것도 신경 쓰지 않아도 돼요."
    ],
    v3: [
        "자세를 확인해볼게요. 척추가 자연스럽게 펴져 있나요?",
        "턱을 살짝 당기고 목 뒤를 늘려보세요.",
        "어깨가 귀 쪽으로 올라갔네요. 투욱 떨어뜨려보세요.",
        "미간에 힘을 빼보세요. 표정이 부드러워졌어요.",
        "손은 편하게 무릎 위에 올려놓으세요.",
        "자세가 안정되니 호흡도 깊어지네요."
    ]
};
