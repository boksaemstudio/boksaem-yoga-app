const fs = require('fs');
const path = require('path');

// Fix 1: English — Instructor link missing ?lang=en
{
  const file = path.join('public', 'en', 'home.html');
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(
    'href="https://passflowai.web.app/instructor"',
    'href="https://passflowai.web.app/instructor?lang=en"'
  );
  fs.writeFileSync(file, html);
  console.log('✅ Fixed: en/home.html — Instructor link now has ?lang=en');
}

// Fix 2: Australia — lang=au → lang=en
{
  const file = path.join('public', 'au', 'home.html');
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');
    html = html.replaceAll('?lang=au', '?lang=en');
    fs.writeFileSync(file, html);
    console.log('✅ Fixed: au/home.html — All lang=au → lang=en');
  }
}

// Fix 3: Canada — lang=ca → lang=en
{
  const file = path.join('public', 'ca', 'home.html');
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');
    html = html.replaceAll('?lang=ca', '?lang=en');
    fs.writeFileSync(file, html);
    console.log('✅ Fixed: ca/home.html — All lang=ca → lang=en');
  }
}

// Fix 4: Russian — Add missing Member and Instructor demo cards
{
  const file = path.join('public', 'ru', 'home.html');
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');

    // Check if member/instructor links exist
    const hasMember = html.includes('/member?lang=ru');
    const hasInstructor = html.includes('/instructor?lang=ru');

    if (!hasMember || !hasInstructor) {
      // Find the closing tag of the demo grid to insert before it
      // Look for the pattern after the checkin demo card
      const checkinCardEnd = html.indexOf('</div>', html.indexOf('checkin?lang=ru'));
      if (checkinCardEnd !== -1) {
        // Find the closing </div> of the demo-card-enhanced that wraps the checkin card
        // We need to find the right </div> - look for the demo grid's closing
        const demoGridSection = html.match(/<div class="demo-grid"[\s\S]*?(<\/div>\s*<\/div>\s*<\/section>)/);
        
        if (demoGridSection) {
          const memberCard = `
                <div class="demo-card-enhanced">
                    <img src="/assets/demo_member.webp" alt="Member App">
                    <h3 style="color:#fff; font-size:1.2rem; margin-bottom:10px;">Приложение участников</h3>
                    <p style="color:rgba(255,255,255,0.6); font-size:0.9rem; margin-bottom:24px; line-height:1.5; min-height:44px;">
                        Кредиты, бронирование классов,<br>история посещений
                    </p>
                    <a href="https://passflowai.web.app/member?lang=ru" target="_blank"
                       style="display:inline-block; padding:14px 24px; background:linear-gradient(135deg,#d4af37,#f5d67b); color:#000; font-weight:700; border-radius:30px; text-decoration:none; transition:all 0.3s; width:100%; box-sizing:border-box; font-size:0.95rem;">
                        Попробовать
                    </a>
                </div>
                <div class="demo-card-enhanced">
                    <img src="/assets/demo_instructor.webp" alt="Instructor App">
                    <h3 style="color:#fff; font-size:1.2rem; margin-bottom:10px;">Приложение инструктора</h3>
                    <p style="color:rgba(255,255,255,0.6); font-size:0.9rem; margin-bottom:24px; line-height:1.5; min-height:44px;">
                        Расписание на сегодня,<br>посещаемость в реальном времени
                    </p>
                    <a href="https://passflowai.web.app/instructor?lang=ru" target="_blank"
                       style="display:inline-block; padding:14px 24px; background:linear-gradient(135deg,#d4af37,#f5d67b); color:#000; font-weight:700; border-radius:30px; text-decoration:none; transition:all 0.3s; width:100%; box-sizing:border-box; font-size:0.95rem;">
                        Попробовать
                    </a>
                </div>`;

          // Insert before the closing of the demo grid
          // Find the </div> that closes .demo-grid
          const demoGridStart = html.indexOf('class="demo-grid"');
          if (demoGridStart !== -1) {
            // Find the checkin card's container closing </div>
            const checkinLink = html.indexOf('checkin?lang=ru');
            if (checkinLink !== -1) {
              // Find the </div> that closes the demo-card-enhanced for checkin
              let pos = checkinLink;
              let depth = 0;
              // Find the </a> first
              pos = html.indexOf('</a>', pos);
              // Then find the closing </div> of demo-card-enhanced
              pos = html.indexOf('</div>', pos);
              if (pos !== -1) {
                pos += 6; // skip past </div>
                html = html.slice(0, pos) + memberCard + html.slice(pos);
                fs.writeFileSync(file, html);
                console.log('✅ Fixed: ru/home.html — Added Member and Instructor demo cards');
              }
            }
          }
        }
      }
    } else {
      console.log('ℹ️  ru/home.html already has Member and Instructor links');
    }
  }
}

// Fix 5: Korean home.html — ensure all demo links explicitly include lang parameter
// This prevents browser cache from a different language session from overriding
{
  const file = path.join('public', 'home.html');
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Add ?lang=ko to admin, checkin, member, instructor links that lack lang param
  const apps = ['admin', 'checkin', 'member', 'instructor'];
  for (const app of apps) {
    const pattern = `https://passflowai.web.app/${app}"`;
    const replacement = `https://passflowai.web.app/${app}?lang=ko"`;
    if (html.includes(pattern)) {
      html = html.replaceAll(pattern, replacement);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, html);
    console.log('✅ Fixed: home.html (Korean) — All demo links now have explicit ?lang=ko');
  } else {
    console.log('ℹ️  home.html (Korean) — Links already have lang param or not found');
  }
}

console.log('\n🎉 All fixes applied!');
