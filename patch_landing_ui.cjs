const fs = require('fs');
const path = require('path');

const dirs = ['en', 'ja', 'ru', 'zh', 'es', 'pt', 'de', 'fr', 'in', 'au', 'ca'];

// The new FAB and Modal HTML
const fabHtml = `
    <!-- Global Floating Action Button for Contact -->
    <a href="javascript:void(0)" class="pf-fab-contact" onclick="document.getElementById('pf-global-contact-modal').style.display='flex'">
        <svg viewBox="0 0 24 24"><path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM19.6 8.25L12.53 12.67C12.21 12.87 11.79 12.87 11.47 12.67L4.4 8.25C4.15 8.09 4 7.82 4 7.53C4 6.86 4.73 6.46 5.3 6.81L12 11L18.7 6.81C19.27 6.46 20 6.86 20 7.53C20 7.82 19.85 8.09 19.6 8.25Z"/></svg>
    </a>

    <!-- Global Contact Modal (Glassmorphism) -->
    <div id="pf-global-contact-modal" class="inquiry-modal-overlay" style="display:none;" onclick="this.style.display='none'">
        <div class="inquiry-modal-content" onclick="event.stopPropagation()">
            <button class="inquiry-close" onclick="document.getElementById('pf-global-contact-modal').style.display='none'">×</button>
            <div id="pf-inquiry-done" class="inquiry-success" style="display:none;">
                <h3>✅ Sent Successfully</h3>
                <p>Our team will contact you shortly.</p>
            </div>
            <form id="pf-inquiry-form-modal" class="inquiry-form" onsubmit="window._pfSendInquiryModal(event)">
                <h3 data-i18n-contact="title">Platform Setup Inquiry</h3>
                <p data-i18n-contact="desc">We provide tailored SaaS capabilities for your studio.</p>
                <div class="i-group">
                    <label data-i18n-contact="email">Email Address</label>
                    <input type="email" id="pf-inquiry-email-modal" required>
                </div>
                <div class="i-group">
                    <label data-i18n-contact="msg">Message / Details</label>
                    <textarea id="pf-inquiry-msg-modal" required rows="4"></textarea>
                </div>
                <button type="submit" id="pf-inquiry-btn-modal" class="i-submit" data-i18n-contact="btn">Send Inquiry</button>
            </form>
        </div>
    </div>
`;

// Updated Submit Script targeting "platform_inquiries"
const newScript = `
    // Firebase SDK for Global Contact Modal
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js';
    import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';
    const app = initializeApp({
      apiKey: "AIzaSyCJ3ZLNQ3GIXtRFksTnXef2PKTh_bPJAXo",
      authDomain: "boksaem-yoga.firebaseapp.com",
      projectId: "boksaem-yoga",
      storageBucket: "boksaem-yoga.firebasestorage.app",
      messagingSenderId: "197947587005",
      appId: "1:197947587005:web:a1bec8e14ab51e25be7a23"
    });
    const db = getFirestore(app);

    window._pfSendInquiryModal = async function(e) {
      e.preventDefault();
      const emailEl = document.getElementById('pf-inquiry-email-modal');
      const msgEl = document.getElementById('pf-inquiry-msg-modal');
      const btnEl = document.getElementById('pf-inquiry-btn-modal');
      const formEl = document.getElementById('pf-inquiry-form-modal');
      const doneEl = document.getElementById('pf-inquiry-done');
      
      if (!emailEl.value.trim() || !msgEl.value.trim()) return;
      
      const originalText = btnEl.textContent;
      btnEl.disabled = true;
      btnEl.textContent = '...';
      
      try {
        await addDoc(collection(db, 'platform_inquiries'), {
          email: emailEl.value.trim(),
          message: msgEl.value.trim(),
          lang: document.documentElement.lang || 'en',
          source: 'landing_global_modal',
          status: 'new',
          createdAt: new Date().toISOString()
        });
        
        formEl.style.display = 'none';
        doneEl.style.display = 'block';
        
        setTimeout(() => { 
            formEl.style.display = 'block'; 
            doneEl.style.display = 'none'; 
            emailEl.value = ''; 
            msgEl.value = ''; 
            btnEl.disabled = false; 
            btnEl.textContent = originalText; 
            document.getElementById('pf-global-contact-modal').style.display = 'none';
        }, 4000);
      } catch(e) {
        console.error('Inquiry error:', e);
        btnEl.disabled = false;
        btnEl.textContent = originalText;
      }
    };
`;

for (const dir of dirs) {
    const filePath = path.join('public', dir, 'home.html');
    if (!fs.existsSync(filePath)) continue;

    let html = fs.readFileSync(filePath, 'utf8');

    // 1. Remove old inline inquiry form
    const oldFormRegex = /<h4[^>]*>💬[^<]*<\/h4>\s*<div id="pf-inquiry-form"[^>]*>[\s\S]*?<\/div>\s*<div id="pf-inquiry-done"[^>]*>[\s\S]*?<\/div>/;
    html = html.replace(oldFormRegex, '');

    // 2. Remove old script
    const oldScriptRegex = /<script type="module">\s*import \{ initializeApp \}[\s\S]*?_pfSendInquiry[\s\S]*?<\/script>/;
    html = html.replace(oldScriptRegex, '');

    // 3. Inject new FAB and Modal before closing </body>
    if (!html.includes('pf-fab-contact')) {
        html = html.replace('</body>', fabHtml + '\n    <script type="module">' + newScript + '</script>\n</body>');
        console.log(`✅ Updated HTML elements in ${dir}/home.html`);
    }

    fs.writeFileSync(filePath, html);
}

// Add CSS to public/style.css
const publicCssPath = 'public/style.css';
let publicCss = fs.readFileSync(publicCssPath, 'utf8');
const reactCss = fs.readFileSync('src/styles/landing.css', 'utf8');

if (!publicCss.includes('inquiry-modal-overlay')) {
    fs.appendFileSync(publicCssPath, '\n\n' + reactCss);
    console.log('✅ Injected premium CSS into public/style.css');
}

console.log('Done patching landing pages!');
