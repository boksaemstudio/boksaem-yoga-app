const { chromium } = require('playwright');
const path = require('path');

(async () => {
    console.log("Launching browser...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ deviceScaleFactor: 4 }); // 4K resolution
    const page = await context.newPage();
    
    const svgHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:ital,wght@1,800&display=swap" rel="stylesheet">
        <style>
            body { margin: 0; padding: 0; background: transparent; }
            .logo-text { font-family: 'Outfit', sans-serif; font-weight: 800; font-style: italic; font-size: 150px; letter-spacing: -4px; }
            .ai-text { font-family: 'Outfit', sans-serif; font-weight: 800; font-style: italic; font-size: 150px; letter-spacing: -2px; }
            .logo-container { display: inline-block; } 
        </style>
    </head>
    <body>
        <div class="logo-container" id="logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="auto" height="auto" style="display: block;">
              <defs>
                <linearGradient id="passflow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#0F5132" />
                  <stop offset="35%" stop-color="#198754" />
                  <stop offset="65%" stop-color="#0DCAF0" />
                  <stop offset="100%" stop-color="#007BFF" />
                </linearGradient>
                <linearGradient id="ai-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#8A2BE2" />
                  <stop offset="50%" stop-color="#D100D1" />
                  <stop offset="100%" stop-color="#FF1493" />
                </linearGradient>
              </defs>
              <text id="t1" x="0" y="120" class="logo-text" fill="url(#passflow-grad)">PassFlow</text>
              <text id="t2" x="650" y="120" class="ai-text" fill="url(#ai-grad)">Ai</text>
            </svg>
        </div>
        <script>
            window.onload = () => {
                const svg = document.querySelector('svg');
                const t1 = document.getElementById('t1');
                const t2 = document.getElementById('t2');
                
                // Precisely align Ai right next to PassFlow
                const b1 = t1.getBBox();
                t2.setAttribute('x', b1.x + b1.width + 10);
                
                // Crop completely eliminating all margins
                const finalBBox = svg.getBBox();
                svg.setAttribute('viewBox', \`\${finalBBox.x - 2} \${finalBBox.y - 2} \${finalBBox.width + 4} \${finalBBox.height + 4}\`);
                svg.setAttribute('width', finalBBox.width + 4);
                svg.setAttribute('height', finalBBox.height + 4);
                
                window.__READY = true;
            };
        </script>
    </body>
    </html>
    `;
    
    await page.setContent(svgHTML);
    console.log("Waiting for fonts to load...");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => window.__READY === true);
    
    console.log("Taking screenshot...");
    const logoElement = await page.$('svg');
    const desktopPath = path.join(require('os').homedir(), 'Desktop', 'PassFlow_Logo_Transparent_UltraHD.png');
    
    await logoElement.screenshot({ 
        path: desktopPath,
        omitBackground: true
    });
    
    console.log("SUCCESS! Saved to: " + desktopPath);
    await browser.close();
})();
