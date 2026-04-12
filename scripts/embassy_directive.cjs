/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  PassFlow AI HQ → 전 세계 대사관 일괄 지시                    ║
 * ║  11개국 랜딩 페이지 3개 카드 현지화 + 예약관리 + 배경 어둡게    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, '..', 'public');

// ─── 각 대사관별 현지화 카피 ─────────────────────────────
const EMBASSIES = {
  en: {
    file: path.join(publicDir, 'en', 'home.html'),
    card1_title: 'No Front Desk Needed',
    card1_old_desc: /Just place a tablet[\s\S]*?no staff required\./,
    card1_new: 'Just place a tablet at the entrance.<br>Members check in by face or PIN — no staff needed.',
    card2_title_old: 'Auto Credit Deduction',
    card2_title_new: 'Credits, Bookings & No-Shows',
    card2_old_desc: /Credits deduct automatically[\s\S]*?No more manual counting\./,
    card2_new: 'Credits deduct instantly on check-in, expiry auto-tracked.<br>No-show auto-deduction and extra bookings — one tap.',
    card3_old_desc: /Who came in[\s\S]*?straight to your phone\./,
    card3_new: 'Who showed up, how much revenue today.<br>Clean stats delivered to your phone.',
  },
  ja: {
    file: path.join(publicDir, 'ja', 'home.html'),
    card1_title: '受付なしでチェックイン',
    card1_old_desc: /タブレット1台を[\s\S]*?すぐに入館できます。/,
    card1_new: 'タブレット1台だけ。<br>顔認識かPINで会員が直接チェックイン。',
    card2_title_old: '正確な回数券差し引き',
    card2_title_new: '回数券・予約・ノーショー管理',
    card2_old_desc: /チェックインと同時に[\s\S]*?アプリにお任せください。/,
    card2_new: 'チェックイン即座に残回数差引、有効期限を自動チェック。<br>ノーショー自動処理、追加予約もワンタップ。',
    card3_old_desc: /今日誰が来て[\s\S]*?すっきりお見せします。/,
    card3_new: '今日の出席と売上を、スマホで一目で確認。',
  },
  zh: {
    file: path.join(publicDir, 'zh', 'home.html'),
    card1_title: '无前台签到',
    card1_old_desc: /只需一台平板[\s\S]*?自助签到入场。/,
    card1_new: '一台平板即可。<br>人脸识别或密码，会员直接签到。',
    card2_title_old: '精准课时扣减',
    card2_title_new: '课时·预约·缺席管理',
    card2_old_desc: /签到即刻扣减[\s\S]*?交给系统处理。/,
    card2_new: '签到即扣次数，到期自动提醒。<br>缺席自动扣费，加课一键搞定。',
    card3_old_desc: /今天谁来了[\s\S]*?清晰呈现。/,
    card3_new: '今日出勤与营收，手机一目了然。',
  },
  ru: {
    file: path.join(publicDir, 'ru', 'home.html'),
    card1_title: 'Без администратора',
    card1_old_desc: /Поставьте планшет[\s\S]*?без помощи персонала\./,
    card1_new: 'Один планшет — и всё.<br>Распознавание лица или PIN — клиент отмечается сам.',
    card2_title_old: 'Точное списание абонемента',
    card2_title_new: 'Абонементы, записи и неявки',
    card2_old_desc: /При каждом[\s\S]*?приложение справится\./,
    card2_new: 'Списание при отметке, контроль срока автоматически.<br>Неявки списываются, допзапись — одним касанием.',
    card3_old_desc: /Кто пришёл сегодня[\s\S]*?на вашем телефоне\./,
    card3_new: 'Посещения и выручка за день — на экране телефона.',
  },
  es: {
    file: path.join(publicDir, 'es', 'home.html'),
    card1_title: 'Sin Recepción',
    card1_old_desc: /Solo coloca una tablet[\s\S]*?sin personal\./,
    card1_new: 'Solo una tablet.<br>Reconocimiento facial o PIN — el socio se registra solo.',
    card2_title_old: 'Descuento Automático de Clases',
    card2_title_new: 'Clases, Reservas y No-Shows',
    card2_old_desc: /Al registrarse[\s\S]*?la app se encarga\./,
    card2_new: 'Descuento inmediato al registrarse, vencimiento automático.<br>No-shows descontados, reservas extra con un toque.',
    card3_old_desc: /Quién vino hoy[\s\S]*?en tu móvil\./,
    card3_new: 'Asistencia y ventas del día, directo a tu móvil.',
  },
  pt: {
    file: path.join(publicDir, 'pt', 'home.html'),
    card1_title: 'Sem Recepção',
    card1_old_desc: /Basta colocar um tablet[\s\S]*?sem funcionários\./,
    card1_new: 'Um tablet basta.<br>Reconhecimento facial ou senha — o aluno faz check-in sozinho.',
    card2_title_old: 'Desconto Automático de Aulas',
    card2_title_new: 'Aulas, Reservas e Faltas',
    card2_old_desc: /Ao fazer check-in[\s\S]*?o app cuida\./,
    card2_new: 'Desconto imediato no check-in, validade rastreada.<br>Faltas descontadas, reservas extras com um toque.',
    card3_old_desc: /Quem veio hoje[\s\S]*?no seu celular\./,
    card3_new: 'Presença e receita do dia, direto no celular.',
  },
  fr: {
    file: path.join(publicDir, 'fr', 'home.html'),
    card1_title: 'Sans Réception',
    card1_old_desc: /Placez simplement une tablette[\s\S]*?sans personnel\./,
    card1_new: 'Une tablette suffit.<br>Reconnaissance faciale ou code PIN — le membre pointe seul.',
    card2_title_old: 'Déduction Automatique des Séances',
    card2_title_new: 'Séances, Réservations et Absences',
    card2_old_desc: /Dès le pointage[\s\S]*?l.application s.en charge\./,
    card2_new: 'Déduction immédiate au pointage, échéance suivie.<br>Absences déduites, réservations supplémentaires en un clic.',
    card3_old_desc: /Qui est venu aujourd[\s\S]*?sur votre mobile\./,
    card3_new: "Présences et chiffre d'affaires du jour, sur votre mobile.",
  },
  de: {
    file: path.join(publicDir, 'de', 'home.html'),
    card1_title: 'Kein Empfang nötig',
    card1_old_desc: /Stellen Sie einfach ein Tablet[\s\S]*?ohne Personal\./,
    card1_new: 'Ein Tablet reicht.<br>Gesichtserkennung oder PIN — das Mitglied checkt selbst ein.',
    card2_title_old: 'Automatische Kreditabzüge',
    card2_title_new: 'Credits, Buchungen & No-Shows',
    card2_old_desc: /Bei jedem Check-in[\s\S]*?die App erledigt das\./,
    card2_new: 'Sofortiger Abzug beim Check-in, Ablauf automatisch überwacht.<br>No-Shows abgebucht, Zusatzbuchung mit einem Tipp.',
    card3_old_desc: /Wer war heute da[\s\S]*?auf Ihrem Handy\./,
    card3_new: 'Anwesenheit und Umsatz auf einen Blick, direkt aufs Handy.',
  },
  in: {
    file: path.join(publicDir, 'in', 'home.html'),
    card1_title: 'No Front Desk Needed',
    card1_old_desc: /Just place a tablet[\s\S]*?no staff required\./,
    card1_new: 'Just place a tablet.<br>Face recognition or PIN — members check in themselves.',
    card2_title_old: 'Auto Credit Deduction',
    card2_title_new: 'Credits, Bookings & No-Shows',
    card2_old_desc: /Credits deduct automatically[\s\S]*?No more manual counting\./,
    card2_new: 'Instant credit deduction on check-in, expiry auto-tracked.<br>No-show auto-deduction, extra bookings — one tap.',
    card3_old_desc: /Who came in[\s\S]*?straight to your phone\./,
    card3_new: 'Today\'s attendance and revenue, clean on your phone.',
  },
  au: {
    file: path.join(publicDir, 'au', 'home.html'),
    card1_title: 'No Front Desk Needed',
    card1_old_desc: /Just place a tablet[\s\S]*?no staff required\./,
    card1_new: 'Just place a tablet.<br>Face recognition or PIN — members check in themselves.',
    card2_title_old: 'Auto Credit Deduction',
    card2_title_new: 'Credits, Bookings & No-Shows',
    card2_old_desc: /Credits deduct automatically[\s\S]*?No more manual counting\./,
    card2_new: 'Instant credit deduction on check-in, expiry auto-tracked.<br>No-show auto-deduction, extra bookings — one tap.',
    card3_old_desc: /Who came in[\s\S]*?straight to your phone\./,
    card3_new: 'Today\'s attendance and revenue, clean on your phone.',
  },
  ca: {
    file: path.join(publicDir, 'ca', 'home.html'),
    card1_title: 'No Front Desk Needed',
    card1_old_desc: /Just place a tablet[\s\S]*?no staff required\./,
    card1_new: 'Just place a tablet.<br>Face recognition or PIN — members check in themselves.',
    card2_title_old: 'Auto Credit Deduction',
    card2_title_new: 'Credits, Bookings & No-Shows',
    card2_old_desc: /Credits deduct automatically[\s\S]*?No more manual counting\./,
    card2_new: 'Instant credit deduction on check-in, expiry auto-tracked.<br>No-show auto-deduction, extra bookings — one tap.',
    card3_old_desc: /Who came in[\s\S]*?straight to your phone\./,
    card3_new: 'Today\'s attendance and revenue, clean on your phone.',
  },
};

// ─── 실행 ────────────────────────────────────────────────
let totalUpdated = 0;
let totalSkipped = 0;

for (const [lang, e] of Object.entries(EMBASSIES)) {
  if (!fs.existsSync(e.file)) {
    console.log(`  ⚠️ [${lang}] 파일 없음`);
    totalSkipped++;
    continue;
  }

  let html = fs.readFileSync(e.file, 'utf8');
  let changes = 0;

  // Card 1: 설명 간결화
  if (e.card1_old_desc.test(html)) {
    html = html.replace(e.card1_old_desc, e.card1_new);
    changes++;
  }

  // Card 2: 제목 변경 (예약관리 추가)
  if (html.includes(e.card2_title_old)) {
    html = html.replace(e.card2_title_old, e.card2_title_new);
    changes++;
  }

  // Card 2: 설명 간결화 + 노쇼/예약 추가
  if (e.card2_old_desc.test(html)) {
    html = html.replace(e.card2_old_desc, e.card2_new);
    changes++;
  }

  // Card 3: 설명 간결화
  if (e.card3_old_desc.test(html)) {
    html = html.replace(e.card3_old_desc, e.card3_new);
    changes++;
  }

  // Hero 배경 어둡게 (opacity: 0.4 → 0.25)
  if (html.includes('opacity: 0.4;')) {
    html = html.replace('opacity: 0.4;', 'opacity: 0.25;');
    changes++;
  }

  if (changes > 0) {
    fs.writeFileSync(e.file, html, 'utf8');
    console.log(`  ✅ [${lang.toUpperCase()}] 대사관 업데이트: ${changes}건`);
    totalUpdated++;
  } else {
    console.log(`  ⚠️ [${lang.toUpperCase()}] 매칭 실패 — 수동 확인 필요`);
    totalSkipped++;
  }
}

console.log('');
console.log(`━━━ 본사 지시 완료: ${totalUpdated}개 대사관 업데이트, ${totalSkipped}개 미확인 ━━━`);
