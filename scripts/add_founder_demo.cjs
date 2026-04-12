/**
 * Add founder story + demo section to all compact landing pages
 * Targets: au, ca, de, es, fr, pt, zh
 */
const fs = require('fs');
const path = require('path');

const pages = {
    es: {
        lang: 'es', langParam: 'es',
        founderTitle: '🏋️ Creado por un dueño de estudio real',
        founderBody: `PassFlow AI fue diseñado por un <strong style="color: #d4af37;">dueño real de un estudio de yoga</strong> que se cansó de software caro y complicado que no entendía las operaciones del día a día.<br><br>
                    Después de años luchando con herramientas inadecuadas para <strong style="color: rgba(255,255,255,0.9);">gestión de miembros, reservas, pausas, control de créditos, gestión de pases y reportes de ingresos</strong>, cada función fue diseñada a partir de necesidades operativas reales.<br><br>
                    En vez de incluir cientos de funciones, elegimos <em style="color: #d4af37;">solo lo que importa en el día a día y lo hicimos super sencillo</em>. Estarás operando desde el primer día — sin manual.`,
        demoTitle: 'Pruébalo ahora mismo',
        demoDesc: 'Sin registro. Prueba cada app.',
        adminTitle: 'Panel de Administración', adminBtn: 'Probar Admin',
        checkinTitle: 'Kiosco de Entrada', checkinBtn: 'Probar Kiosco',
        memberTitle: 'App de Miembros', memberBtn: 'Probar App',
        instructorTitle: 'App de Instructor', instructorBtn: 'Probar App',
        landscapeNote: 'Mejor en tablet en <strong>modo horizontal</strong>'
    },
    pt: {
        lang: 'pt', langParam: 'pt',
        founderTitle: '🏋️ Criado por um dono de estúdio real',
        founderBody: `PassFlow AI foi projetado por um <strong style="color: #d4af37;">dono real de estúdio de yoga</strong> que se cansou de softwares caros e complicados.<br><br>
                    Após anos lutando com ferramentas inadequadas para <strong style="color: rgba(255,255,255,0.9);">gestão de membros, reservas, pausas, controle de créditos, gestão de passes e relatórios financeiros</strong>, cada funcionalidade foi projetada a partir de necessidades operacionais reais.<br><br>
                    Ao invés de colocar centenas de funções, escolhemos <em style="color: #d4af37;">apenas o que importa no dia a dia e fizemos super simples</em>. Você estará operando desde o primeiro dia — sem manual.`,
        demoTitle: 'Experimente agora mesmo',
        demoDesc: 'Sem cadastro. Teste cada app.',
        adminTitle: 'Painel Admin', adminBtn: 'Testar Admin',
        checkinTitle: 'Quiosque de Entrada', checkinBtn: 'Testar Quiosque',
        memberTitle: 'App do Aluno', memberBtn: 'Testar App',
        instructorTitle: 'App do Instrutor', instructorBtn: 'Testar App',
        landscapeNote: 'Melhor em tablet no <strong>modo paisagem</strong>'
    },
    fr: {
        lang: 'fr', langParam: 'fr',
        founderTitle: '🏋️ Créé par un vrai propriétaire de studio',
        founderBody: `PassFlow AI a été conçu par un <strong style="color: #d4af37;">propriétaire de studio de yoga en activité</strong> fatigué des logiciels coûteux et compliqués.<br><br>
                    Après des années avec des outils inadéquats pour <strong style="color: rgba(255,255,255,0.9);">la gestion des membres, les réservations, les mises en pause, le suivi des crédits et les rapports financiers</strong>, chaque fonctionnalité a été pensée à partir de besoins opérationnels réels.<br><br>
                    Plutôt que d'empiler des centaines de fonctions, nous avons choisi <em style="color: #d4af37;">uniquement l'essentiel du quotidien, rendu le plus simple possible</em>. Opérationnel dès le premier jour — sans manuel.`,
        demoTitle: 'Essayez maintenant',
        demoDesc: 'Sans inscription. Testez chaque app.',
        adminTitle: 'Tableau de bord Admin', adminBtn: 'Essayer Admin',
        checkinTitle: 'Borne d\'accueil', checkinBtn: 'Essayer Borne',
        memberTitle: 'App Membre', memberBtn: 'Essayer App',
        instructorTitle: 'App Instructeur', instructorBtn: 'Essayer App',
        landscapeNote: 'Optimal sur tablette en <strong>mode paysage</strong>'
    },
    de: {
        lang: 'de', langParam: 'de',
        founderTitle: '🏋️ Von einem echten Studiobesitzer entwickelt',
        founderBody: `PassFlow AI wurde von einem <strong style="color: #d4af37;">echten Yoga-Studioinhaber</strong> entworfen, der genug hatte von teurer, überladener Verwaltungssoftware.<br><br>
                    Nach Jahren mit unzureichenden Tools für <strong style="color: rgba(255,255,255,0.9);">Mitgliederverwaltung, Buchung, Pausierung, Guthabenverwaltung und Umsatzberichte</strong> — jede Funktion wurde aus echten betrieblichen Anforderungen heraus entwickelt.<br><br>
                    Statt Hunderte von Funktionen einzubauen, haben wir <em style="color: #d4af37;">nur das ausgewählt, was im Alltag wirklich zählt — und es kinderleicht gemacht</em>. Ab dem ersten Tag einsatzbereit — ohne Handbuch.`,
        demoTitle: 'Jetzt selbst ausprobieren',
        demoDesc: 'Ohne Registrierung. Testen Sie jede App.',
        adminTitle: 'Admin-Dashboard', adminBtn: 'Admin testen',
        checkinTitle: 'Check-in Kiosk', checkinBtn: 'Kiosk testen',
        memberTitle: 'Mitglieder-App', memberBtn: 'App testen',
        instructorTitle: 'Trainer-App', instructorBtn: 'App testen',
        landscapeNote: 'Am besten auf Tablet im <strong>Querformat</strong>'
    },
    zh: {
        lang: 'zh', langParam: 'zh',
        founderTitle: '🏋️ 由真正的工作室老板亲自设计',
        founderBody: `PassFlow AI 是由一位<strong style="color: #d4af37;">在职瑜伽工作室老板</strong>亲自参与设计的系统。<br><br>
                    在多年使用其他管理系统的过程中，他深感<strong style="color: rgba(255,255,255,0.9);">会员管理、预约管理、暂停功能、次数扣减、课程管理、收入报表</strong>等功能的不足，逐一设计并改进了每一个功能。<br><br>
                    我们没有堆砌功能，而是<em style="color: #d4af37;">只保留了日常运营真正需要的功能，并且做到极致简单</em>。从第一天起就能上手使用——无需培训手册。`,
        demoTitle: '立即体验',
        demoDesc: '无需注册，直接试用每个应用。',
        adminTitle: '管理后台', adminBtn: '体验管理端',
        checkinTitle: '签到终端', checkinBtn: '体验签到',
        memberTitle: '会员端', memberBtn: '体验会员端',
        instructorTitle: '教练端', instructorBtn: '体验教练端',
        landscapeNote: '平板电脑<strong>横屏模式</strong>效果最佳'
    },
    au: {
        lang: 'en-AU', langParam: 'en',
        founderTitle: '🏋️ Built by a real studio owner',
        founderBody: `PassFlow AI was designed by a <strong style="color: #d4af37;">practising yoga studio owner</strong> who got tired of clunky, overpriced management software.<br><br>
                    After years of struggling with inadequate tools for <strong style="color: rgba(255,255,255,0.9);">member management, class booking, holds, credit tracking, pass management, and revenue reporting</strong>, every feature was designed from real operational pain points.<br><br>
                    Instead of cramming in hundreds of features, we picked <em style="color: #d4af37;">only what matters in daily operations and made it dead simple</em>. You'll be running it on day one — no manual needed.`,
        demoTitle: 'See it in action — right now',
        demoDesc: 'No sign-up required. Try each app yourself.',
        adminTitle: 'Admin Dashboard', adminBtn: 'Try Admin',
        checkinTitle: 'Check-in Kiosk', checkinBtn: 'Try Kiosk',
        memberTitle: 'Member App', memberBtn: 'Try App',
        instructorTitle: 'Instructor App', instructorBtn: 'Try App',
        landscapeNote: 'Best viewed on tablet in <strong>landscape mode</strong>'
    },
    ca: {
        lang: 'en-CA', langParam: 'en',
        founderTitle: '🏋️ Built by a real studio owner',
        founderBody: `PassFlow AI was designed by a <strong style="color: #d4af37;">practising yoga studio owner</strong> who got tired of clunky, overpriced management software.<br><br>
                    After years of struggling with inadequate tools for <strong style="color: rgba(255,255,255,0.9);">member management, class booking, holds, credit tracking, pass management, and revenue reporting</strong>, every feature was designed from real operational pain points.<br><br>
                    Instead of cramming in hundreds of features, we picked <em style="color: #d4af37;">only what matters in daily operations and made it dead simple</em>. You'll be running it on day one — no manual needed.`,
        demoTitle: 'See it in action — right now',
        demoDesc: 'No sign-up required. Try each app yourself.',
        adminTitle: 'Admin Dashboard', adminBtn: 'Try Admin',
        checkinTitle: 'Check-in Kiosk', checkinBtn: 'Try Kiosk',
        memberTitle: 'Member App', memberBtn: 'Try App',
        instructorTitle: 'Instructor App', instructorBtn: 'Try App',
        landscapeNote: 'Best viewed on tablet in <strong>landscape mode</strong>'
    }
};

for (const [code, p] of Object.entries(pages)) {
    const filePath = path.join(__dirname, '..', 'public', code, 'home.html');
    if (!fs.existsSync(filePath)) { console.log(`⚠️ ${code}: file not found`); continue; }
    
    let html = fs.readFileSync(filePath, 'utf-8');
    
    // Check if already has sympathy-box
    if (html.includes('sympathy-box')) {
        console.log(`⏭️ ${code}: already has founder story, skipping`);
        continue;
    }
    
    // Build founder story + demo section HTML
    const founderSection = `
    <!-- Founder Story -->
    <section class="features" style="padding: clamp(30px, 5vw, 50px) 0;">
        <div class="container">
            <div class="sympathy-box" style="position: relative; overflow: hidden;">
                <h3 style="display: flex; align-items: center; gap: 10px;">${p.founderTitle}</h3>
                <p style="line-height: 1.8; color: rgba(255,255,255,0.75);">
                    ${p.founderBody}
                </p>
            </div>
        </div>
    </section>

    <!-- Live Demo -->
    <section class="features" id="live-demo" style="padding: clamp(40px, 6vw, 70px) 0;">
        <div class="container">
            <h2 style="text-align:center; margin-bottom: 15px;"><span class="gradient-text">${p.demoTitle}</span></h2>
            <p class="section-desc" style="margin-bottom: clamp(30px, 5vw, 40px);">${p.demoDesc}</p>
            <div class="demo-grid">
                <div class="demo-card-enhanced">
                    <img src="/assets/demo_admin.webp" alt="${p.adminTitle}">
                    <h3 style="color:#fff; font-size:1.2rem; margin-bottom:10px;">${p.adminTitle}</h3>
                    <a href="https://passflowai.web.app/admin?lang=${p.langParam}" target="_blank"
                       style="display:inline-block; padding:14px 24px; background:linear-gradient(135deg,#d4af37,#f5d67b); color:#000; font-weight:700; border-radius:30px; text-decoration:none; width:100%; box-sizing:border-box; font-size:0.95rem;">
                        ${p.adminBtn} →
                    </a>
                </div>
                <div class="demo-card-enhanced">
                    <img src="/assets/demo_checkin.webp" alt="${p.checkinTitle}">
                    <h3 style="color:#fff; font-size:1.2rem; margin-bottom:10px;">${p.checkinTitle}</h3>
                    <p style="color:rgba(255,255,255,0.6); font-size:0.85rem; margin-bottom:16px;">
                        <span style="font-size:0.8rem; color:#d4af37; font-weight:600;">📱↔️ ${p.landscapeNote}</span>
                    </p>
                    <a href="https://passflowai.web.app/checkin?lang=${p.langParam}" target="_blank"
                       style="display:inline-block; padding:14px 24px; background:linear-gradient(135deg,#d4af37,#f5d67b); color:#000; font-weight:700; border-radius:30px; text-decoration:none; width:100%; box-sizing:border-box; font-size:0.95rem;">
                        ${p.checkinBtn} →
                    </a>
                </div>
                <div class="demo-card-enhanced">
                    <img src="/assets/demo_member.webp" alt="${p.memberTitle}">
                    <h3 style="color:#fff; font-size:1.2rem; margin-bottom:10px;">${p.memberTitle}</h3>
                    <a href="https://passflowai.web.app/member?lang=${p.langParam}" target="_blank"
                       style="display:inline-block; padding:14px 24px; background:linear-gradient(135deg,#d4af37,#f5d67b); color:#000; font-weight:700; border-radius:30px; text-decoration:none; width:100%; box-sizing:border-box; font-size:0.95rem;">
                        ${p.memberBtn} →
                    </a>
                </div>
                <div class="demo-card-enhanced">
                    <img src="/assets/demo_instructor.webp" alt="${p.instructorTitle}">
                    <h3 style="color:#fff; font-size:1.2rem; margin-bottom:10px;">${p.instructorTitle}</h3>
                    <a href="https://passflowai.web.app/instructor?lang=${p.langParam}" target="_blank"
                       style="display:inline-block; padding:14px 24px; background:linear-gradient(135deg,#d4af37,#f5d67b); color:#000; font-weight:700; border-radius:30px; text-decoration:none; width:100%; box-sizing:border-box; font-size:0.95rem;">
                        ${p.instructorBtn} →
                    </a>
                </div>
            </div>
        </div>
    </section>
`;
    
    // Insert before the pricing section or footer
    const pricingIdx = html.indexOf('id="pricing"');
    const footerIdx = html.indexOf('<footer');
    const insertPoint = pricingIdx !== -1 ? html.lastIndexOf('<section', pricingIdx) : footerIdx;
    
    if (insertPoint === -1) {
        console.log(`⚠️ ${code}: could not find insertion point`);
        continue;
    }
    
    html = html.slice(0, insertPoint) + founderSection + '\n    ' + html.slice(insertPoint);
    fs.writeFileSync(filePath, html, 'utf-8');
    console.log(`✅ ${code}: added founder story + demo section`);
}

console.log('\n🎉 All pages updated!');
