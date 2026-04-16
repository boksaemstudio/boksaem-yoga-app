const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

const jsonLd = `
    <!-- Global SEO JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "PassFlow AI",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web, iOS, Android",
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "USD"
      },
      "description": "Smart Attendance & Operations Management System",
      "publisher": {
        "@type": "Organization",
        "name": "PassFlow AI",
        "url": "https://passflowai.web.app"
      }
    }
    </script>
`;

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (!content.includes('type="application/ld+json"')) {
                content = content.replace('</head>', jsonLd + '</head>');
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Injected JSON-LD into: ' + fullPath);
            }
        }
    }
}

processDir(publicDir);
console.log('JSON-LD injection complete!');
