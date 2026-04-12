const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// CTA 템플릿 함수
function makeCTA(lang, text, onboardingUrl, socialProof) {
    return `
                <!-- Hero CTA Buttons -->
                <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 10px;">
                    <a href="${onboardingUrl}" style="display: inline-flex; align-items: center; gap: 8px; padding: 16px 32px; background: linear-gradient(135deg, #4ade80, #22c55e); color: #000; font-weight: 800; font-size: 1.1rem; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 20px rgba(74,222,128,0.35); transition: all 0.3s; animation: pulse 2s ease-in-out infinite;">
                        🚀 ${text}
                    </a>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 16px; flex-wrap: wrap; justify-content: center;">
                    <div style="display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
                        <span style="font-size: 0.82rem;">🟢</span>
                        <span style="color: rgba(255,255,255,0.7); font-size: 0.8rem; font-weight: 500;">${socialProof[0]}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
                        <span style="font-size: 0.82rem;">🔒</span>
                        <span style="color: rgba(255,255,255,0.7); font-size: 0.8rem; font-weight: 500;">${socialProof[1]}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
                        <span style="font-size: 0.82rem;">☁️</span>
                        <span style="color: rgba(255,255,255,0.7); font-size: 0.8rem; font-weight: 500;">Google Cloud</span>
                    </div>
                </div>`;
}

// 언어별 설정
const configs = {
    'en': { text: 'Start Free — 2 Months', url: '/onboarding?lang=en', proof: ['Live in production', 'GDPR Compliant', 'Google Cloud'] },
    'ja': { text: '2ヶ月無料で始める', url: '/onboarding?lang=ja', proof: ['実稼働中', '個人情報保護法準拠', 'Google Cloud'] },
    'zh': { text: '免费试用2个月', url: '/onboarding?lang=zh', proof: ['已上线运营', '隐私合规', 'Google Cloud'] },
    'es': { text: '2 Meses Gratis', url: '/onboarding?lang=es', proof: ['En producción', 'GDPR', 'Google Cloud'] },
    'de': { text: '2 Monate Gratis', url: '/onboarding?lang=de', proof: ['Live im Betrieb', 'DSGVO', 'Google Cloud'] },
    'fr': { text: '2 Mois Gratuits', url: '/onboarding?lang=fr', proof: ['En production', 'RGPD', 'Google Cloud'] },
    'pt': { text: '2 Meses Grátis', url: '/onboarding?lang=pt', proof: ['Em produção', 'LGPD', 'Google Cloud'] },
    'ru': { text: '2 месяца бесплатно', url: '/onboarding?lang=ru', proof: ['В работе', 'Защита данных', 'Google Cloud'] },
    'in': { text: 'Start Free — 2 Months', url: '/onboarding?lang=en', proof: ['Live in production', 'Data Privacy', 'Google Cloud'] },
    'au': { text: 'Start Free — 2 Months', url: '/onboarding?lang=en', proof: ['Live in production', 'Privacy Act', 'Google Cloud'] },
    'ca': { text: 'Start Free — 2 Months', url: '/onboarding?lang=en', proof: ['Live in production', 'PIPEDA', 'Google Cloud'] },
};

let modified = 0;
for (const [lang, config] of Object.entries(configs)) {
    const filePath = path.join(publicDir, lang, 'home.html');
    if (!fs.existsSync(filePath)) continue;
    
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('Hero CTA Buttons')) {
        console.log(`⏩ ${lang}/home.html — 이미 CTA 존재`);
        continue;
    }
    
    const cta = makeCTA(lang, config.text, config.url, config.proof);
    
    // </header> 바로 직전에 CTA 삽입
    content = content.replace(
        /(<\/div>\s*<\/div>\s*<\/div>\s*<\/header>)/,
        cta + '\n                </div>\n            </div>\n        </div>\n    </header>'
    );
    
    // 원래의 closing divs + header 제거 (대체됨)
    if (content.includes('Hero CTA Buttons')) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${lang}/home.html — CTA + 소셜 증거 추가 완료`);
        modified++;
    } else {
        // 대체 전략: </header> 직전에 삽입
        const headerEnd = content.lastIndexOf('</header>');
        if (headerEnd !== -1) {
            content = content.slice(0, headerEnd) + cta + '\n            </div>\n        </div>\n    </header>' + content.slice(headerEnd + '</header>'.length);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${lang}/home.html — CTA 직접 삽입 완료`);
            modified++;
        } else {
            console.log(`⚠️ ${lang}/home.html — </header> 없음!`);
        }
    }
}

console.log(`\n✅ 완료: ${modified}개 파일 수정`);
