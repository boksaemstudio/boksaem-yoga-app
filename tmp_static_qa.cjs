const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const pDir = path.join(__dirname, 'public');
const languages = ['au', 'ca', 'de', 'en', 'es', 'fr', 'in', 'ja', 'pt', 'ru', 'zh', 'ko']; // ko is root

const files = [];
languages.forEach(lang => {
    let p = lang === 'ko' ? path.join(pDir, 'home.html') : path.join(pDir, lang, 'home.html');
    if(fs.existsSync(p)) files.push({lang, path: p});
});

let report = {
    totalFiles: files.length,
    brokenLinks: [],
    mixedLanguages: [],
    missingAlts: [],
    emptyButtons: []
};

// Regex for Korean characters
const koreanRegex = /[\uac00-\ud7af|\u1100-\u11ff|\u3130-\u318f]/;

files.forEach(fileObj => {
    const content = fs.readFileSync(fileObj.path, 'utf8');
    const $ = cheerio.load(content);
    
    // Check links
    $('a').each((i, el) => {
        const href = $(el).attr('href');
        if (!href || href === '#') {
            report.brokenLinks.push({lang: fileObj.lang, text: $(el).text().trim().substring(0,20)});
        }
    });

    // Check Mixed Languages (Korean in non-KO pages)
    if (fileObj.lang !== 'ko') {
        const textNodes = $('body').text();
        // Ignore the language switcher where Korean is expected
        const ignoreSwitcher = $('.lang-dropdown').text();
        const cleanedText = textNodes.replace(ignoreSwitcher, '');
        
        if (koreanRegex.test(cleanedText)) {
            // Find roughly where it is
            $('body *').each((i, el) => {
                if($(el).children().length === 0) { // leaf node
                    const text = $(el).text();
                    if(koreanRegex.test(text) && !$(el).closest('.lang-dropdown').length && !$(el).closest('script').length) {
                         report.mixedLanguages.push({lang: fileObj.lang, tag: el.tagName, text: text.trim().substring(0,30)});
                    }
                }
            });
        }
    }

    // Missing Alts
    $('img').each((i, el) => {
        const alt = $(el).attr('alt');
        if (!alt) {
            report.missingAlts.push({lang: fileObj.lang, src: $(el).attr('src')});
        }
    });

    // Empty buttons / links
    $('button, a').each((i, el) => {
        const text = $(el).text().trim();
        const hasChildren = $(el).children().length > 0;
        if (!text && !hasChildren) {
             report.emptyButtons.push({lang: fileObj.lang, tag: el.tagName, class: $(el).attr('class')});
        }
    });
});

console.log(JSON.stringify(report, null, 2));
