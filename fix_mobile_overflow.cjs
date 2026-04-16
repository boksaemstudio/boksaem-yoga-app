const fs = require('fs');
const path = require('path');

// Fix all home.html files
const dirs = ['', 'en', 'ja', 'ru', 'zh', 'es', 'pt', 'de', 'fr', 'in', 'au', 'ca'];

for (const dir of dirs) {
  const file = dir ? path.join('public', dir, 'home.html') : path.join('public', 'home.html');
  if (!fs.existsSync(file)) continue;
  
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Fix 1: hero-glow — add max-width and overflow hidden
  if (html.includes('width: 600px; height: 600px; border-radius: 50%')) {
    html = html.replace(
      'width: 600px; height: 600px; border-radius: 50%',
      'width: 600px; max-width: 100vw; height: 600px; border-radius: 50%; overflow: hidden'
    );
    changed = true;
  }

  // Fix 2: Ensure the <body> tag has overflow-x: hidden 
  // Add a wrapper style that prevents ANY horizontal overflow
  if (!html.includes('overflow-x-fix')) {
    html = html.replace(
      '</head>',
      `    <style class="overflow-x-fix">
        /* [CRITICAL] Prevent mobile horizontal overflow / forced zoom-out */
        html, body { overflow-x: hidden !important; max-width: 100vw !important; }
        .hero { overflow: hidden !important; }
        .hero-glow { max-width: 100vw !important; overflow: hidden !important; }
    </style>
</head>`
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, html);
    console.log(`✅ Fixed: ${dir || 'root'}/home.html`);
  } else {
    console.log(`ℹ️  ${dir || 'root'}/home.html — already fixed or no match`);
  }
}

console.log('\n🎉 All files processed!');
