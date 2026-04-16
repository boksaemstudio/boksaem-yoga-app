const fs = require('fs');
const path = require('path');

const dirs = ['', 'en', 'ja', 'ru', 'zh', 'es', 'pt', 'de', 'fr', 'in', 'au', 'ca'];
const labels = {
  '': 'Korean (root)', 'en': 'English', 'ja': 'Japanese', 'ru': 'Russian',
  'zh': 'Chinese', 'es': 'Spanish', 'pt': 'Portuguese', 'de': 'German',
  'fr': 'French', 'in': 'India', 'au': 'Australia', 'ca': 'Canada'
};

console.log('='.repeat(70));
console.log('📋 FULL CONTACT/INQUIRY AUDIT — Landing Pages');
console.log('='.repeat(70));

for (const dir of dirs) {
  const file = dir ? path.join('public', dir, 'home.html') : path.join('public', 'home.html');
  if (!fs.existsSync(file)) { console.log(`⏭️ ${labels[dir]} — NOT FOUND`); continue; }
  const html = fs.readFileSync(file, 'utf8');
  
  console.log(`\n--- ${labels[dir]} (${file}) ---`);
  
  // KakaoTalk links
  const kakaoLinks = [...html.matchAll(/href="([^"]*kakao[^"]*)"/gi)];
  if (kakaoLinks.length > 0) {
    kakaoLinks.forEach(m => console.log(`  🟡 KakaoTalk: ${m[1]}`));
  }

  // Inquiry form
  const hasInquiryForm = html.includes('pf-inquiry-form') || html.includes('inquiry-form');
  console.log(`  📝 Inquiry Form: ${hasInquiryForm ? '✅ EXISTS' : '❌ MISSING'}`);
  
  // Email input in inquiry
  const hasEmailInput = html.includes('pf-inquiry-email');
  const hasMessageInput = html.includes('pf-inquiry-msg');
  console.log(`  📧 Email field: ${hasEmailInput ? '✅' : '❌'} | Message field: ${hasMessageInput ? '✅' : '❌'}`);
  
  // Submit button
  const hasSendBtn = html.includes('pf-inquiry-btn') || html.includes('_pfSendInquiry');
  console.log(`  🔘 Submit button: ${hasSendBtn ? '✅' : '❌'}`);

  // Firebase Firestore integration
  const hasFirestore = html.includes('addDoc') && html.includes('inquiries');
  console.log(`  🔥 Firestore integration: ${hasFirestore ? '✅' : '❌'}`);

  // Contact links (email, phone, etc.)
  const contactLinks = [...html.matchAll(/href="(mailto:[^"]*|tel:[^"]*)"/gi)];
  contactLinks.forEach(m => console.log(`  📞 Contact: ${m[1]}`));
  
  // Onboarding link
  const onboardingLinks = [...html.matchAll(/href="([^"]*onboarding[^"]*)"/gi)];
  onboardingLinks.forEach(m => console.log(`  🚀 Onboarding: ${m[1]}`));
}

console.log('\n' + '='.repeat(70));
console.log('📋 ONBOARDING PAGE CHECK');
console.log('='.repeat(70));

// Check OnboardingPage.jsx
const onboardingFiles = [
  'src/pages/OnboardingPage.jsx',
  'src/pages/OnboardingPage.tsx',
];
for (const f of onboardingFiles) {
  if (fs.existsSync(f)) {
    const src = fs.readFileSync(f, 'utf8');
    console.log(`\n--- ${f} ---`);
    const kakaoLinks = [...src.matchAll(/(kakao[^'"}\s]*)/gi)];
    kakaoLinks.forEach(m => console.log(`  🟡 KakaoTalk ref: ${m[1]}`));
    
    const hasInquiry = src.includes('inquir') || src.includes('Inquir');
    console.log(`  📝 Inquiry logic: ${hasInquiry ? '✅' : '❌'}`);
    
    const hasFirestore = src.includes('addDoc') || src.includes('inquiries');
    console.log(`  🔥 Firestore inquiry: ${hasFirestore ? '✅' : '❌'}`);
  }
}

// Check SuperAdminPage for inquiry listing
console.log('\n' + '='.repeat(70));
console.log('📋 SUPERADMIN — Inquiry Listing');
console.log('='.repeat(70));

const superAdminFiles = [
  'src/pages/SuperAdminPage.jsx',
  'src/pages/SuperAdminPage.tsx',
];
for (const f of superAdminFiles) {
  if (fs.existsSync(f)) {
    const src = fs.readFileSync(f, 'utf8');
    console.log(`\n--- ${f} ---`);
    const hasInquiry = src.includes('inquir') || src.includes('Inquir');
    console.log(`  📝 Inquiry tab/section: ${hasInquiry ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // Check for collection reference
    const inquiryCollection = src.includes("'inquiries'") || src.includes('"inquiries"');
    console.log(`  🔥 inquiries collection ref: ${inquiryCollection ? '✅' : '❌'}`);
  }
}
