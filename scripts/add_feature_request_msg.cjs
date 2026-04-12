const fs = require('fs');
const path = require('path');

// Localized "feature request" messages for each language
const messages = {
  'public': {
    html: `<div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">원하는 기능이 있으신가요?</strong><br>
                        언제든 문의해 주세요. 실현해 드립니다.
                    </p>
                </div>`
  },
  'en': {
    html: `<div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">Have a feature in mind?</strong><br>
                        Just let us know — we'll make it happen.
                    </p>
                </div>`
  },
  'ja': {
    html: `<div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">ご要望の機能はございますか？</strong><br>
                        いつでもお気軽にお問い合わせください。実現いたします。
                    </p>
                </div>`
  },
  'ru': {
    html: `<div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">Нужна особая функция?</strong><br>
                        Просто сообщите нам — мы воплотим это в жизнь.
                    </p>
                </div>`
  },
  'zh': {
    html: `<div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">需要特定功能？</strong><br>
                        随时联系我们，我们帮您实现。
                    </p>
                </div>`
  },
  'es': {
    html: `<div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">¿Necesitas una función específica?</strong><br>
                        Cuéntanos y la haremos realidad.
                    </p>
                </div>`
  },
  'pt': {
    html: `<div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">Quer uma funcionalidade específica?</strong><br>
                        Fale com a gente — nós desenvolvemos pra você.
                    </p>
                </div>`
  },
  'fr': {
    html: `<div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">Besoin d'une fonctionnalité sur mesure\u00a0?</strong><br>
                        Dites-le nous — nous la réaliserons pour vous.
                    </p>
                </div>`
  },
  'de': {
    html: `<div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">Wünschen Sie sich eine bestimmte Funktion?</strong><br>
                        Teilen Sie es uns mit — wir setzen es für Sie um.
                    </p>
                </div>`
  },
  'in': {
    html: `<div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">Need a specific feature?</strong><br>
                        Just tell us — we'll build it for you.
                    </p>
                </div>`
  },
  'au': {
    html: `<div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">Got a feature in mind?</strong><br>
                        Let us know — we'll make it happen.
                    </p>
                </div>`
  },
  'ca': {
    html: `<div style="text-align:center;margin-top:20px;padding:14px 20px;border-radius:12px;background:rgba(212,175,55,0.05);border:1px dashed rgba(212,175,55,0.2);">
                    <p style="margin:0;font-size:0.9rem;color:rgba(255,255,255,0.7);line-height:1.6;">
                        💡 <strong style="color:#d4af37;">Need a custom feature?</strong><br>
                        Just reach out — we'll build it for you.
                    </p>
                </div>`
  }
};

const publicDir = path.join(__dirname, '..', 'public');

for (const [lang, { html }] of Object.entries(messages)) {
  const filePath = lang === 'public'
    ? path.join(publicDir, 'home.html')
    : path.join(publicDir, lang, 'home.html');

  if (!fs.existsSync(filePath)) {
    console.log(`⏩ ${lang}: file not found, skipping`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has the feature request message
  if (content.includes('feature-request-msg') || content.includes('원하는 기능이 있으신가요') || content.includes('Have a feature in mind') || content.includes('Besoin d') || content.includes('Wünschen Sie') || content.includes('ご要望の機能') || content.includes('Нужна особая') || content.includes('需要特定功能') || content.includes('Necesitas una función') || content.includes('Quer uma funcionalidade') || content.includes('Got a feature') || content.includes('Need a custom feature') || content.includes('Need a specific feature')) {
    console.log(`⏩ ${lang}: already has feature request message`);
    continue;
  }

  // Find the last </section> before the footer and insert before it
  // Strategy: find the closing </div> right before </section> near the footer
  // Look for the CTA button area and insert after it
  
  // Try to find a pattern: closing </div> followed by </div> followed by </section> near end
  const footerIdx = content.lastIndexOf('<footer');
  if (footerIdx === -1) {
    console.log(`⚠️ ${lang}: no footer found`);
    continue;
  }

  // Find the last </section> before footer
  const beforeFooter = content.substring(0, footerIdx);
  const lastSectionEnd = beforeFooter.lastIndexOf('</section>');
  
  if (lastSectionEnd === -1) {
    console.log(`⚠️ ${lang}: no </section> before footer`);
    continue;
  }

  // Find the </div> chain before </section> - insert before the last </div></div></section>
  // Strategy: find last occurrence of "</div>\n        </div>\n    </section>" pattern area
  const sectionBlock = content.substring(Math.max(0, lastSectionEnd - 300), lastSectionEnd + 10);
  
  // Find the 3rd-to-last </div> before </section> to insert our message
  // Simpler approach: insert right before the line that has "</div>" just before "</section>"
  const insertPoint = beforeFooter.lastIndexOf('</div>');
  const insertPoint2 = beforeFooter.lastIndexOf('</div>', insertPoint - 1);
  
  if (insertPoint2 === -1) {
    console.log(`⚠️ ${lang}: could not find insert point`);
    continue;
  }

  // Insert message HTML before the second-to-last </div>
  const markedHtml = `\n                ${html}\n`;
  content = content.substring(0, insertPoint2) + markedHtml + content.substring(insertPoint2);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ ${lang}: added feature request message`);
}

console.log('\n🎉 Done!');
