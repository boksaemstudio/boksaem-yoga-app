const fs = require('fs');

const seoExtensions = {
  au: `
        <!-- Localized SEO Extension for Australia -->
        <div style="max-width: 900px; margin: 40px auto; padding: 40px 20px; text-align: left; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
            <h2 style="font-family: 'Outfit'; font-size: 1.5rem; color: #d4af37; margin-bottom: 20px;">Why Australian Gyms & Studios are Switching to PassFlow AI</h2>
            <p style="font-size: 0.95rem; line-height: 1.6; color: #a1a1aa; margin-bottom: 16px;">
                Operating a fitness business in Sydney, Melbourne, or anywhere in Australia comes with high overheads. Software shouldn't be one of them. While local Mindbody alternatives charge $100+ AUD monthly, PassFlow AI provides an all-in-one studio management platform for just $69 USD per year (~$105 AUD/yr). 
            </p>
            <p style="font-size: 0.95rem; line-height: 1.6; color: #a1a1aa;">
                From Bondi Beach yoga studios to Brisbane functional fitness boxes, Australian owners love our free AI facial recognition. It works perfectly on low-cost tablets, eliminating the need for expensive key tags or scanners. Fully compliant with Australian data privacy schedules through our secure edge-AI processing.
            </p>
        </div>
`,
  ca: `
        <!-- Localized SEO Extension for Canada -->
        <div style="max-width: 900px; margin: 40px auto; padding: 40px 20px; text-align: left; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
            <h2 style="font-family: 'Outfit'; font-size: 1.5rem; color: #d4af37; margin-bottom: 20px;">The Ultimate Gym Software for Canadian Fitness Studios</h2>
            <p style="font-size: 0.95rem; line-height: 1.6; color: #a1a1aa; margin-bottom: 16px;">
                Canadian studio owners in Toronto, Vancouver, and Calgary are moving away from restrictive monthly subscriptions. PassFlow AI is Canada's smartest alternative to ZenPlanner and Mindbody, costing only $69/year USD (roughly $95 CAD/year) with absolutely no hidden fees.
            </p>
            <p style="font-size: 0.95rem; line-height: 1.6; color: #a1a1aa;">
                Our platform includes AI-powered facial recognition check-ins that work flawlessly in harsh winters when members are wearing gloves and beanies. Forget physical fobs. Manage your members, online bookings, and billing with seamless Stripe integration configured for Canadian bank payouts.
            </p>
        </div>
`,
  de: `
        <!-- Localized SEO Extension for Germany -->
        <div style="max-width: 900px; margin: 40px auto; padding: 40px 20px; text-align: left; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
            <h2 style="font-family: 'Outfit'; font-size: 1.5rem; color: #d4af37; margin-bottom: 20px;">Die perfekte Software für Fitnessstudios & Yoga-Zentren in Deutschland</h2>
            <p style="font-size: 0.95rem; line-height: 1.6; color: #a1a1aa; margin-bottom: 16px;">
                Ob in Berlin, München oder Hamburg – Miet- und Personalkosten für deutsche Fitnessstudios steigen stetig. PassFlow AI bietet eine DSGVO-konforme (GDPR) Studio-Management-Lösung für unglaubliche 69$ pro Jahr. Verabschieden Sie sich von starren, monatlichen Softwareabonnements teurer lokaler Anbieter.
            </p>
            <p style="font-size: 0.95rem; line-height: 1.6; color: #a1a1aa;">
                Integrieren Sie moderne KI-Gesichtserkennung völlig kostenlos über ein normales Tablet (z.B. iPad) am Empfang. Unser Edge-AI-System verarbeitet biometrische Daten lokal auf dem Gerät und erfüllt strengste deutsche Datenschutzrichtlinien, da keine Bilder in die Cloud übertragen werden. Inklusive Kursbuchung, Mitgliederverwaltung und Umsatzanalysen.
            </p>
        </div>
`
};

for (const lang of ['au', 'ca', 'de']) {
  const filePath = \`public/\${lang}/home.html\`;
  if (!fs.existsSync(filePath)) {
    console.log(\`File not found: \${filePath}\`);
    continue;
  }
  
  let html = fs.readFileSync(filePath, 'utf8');
  
  // Inject just before the footer or before the final closing body tag.
  // Using <!-- 5. Footer --> as our anchor.
  if (html.includes('<!-- 5. Footer -->')) {
    html = html.replace('<!-- 5. Footer -->', seoExtensions[lang] + '\n\n    <!-- 5. Footer -->');
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(\`✅ Expanded SEO content for \${lang}\`);
  } else {
    // If no footer comment, inject before </body>
    html = html.replace('</body>', seoExtensions[lang] + '\n</body>');
    fs.writeFileSync(filePath, html, 'utf8');
    console.log(\`✅ Expanded SEO content for \${lang} (fallback mode)\`);
  }
}
