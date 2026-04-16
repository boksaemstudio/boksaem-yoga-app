const fs = require('fs');

// Check ALL inline styles in home.html for fixed widths > 400px
const html = fs.readFileSync('public/home.html', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');

console.log('=== home.html: Fixed widths that could overflow mobile ===');
const widthRegex = /width:\s*(\d+)px/gi;
let match;
while ((match = widthRegex.exec(html)) !== null) {
  const w = parseInt(match[1]);
  if (w > 400) {
    const context = html.substring(Math.max(0, match.index - 80), match.index + match[0].length + 20);
    console.log(`  ❌ ${match[0]} (${w}px) — context: ...${context.replace(/\n/g, ' ').trim()}...`);
  }
}

console.log('\n=== style.css: Fixed widths that could overflow mobile ===');
const cssWidthRegex = /width:\s*(\d+)px/gi;
while ((match = cssWidthRegex.exec(css)) !== null) {
  const w = parseInt(match[1]);
  if (w > 400) {
    const lineNum = css.substring(0, match.index).split('\n').length;
    const context = css.substring(Math.max(0, match.index - 60), match.index + match[0].length + 20);
    console.log(`  ❌ Line ${lineNum}: ${match[0]} (${w}px) — ${context.replace(/\n/g, ' ').trim()}`);
  }
}

console.log('\n=== style.css: min-width values > 400px ===');
const minWidthRegex = /min-width:\s*(\d+)px/gi;
while ((match = minWidthRegex.exec(css)) !== null) {
  const w = parseInt(match[1]);
  if (w > 400) {
    const lineNum = css.substring(0, match.index).split('\n').length;
    console.log(`  ⚠️ Line ${lineNum}: ${match[0]}`);
  }
}

console.log('\n=== home.html: min-width values > 400px ===');
const htmlMinWidthRegex = /min-width:\s*(\d+)px/gi;
while ((match = htmlMinWidthRegex.exec(html)) !== null) {
  const w = parseInt(match[1]);
  if (w > 400) {
    console.log(`  ⚠️ ${match[0]}`);
  }
}

// Check for elements without max-width constraints
console.log('\n=== Checking for hero-glow width ===');
const heroGlow = html.match(/hero-glow[^}]*/);
if (heroGlow) console.log('  home.html hero-glow:', heroGlow[0]);
const cssHeroGlow = css.match(/\.hero-glow[^}]*/);
if (cssHeroGlow) console.log('  style.css hero-glow:', cssHeroGlow[0]);

// Check for gallery-card width
console.log('\n=== Checking gallery-card ===');
const galleryCard = css.match(/\.gallery-card\s*\{[^}]*/);
if (galleryCard) console.log('  style.css:', galleryCard[0]);

// Check comparison table min-width
console.log('\n=== Checking table min-width ===');
const tableMinW = css.match(/\.comparison-table table \{[^}]*/g);
if (tableMinW) tableMinW.forEach(t => console.log('  ', t));
