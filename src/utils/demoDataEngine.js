/**
 * Demo Data Engine — 각 나라 물가/문화에 맞는 현실적 데모 데이터 생성
 * Firestore 없이 클라이언트에서 동적 생성
 */
import { isDemoEnvironment, localizeKoreanName } from './demoLocalization';

// ═══════════════════════════════════════════════════
//  1. 나라별 현실적 가격 (환율 변환 ❌, 현지 물가 ✅)
// ═══════════════════════════════════════════════════
const LOCAL_PRICING = {
  ko: {
    currency: 'KRW', symbol: '₩', locale: 'ko-KR',
    plans: [
      { name: '정규권(3개월)', price: 450000, months: 3, credits: null },
      { name: 'MTypeC (Pass)', price: 150000, months: 1, credits: null },
      { name: '쿠폰(10회)', price: 200000, months: 3, credits: 10 },
      { name: '원데이 클래스', price: 25000, months: 0, credits: 1 },
    ]
  },
  en: {
    currency: 'USD', symbol: '$', locale: 'en-US',
    plans: [
      { name: 'Quarterly Unlimited', price: 399, months: 3, credits: null },
      { name: 'Monthly Unlimited', price: 149, months: 1, credits: null },
      { name: '10-Class Pack', price: 189, months: 3, credits: 10 },
      { name: 'Drop-In Class', price: 25, months: 0, credits: 1 },
    ]
  },
  ja: {
    currency: 'JPY', symbol: '¥', locale: 'ja-JP',
    plans: [
      { name: '3ヶ月フリーパス', price: 36000, months: 3, credits: null },
      { name: '月額フリーパス', price: 12800, months: 1, credits: null },
      { name: '10回チケット', price: 16500, months: 3, credits: 10 },
      { name: '体験レッスン', price: 2200, months: 0, credits: 1 },
    ]
  },
  zh: {
    currency: 'CNY', symbol: '¥', locale: 'zh-CN',
    plans: [
      { name: '季卡(3个月)', price: 1680, months: 3, credits: null },
      { name: '月卡', price: 598, months: 1, credits: null },
      { name: '10次卡', price: 780, months: 3, credits: 10 },
      { name: '体验课', price: 98, months: 0, credits: 1 },
    ]
  },
  es: {
    currency: 'EUR', symbol: '€', locale: 'es-ES',
    plans: [
      { name: 'Trimestral Ilimitado', price: 249, months: 3, credits: null },
      { name: 'Mensual Ilimitado', price: 89, months: 1, credits: null },
      { name: 'Bono 10 Clases', price: 119, months: 3, credits: 10 },
      { name: 'Clase Suelta', price: 15, months: 0, credits: 1 },
    ]
  },
  fr: {
    currency: 'EUR', symbol: '€', locale: 'fr-FR',
    plans: [
      { name: 'Abonnement Trimestriel', price: 269, months: 3, credits: null },
      { name: 'Abonnement Mensuel', price: 95, months: 1, credits: null },
      { name: 'Carnet 10 Cours', price: 129, months: 3, credits: 10 },
      { name: 'Cours d\'essai', price: 18, months: 0, credits: 1 },
    ]
  },
  de: {
    currency: 'EUR', symbol: '€', locale: 'de-DE',
    plans: [
      { name: 'Quartals-Flatrate', price: 279, months: 3, credits: null },
      { name: 'Monats-Flatrate', price: 99, months: 1, credits: null },
      { name: '10er-Karte', price: 139, months: 3, credits: 10 },
      { name: 'Schnupperstunde', price: 20, months: 0, credits: 1 },
    ]
  },
  pt: {
    currency: 'BRL', symbol: 'R$', locale: 'pt-BR',
    plans: [
      { name: 'Trimestral Ilimitado', price: 799, months: 3, credits: null },
      { name: 'Mensal Ilimitado', price: 289, months: 1, credits: null },
      { name: 'Pacote 10 Aulas', price: 389, months: 3, credits: 10 },
      { name: 'Aula Avulsa', price: 49, months: 0, credits: 1 },
    ]
  },
  vi: {
    currency: 'VND', symbol: '₫', locale: 'vi-VN',
    plans: [
      { name: 'Gói 3 Tháng', price: 2500000, months: 3, credits: null },
      { name: 'Gói Tháng', price: 890000, months: 1, credits: null },
      { name: 'Gói 10 Buổi', price: 1200000, months: 3, credits: 10 },
      { name: 'Lớp Thử', price: 150000, months: 0, credits: 1 },
    ]
  },
  th: {
    currency: 'THB', symbol: '฿', locale: 'th-TH',
    plans: [
      { name: 'แพ็คเกจ 3 เดือน', price: 7500, months: 3, credits: null },
      { name: 'แพ็คเกจรายเดือน', price: 2700, months: 1, credits: null },
      { name: 'แพ็คเกจ 10 ครั้ง', price: 3500, months: 3, credits: 10 },
      { name: 'คลาสทดลอง', price: 450, months: 0, credits: 1 },
    ]
  },
  ru: {
    currency: 'RUB', symbol: '₽', locale: 'ru-RU',
    plans: [
      { name: 'Квартальный абонемент', price: 16500, months: 3, credits: null },
      { name: 'Месячный безлимит', price: 5900, months: 1, credits: null },
      { name: 'Абонемент 10 занятий', price: 7500, months: 3, credits: 10 },
      { name: 'Пробное занятие', price: 900, months: 0, credits: 1 },
    ]
  },
};

// ═══════════════════════════════════════════════════
//  2. 수업 유형 & 강사 이름 (현지화)
// ═══════════════════════════════════════════════════
const LOCAL_CLASSES = {
  ko: ['하타', '빈야사', '인요가', '플라잉', '힐링', '아쉬탕가'],
  en: ['Hatha', 'Vinyasa', 'Yin Yoga', 'Aerial', 'Healing Flow', 'Ashtanga'],
  ja: ['ハタ', 'ヴィンヤサ', '陰ヨガ', 'エアリアル', 'ヒーリング', 'アシュタンガ'],
  zh: ['哈他', '流瑜伽', '阴瑜伽', '空中瑜伽', '疗愈', '阿斯汤加'],
  es: ['Hatha', 'Vinyasa', 'Yin Yoga', 'Aéreo', 'Restaurativo', 'Ashtanga'],
  fr: ['Hatha', 'Vinyasa', 'Yin Yoga', 'Aérien', 'Restauratif', 'Ashtanga'],
  de: ['Hatha', 'Vinyasa', 'Yin Yoga', 'Aerial', 'Restorative', 'Ashtanga'],
  pt: ['Hatha', 'Vinyasa', 'Yin Yoga', 'Aéreo', 'Restaurativo', 'Ashtanga'],
  vi: ['Hatha', 'Vinyasa', 'Âm Yoga', 'Yoga Bay', 'Chữa Lành', 'Ashtanga'],
  th: ['หฐะ', 'วินยาสะ', 'หยินโยคะ', 'แอเรียล', 'ฮีลลิ่ง', 'อัษฎางค์'],
  ru: ['Хатха', 'Виньяса', 'Инь-йога', 'Аэройога', 'Восстановление', 'Аштанга'],
};

const LOCAL_INSTRUCTORS = {
  ko: ['김지현', '박서연', '이수빈', '최유진', '정하나'],
  en: ['Sarah Chen', 'Maya Roberts', 'Jessica Kim', 'Lily Adams', 'Emma Wilson'],
  ja: ['田中 花子', '佐藤 美咲', '鈴木 陽子', '高橋 結衣', '伊藤 さくら'],
  zh: ['王芳', '李娜', '张伟', '陈静', '杨丽'],
  es: ['Valentina García', 'Camila López', 'Sofía Martínez', 'Isabella Rodríguez', 'Andrea Flores'],
  fr: ['Camille Dupont', 'Léa Martin', 'Manon Bernard', 'Chloé Petit', 'Inès Leroy'],
  de: ['Lena Müller', 'Sophie Schmidt', 'Marie Schneider', 'Anna Fischer', 'Laura Weber'],
  pt: ['Ana Silva', 'Beatriz Santos', 'Camila Oliveira', 'Diana Costa', 'Fernanda Pereira'],
  vi: ['Nguyễn Thị Lan', 'Trần Thị Hoa', 'Lê Thị Mai', 'Phạm Thị Hương', 'Hoàng Thị Linh'],
  th: ['สมใจ วงศ์ไพศาล', 'นิตยา สุขสวัสดิ์', 'พรพิมล จันทร์เพ็ญ', 'วิภาดา รัตนะ', 'สุกัญญา ศรีสุข'],
  ru: ['Анна Иванова', 'Мария Петрова', 'Елена Сидорова', 'Ольга Козлова', 'Наталья Новикова'],
};

const LOCAL_BRANCH_NAMES = {
  ko: ['광흥창점', '마포점'],
  en: ['Downtown', 'Westside'],
  ja: ['渋谷店', '新宿店'],
  zh: ['静安店', '徐汇店'],
  es: ['Centro', 'Norte'],
  fr: ['Centre-Ville', 'Rive Gauche'],
  de: ['Mitte', 'Charlottenburg'],
  pt: ['Centro', 'Jardins'],
  vi: ['Quận 1', 'Quận 3'],
  th: ['สาขาสีลม', 'สาขาทองหล่อ'],
  ru: ['Центр', 'Пресня'],
};

// ═══════════════════════════════════════════════════
//  3. 시간표 패턴 (복샘요가 기반)
// ═══════════════════════════════════════════════════
const SCHEDULE_TEMPLATE = [
  // 평일 기본 패턴 (월~금)
  { time: '06:30', duration: 90, classIdx: 5, instrIdx: 0 },  // Ashtanga/Mysore
  { time: '09:00', duration: 75, classIdx: 0, instrIdx: 1 },  // Hatha
  { time: '10:30', duration: 60, classIdx: 1, instrIdx: 2 },  // Vinyasa
  { time: '14:00', duration: 60, classIdx: 2, instrIdx: 3 },  // Yin
  { time: '18:30', duration: 75, classIdx: 1, instrIdx: 4 },  // Vinyasa
  { time: '20:00', duration: 60, classIdx: 4, instrIdx: 1 },  // Healing
];

const WEEKEND_TEMPLATE = [
  { time: '09:00', duration: 90, classIdx: 0, instrIdx: 0 },
  { time: '11:00', duration: 60, classIdx: 3, instrIdx: 2 },  // Aerial
  { time: '14:00', duration: 60, classIdx: 2, instrIdx: 3 },  // Yin
];

// ═══════════════════════════════════════════════════
//  4. Seeded random (결정적 — 같은 날짜/언어 = 같은 결과)
// ═══════════════════════════════════════════════════
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// ═══════════════════════════════════════════════════
//  5. 월간 스케줄 생성
// ═══════════════════════════════════════════════════
export function generateDemoSchedule(lang, year, month, branchId = 'main') {
  if (lang === 'ko') return null; // 한국어는 실제 데이터 사용
  const classes = LOCAL_CLASSES[lang] || LOCAL_CLASSES.en;
  const instructors = LOCAL_INSTRUCTORS[lang] || LOCAL_INSTRUCTORS.en;
  const daysInMonth = new Date(year, month, 0).getDate();
  const result = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dow = new Date(year, month - 1, day).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const template = isWeekend ? WEEKEND_TEMPLATE : SCHEDULE_TEMPLATE;
    const rand = seededRandom(hashStr(`${lang}${date}${branchId}`));

    result[date] = template.map((slot, idx) => {
      // 10% 확률로 수업 취소 (현실적)
      if (rand() < 0.1) return null;
      const instrShift = Math.floor(rand() * 2);
      return {
        id: `demo-${date}-${idx}`,
        classType: classes[slot.classIdx % classes.length],
        instructor: instructors[(slot.instrIdx + instrShift) % instructors.length],
        time: slot.time,
        duration: slot.duration,
        capacity: 15 + Math.floor(rand() * 6),
        branchId: branchId,
        date: date,
      };
    }).filter(Boolean);
  }
  return result;
}

// ═══════════════════════════════════════════════════
//  6. 출석 데이터 생성 (이번 달, 오늘까지)
// ═══════════════════════════════════════════════════
export function generateDemoAttendance(lang, year, month, members) {
  if (lang === 'ko') return null;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const daysInMonth = new Date(year, month, 0).getDate();
  const maxDay = (year === today.getFullYear() && month === today.getMonth() + 1)
    ? today.getDate() : daysInMonth;

  const classes = LOCAL_CLASSES[lang] || LOCAL_CLASSES.en;
  const instructors = LOCAL_INSTRUCTORS[lang] || LOCAL_INSTRUCTORS.en;
  const branches = LOCAL_BRANCH_NAMES[lang] || LOCAL_BRANCH_NAMES.en;
  const logs = [];

  for (let day = 1; day <= maxDay; day++) {
    const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dow = new Date(year, month - 1, day).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const rand = seededRandom(hashStr(`attend-${lang}-${date}`));

    // 하루 평균 출석: 평일 18~28명, 주말 10~18명
    const dailyCount = isWeekend
      ? 10 + Math.floor(rand() * 9)
      : 18 + Math.floor(rand() * 11);

    const schedule = isWeekend ? WEEKEND_TEMPLATE : SCHEDULE_TEMPLATE;

    for (let i = 0; i < dailyCount; i++) {
      const memberIdx = Math.floor(rand() * (members?.length || 40));
      const member = members?.[memberIdx] || { id: `demo-m-${memberIdx}`, name: `Member ${memberIdx}` };
      const slot = schedule[Math.floor(rand() * schedule.length)];
      const hour = parseInt(slot.time.split(':')[0]);
      const min = parseInt(slot.time.split(':')[1]) + Math.floor(rand() * 15);

      logs.push({
        id: `demo-att-${date}-${i}`,
        memberId: member.id || `demo-m-${memberIdx}`,
        memberName: member.name || localizeKoreanName(`회원${memberIdx}`, lang),
        date: date,
        timestamp: `${date}T${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}:00`,
        className: classes[slot.classIdx % classes.length],
        instructor: instructors[slot.instrIdx % instructors.length],
        branchId: branches[0],
        source: rand() > 0.3 ? 'facial' : 'pin',
      });
    }
  }

  return logs;
}

// ═══════════════════════════════════════════════════
//  7. 매출 데이터 생성 (현지 물가 기반)
// ═══════════════════════════════════════════════════
export function generateDemoSales(lang, year, month, members) {
  if (lang === 'ko') return null;
  const pricing = LOCAL_PRICING[lang] || LOCAL_PRICING.en;
  const today = new Date();
  const maxDay = (year === today.getFullYear() && month === today.getMonth() + 1)
    ? today.getDate() : new Date(year, month, 0).getDate();
  const rand = seededRandom(hashStr(`sales-${lang}-${year}-${month}`));
  const sales = [];

  // 월 총 판매: 25~40건 (신규 5~10, 재등록 15~25, 체험 5~8)
  const totalSales = 25 + Math.floor(rand() * 16);

  for (let i = 0; i < totalSales; i++) {
    const day = 1 + Math.floor(rand() * maxDay);
    const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const memberIdx = Math.floor(rand() * (members?.length || 40));
    const member = members?.[memberIdx] || { id: `demo-m-${memberIdx}`, name: `Member ${memberIdx}` };

    // 비율: 월정액 40%, 10회권 30%, 3개월 15%, 체험 15%
    const r = rand();
    let planIdx;
    if (r < 0.15) planIdx = 0;      // 3개월
    else if (r < 0.55) planIdx = 1;  // 월정액
    else if (r < 0.85) planIdx = 2;  // 10회권
    else planIdx = 3;                 // 체험

    const plan = pricing.plans[planIdx];
    const isNew = rand() < 0.3;

    sales.push({
      id: `demo-sale-${i}`,
      memberId: member.id || `demo-m-${memberIdx}`,
      memberName: member.name || `Member ${memberIdx}`,
      productName: plan.name,
      amount: plan.price,
      date: date,
      timestamp: `${date}T${String(9 + Math.floor(rand() * 10)).padStart(2,'0')}:${String(Math.floor(rand() * 60)).padStart(2,'0')}:00`,
      type: isNew ? 'new' : 'renewal',
      months: plan.months,
      credits: plan.credits,
      branchId: 'main',
    });
  }

  // 날짜순 정렬
  sales.sort((a, b) => a.date.localeCompare(b.date));
  return sales;
}

// ═══════════════════════════════════════════════════
//  8. 강사 목록 생성
// ═══════════════════════════════════════════════════
export function generateDemoInstructors(lang) {
  if (lang === 'ko') return null;
  const names = LOCAL_INSTRUCTORS[lang] || LOCAL_INSTRUCTORS.en;
  const classes = LOCAL_CLASSES[lang] || LOCAL_CLASSES.en;

  return names.map((name, i) => ({
    name,
    id: `demo-instr-${i}`,
    specialty: classes[i % classes.length],
    active: true,
  }));
}

// ═══════════════════════════════════════════════════
//  9. 가격표 생성
// ═══════════════════════════════════════════════════
export function generateDemoPricing(lang) {
  if (lang === 'ko') return null;
  const pricing = LOCAL_PRICING[lang] || LOCAL_PRICING.en;

  return {
    passes: pricing.plans.filter(p => !p.credits || p.credits > 1).map((p, i) => ({
      id: `demo-price-${i}`,
      title: p.name,
      price: p.price,
      months: p.months,
      credits: p.credits,
      description: '',
    })),
    regular: pricing.plans.filter(p => p.credits === 1).map((p, i) => ({
      id: `demo-price-r-${i}`,
      title: p.name,
      price: p.price,
      months: 0,
      credits: 1,
      description: '',
    })),
  };
}

// ═══════════════════════════════════════════════════
//  10. 통합 포맷 함수
// ═══════════════════════════════════════════════════
export function formatLocalCurrency(amount, lang) {
  const pricing = LOCAL_PRICING[lang] || LOCAL_PRICING.en;
  const noDecimals = ['KRW', 'JPY', 'VND'].includes(pricing.currency);
  try {
    return new Intl.NumberFormat(pricing.locale, {
      style: 'currency',
      currency: pricing.currency,
      minimumFractionDigits: noDecimals ? 0 : 0,
      maximumFractionDigits: noDecimals ? 0 : 0,
    }).format(amount);
  } catch {
    return `${pricing.symbol}${amount.toLocaleString()}`;
  }
}

// ═══════════════════════════════════════════════════
//  11. 데모 환경 판단 + 캐시
// ═══════════════════════════════════════════════════
const _cache = {};

export function getDemoData(lang, year, month) {
  if (!isDemoEnvironment() || lang === 'ko') return null;
  const key = `${lang}-${year}-${month}`;
  if (_cache[key]) return _cache[key];

  const data = {
    schedule: generateDemoSchedule(lang, year, month),
    attendance: generateDemoAttendance(lang, year, month, null),
    sales: generateDemoSales(lang, year, month, null),
    instructors: generateDemoInstructors(lang),
    pricing: generateDemoPricing(lang),
    branches: LOCAL_BRANCH_NAMES[lang] || LOCAL_BRANCH_NAMES.en,
  };

  _cache[key] = data;
  return data;
}

export { LOCAL_PRICING, LOCAL_CLASSES, LOCAL_INSTRUCTORS, LOCAL_BRANCH_NAMES };
