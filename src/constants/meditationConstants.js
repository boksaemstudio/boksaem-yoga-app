import { useLanguageStore } from '../stores/useLanguageStore';
// ==========================================
// 🧘 AI Mindful Guide - CONFIG
// "지금의 당신을 듣고, 지금의 명상을 만듭니다."
// ==========================================

// 🎯 Step 1: Meditation Categories - 큰 방향 (비움 vs 채움)
export const MEDITATION_CATEGORIES = [{
  id: 'healing',
  label: "\uC9C0\uCE5C \uB9C8\uC74C\uC744 \uBE44\uC6B0\uACE0 \uC2F6\uC5B4\uC694",
  subtitle: "\uCE58\uC720\uC640 \uC774\uC644",
  description: "\uBE44\uC6CC\uB0C4\uC73C\uB85C\uC368 \uBE44\uB85C\uC18C \uD3C9\uC628\uD574\uC9C0\uB294 \uC2DC\uAC04\uC785\uB2C8\uB2E4.",
  emoji: '🌊',
  direction: 'negative_to_zero' // 회복 모드
}, {
  id: 'growth',
  label: "\uBC1D\uC740 \uC5D0\uB108\uC9C0\uB97C \uCC44\uC6B0\uACE0 \uC2F6\uC5B4\uC694",
  subtitle: "\uC131\uC7A5\uACFC \uC5F0\uACB0",
  description: "\uB2F9\uC2E0\uC758 \uB0B4\uBA74\uC774 \uAC00\uC9C4 \uBCF8\uC5F0\uC758 \uBE5B\uC744 \uAE68\uC6B0\uB294 \uC2DC\uAC04\uC785\uB2C8\uB2E4.",
  emoji: '✨',
  direction: 'zero_to_positive' // 성장 모드
}];

// 🎯 Step 2: Meditation Intentions - 구체적 의도 (총 8가지)
export const MEDITATION_INTENTIONS = [
// === A그룹: 비움과 치유 (Healing) ===
{
  id: 'body_rest',
  category: 'healing',
  label: "\uC9C0\uCE5C \uBAB8\uC5D0 \uAE4A\uC740 \uD734\uC2DD\uC744 \uC120\uBB3C\uD558\uACE0 \uC2F6\uC5B4\uC694",
  tag: "\uC2E0\uCCB4",
  emoji: '😌',
  focus: 'body',
  keywords: ["\uADFC\uC721 \uC774\uC644", "\uC548\uC804 \uC2E0\uD638", "\uBC14\uB514\uC2A4\uCE94"]
}, {
  id: 'mind_calm',
  category: 'healing',
  label: "\uD3ED\uD48D \uAC19\uC740 \uC0DD\uAC01\uB4E4\uC744 \uC7A0\uC7AC\uC6B0\uACE0 \uACE0\uC694\uD574\uC9C0\uACE0 \uC2F6\uC5B4\uC694",
  tag: "\uC0DD\uAC01",
  emoji: '🍃',
  focus: 'mind',
  keywords: ["\uC778\uC9C0 \uACFC\uBD80\uD558", "\uC0DD\uAC01 \uBD84\uB9AC", "\uD638\uD761 \uC9D1\uC911"]
}, {
  id: 'emotion_release',
  category: 'healing',
  label: "\uB0B4 \uC548\uC5D0 \uC313\uC778 \uAC10\uC815\uC758 \uCC0C\uAEBC\uAE30\uB97C \uD758\uB824\uBCF4\uB0B4\uACE0 \uC2F6\uC5B4\uC694",
  tag: "\uAC10\uC815",
  emoji: '🌧️',
  focus: 'emotion',
  keywords: ["\uAC10\uC815 \uBC30\uCD9C", "\uC815\uC11C\uC801 \uACF5\uAC04 \uD655\uBCF4"]
}, {
  id: 'let_go',
  category: 'healing',
  label: "\uD1B5\uC81C\uD560 \uC218 \uC5C6\uB294 \uBD88\uC548\uC744 \uADF8\uB9CC \uB0B4\uB824\uB193\uACE0 \uC2F6\uC5B4\uC694",
  tag: "\uB0B4\uB824\uB193\uAE30",
  emoji: '🕊️',
  focus: 'detachment',
  keywords: ["\uC9D1\uCC29 \uB0B4\uB824\uB193\uAE30", "\uC2EC\uB9AC\uC801 \uAC70\uB9AC\uB450\uAE30"]
},
// === B그룹: 채움과 성장 (Growth) ===
{
  id: 'inner_voice',
  category: 'growth',
  label: "\uC678\uBD80\uC758 \uC18C\uC74C\uC740 \uB044\uACE0, \uB0B4 \uC548\uC758 \uBAA9\uC18C\uB9AC\uC5D0 \uADC0 \uAE30\uC6B8\uC77C\uB798\uC694",
  tag: "\uBAB0\uC785",
  emoji: '🧘',
  focus: 'sensation',
  keywords: ["\uAC10\uAC01 \uD68C\uC218", "\uB0B4\uBA74 \uBAB0\uC785", "\uACE0\uC694"]
}, {
  id: 'self_compassion',
  category: 'growth',
  label: "\uC560\uC4F0\uC9C0 \uC54A\uACE0, \uC9C0\uAE08\uC758 \uB098\uB97C \uC788\uB294 \uADF8\uB300\uB85C \uC548\uC544\uC904\uB798\uC694",
  tag: "\uC218\uC6A9",
  emoji: '💚',
  focus: 'acceptance',
  keywords: ["\uBE44\uD310\uB2E8\uC801 \uC218\uC6A9", "\uC790\uAE30 \uC5F0\uBBFC", "\uD604\uC874"]
}, {
  id: 'energy_recharge',
  category: 'growth',
  label: "\uBC29\uC804\uB41C \uC5D0\uB108\uC9C0\uB97C \uCC44\uC6B0\uACE0, \uB2E4\uC2DC \uB098\uC544\uAC08 \uD798\uC744 \uC5BB\uACE0 \uC2F6\uC5B4\uC694",
  tag: "\uD65C\uB825",
  emoji: '⚡',
  focus: 'vitality',
  keywords: ["\uC5D0\uB108\uC9C0 \uC21C\uD658", "\uD68C\uBCF5 \uD0C4\uB825\uC131", "\uC758\uC695"]
}, {
  id: 'gratitude',
  category: 'growth',
  label: "\uB2F9\uC5F0\uD588\uB358 \uAC83\uB4E4 \uC18D\uC5D0\uC11C \uC18C\uC911\uD55C \uC758\uBBF8\uB97C \uBC1C\uACAC\uD558\uACE0 \uC2F6\uC5B4\uC694",
  tag: "\uAC10\uC0AC",
  emoji: '🌟',
  focus: 'gratitude',
  keywords: ["\uAE0D\uC815 \uD3B8\uD5A5", "\uAD00\uACC4\uC758 \uC5F0\uACB0", "\uC790\uC874\uAC10"]
}];
export const MEDITATION_MODES = [{
  id: 'breath',
  label: "3\uBD84 \uC228 \uACE0\uB974\uAE30",
  time: 3 * 60,
  iconName: 'Wind',
  color: '#48dbfb',
  desc: "\uC7A0\uAE50\uC758 \uD638\uD761\uC73C\uB85C \uADE0\uD615 \uCC3E\uAE30",
  freq: 10
}, {
  id: 'calm',
  label: "7\uBD84 \uB9C8\uC74C \uC815\uB3C8",
  time: 7 * 60,
  iconName: 'Brain',
  color: 'var(--primary-gold)',
  desc: "\uD750\uD2B8\uB7EC\uC9C4 \uB9C8\uC74C \uB3CC\uBCF4\uAE30",
  freq: 8
}, {
  id: 'deep',
  label: "15\uBD84 \uAE4A\uC740 \uC774\uC644",
  time: 15 * 60,
  iconName: 'Sparkle',
  color: '#a29bfe',
  desc: "\uAE4A\uC740 \uBA85\uC0C1\uC758 \uC138\uACC4\uB85C",
  freq: 6
}];

// Interaction Types - Bio-Feedback Loop
export const INTERACTION_TYPES = {
  v1: {
    id: 'v1',
    label: "\uC628\uBAB8 \uC774\uC644 \uAC00\uC774\uB4DC",
    desc: "\uD83D\uDCF1 \uAE30\uAE30 \uC790\uC720 \xB7 \uC74C\uC131\uC73C\uB85C \uD3B8\uC548\uD558\uAC8C \uC548\uB0B4",
    iconName: 'Wind'
  },
  v2: {
    id: 'v2',
    label: "\uD638\uD761 \uBAB0\uC785",
    desc: "\uD83C\uDFA4 \uB9C8\uC774\uD06C \uC0AC\uC6A9 \xB7 \uC228\uC18C\uB9AC\uB97C \uAC10\uC9C0\uD574 \uBC18\uC751",
    iconName: 'Microphone'
  },
  v3: {
    id: 'v3',
    label: "\uC790\uC138 \uAD50\uC815",
    desc: "\uD83D\uDCF7 \uCE74\uBA54\uB77C \uD544\uC218 \xB7 \uC804\uC2E0\uC774 \uBCF4\uC774\uAC8C 2m \uAC70\uB9AC",
    iconName: 'VideoCamera'
  }
};
export const DIAGNOSIS_OPTIONS = [{
  id: 'stress',
  label: "\uBA38\uB9AC\uAC00 \uBCF5\uC7A1\uD574\uC694",
  iconName: 'Lightning',
  color: '#FF6B6B',
  prescription: {
    modeId: 'calm',
    type: 'v2'
  }
}, {
  id: 'stiff',
  label: "\uBAB8\uC774 \uCC0C\uBFCC\uB465\uD574\uC694",
  iconName: 'Barbell',
  color: '#4ECDC4',
  prescription: {
    modeId: 'breath',
    type: 'v3'
  }
}, {
  id: 'anxious',
  label: "\uB9C8\uC74C\uC774 \uBD88\uC548\uD574\uC694",
  iconName: 'Heartbeat',
  color: '#FFD93D',
  prescription: {
    modeId: 'deep',
    type: 'v2'
  }
}, {
  id: 'tired',
  label: "\uBB34\uAE30\uB825\uD574\uC694",
  iconName: 'SmileySad',
  color: '#A8A4CE',
  prescription: {
    modeId: 'calm',
    type: 'v1'
  }
}, {
  id: 'overthink',
  label: "\uC0DD\uAC01\uC774 \uAF2C\uB9AC\uC5D0 \uAF2C\uB9AC\uB97C \uBB3C\uC5B4\uC694",
  iconName: 'Brain',
  color: '#a29bfe',
  prescription: {
    modeId: 'calm',
    type: 'v2'
  }
}, {
  id: 'frustrated',
  label: "\uAC00\uC2B4\uC774 \uB2F5\uB2F5\uD574\uC694",
  iconName: 'Wind',
  color: '#48dbfb',
  prescription: {
    modeId: 'breath',
    type: 'v2'
  }
}, {
  id: 'low_energy',
  label: "\uC5D0\uB108\uC9C0\uAC00 \uBC14\uB2E5\uB0AC\uC5B4\uC694",
  iconName: 'Sparkle',
  color: '#FFD32A',
  prescription: {
    modeId: 'breath',
    type: 'v1'
  }
}, {
  id: 'distracted',
  label: "\uC9D1\uC911\uC774 \uC548 \uB3FC\uC694",
  iconName: 'Lightning',
  color: '#32ff7e',
  prescription: {
    modeId: 'calm',
    type: 'v2'
  }
}];
export const WEATHER_OPTIONS = [{
  id: 'sun',
  label: "\uB9D1\uC74C",
  iconName: 'Sun',
  color: '#FFD23F'
}, {
  id: 'cloud',
  label: "\uD750\uB9BC",
  iconName: 'Cloud',
  color: '#B0C4DE'
}, {
  id: 'rain',
  label: "\uBE44",
  iconName: 'CloudRain',
  color: '#4895EF'
}, {
  id: 'snow',
  label: "\uB208",
  iconName: 'CloudSnow',
  color: '#A8E6CF'
}];

// 🎵 Ambient Sound Options - Multi-layer audio for immersive meditation
export const AMBIENT_SOUNDS = [{
  id: 'none',
  label: "\uC8FC\uD30C\uC218\uB9CC",
  desc: "\uC21C\uC218\uD55C binaural beats",
  iconName: 'Wind',
  color: '#48dbfb',
  audioUrl: null
}, {
  id: 'rain',
  label: "\uBE57\uC18C\uB9AC",
  desc: "\uBD80\uB4DC\uB7EC\uC6B4 \uBE57\uC18C\uB9AC\uC640 \uD568\uAED8",
  iconName: 'CloudRain',
  color: '#4895EF',
  // Free ambient audio from Pixabay (CC0)
  audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_7e3e9d3f44.mp3?filename=rain-and-thunder-sounds-for-sleeping-black-screen-126699.mp3'
}, {
  id: 'ocean',
  label: "\uD30C\uB3C4\uC18C\uB9AC",
  desc: "\uBC14\uB2E4\uC758 \uB9AC\uB4EC\uC5D0 \uB9E1\uAE30\uAE30",
  iconName: 'Waves',
  color: '#00d2d3',
  audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_f0a69b3d97.mp3?filename=ocean-waves-112906.mp3'
}, {
  id: 'forest',
  label: "\uC232\uC18D \uC0C8\uC18C\uB9AC",
  desc: "\uC790\uC5F0\uC758 \uD488\uC5D0\uC11C \uC26C\uAE30",
  iconName: 'Plant',
  color: '#32ff7e',
  audioUrl: 'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=forest-wind-and-birds-sounds-nature-sounds-8013.mp3'
}, {
  id: 'singingbowl',
  label: "\uC2F1\uC789\uBCFC",
  desc: "\uD2F0\uBCB3 \uC2F1\uC789\uBCFC\uC758 \uC6B8\uB9BC",
  iconName: 'Sparkle',
  color: '#a29bfe',
  audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/18/audio_69a97e72c8.mp3?filename=singing-bowl-sound-1-123051.mp3'
}];
export const SPECIALIST_QUESTIONS = {
  morning: [{
    q: "\uC544\uAE4C \uC54C\uB78C \uC18C\uB9AC \uB4E4\uC5C8\uC744 \uB54C, \uC194\uC9C1\uD788 \uC5B4\uB5A4 \uAE30\uBD84\uC774\uC5C8\uC5B4\uC694?",
    sub: "\uCCAB \uBC18\uC751\uC774 \uD558\uB8E8\uB97C \uB9D0\uD574\uC918\uC694",
    insight: "\uC9DC\uC99D \u2192 \uD53C\uB85C \uB204\uC801, \uBD88\uC548 \u2192 \uACFC\uC81C \uC555\uBC15, \uBB34\uB364\uB364 \u2192 \uBB34\uAE30\uB825"
  }, {
    q: "\uC9C0\uAE08 \uC774 \uC21C\uAC04, \uAC00\uC7A5 \uD558\uACE0 \uC2F6\uC740 \uAC8C \uBB50\uC608\uC694?",
    sub: "\uC228\uACA8\uC9C4 \uC695\uAD6C\uAC00 \uD604\uC7AC \uC0C1\uD0DC\uB97C \uC54C\uB824\uC918\uC694",
    insight: "\uC790\uACE0 \uC2F6\uB2E4 \u2192 \uD53C\uB85C, \uB3C4\uB9DD\uCE58\uACE0 \uC2F6\uB2E4 \u2192 \uC2A4\uD2B8\uB808\uC2A4, \uC544\uBB34\uAC83\uB3C4 \u2192 \uBB34\uAE30\uB825"
  }, {
    q: "\uC624\uB298 \uB204\uAD70\uAC00\uB97C \uB9CC\uB098\uC57C \uD55C\uB2E4\uBA74, \uAE30\uB300\uB3FC\uC694 \uC544\uB2C8\uBA74 \uD53C\uD558\uACE0 \uC2F6\uC5B4\uC694?",
    sub: "\uC0AC\uD68C\uC801 \uC5D0\uB108\uC9C0 \uC0C1\uD0DC\uB97C \uCCB4\uD06C\uD574\uC694",
    insight: "\uD53C\uD558\uACE0 \uC2F6\uB2E4\uBA74 \uD63C\uC790\uB9CC\uC758 \uBA85\uC0C1\uC774 \uB9DE\uC544\uC694"
  }, {
    q: "\uC9C0\uAE08 5\uCD08\uAC04 \uAC00\uB9CC\uD788 \uC788\uC5B4\uBCF4\uC138\uC694... \uBB34\uC2A8 \uC0DD\uAC01\uC774 \uBA3C\uC800 \uC654\uC5B4\uC694?",
    sub: "\uBB34\uC758\uC2DD\uC774 \uAC00\uC7A5 \uBA3C\uC800 \uBCF4\uB0B4\uB294 \uC2E0\uD638\uC608\uC694",
    insight: "\uAC71\uC815 \u2192 \uBD88\uC548, \uD560 \uC77C \u2192 \uC2A4\uD2B8\uB808\uC2A4, \uC544\uBB34\uAC83\uB3C4 \u2192 \uC88B\uC740 \uC0C1\uD0DC"
  }],
  afternoon: [{
    q: "\uC9C0\uAE08 \uBB54\uAC00\uC5D0 \uC9D1\uC911\uD558\uB77C\uACE0 \uD558\uBA74... \uC194\uC9C1\uD788 \uAC00\uB2A5\uD574\uC694?",
    sub: "\uC624\uD6C4\uC758 \uC815\uC2E0 \uC0C1\uD0DC\uB97C \uC9C1\uC811 \uBB3C\uC5B4\uBD10\uC694",
    insight: "\uBD88\uAC00\uB2A5 \u2192 \uACFC\uBD80\uD558, \uC5B5\uC9C0\uB85C \uAC00\uB2A5 \u2192 \uC2A4\uD2B8\uB808\uC2A4, \uAC00\uB2A5 \u2192 \uC591\uD638"
  }, {
    q: "\uC624\uB298 \uC544\uC9C1 \uC6C3\uC740 \uC801 \uC788\uC5B4\uC694?",
    sub: "\uAC10\uC815\uC758 \uC628\uB3C4\uB97C \uCCB4\uD06C\uD574\uC694",
    insight: "\uAE30\uC5B5 \uC548 \uB0A8 \u2192 \uBB34\uAC10\uAC01, \uC5C6\uC74C \u2192 \uAE34\uC7A5/\uC2A4\uD2B8\uB808\uC2A4"
  }, {
    q: "\uC9C0\uAE08 \uAC00\uC7A5 \uC2E0\uACBD \uC4F0\uC774\uB294 \uAC8C \uBB50\uC608\uC694? \uD55C \uB2E8\uC5B4\uB85C\uC694.",
    sub: "\uB2E8\uC5B4 \uD558\uB098\uAC00 \uB9C8\uC74C\uC758 \uD575\uC2EC\uC744 \uBCF4\uC5EC\uC918\uC694",
    insight: "\uADF8 \uB2E8\uC5B4\uAC00 \uC624\uB298\uC758 \uBA85\uC0C1 \uC8FC\uC81C\uAC00 \uB420 \uAC70\uC608\uC694"
  }, {
    q: "\uBAB8 \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uBD88\uD3B8\uD574\uC694? \uC190\uC73C\uB85C \uB9CC\uC838\uBCF4\uC138\uC694.",
    sub: "\uBAB8\uC740 \uAC70\uC9D3\uB9D0\uC744 \uC548 \uD574\uC694",
    insight: "\uC5B4\uAE68\u2192\uCC45\uC784\uAC10, \uD5C8\uB9AC\u2192\uC9C0\uC9C0 \uBD80\uC871, \uBAA9\u2192\uD45C\uD604 \uC5B5\uC555"
  }],
  night: [{
    q: "\uC624\uB298 \uD558\uB8E8, \uD55C \uBB38\uC7A5\uC73C\uB85C \uD558\uBA74 \uBB50\uC600\uC5B4\uC694?",
    sub: "\uBB34\uC758\uC2DD\uC774 \uD558\uB8E8\uB97C \uC815\uB9AC\uD558\uB294 \uBC29\uC2DD\uC774\uC5D0\uC694",
    insight: "\uBD80\uC815\uC801 \uBB38\uC7A5 \u2192 \uC815\uD654 \uD544\uC694, \uC911\uB9BD \u2192 \uB9C8\uBB34\uB9AC \uD544\uC694"
  }, {
    q: "\uC9C0\uAE08 \uB1CC\uAC00 '\uAEBC\uC84C\uC73C\uBA74 \uC88B\uACA0\uB2E4' \uC2F6\uC5B4\uC694?",
    sub: "\uC815\uC2E0\uC801 \uACFC\uBD80\uD558 \uC815\uB3C4\uB97C \uC54C\uC544\uBD10\uC694",
    insight: "\uAC15\uD558\uAC8C \uACF5\uAC10 \u2192 \uAE4A\uC740 \uC774\uC644 \uD544\uC694"
  }, {
    q: "\uC624\uB298 \uB098\uD55C\uD14C '\uC218\uACE0\uD588\uB2E4' \uB9D0\uD574\uC92C\uC5B4\uC694?",
    sub: "\uC790\uAE30 \uC704\uB85C \uB2A5\uB825\uC744 \uCCB4\uD06C\uD574\uC694",
    insight: "\uC544\uB2C8\uC694 \u2192 \uC790\uAE30 \uC5F0\uBBFC \uBA85\uC0C1 \uCD94\uCC9C"
  }, {
    q: "\uC9C0\uAE08 \uB208 \uAC10\uC73C\uBA74 \uBC14\uB85C \uC798 \uC218 \uC788\uC744 \uAC83 \uAC19\uC544\uC694?",
    sub: "\uC218\uBA74 \uC900\uBE44 \uC0C1\uD0DC\uB97C \uC54C\uC544\uBD10\uC694",
    insight: "\uC544\uB2C8\uC694 \u2192 \uC0DD\uAC01 \uC815\uB9AC \uBA85\uC0C1 \uD544\uC694"
  }]
};
export const AI_SESSION_MESSAGES = {
  v1: ["\uD3B8\uC548\uD55C \uC790\uC138\uB97C \uCC3E\uC544\uBCF4\uC138\uC694. \uC644\uBCBD\uD560 \uD544\uC694 \uC5C6\uC5B4\uC694.", "\uCF54\uB85C \uCC9C\uCC9C\uD788 \uB4E4\uC774\uB9C8\uC2DC\uACE0... 4\uCD08... \uCC38\uACE0... 7\uCD08... \uB0B4\uC26C\uACE0... 8\uCD08...", "\uC0DD\uAC01\uC774 \uB5A0\uC624\uB974\uBA74 \uD310\uB2E8\uD558\uC9C0 \uB9D0\uACE0 \uADF8\uB0E5 \uBC14\uB77C\uBCF4\uC138\uC694. \uAD6C\uB984\uCC98\uB7FC \uC9C0\uB098\uAC08 \uAC70\uC608\uC694.", "\uC5B4\uAE68\uB97C \uADC0\uC5D0\uC11C \uBA40\uB9AC \uB5A8\uC5B4\uB728\uB824\uBCF4\uC138\uC694. \uC544, \uADF8\uB807\uC8E0.", "\uC774 \uC21C\uAC04, \uB2F9\uC2E0\uC740 \uC544\uBB34\uAC83\uB3C4 \uD574\uC57C \uD560 \uD544\uC694\uAC00 \uC5C6\uC5B4\uC694.", "\uD638\uD761\uC774 \uB2F9\uC2E0\uC744 \uB370\uB824\uAC00\uB294 \uACF3\uC73C\uB85C \uB530\uB77C\uAC00\uBCF4\uC138\uC694.", "\uC9C0\uAE08 \uC774 \uACF5\uAC04\uC740 \uC548\uC804\uD574\uC694. \uBAA8\uB4E0 \uAC83\uC744 \uB0B4\uB824\uB193\uC544\uB3C4 \uAD1C\uCC2E\uC544\uC694.", "\uB9E4 \uD638\uD761\uB9C8\uB2E4 \uAE34\uC7A5\uC774 \uC870\uAE08\uC529 \uB179\uC544\uB0B4\uB9AC\uACE0 \uC788\uC5B4\uC694.", "\uC798\uD558\uACE0 \uC788\uC5B4\uC694. \uC774 \uC21C\uAC04\uC5D0 \uC788\uB294 \uAC83\uB9CC\uC73C\uB85C \uCDA9\uBD84\uD574\uC694.", "\uB9C8\uC9C0\uB9C9\uC73C\uB85C, \uC624\uB298 \uD558\uB8E8 \uB098\uC5D0\uAC8C '\uC218\uACE0\uD588\uB2E4'\uACE0 \uB9D0\uD574\uC8FC\uC138\uC694."],
  v2: ["\uB2F9\uC2E0\uC758 \uD638\uD761 \uC18C\uB9AC\uAC00 \uB4E4\uB824\uC694. \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uB9AC\uB4EC\uC774\uB124\uC694.", "\uB0B4\uC274 \uB54C\uB9C8\uB2E4 \uC5B4\uAE68\uAC00 \uC870\uAE08\uC529 \uB0B4\uB824\uAC00\uB294 \uAC83\uC744 \uB290\uAEF4\uBCF4\uC138\uC694.", "\uD638\uD761\uC774 \uAE4A\uC5B4\uC9C0\uACE0 \uC788\uC5B4\uC694. \uC88B\uC740 \uC2E0\uD638\uC608\uC694.", "\uC228\uC774 \uB4E4\uC5B4\uC624\uACE0 \uB098\uAC00\uB294 \uADF8 \uC0AC\uC774\uC758 \uACE0\uC694\uD568\uC744 \uB290\uAEF4\uBCF4\uC138\uC694.", "\uC9C0\uAE08 \uD638\uD761\uC740 \uD30C\uB3C4\uC640 \uAC19\uC544\uC694. \uBC00\uB824\uC624\uACE0, \uBC00\uB824\uAC00\uACE0.", "\uC228\uC18C\uB9AC \uC678\uC5D0 \uC544\uBB34\uAC83\uB3C4 \uC2E0\uACBD \uC4F0\uC9C0 \uC54A\uC544\uB3C4 \uB3FC\uC694."],
  v3: ["\uC790\uC138\uB97C \uD655\uC778\uD574\uBCFC\uAC8C\uC694. \uCC99\uCD94\uAC00 \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uD3B4\uC838 \uC788\uB098\uC694?", "\uD131\uC744 \uC0B4\uC9DD \uB2F9\uAE30\uACE0 \uBAA9 \uB4A4\uB97C \uB298\uB824\uBCF4\uC138\uC694.", "\uC5B4\uAE68\uAC00 \uADC0 \uCABD\uC73C\uB85C \uC62C\uB77C\uAC14\uB124\uC694. \uD22C\uC6B1 \uB5A8\uC5B4\uB728\uB824\uBCF4\uC138\uC694.", "\uBBF8\uAC04\uC5D0 \uD798\uC744 \uBE7C\uBCF4\uC138\uC694. \uD45C\uC815\uC774 \uBD80\uB4DC\uB7EC\uC6CC\uC84C\uC5B4\uC694.", "\uC190\uC740 \uD3B8\uD558\uAC8C \uBB34\uB98E \uC704\uC5D0 \uC62C\uB824\uB193\uC73C\uC138\uC694.", "\uC790\uC138\uAC00 \uC548\uC815\uB418\uB2C8 \uD638\uD761\uB3C4 \uAE4A\uC5B4\uC9C0\uB124\uC694."]
};