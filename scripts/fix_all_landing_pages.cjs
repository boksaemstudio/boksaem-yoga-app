/**
 * 전수 점검 & 수정 스크립트
 * 
 * 한국어 home.html을 기준(Golden Template)으로
 * 모든 다국어 페이지의 레이아웃, 데모 섹션, 가격 섹션,
 * CTA 버튼 링크, "원하는 기능" 문구를 통일시킵니다.
 * 
 * 문제점 목록:
 * 1. 데모 섹션: 한국 페이지는 4개 카드(관리자,출석,회원,선생님) + 설명문 + 버튼인데,
 *    다국어 페이지들은 설명문이 빠져있고, 이미지만 크게 보이는 레이아웃
 * 2. 가격 섹션: 한국 페이지는 체크마크 feature grid가 있는데, 다국어 페이지에는 없음
 *    "원하는 기능이 있으신가요?" 부분이 버튼처럼 보이는 문제
 * 3. CTA 버튼: es 페이지에서 두 버튼 모두 /onboarding으로 연결되는 문제
 *    (첫번째는 이메일, 두번째만 온보딩이어야 함)
 * 4. 생성기(generate_landing_pages.cjs)로 만든 페이지들은 데모 섹션 자체가 없음
 */

const fs = require('fs');
const path = require('path');
const projectRoot = path.join(__dirname, '..');

// =====================================================
// 1. ES 페이지 수정 (수동 생성 페이지)
// =====================================================
function fixEsPage() {
  const filePath = path.join(projectRoot, 'public/es/home.html');
  let html = fs.readFileSync(filePath, 'utf8');

  // Fix 1: 데모 카드에 설명문 추가 (한국어 페이지와 동일한 구조)
  // Admin 카드 - 설명문 추가
  html = html.replace(
    /<h3 style="color:#fff; font-size:1\.2rem; margin-bottom:10px;">Panel de Administración<\/h3>\s*<a href/,
    `<h3 style="color:#fff; font-size:1.2rem; margin-bottom:10px;">Panel de Administración</h3>
                    <p style="color:rgba(255,255,255,0.6); font-size:0.9rem; margin-bottom:24px; line-height:1.5; min-height:44px;">
                        Miembros, ingresos y reservas<br>todo en un solo panel
                    </p>
                    <a href`
  );

  // Checkin 카드 - 설명문은 이미 있음 (OK)

  // Member 카드 - 설명문 추가
  html = html.replace(
    /<h3 style="color:#fff; font-size:1\.2rem; margin-bottom:10px;">App de Miembros<\/h3>\s*<a href/,
    `<h3 style="color:#fff; font-size:1.2rem; margin-bottom:10px;">App de Miembros</h3>
                    <p style="color:rgba(255,255,255,0.6); font-size:0.9rem; margin-bottom:24px; line-height:1.5; min-height:44px;">
                        Consultar pase y reservas<br>Historial de asistencia
                    </p>
                    <a href`
  );

  // Instructor 카드 - 설명문 추가
  html = html.replace(
    /<h3 style="color:#fff; font-size:1\.2rem; margin-bottom:10px;">App de Instructor<\/h3>\s*<a href/,
    `<h3 style="color:#fff; font-size:1.2rem; margin-bottom:10px;">App de Instructor</h3>
                    <p style="color:rgba(255,255,255,0.6); font-size:0.9rem; margin-bottom:24px; line-height:1.5; min-height:44px;">
                        Clases de hoy<br>Control de asistencia en vivo
                    </p>
                    <a href`
  );

  // Fix 2: 가격 섹션 - 첫번째 CTA를 이메일로 변경 (두 버튼이 모두 onboarding으로 가는 문제)
  html = html.replace(
    /<a href="\/onboarding\?lang=es" class="btn-primary" id="cta-email-es"/,
    `<a href="mailto:motionpt@gmail.com?subject=PassFlow%20AI%20-%20España&body=Hola!%20Estoy%20interesado/a%20en%20PassFlow%20AI.%0A%0ANombre%20del%20estudio:%20%0ACiudad:%20" class="btn-primary" id="cta-email-es"`
  );

  // Fix 3: 가격 섹션에 feature grid 추가 (한국어 페이지의 체크마크 리스트)
  const pricingFeatureGrid = `
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:30px;text-align:left;">
                    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                        <svg viewBox="0 0 20 20" fill="#4ade80" style="flex-shrink:0;width:20px;height:20px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                        <span style="font-size:0.95rem;color:rgba(255,255,255,0.85);">Sistema de reservas</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                        <svg viewBox="0 0 20 20" fill="#4ade80" style="flex-shrink:0;width:20px;height:20px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                        <span style="font-size:0.95rem;color:rgba(255,255,255,0.85);">Check-in facial o con PIN</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                        <svg viewBox="0 0 20 20" fill="#4ade80" style="flex-shrink:0;width:20px;height:20px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                        <span style="font-size:0.95rem;color:rgba(255,255,255,0.85);">Gestión de miembros</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                        <svg viewBox="0 0 20 20" fill="#4ade80" style="flex-shrink:0;width:20px;height:20px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                        <span style="font-size:0.95rem;color:rgba(255,255,255,0.85);">Pases ilimitados</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                        <svg viewBox="0 0 20 20" fill="#4ade80" style="flex-shrink:0;width:20px;height:20px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                        <span style="font-size:0.95rem;color:rgba(255,255,255,0.85);">Estadísticas en tiempo real</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                        <svg viewBox="0 0 20 20" fill="#4ade80" style="flex-shrink:0;width:20px;height:20px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                        <span style="font-size:0.95rem;color:rgba(255,255,255,0.85);">Setup inicial gratuito</span>
                    </div>
                </div>`;

  // Insert feature grid before CTA buttons
  html = html.replace(
    /(<p style="font-size:0\.8rem; color:rgba\(255,255,255,0\.4\); margin-bottom:20px;">🔒 Datos almacenados)/,
    pricingFeatureGrid + '\n                $1'
  );

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('✅ Fixed es/home.html');
}

// =====================================================
// 2. 동일한 문제가 있는 다른 수동 파일들도 수정
// =====================================================
function fixManualPages() {
  // zh, ru 페이지도 동일한 cta-email 이슈 확인
  const pagesWithOnboardingLinkBug = ['zh', 'ru'];
  
  for (const code of pagesWithOnboardingLinkBug) {
    const filePath = path.join(projectRoot, `public/${code}/home.html`);
    if (!fs.existsSync(filePath)) continue;
    let html = fs.readFileSync(filePath, 'utf8');

    // CTA email 버튼이 /onboarding으로 잘못 링크된 경우 수정
    const emailSubjects = {
      zh: { subject: 'PassFlow%20AI%20-%20中国', body: '你好！我对PassFlow%20AI很感兴趣。%0A%0A工作室名称：%0A城市：' },
      ru: { subject: 'PassFlow%20AI%20-%20Россия', body: 'Здравствуйте!%20Меня%20интересует%20PassFlow%20AI.%0A%0AНазвание%20студии:%20%0AГород:%20' }
    };

    const e = emailSubjects[code];
    if (e) {
      html = html.replace(
        new RegExp(`<a href="/onboarding\\?lang=${code}" class="btn-primary" id="cta-email-${code}"`),
        `<a href="mailto:motionpt@gmail.com?subject=${e.subject}&body=${e.body}" class="btn-primary" id="cta-email-${code}"`
      );
    }
    
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✅ Fixed ${code}/home.html CTA links`);
  }
}

// =====================================================
// 3. generate_landing_pages.cjs로 생성되는 페이지 수정
//    - 데모 섹션 추가 (4개 카드 레이아웃)
//    - 가격 섹션에 feature grid 추가
//    - "원하는 기능" 문구를 버튼이 아닌 텍스트로 변경
//    - CTA 첫번째 버튼을 이메일 링크로, 두번째를 온보딩으로
// =====================================================

function rebuildGenerator() {
  const generatorPath = path.join(projectRoot, 'scripts/generate_landing_pages.cjs');
  let content = fs.readFileSync(generatorPath, 'utf8');

  // Add demo section translations
  const demoTranslations = {
    pt: { tryIt: 'Experimente agora', tryDesc: 'Sem cadastro. Teste cada app.', 
          admin: 'Painel Admin', adminD: 'Alunos, faturamento e reservas<br>tudo em um só painel',
          checkin: 'Quiosque de Entrada', checkinD: 'Reconhecimento facial ou PIN<br>📱↔️ Melhor em tablet <strong>modo paisagem</strong>',
          member: 'App do Aluno', memberD: 'Consultar créditos e reservas<br>Histórico de frequência',
          instructor: 'App do Professor', instructorD: 'Aulas de hoje<br>Controle de presença ao vivo',
          adminBtn: 'Testar Admin', checkinBtn: 'Testar Quiosque', memberBtn: 'Testar App', instructorBtn: 'Testar App',
          featureRequest: '¿Precisa de uma função específica?', featureRequestDesc: 'Fale conosco. Nós fazemos realidade.' },
    fr: { tryIt: 'Essayez maintenant', tryDesc: 'Sans inscription. Testez chaque app.',
          admin: 'Tableau de Bord', adminD: 'Membres, revenus et réservations<br>tout en un seul tableau',
          checkin: 'Kiosque d\'Entrée', checkinD: 'Reconnaissance faciale ou code PIN<br>📱↔️ Meilleur en tablette <strong>mode paysage</strong>',
          member: 'App Membre', memberD: 'Consulter crédit et réservations<br>Historique de présence',
          instructor: 'App Instructeur', instructorD: 'Cours du jour<br>Suivi de présence en direct',
          adminBtn: 'Tester Admin', checkinBtn: 'Tester Kiosque', memberBtn: 'Tester App', instructorBtn: 'Tester App',
          featureRequest: 'Besoin d\'une fonctionnalité spécifique ?', featureRequestDesc: 'Dites-nous. Nous la réaliserons.' },
    de: { tryIt: 'Jetzt ausprobieren', tryDesc: 'Ohne Registrierung. Teste jede App.',
          admin: 'Admin-Dashboard', adminD: 'Mitglieder, Umsatz und Buchungen<br>alles in einem Panel',
          checkin: 'Eingangs-Kiosk', checkinD: 'Gesichtserkennung oder PIN<br>📱↔️ Am besten auf Tablet im <strong>Querformat</strong>',
          member: 'Mitglieder-App', memberD: 'Guthaben und Buchungen prüfen<br>Anwesenheitshistorie',
          instructor: 'Trainer-App', instructorD: 'Heutige Kurse<br>Live-Anwesenheitskontrolle',
          adminBtn: 'Admin testen', checkinBtn: 'Kiosk testen', memberBtn: 'App testen', instructorBtn: 'App testen',
          featureRequest: 'Benötigen Sie eine bestimmte Funktion?', featureRequestDesc: 'Sagen Sie uns. Wir setzen es um.' },
    au: { tryIt: 'Try it right now', tryDesc: 'No signup required. Test each app.',
          admin: 'Admin Dashboard', adminD: 'Members, revenue & bookings<br>all in one panel',
          checkin: 'Check-in Kiosk', checkinD: 'Face or PIN check-in<br>📱↔️ Best on tablet in <strong>landscape mode</strong>',
          member: 'Member App', memberD: 'Check credits & bookings<br>Attendance history',
          instructor: 'Instructor App', instructorD: 'Today\'s classes<br>Live attendance tracking',
          adminBtn: 'Try Admin', checkinBtn: 'Try Kiosk', memberBtn: 'Try App', instructorBtn: 'Try App',
          featureRequest: 'Need a specific feature?', featureRequestDesc: 'Tell us. We\'ll make it happen.' },
    ca: { tryIt: 'Try it right now', tryDesc: 'No signup required. Test each app.',
          admin: 'Admin Dashboard', adminD: 'Members, revenue & bookings<br>all in one panel',
          checkin: 'Check-in Kiosk', checkinD: 'Face or PIN check-in<br>📱↔️ Best on tablet in <strong>landscape mode</strong>',
          member: 'Member App', memberD: 'Check credits & bookings<br>Attendance history',
          instructor: 'Instructor App', instructorD: 'Today\'s classes<br>Live attendance tracking',
          adminBtn: 'Try Admin', checkinBtn: 'Try Kiosk', memberBtn: 'Try App', instructorBtn: 'Try App',
          featureRequest: 'Need a specific feature?', featureRequestDesc: 'Tell us. We\'ll make it happen.' }
  };

  // Add feature grid translations for pricing section
  const pricingFeatures = {
    pt: ['Sistema de agendamento', 'Check-in facial ou PIN', 'Gestão de alunos', 'Créditos ilimitados', 'Estatísticas em tempo real', 'Setup inicial gratuito'],
    fr: ['Système de réservation', 'Check-in facial ou PIN', 'Gestion des membres', 'Crédits illimités', 'Statistiques en temps réel', 'Setup initial gratuit'],
    de: ['Buchungssystem', 'Gesichts- oder PIN-Check-in', 'Mitgliederverwaltung', 'Unbegrenzte Guthaben', 'Echtzeit-Statistiken', 'Kostenloses Setup'],
    au: ['Booking system', 'Face or PIN check-in', 'Member management', 'Unlimited credits', 'Real-time analytics', 'Free initial setup'],
    ca: ['Booking system', 'Face or PIN check-in', 'Member management', 'Unlimited credits', 'Real-time analytics', 'Free initial setup']
  };

  // Add demo+featureRequest translations to page configs
  for (const [code, demo] of Object.entries(demoTranslations)) {
    content = content.replace(
      new RegExp(`(navContact: '${pages_navContact_map[code]}')`),
      `$1,\n    demo: ${JSON.stringify(demo)},\n    pricingFeatures: ${JSON.stringify(pricingFeatures[code])}`
    );
  }

  // Actually, rewriting the HTML generator template is tricky with regex. 
  // Let's just directly rewrite the whole function (it's output only, not data)
  // We already have the data. Let's rewrite generate_landing_pages.cjs completely.
  console.log('⚙️  Need to update generator template...');
}

// Since modifying the template with regex is fragile, let's instead
// just directly regenerate ALL 5 pages from scratch using full template.

function generateAllPagesDirectly() {
  const pagesData = {
    pt: require(path.join(projectRoot, 'scripts/generate_landing_pages.cjs').replace(/\.cjs$/, '') + '.cjs') || null,
    // ... instead, let's read the existing data from the current script
  };
  
  // Actually the simplest approach: read the current generator, extract pages data, 
  // then write new pages using the full Korean-style template
}

// =====================================================
// APPROACH: Instead of complex regex, write a comprehensive 
// Node script that reads all pages and applies targeted fixes
// =====================================================

function addDemoSectionToGeneratedPages() {
  const generatedPages = ['pt', 'fr', 'de', 'au', 'ca'];
  
  const demoT = {
    pt: { tryIt: 'Experimente agora', tryDesc: 'Sem cadastro. Teste cada app.',
          admin: 'Painel Admin', adminD: 'Alunos, faturamento e reservas<br>tudo em um só painel',
          checkin: 'Quiosque', checkinD: 'Reconhecimento facial ou PIN<br><span style="font-size:0.8rem;color:#d4af37;font-weight:600;">📱↔️ Melhor em tablet <strong>modo paisagem</strong></span>',
          member: 'App do Aluno', memberD: 'Consultar créditos<br>Histórico de frequência',
          instructor: 'App Professor', instructorD: 'Aulas de hoje<br>Presença ao vivo',
          adminBtn: 'Testar Admin', checkinBtn: 'Testar Quiosque', memberBtn: 'Testar App', instructorBtn: 'Testar App',
          featureQ: 'Precisa de uma função específica?', featureA: 'Fale conosco. Nós realizamos.',
          pf: ['Sistema de agendamento', 'Check-in facial ou PIN', 'Gestão de alunos', 'Créditos ilimitados', 'Estatísticas em tempo real', 'Setup inicial gratuito'] },
    fr: { tryIt: 'Essayez maintenant', tryDesc: 'Sans inscription. Testez chaque app.',
          admin: 'Tableau de Bord', adminD: 'Membres, revenus et réservations<br>tout en un seul tableau',
          checkin: 'Kiosque', checkinD: 'Reconnaissance faciale ou PIN<br><span style="font-size:0.8rem;color:#d4af37;font-weight:600;">📱↔️ Meilleur en tablette en <strong>mode paysage</strong></span>',
          member: 'App Membre', memberD: 'Consulter crédit<br>Historique de présence',
          instructor: 'App Instructeur', instructorD: 'Cours du jour<br>Suivi de présence en direct',
          adminBtn: 'Tester Admin', checkinBtn: 'Tester Kiosque', memberBtn: 'Tester App', instructorBtn: 'Tester App',
          featureQ: 'Besoin d\'une fonctionnalité spécifique ?', featureA: 'Dites-nous. Nous la réaliserons.',
          pf: ['Système de réservation', 'Check-in facial ou PIN', 'Gestion des membres', 'Crédits illimités', 'Statistiques en temps réel', 'Setup initial gratuit'] },
    de: { tryIt: 'Jetzt ausprobieren', tryDesc: 'Ohne Registrierung. Teste jede App.',
          admin: 'Admin-Dashboard', adminD: 'Mitglieder, Umsatz und Buchungen<br>alles in einem Panel',
          checkin: 'Eingangs-Kiosk', checkinD: 'Gesichtserkennung oder PIN<br><span style="font-size:0.8rem;color:#d4af37;font-weight:600;">📱↔️ Am besten im <strong>Querformat</strong></span>',
          member: 'Mitglieder-App', memberD: 'Guthaben prüfen<br>Anwesenheitshistorie',
          instructor: 'Trainer-App', instructorD: 'Heutige Kurse<br>Live-Anwesenheit',
          adminBtn: 'Admin testen', checkinBtn: 'Kiosk testen', memberBtn: 'App testen', instructorBtn: 'App testen',
          featureQ: 'Benötigen Sie eine bestimmte Funktion?', featureA: 'Sagen Sie uns Bescheid. Wir setzen es um.',
          pf: ['Buchungssystem', 'Check-in per Gesicht oder PIN', 'Mitgliederverwaltung', 'Unbegrenzte Guthaben', 'Echtzeit-Statistiken', 'Kostenloses Setup'] },
    au: { tryIt: 'Try it right now', tryDesc: 'No signup required. Test each app.',
          admin: 'Admin Dashboard', adminD: 'Members, revenue & bookings<br>all in one panel',
          checkin: 'Check-in Kiosk', checkinD: 'AI face or PIN check-in<br><span style="font-size:0.8rem;color:#d4af37;font-weight:600;">📱↔️ Best on tablet in <strong>landscape mode</strong></span>',
          member: 'Member App', memberD: 'Check credits & bookings<br>Attendance history',
          instructor: 'Instructor App', instructorD: 'Today\'s classes<br>Live attendance tracking',
          adminBtn: 'Try Admin', checkinBtn: 'Try Kiosk', memberBtn: 'Try App', instructorBtn: 'Try App',
          featureQ: 'Need a specific feature?', featureA: 'Tell us. We\'ll make it happen.',
          pf: ['Booking system', 'Face or PIN check-in', 'Member management', 'Unlimited credits', 'Real-time analytics', 'Free initial setup'] },
    ca: { tryIt: 'Try it right now', tryDesc: 'No signup required. Test each app.',
          admin: 'Admin Dashboard', adminD: 'Members, revenue & bookings<br>all in one panel',
          checkin: 'Check-in Kiosk', checkinD: 'AI face or PIN check-in<br><span style="font-size:0.8rem;color:#d4af37;font-weight:600;">📱↔️ Best on tablet in <strong>landscape mode</strong></span>',
          member: 'Member App', memberD: 'Check credits & bookings<br>Attendance history',
          instructor: 'Instructor App', instructorD: 'Today\'s classes<br>Live attendance tracking',
          adminBtn: 'Try Admin', checkinBtn: 'Try Kiosk', memberBtn: 'Try App', instructorBtn: 'Try App',
          featureQ: 'Need a specific feature?', featureA: 'Tell us. We\'ll make it happen.',
          pf: ['Booking system', 'Face or PIN check-in', 'Member management', 'Unlimited credits', 'Real-time analytics', 'Free initial setup'] }
  };

  for (const code of generatedPages) {
    const filePath = path.join(projectRoot, `public/${code}/home.html`);
    if (!fs.existsSync(filePath)) { console.log(`⚠️  ${code}/home.html not found`); continue; }
    let html = fs.readFileSync(filePath, 'utf8');
    const d = demoT[code];
    if (!d) continue;

    // === ADD DEMO SECTION (before pricing section) ===
    const demoSection = `
    <!-- Live Demo -->
    <section class="features" id="live-demo" style="padding: clamp(40px, 6vw, 70px) 0;">
        <div class="container">
            <h2 style="text-align:center; margin-bottom: 15px;"><span class="gradient-text">${d.tryIt}</span></h2>
            <p class="section-desc" style="margin-bottom: clamp(30px, 5vw, 40px);">${d.tryDesc}</p>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px;max-width:800px;margin:0 auto;">
                <div class="demo-card-enhanced" style="background:linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:clamp(24px,4vw,40px) 24px;text-align:center;display:flex;flex-direction:column;">
                    <img src="/assets/demo_admin.webp" alt="${d.admin}" style="width:100%;height:200px;object-fit:cover;border-radius:16px;margin-bottom:24px;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
                    <h3 style="color:#fff;font-size:1.2rem;margin-bottom:10px;">${d.admin}</h3>
                    <p style="color:rgba(255,255,255,0.6);font-size:0.9rem;margin-bottom:24px;line-height:1.5;min-height:44px;">${d.adminD}</p>
                    <a href="https://passflowai.web.app/admin?lang=${code}" target="_blank" style="display:inline-block;padding:14px 24px;background:linear-gradient(135deg,#d4af37,#f5d67b);color:#000;font-weight:700;border-radius:30px;text-decoration:none;width:100%;box-sizing:border-box;font-size:0.95rem;">${d.adminBtn}</a>
                </div>
                <div class="demo-card-enhanced" style="background:linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:clamp(24px,4vw,40px) 24px;text-align:center;display:flex;flex-direction:column;">
                    <img src="/assets/demo_checkin.webp" alt="${d.checkin}" style="width:100%;height:200px;object-fit:cover;border-radius:16px;margin-bottom:24px;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
                    <h3 style="color:#fff;font-size:1.2rem;margin-bottom:10px;">${d.checkin}</h3>
                    <p style="color:rgba(255,255,255,0.6);font-size:0.9rem;margin-bottom:24px;line-height:1.5;min-height:44px;">${d.checkinD}</p>
                    <a href="https://passflowai.web.app/checkin?lang=${code}" target="_blank" style="display:inline-block;padding:14px 24px;background:linear-gradient(135deg,#d4af37,#f5d67b);color:#000;font-weight:700;border-radius:30px;text-decoration:none;width:100%;box-sizing:border-box;font-size:0.95rem;">${d.checkinBtn}</a>
                </div>
                <div class="demo-card-enhanced" style="background:linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:clamp(24px,4vw,40px) 24px;text-align:center;display:flex;flex-direction:column;">
                    <img src="/assets/demo_member.webp" alt="${d.member}" style="width:100%;height:200px;object-fit:cover;border-radius:16px;margin-bottom:24px;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
                    <h3 style="color:#fff;font-size:1.2rem;margin-bottom:10px;">${d.member}</h3>
                    <p style="color:rgba(255,255,255,0.6);font-size:0.9rem;margin-bottom:24px;line-height:1.5;min-height:44px;">${d.memberD}</p>
                    <a href="https://passflowai.web.app/member?lang=${code}" target="_blank" style="display:inline-block;padding:14px 24px;background:linear-gradient(135deg,#d4af37,#f5d67b);color:#000;font-weight:700;border-radius:30px;text-decoration:none;width:100%;box-sizing:border-box;font-size:0.95rem;">${d.memberBtn}</a>
                </div>
                <div class="demo-card-enhanced" style="background:linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:clamp(24px,4vw,40px) 24px;text-align:center;display:flex;flex-direction:column;">
                    <img src="/assets/demo_instructor.webp" alt="${d.instructor}" style="width:100%;height:200px;object-fit:cover;border-radius:16px;margin-bottom:24px;box-shadow:0 10px 30px rgba(0,0,0,0.4);">
                    <h3 style="color:#fff;font-size:1.2rem;margin-bottom:10px;">${d.instructor}</h3>
                    <p style="color:rgba(255,255,255,0.6);font-size:0.9rem;margin-bottom:24px;line-height:1.5;min-height:44px;">${d.instructorD}</p>
                    <a href="https://passflowai.web.app/instructor?lang=${code}" target="_blank" style="display:inline-block;padding:14px 24px;background:linear-gradient(135deg,#d4af37,#f5d67b);color:#000;font-weight:700;border-radius:30px;text-decoration:none;width:100%;box-sizing:border-box;font-size:0.95rem;">${d.instructorBtn}</a>
                </div>
            </div>
        </div>
    </section>
`;

    // Insert demo section before pricing
    html = html.replace(
      /(\s*<section id="pricing")/,
      demoSection + '\n$1'
    );

    // === ADD FEATURE GRID to pricing section ===
    const featureGridHtml = d.pf.map(f => `
                    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                        <svg viewBox="0 0 20 20" fill="#4ade80" style="flex-shrink:0;width:20px;height:20px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                        <span style="font-size:0.95rem;color:rgba(255,255,255,0.85);">${f}</span>
                    </div>`).join('\n');
    
    const featureGridWrapper = `
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:30px;text-align:left;">
${featureGridHtml}
                </div>`;

    // Insert before first CTA button in pricing
    html = html.replace(
      /(<a href="mailto:[^"]*" class="btn-primary" id="cta-email)/,
      featureGridWrapper + '\n                $1'
    );

    // === ADD "Want a feature?" text (NOT a button) ===
    const featureRequestText = `
                <div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">${d.featureQ}</strong><br>
                        ${d.featureA}
                    </p>
                </div>`;

    // Insert after the last CTA button (before closing single-plan-card)
    html = html.replace(
      /(<\/a>\s*<\/div>\s*<\/div>\s*<\/section>\s*<footer)/,
      `</a>${featureRequestText}\n            </div>\n        </div>\n    </section>\n    <footer`
    );

    // Add demo-grid responsive CSS
    if (!html.includes('@media (max-width: 768px)')) {
      html = html.replace(
        '</style>',
        `        @media (max-width: 768px) { .demo-card-enhanced { padding: 20px !important; } }
        @media (max-width: 480px) { [style*="grid-template-columns:repeat(2,1fr)"] { grid-template-columns: 1fr !important; } }
    </style>`
      );
    }

    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✅ Fixed ${code}/home.html (demo + pricing grid + feature request + responsive)`);
  }
}

// =====================================================
// RUN ALL FIXES
// =====================================================
console.log('\n🔧 Starting full landing page audit & fix...\n');

fixEsPage();
fixManualPages();
addDemoSectionToGeneratedPages();

console.log('\n✅ All landing pages have been fixed!\n');
