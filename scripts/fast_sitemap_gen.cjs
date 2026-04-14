const fs = require('fs');

const langs = [
    { code: 'ko', param: '' },
    { code: 'en', param: '?lang=en' },
    { code: 'ja', param: '?lang=ja' },
    { code: 'zh', param: '?lang=zh' },
    { code: 'es', param: '?lang=es' },
    { code: 'ru', param: '?lang=ru' },
    { code: 'pt', param: '?lang=pt' },
    { code: 'de', param: '?lang=de' },
    { code: 'fr', param: '?lang=fr' }
];

let urls = '';

// Home pages for each language
langs.forEach(lang => {
    const loc = lang.param ? "https://passflowai.web.app/" + lang.param : "https://passflowai.web.app/";
    let alternateLinks = "";
    langs.forEach(l => {
      const linkHref = l.param ? "https://passflowai.web.app/" + l.param : "https://passflowai.web.app/";
      alternateLinks += "    <xhtml:link rel=\"alternate\" hreflang=\"" + l.code + "\" href=\"" + linkHref + "\"/>\n";
    });
    const priority = (lang.code === 'ko' || lang.code === 'en') ? '1.0' : '0.9';
    
    urls += "\n  <url>\n    <loc>" + loc + "</loc>\n" + alternateLinks + "    <lastmod>" + new Date().toISOString().split('T')[0] + "</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>" + priority + "</priority>\n  </url>";
});

// Features pages for each language
langs.forEach(lang => {
    const loc = lang.param ? "https://passflowai.web.app/features" + lang.param : "https://passflowai.web.app/features";
    let alternateLinks = "";
    langs.forEach(l => {
      const linkHref = l.param ? "https://passflowai.web.app/features" + l.param : "https://passflowai.web.app/features";
      alternateLinks += "    <xhtml:link rel=\"alternate\" hreflang=\"" + l.code + "\" href=\"" + linkHref + "\"/>\n";
    });
    
    urls += "\n  <url>\n    <loc>" + loc + "</loc>\n" + alternateLinks + "    <lastmod>" + new Date().toISOString().split('T')[0] + "</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>";
});

const sitemapContent = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"\n        xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">\n" + urls + "\n</urlset>";

fs.writeFileSync('public/sitemap.xml', sitemapContent);
console.log('sitemap generated');
