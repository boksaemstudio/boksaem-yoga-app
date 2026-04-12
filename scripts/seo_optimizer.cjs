const fs = require('fs');
const path = require('path');
const pub = p => path.join(__dirname, '..', 'public', p);

// 15개 에러 수정 타겟
const targets = [
  { file: pub('en/home.html'), 
    oldDesc: /<meta name="description" content="[^"]+">/,
    newDesc: '<meta name="description" content="AI-powered gym & yoga studio management software with facial recognition check-in. Membership, booking, billing CRM — $69/year. No monthly fees.">' // 149 chars
  },
  { file: pub('zh/home.html'),
    oldDesc: /<meta name="description" content="[^"]+">/,
    newDesc: '<meta name="description" content="PassFlow AI是全球最具性价比的健身房与瑜伽馆管理系统。提供人脸识别签到、会员管理、课程预约等功能，每年仅需$69。向昂贵的月费说再见，让你的场馆运营更智能、更高效。">' // 97 chars
  },
  { file: pub('ru/home.html'),
    oldTitle: /<title>[^<]+<\/title>/,
    newTitle: '<title>PassFlow AI | CRM для фитнеса и йоги за $69 в год</title>' // 59 chars
  },
  { file: pub('es/home.html'),
    oldTitle: /<title>[^<]+<\/title>/,
    newTitle: '<title>PassFlow AI | Software para Gimnasios y Yoga ($69/Año)</title>', // 64 chars
    oldDesc: /<meta name="description" content="[^"]+">/,
    newDesc: '<meta name="description" content="Software de gestión para gimnasios y estudios de yoga con check-in facial IA. Reservas, CRM y cobros por solo $69 al año. Sin comisiones mensuales.">' // 151 chars
  },
  { file: pub('pt/home.html'),
    oldTitle: /<title>[^<]+<\/title>/,
    newTitle: '<title>PassFlow AI | Sistema para Academias e Yoga ($69/Ano)</title>' // 63 chars
  },
  { file: pub('fr/home.html'),
    oldTitle: /<title>[^<]+<\/title>/,
    newTitle: '<title>PassFlow AI | Logiciel de gestion pour salles de sport</title>', // 63 chars
    oldDesc: /<meta name="description" content="[^"]+">/,
    newDesc: '<meta name="description" content="Logiciel pour salles de sport et studios de yoga. Pointage facial IA, réservations et CRM. Tout pour 69$ par an. Sans abonnement mensuel caché.">' // 147 chars
  },
  { file: pub('de/home.html'),
    oldDesc: /<meta name="description" content="[^"]+">/,
    newDesc: '<meta name="description" content="Fitnessstudio & Yoga Software mit KI-Gesichtserkennung. Check-in, Buchung und CRM-System für nur 69$ pro Jahr. Keine monatlichen Gebühren.">' // 142 chars
  },
  { file: pub('in/home.html'),
    oldTitle: /<title>[^<]+<\/title>/,
    newTitle: '<title>PassFlow AI | Gym & Yoga Studio Software ($69/Year)</title>', // 58 chars
    oldDesc: /<meta name="description" content="[^"]+">/,
    newDesc: '<meta name="description" content="Best gym & yoga studio management software in India. Free AI facial check-in, auto booking, and CRM. Only $69/year. Stop paying expensive monthly fees.">' // 153 chars
  },
  { file: pub('au/home.html'),
    oldTitle: /<title>[^<]+<\/title>/,
    newTitle: '<title>PassFlow AI | Gym & Studio Management Software ($69/Yr)</title>', // 64 chars
    oldDesc: /<meta name="description" content="[^"]+">/,
    newDesc: '<meta name="description" content="Australia\'s most affordable gym & yoga studio software. AI facial check-in, bookings, and member CRM. Just $69/year with no monthly subscription fees.">' // 154 chars
  },
  { file: pub('ca/home.html'),
    oldTitle: /<title>[^<]+<\/title>/,
    newTitle: '<title>PassFlow AI | Gym & Yoga Studio Software ($69/Year)</title>', // 58 chars
    oldDesc: /<meta name="description" content="[^"]+">/,
    newDesc: '<meta name="description" content="Canada\'s best gym & fitness studio management software. AI face check-in, reservations, and member CRM for $69/year. Say goodbye to monthly fees.">' // 149 chars
  }
];

let changedFiles = 0;
for (const t of targets) {
  if (!fs.existsSync(t.file)) continue;
  let html = fs.readFileSync(t.file, 'utf8');
  let updated = false;

  if (t.oldTitle && t.oldTitle.test(html)) {
    html = html.replace(t.oldTitle, t.newTitle);
    updated = true;
  }
  if (t.oldDesc && t.oldDesc.test(html)) {
    html = html.replace(t.oldDesc, t.newDesc);
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(t.file, html, 'utf8');
    changedFiles++;
    console.log(`✅ 최적화 완료: ${path.basename(path.dirname(t.file))}`);
  }
}

console.log(`총 ${changedFiles}개 파일 최적화 완료.`);
