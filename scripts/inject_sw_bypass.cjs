/**
 * inject_sw_bypass.cjs
 *
 * 모든 다국어 HTML 파일의 <head>에 Service Worker 해제 스크립트를 주입합니다.
 * 이 스크립트가 있으면, 사용자가 다국어 랜딩 페이지에 처음 접속할 때
 * 기존 SW의 NavigationRoute 캐시를 우회하고 직접 서버에서 HTML을 로드합니다.
 *
 * 원인: Workbox SW의 navigateFallback이 다국어 HTML을 index.html(한국어)로 가로챔
 * 해결: 다국어 HTML 자체에 SW 해제 스크립트를 삽입하여, 해당 페이지 로드 시 SW 캐시를 삭제
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// SW 우회 스크립트 — <head> 최상단에 삽입
const SW_BYPASS_SCRIPT = `
    <!-- [CRITICAL] Service Worker bypass for localized landing pages -->
    <script>
    // If a Service Worker is serving cached Korean index.html instead of this page,
    // unregister it and reload to get the correct localized content
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            registrations.forEach(function(registration) {
                registration.unregister();
            });
        });
        // Clear all caches to prevent stale SW responses
        if ('caches' in window) {
            caches.keys().then(function(names) {
                names.forEach(function(name) { caches.delete(name); });
            });
        }
    }
    </script>`;

// 대상 언어 디렉토리
const langDirs = ['en', 'ja', 'zh', 'es', 'de', 'fr', 'pt', 'ru', 'in', 'au', 'ca'];

let modified = 0;
let skipped = 0;

langDirs.forEach(lang => {
    const langDir = path.join(publicDir, lang);
    if (!fs.existsSync(langDir)) {
        console.log(`⏩ ${lang}/ 디렉토리 없음, 스킵`);
        return;
    }

    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.html'));
    files.forEach(file => {
        const filePath = path.join(langDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // 이미 주입됐는지 확인
        if (content.includes('Service Worker bypass for localized')) {
            console.log(`✅ ${lang}/${file} — 이미 주입됨, 스킵`);
            skipped++;
            return;
        }

        // <head> 태그 바로 다음에 삽입
        const headIdx = content.indexOf('<head>');
        if (headIdx === -1) {
            console.warn(`⚠️ ${lang}/${file} — <head> 태그 없음!`);
            return;
        }

        const insertPos = headIdx + '<head>'.length;
        content = content.slice(0, insertPos) + SW_BYPASS_SCRIPT + content.slice(insertPos);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`🔧 ${lang}/${file} — SW 우회 스크립트 주입 완료`);
        modified++;
    });
});

// 한국어 home.html에도 주입 (메인 SPA 진입은 SW가 처리하므로 home.html에만)
const koHomePath = path.join(publicDir, 'home.html');
if (fs.existsSync(koHomePath)) {
    let content = fs.readFileSync(koHomePath, 'utf8');
    if (!content.includes('Service Worker bypass for localized')) {
        const headIdx = content.indexOf('<head>');
        if (headIdx !== -1) {
            const insertPos = headIdx + '<head>'.length;
            content = content.slice(0, insertPos) + SW_BYPASS_SCRIPT + content.slice(insertPos);
            fs.writeFileSync(koHomePath, content, 'utf8');
            console.log(`🔧 home.html (한국어) — SW 우회 스크립트 주입 완료`);
            modified++;
        }
    } else {
        console.log(`✅ home.html (한국어) — 이미 주입됨, 스킵`);
        skipped++;
    }
}

console.log(`\n✅ 완료: ${modified}개 파일 수정, ${skipped}개 스킵`);
