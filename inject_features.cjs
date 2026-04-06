const fs = require('fs');
const path = require('path');

const homePath = path.join(__dirname, 'public', 'home.html');
const featuresPath = path.join(__dirname, 'public', 'features.html');

let homeHTML = fs.readFileSync(homePath, 'utf8');
let featuresHTML = fs.readFileSync(featuresPath, 'utf8');

// 1. Remove background: #0a0a0f from #core section
homeHTML = homeHTML.replace('background: #0a0a0f;', '');

// 2. Extract CSS from features.html
const cssMatch = featuresHTML.match(/<style>([\s\S]*?)<\/style>/);
if (cssMatch) {
    let css = cssMatch[1];
    // Keep only the .spec-category, .feature-*, .f-*, .sympathy-box, .philosophy-box
    const lines = css.split('\n');
    const relevantCssLines = lines.filter(line => 
        line.includes('.spec-') || 
        line.includes('.feature-') || 
        line.includes('.f-') || 
        line.includes('.sympathy-box') || 
        line.includes('.philosophy-box')
    );
    
    // Scale down dimensions slightly
    let injectedCss = relevantCssLines.join('\n')
        .replace(/margin: 100px 0/g, 'margin: 50px 0')
        .replace(/padding-top: 60px/g, 'padding-top: 30px')
        .replace(/font-size: 2.2rem/g, 'font-size: 1.8rem')
        .replace(/padding: 40px/g, 'padding: 30px');

    // Insert into home.html
    homeHTML = homeHTML.replace('</style>', `
        /* Included from features.html */
        ${injectedCss}
    </style>`);
}

// 3. Extract HTML content from features.html
// We want exactly what's inside <section class="container" style="padding-bottom: 120px;">
const startStr = '<div class="sympathy-box">';
// Find end of last spec-category
const endStr = '</section>\n    </main>';

const startIndex = featuresHTML.indexOf(startStr);
const endIndex = featuresHTML.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    const extractedContent = featuresHTML.slice(startIndex, endIndex);

    // 4. Inject it into home.html right under the "상세 혁신 기능 확인하기" box
    const injectionPoint = '</a>\n            </div>\n        </div>\n    </section>';
    
    // Check if it's already injected to prevent duplicates
    if (!homeHTML.includes('<div class="sympathy-box">')) {
        homeHTML = homeHTML.replace(
            injectionPoint, 
            '</a>\n            </div>\n\n            <!-- Injected Features -->\n            <div style="margin-top: 60px;">\n' + extractedContent + '\n            </div>\n        </div>\n    </section>'
        );
    }
}

fs.writeFileSync(homePath, homeHTML, 'utf8');
console.log('Successfully injected features.html content into home.html.');
