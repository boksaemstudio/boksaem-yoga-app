// Generate remaining landing pages: PT, FR, DE, AU, CA
const fs = require('fs');
const path = require('path');

// Read ES template as base
const projectRoot = path.join(__dirname, '..');
const esTemplate = fs.readFileSync(path.join(projectRoot, 'public/es/home.html'), 'utf8');

const pages = {
  pt: {
    lang: 'pt-BR', title: 'PassFlow AI | Software de Gestão para Academias com IA — R$349/Ano, Não por Mês',
    desc: 'O software mais acessível para gestão de academias, estúdios de yoga e pilates. Check-in com reconhecimento facial AI, agendamentos, CRM — tudo por apenas R$349/ANO.',
    keywords: 'software academia, sistema gestão academia, programa para estúdio yoga, reconhecimento facial academia, CRM fitness, alternativa Tecnofit, alternativaEvo, sistema pilates, controle acesso academia, PassFlow AI',
    currency: 'BRL', price: '349', symbol: 'R$', monthly: 'R$29', priceLabel: 'R$349',
    tagline: 'Gestão com IA para Academias, Yoga e Pilates',
    h1: 'Você ensina. <span class="gradient-text">A gente cuida do resto.</span>',
    sub: 'Pare de pagar caro por sistemas complicados.<br>Check-in com IA, agendamentos, gestão de alunos — tudo em um só lugar. <strong style="color:#d4af37;">R$349/ano, não por mês.</strong>',
    feat1: 'Sem Recepcionista', feat1d: 'Coloque um tablet na entrada.<br>Alunos entram por reconhecimento facial ou PIN — sem funcionário.',
    feat2: 'Desconto Automático', feat2d: 'Aulas descontadas automaticamente no check-in. Vencimentos acompanhados em tempo real.',
    feat3: 'Relatórios com Um Toque', feat3d: 'Quem veio, quanto faturou, quais alunos correm risco de abandono. Estatísticas direto no celular.',
    stopPaying: 'Pare de pagar <span style="color:#d4af37;">todo mês</span>', othersCharge: 'Outros cobram R$200–R$2000 <em>por mês</em>. Nós cobramos isso <em>por ano</em>.',
    plan: 'Plano Completo', perMonth: 'R$29/mês', coffeeCompare: '— menos que uma pizza por mês.',
    noHidden: '⚡ Sem custos ocultos. Sem taxa de setup. Sem cobrança por aluno.',
    privacy: '🔒 Dados armazenados no Google Cloud, em conformidade com a LGPD (Lei Geral de Proteção de Dados). Dados faciais processados localmente no dispositivo — nunca enviados à nuvem.',
    cta1: '📧 Fale Conosco — Demo Grátis', cta2: '🚀 Cadastrar Online — Ativo em 24h',
    footer: 'O novo padrão em gestão de academias e estúdios',
    footerDesc: 'PassFlow AI automatiza check-in, gestão de alunos e análise de negócios para academias, CrossFit, yoga e pilates no mundo todo.',
    emailSubject: 'PassFlow%20AI%20Consulta%20-%20Brasil', emailBody: 'Olá!%20Tenho%20interesse%20no%20PassFlow%20AI.%0A%0ANome%20da%20academia:%20%0ACidade:%20',
    yearLabel: 'ANO', btnLabel: 'PT', flag: '🇧🇷',
    features: ['✔ Reconhecimento Facial IA', '✔ Agendamento Automático', '✔ R$349/<span class="year-emphasis">ANO</span>'],
    navDemo: 'Demo', navFeatures: 'Funcionalidades', navPricing: 'Preços', navContact: 'Contato'
  },
  fr: {
    lang: 'fr', title: 'PassFlow AI | Logiciel de Gestion de Salle de Sport avec IA — 59€/An, Pas par Mois',
    desc: 'Le logiciel le plus abordable pour la gestion de salles de sport, studios de yoga et pilates. Check-in IA par reconnaissance faciale, réservations, CRM — tout pour seulement 59€ par AN.',
    keywords: 'logiciel gestion salle de sport, logiciel studio yoga, gestion pilates, reconnaissance faciale salle de sport, CRM fitness, alternative Resamania, logiciel fitness pas cher, contrôle accès salle, PassFlow AI',
    currency: 'EUR', price: '59', symbol: '€', monthly: '4,92€', priceLabel: '59€',
    tagline: 'Gestion IA pour Salles de Sport, Yoga et Pilates',
    h1: 'Vous enseignez. <span class="gradient-text">On s\'occupe du reste.</span>',
    sub: 'Arrêtez de surpayer pour un logiciel compliqué.<br>Check-in IA, réservations, gestion clients — tout-en-un. <strong style="color:#d4af37;">59€ par an, pas par mois.</strong>',
    feat1: 'Sans Réceptionniste', feat1d: 'Placez une tablette à l\'entrée.<br>Les membres s\'enregistrent par reconnaissance faciale ou code PIN.',
    feat2: 'Déduction Automatique', feat2d: 'Les séances se déduisent automatiquement lors du check-in. Dates d\'expiration suivies en temps réel.',
    feat3: 'Rapports en Un Clic', feat3d: 'Qui est venu, combien de CA aujourd\'hui, quels membres risquent de partir.<br>Stats claires sur votre mobile.',
    stopPaying: 'Arrêtez de payer <span style="color:#d4af37;">chaque mois</span>', othersCharge: 'Les autres facturent 50–700€ <em>par mois</em>. Nous facturons ceci <em>par an</em>.',
    plan: 'Plan Tout-en-Un', perMonth: '4,92€/mois', coffeeCompare: '— moins qu\'un café par semaine.',
    noHidden: '⚡ Sans frais cachés. Sans frais d\'installation. Sans tarif par membre.',
    privacy: '🔒 Données stockées sur Google Cloud, conforme au RGPD. Les données faciales sont traitées localement sur l\'appareil — jamais envoyées dans le cloud.',
    cta1: '📧 Contactez-nous — Démo Gratuite', cta2: '🚀 Postuler en Ligne — Actif sous 24h',
    footer: 'Le nouveau standard de la gestion de studios fitness',
    footerDesc: 'PassFlow AI automatise le check-in, la gestion des membres et l\'analyse business pour les salles de sport, CrossFit, yoga et pilates dans le monde entier.',
    emailSubject: 'PassFlow%20AI%20Demande%20-%20France', emailBody: 'Bonjour!%20Je%20suis%20intéressé(e)%20par%20PassFlow%20AI.%0A%0ANom%20du%20studio:%20%0AVille:%20',
    yearLabel: 'AN', btnLabel: 'FR', flag: '🇫🇷',
    features: ['✔ Reconnaissance Faciale IA', '✔ Réservation Automatique', '✔ 59€/<span class="year-emphasis">AN</span>'],
    navDemo: 'Démo', navFeatures: 'Fonctionnalités', navPricing: 'Tarifs', navContact: 'Contact'
  },
  de: {
    lang: 'de', title: 'PassFlow AI | KI-Fitnessstudio-Verwaltung — 59€/Jahr, Nicht pro Monat',
    desc: 'Die günstigste Software für Fitnessstudio-, Yoga- und Pilates-Studio-Verwaltung. KI-Gesichtserkennung-Check-in, Buchungen, Mitglieder-CRM — alles für nur 59€ pro JAHR. Keine versteckten Kosten.',
    keywords: 'Fitnessstudio Software, Yoga Studio Verwaltung, Pilates Software, Gesichtserkennung Fitnessstudio, CRM Fitness, Mindbody Alternative Deutschland, günstige Gym Software, Zutrittskontrolle Fitnessstudio, Mitgliederverwaltung, PassFlow AI',
    currency: 'EUR', price: '59', symbol: '€', monthly: '4,92€', priceLabel: '59€',
    tagline: 'KI-Verwaltung für Fitnessstudios, Yoga & Pilates',
    h1: 'Du trainierst. <span class="gradient-text">Wir kümmern uns um den Rest.</span>',
    sub: 'Schluss mit überteuerten Studio-Programmen.<br>KI-Check-in, Buchungen, Mitgliederverwaltung — alles in einem. <strong style="color:#d4af37;">59€ pro Jahr, nicht pro Monat.</strong>',
    feat1: 'Kein Empfang Nötig', feat1d: 'Einfach ein Tablet am Eingang aufstellen.<br>Mitglieder checken per Gesichtserkennung oder PIN ein — kein Personal nötig.',
    feat2: 'Automatische Abrechnung', feat2d: 'Einheiten werden beim Check-in automatisch abgezogen. Ablaufdaten in Echtzeit verfolgt.',
    feat3: 'Tagesberichte mit einem Tipp', feat3d: 'Wer war da, wie viel Umsatz heute, welche Mitglieder drohen abzuwandern.<br>Klare Statistik aufs Handy.',
    stopPaying: 'Schluss mit <span style="color:#d4af37;">monatlichen Zahlungen</span>', othersCharge: 'Andere verlangen 50–700€ <em>pro Monat</em>. Wir verlangen das <em>pro Jahr</em>.',
    plan: 'All-in-One Plan', perMonth: '4,92€/Monat', coffeeCompare: '— weniger als ein Kaffee pro Woche.',
    noHidden: '⚡ Keine versteckten Kosten. Keine Einrichtungsgebühr. Keine Pro-Mitglied-Gebühren.',
    privacy: '🔒 Daten auf Google Cloud gespeichert, vollständig DSGVO-konform. Gesichtsdaten werden lokal auf dem Gerät verarbeitet — niemals in die Cloud hochgeladen.',
    cta1: '📧 Kontaktieren Sie uns — Kostenlose Demo', cta2: '🚀 Online Beantragen — In 24h Aktiv',
    footer: 'Der neue Standard im Fitnessstudio-Management',
    footerDesc: 'PassFlow AI automatisiert Check-in, Mitgliederverwaltung und Business-Analyse für Fitnessstudios, CrossFit, Yoga- und Pilates-Studios weltweit.',
    emailSubject: 'PassFlow%20AI%20Anfrage%20-%20Deutschland', emailBody: 'Hallo!%20Ich%20interessiere%20mich%20für%20PassFlow%20AI.%0A%0AStudio-Name:%20%0AStadt:%20',
    yearLabel: 'JAHR', btnLabel: 'DE', flag: '🇩🇪',
    features: ['✔ KI-Gesichtserkennung', '✔ Auto-Buchung & Credits', '✔ 59€/<span class="year-emphasis">JAHR</span>'],
    navDemo: 'Demo', navFeatures: 'Funktionen', navPricing: 'Preise', navContact: 'Kontakt'
  },
  au: {
    lang: 'en-AU', title: 'PassFlow AI | AI-Powered Gym & Studio Management — A$99/Year, Not Per Month',
    desc: 'Australia\'s most affordable gym, yoga & pilates studio management software. AI facial recognition check-in, booking, member CRM — all for A$99 per YEAR. No lock-in contracts.',
    keywords: 'gym management software Australia, yoga studio software, pilates software Australia, facial recognition gym, fitness CRM, Mindbody alternative Australia, cheap gym software, member management, 24 7 gym software, PassFlow AI',
    currency: 'AUD', price: '99', symbol: 'A$', monthly: 'A$8.25', priceLabel: 'A$99',
    tagline: 'AI-Powered for Gyms, Yoga & Pilates Studios in Australia',
    h1: 'You teach. <span class="gradient-text">We handle everything else.</span>',
    sub: 'Stop overpaying for bloated studio software.<br>AI check-in, booking, member management — all in one. <strong style="color:#d4af37;">A$99 per year, not per month.</strong>',
    feat1: 'No Front Desk Needed', feat1d: 'Place a tablet at your entrance.<br>Members check in with their face or PIN — no staff required.',
    feat2: 'Auto Credit Deduction', feat2d: 'Credits deduct automatically on check-in. Expiry dates tracked in real-time. No more manual counting.',
    feat3: 'Daily Reports in 1 Tap', feat3d: 'Who came in, how much revenue today, which members are at risk of churning. Clean stats, straight to your phone.',
    stopPaying: 'Stop Paying <span style="color:#d4af37;">Monthly</span>', othersCharge: 'Others charge A$80–A$1000 <em>per month</em>. We charge this <em>per year</em>.',
    plan: 'All-in-One Plan', perMonth: 'A$8.25/month', coffeeCompare: '— less than a flat white per week.',
    noHidden: '⚡ No hidden fees. No setup costs. No lock-in contracts.',
    privacy: '🔒 Data stored on Google Cloud (Sydney region available), compliant with the Australian Privacy Act 1988. Facial data processed on-device — never uploaded to the cloud.',
    cta1: '📧 Get Started — Email Us', cta2: '🚀 Apply Online — Live in 24 Hours',
    footer: 'The new standard in fitness studio management',
    footerDesc: 'PassFlow AI automates check-in, member management, and business analytics for gyms, CrossFit boxes, yoga, and pilates studios across Australia and worldwide.',
    emailSubject: 'PassFlow%20AI%20Inquiry%20-%20Australia', emailBody: 'G\'day!%20I\'m%20interested%20in%20PassFlow%20AI%20for%20my%20studio.%0A%0AStudio%20Name:%20%0ACity:%20',
    yearLabel: 'YEAR', btnLabel: 'AU', flag: '🇦🇺',
    features: ['✔ AI Facial Recognition', '✔ Auto Booking & Credits', '✔ A$99/<span class="year-emphasis">YEAR</span>'],
    navDemo: 'Demo', navFeatures: 'Features', navPricing: 'Pricing', navContact: 'Contact'
  },
  ca: {
    lang: 'en-CA', title: 'PassFlow AI | AI-Powered Gym & Studio Management — C$89/Year, Not Per Month',
    desc: 'Canada\'s most affordable gym, yoga & pilates studio management software. AI facial recognition check-in, booking, member CRM — all for C$89 per YEAR. No hidden fees. PIPEDA compliant.',
    keywords: 'gym management software Canada, yoga studio software, pilates software Canada, facial recognition gym, fitness CRM, Mindbody alternative Canada, affordable gym software, member management app, 24 hour gym software, PassFlow AI',
    currency: 'CAD', price: '89', symbol: 'C$', monthly: 'C$7.42', priceLabel: 'C$89',
    tagline: 'AI-Powered for Gyms, Yoga & Pilates Studios in Canada',
    h1: 'You teach. <span class="gradient-text">We handle everything else.</span>',
    sub: 'Stop overpaying for bloated studio software.<br>AI check-in, booking, member management — all in one. <strong style="color:#d4af37;">C$89 per year, not per month.</strong>',
    feat1: 'No Front Desk Needed', feat1d: 'Place a tablet at your entrance.<br>Members check in with their face or PIN — no staff required.',
    feat2: 'Auto Credit Deduction', feat2d: 'Credits deduct automatically on check-in. Expiry dates tracked in real-time. No more manual counting.',
    feat3: 'Daily Reports in 1 Tap', feat3d: 'Who came in, how much revenue today, which members are at risk of churning. Clean stats, straight to your phone.',
    stopPaying: 'Stop Paying <span style="color:#d4af37;">Monthly</span>', othersCharge: 'Others charge C$80–C$900 <em>per month</em>. We charge this <em>per year</em>.',
    plan: 'All-in-One Plan', perMonth: 'C$7.42/month', coffeeCompare: '— less than a Tim Hortons coffee per week.',
    noHidden: '⚡ No hidden fees. No setup costs. No per-member charges.',
    privacy: '🔒 Data stored on Google Cloud, fully PIPEDA (Personal Information Protection and Electronic Documents Act) compliant. Facial data processed on-device — never uploaded to the cloud. Available in English and French.',
    cta1: '📧 Get Started — Email Us', cta2: '🚀 Apply Online — Live in 24 Hours',
    footer: 'The new standard in fitness studio management',
    footerDesc: 'PassFlow AI automates check-in, member management, and business analytics for gyms, CrossFit boxes, yoga, and pilates studios across Canada and worldwide.',
    emailSubject: 'PassFlow%20AI%20Inquiry%20-%20Canada', emailBody: 'Hi!%20I\'m%20interested%20in%20PassFlow%20AI%20for%20my%20studio.%0A%0AStudio%20Name:%20%0ACity:%20',
    yearLabel: 'YEAR', btnLabel: 'CA', flag: '🇨🇦',
    features: ['✔ AI Facial Recognition', '✔ Auto Booking & Credits', '✔ C$89/<span class="year-emphasis">YEAR</span>'],
    navDemo: 'Demo', navFeatures: 'Features', navPricing: 'Pricing', navContact: 'Contact'
  }
};

function generatePage(code, p) {
  const langDropdown = `
                    <a href="/en/home.html">🇺🇸 English</a>
                    <a href="/es/home.html"${code==='es'?' class="active"':''}>🇪🇸 Español</a>
                    <a href="/pt/home.html"${code==='pt'?' class="active"':''}>🇧🇷 Português</a>
                    <a href="/fr/home.html"${code==='fr'?' class="active"':''}>🇫🇷 Français</a>
                    <a href="/de/home.html"${code==='de'?' class="active"':''}>🇩🇪 Deutsch</a>
                    <a href="/au/home.html"${code==='au'?' class="active"':''}>🇦🇺 Australia</a>
                    <a href="/ca/home.html"${code==='ca'?' class="active"':''}>🇨🇦 Canada</a>
                    <a href="/ja/home.html">🇯🇵 日本語</a>
                    <a href="/ru/home.html">🇷🇺 Русский</a>
                    <a href="/zh/home.html">🇨🇳 中文</a>`;

  return `<!DOCTYPE html>
<html lang="${p.lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${p.title}</title>
    <meta name="description" content="${p.desc}">
    <meta name="keywords" content="${p.keywords}">
    <meta property="og:title" content="${p.title}">
    <meta property="og:description" content="${p.desc}">
    <meta property="og:image" content="/assets/passflow_square_logo.png">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://passflowai.web.app/${code}/home.html">
    <link rel="alternate" hreflang="${p.lang}" href="https://passflowai.web.app/${code}/home.html" />
    <link rel="alternate" hreflang="en" href="https://passflowai.web.app/en/home.html" />
    <link rel="alternate" hreflang="ko" href="https://passflowai.web.app/home.html" />
    <link rel="alternate" hreflang="x-default" href="https://passflowai.web.app/en/home.html" />
    <link rel="canonical" href="https://passflowai.web.app/${code}/home.html" />
    <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"SoftwareApplication","name":"PassFlow AI","applicationCategory":"BusinessApplication","operatingSystem":"Web, iOS, Android","url":"https://passflowai.web.app/${code}/home.html","offers":{"@type":"Offer","price":"${p.price}","priceCurrency":"${p.currency}","priceValidUntil":"2027-12-31","availability":"https://schema.org/InStock"},"aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","ratingCount":"47"}}
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" as="image" type="image/webp" href="/assets/hero_bg_ai.webp">
    <link rel="icon" type="image/png" href="/favicon.png" />
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-3D6011MNHF"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3D6011MNHF');</script>
    <link rel="stylesheet" href="/style.css?v=6">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body{font-family:'Inter','Outfit',sans-serif}
        .hero-glow{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(212,175,55,.08) 0%,transparent 70%);pointer-events:none;z-index:0}
        .year-emphasis{display:inline-block;background:rgba(212,175,55,.15);border:1px solid rgba(212,175,55,.3);border-radius:6px;padding:2px 10px;font-weight:800}
        .lang-switcher{position:relative;display:inline-flex;align-items:center;cursor:pointer}
        .lang-switcher-btn{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.8);font-size:.85rem;cursor:pointer}
        .lang-dropdown{position:absolute;top:calc(100% + 8px);right:0;min-width:160px;background:rgba(20,20,25,.98);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:6px;display:none;z-index:1000}
        .lang-dropdown.show{display:block}
        .lang-dropdown a{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;text-decoration:none;color:rgba(255,255,255,.75);font-size:.9rem}
        .lang-dropdown a:hover{background:rgba(212,175,55,.1);color:#d4af37}
        .lang-dropdown a.active{color:#d4af37;font-weight:600}
        .single-plan-card{max-width:520px;margin:40px auto 0;padding:clamp(30px,6vw,50px) clamp(20px,6vw,40px);background:rgba(15,15,20,.75);backdrop-filter:blur(12px);border:1px solid rgba(212,175,55,.3);border-radius:24px;box-shadow:0 30px 60px rgba(0,0,0,.6)}
    </style>
</head>
<body>
    <nav class="navbar glass">
        <a href="/${code}/home.html" class="logo" style="text-decoration:none;display:flex;align-items:center;gap:8px">
            <img src="/assets/passflow_square_logo.png" alt="PassFlow AI" style="height:36px;border-radius:6px" />
            <div style="width:140px;height:38px;display:flex;align-items:center;overflow:hidden;position:relative">
                <img src="/assets/passflow_ai_logo_transparent.webp" alt="PassFlow AI" style="position:absolute;height:110px;left:-6px;max-width:none" />
            </div>
        </a>
        <div class="nav-links" id="navLinks">
            <a href="#live-demo" style="color:#d4af37;font-weight:600">${p.navDemo}</a>
            <a href="#features">${p.navFeatures}</a>
            <a href="#pricing">${p.navPricing}</a>
            <a href="#contact">${p.navContact}</a>
            <div class="lang-switcher" style="margin-left:16px">
                <button class="lang-switcher-btn" onclick="document.querySelector('.lang-dropdown').classList.toggle('show')">🌐 ${p.btnLabel} ▾</button>
                <div class="lang-dropdown">${langDropdown}</div>
            </div>
        </div>
        <button class="nav-hamburger" onclick="document.getElementById('navLinks').classList.toggle('open')">☰</button>
    </nav>
    <header class="hero" id="home">
        <div class="hero-bg"></div>
        <div class="hero-glow"></div>
        <div class="hero-content" style="position:relative;z-index:2;padding-top:40px">
            <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:30px;background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.25);margin-bottom:24px;font-size:.85rem;font-weight:600;color:#d4af37">${p.tagline}</div>
            <h1 style="color:#fff;font-size:clamp(2rem,5vw,3.5rem);font-weight:800;line-height:1.3;margin-bottom:20px">${p.h1}</h1>
            <p style="color:rgba(255,255,255,.7);font-size:clamp(1rem,2vw,1.2rem);line-height:1.6;max-width:680px;margin:0 auto 30px">${p.sub}</p>
            <div style="display:inline-flex;align-items:center;flex-wrap:wrap;gap:8px;padding:12px 24px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.1);border-radius:50px">
                <span style="color:#fff;font-size:.95rem;font-weight:600">${p.features[0]}</span>
                <span style="color:rgba(255,255,255,.2)">|</span>
                <span style="color:#fff;font-size:.95rem;font-weight:600">${p.features[1]}</span>
                <span style="color:rgba(255,255,255,.2)">|</span>
                <span style="color:#d4af37;font-size:.95rem;font-weight:700">${p.features[2]}</span>
            </div>
        </div>
    </header>
    <section class="features" id="features" style="padding:clamp(30px,5vw,60px) 0">
        <div class="container">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:30px;margin-top:40px">
                <div style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:20px;padding:40px;text-align:center">
                    <div style="font-size:3rem;margin-bottom:20px">👋</div>
                    <h3 style="font-size:1.4rem;color:#fff;margin-bottom:12px;font-weight:700">${p.feat1}</h3>
                    <p style="font-size:1rem;color:rgba(255,255,255,.6);line-height:1.6">${p.feat1d}</p>
                </div>
                <div style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:20px;padding:40px;text-align:center">
                    <div style="font-size:3rem;margin-bottom:20px">🎫</div>
                    <h3 style="font-size:1.4rem;color:#fff;margin-bottom:12px;font-weight:700">${p.feat2}</h3>
                    <p style="font-size:1rem;color:rgba(255,255,255,.6);line-height:1.6">${p.feat2d}</p>
                </div>
                <div style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:20px;padding:40px;text-align:center">
                    <div style="font-size:3rem;margin-bottom:20px">📉</div>
                    <h3 style="font-size:1.4rem;color:#fff;margin-bottom:12px;font-weight:700">${p.feat3}</h3>
                    <p style="font-size:1rem;color:rgba(255,255,255,.6);line-height:1.6">${p.feat3d}</p>
                </div>
            </div>
        </div>
    </section>
    <section id="pricing" style="padding:40px 0 30px">
        <div class="container">
            <h2 style="text-align:center;margin-bottom:10px;color:#fff;font-size:2rem">${p.stopPaying}</h2>
            <p style="text-align:center;color:rgba(255,255,255,.5);margin-bottom:10px">${p.othersCharge}</p>
            <div class="single-plan-card">
                <div style="font-size:.85rem;color:rgba(255,255,255,.5);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">${p.plan}</div>
                <h3 style="font-size:clamp(2.5rem,6vw,3.2rem);margin-bottom:4px;color:#d4af37;font-weight:900">
                    ${p.priceLabel}<span style="font-size:.4em;color:rgba(255,255,255,.5)">/</span><span class="year-emphasis" style="font-size:.5em">${p.yearLabel}</span>
                </h3>
                <p style="font-size:1.1rem;color:rgba(255,255,255,.6);margin-bottom:12px">That's <strong style="color:#fff">${p.perMonth}</strong> ${p.coffeeCompare}</p>
                <p style="font-size:.85rem;color:rgba(212,175,55,.7);margin-bottom:20px">${p.noHidden}</p>
                <p style="font-size:.8rem;color:rgba(255,255,255,.4);margin-bottom:20px">${p.privacy}</p>
                <a href="mailto:motionpt@gmail.com?subject=${p.emailSubject}&body=${p.emailBody}" class="btn-primary" id="cta-email-${code}" onclick="gtag('event','generate_lead',{event_category:'conversion',event_label:'${code}-landing-email',source:'landing',page:'${code}'})" style="display:flex;justify-content:center;align-items:center;gap:8px;width:100%;padding:18px;font-size:1.1rem;text-decoration:none;font-weight:800;background:linear-gradient(135deg,#d4af37,#f5d67b);color:#000;border-radius:12px;border:none;box-sizing:border-box">
                    ${p.cta1}
                </a>
                <a href="/onboarding?lang=${code}" class="btn-secondary" id="cta-onboarding-${code}" onclick="gtag('event','generate_lead',{event_category:'conversion',event_label:'${code}-landing-onboarding',source:'landing',page:'${code}'})" style="display:block;width:100%;text-align:center;padding:18px;font-size:1rem;text-decoration:none;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;font-weight:600;border-radius:12px;margin-top:12px;box-sizing:border-box">
                    ${p.cta2}
                </a>
            </div>
        </div>
    </section>
    <footer class="footer" id="contact" style="padding:20px 0 25px;text-align:center">
        <div class="container">
            <div style="border-top:1px solid rgba(255,255,255,.1);padding-top:20px">
                <h4 style="font-size:.85rem;color:#d4af37;margin-bottom:8px">${p.footer}</h4>
                <p style="font-size:.85rem;color:rgba(255,255,255,.6);line-height:1.5">${p.footerDesc}</p>
                <p>&copy; 2026 PassFlow AI.</p>
            </div>
        </div>
    </footer>
    <script>document.addEventListener('click',function(e){if(!e.target.closest('.lang-switcher')){document.querySelectorAll('.lang-dropdown').forEach(d=>d.classList.remove('show'))}});</script>
    <script src="/script.js"></script>
</body>
</html>`;
}

// Generate all pages
for (const [code, config] of Object.entries(pages)) {
  const dir = path.join(projectRoot, 'public', code);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const html = generatePage(code, config);
  fs.writeFileSync(path.join(dir, 'home.html'), html, 'utf8');
  console.log(`✅ Created /${code}/home.html (${config.lang})`);
}

console.log('\n🎉 All 5 landing pages generated successfully!');
