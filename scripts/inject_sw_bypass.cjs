/**
 * SW 해제 + 자동 리로드 스크립트 주입
 * 기존 SW bypass 스크립트를 "해제 → 리로드" 방식으로 업그레이드합니다.
 * 한국어(home.html)는 제외 — SPA index.html이 올바르게 동작해야 하므로
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

// 기존 SW bypass → 자동 리로드 포함 버전으로 교체
const OLD_BYPASS = `    <!-- [CRITICAL] Service Worker bypass for localized landing pages -->
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

const NEW_BYPASS = `    <!-- [CRITICAL] Service Worker bypass + auto-reload for localized landing pages -->
    <script>
    (function() {
        if ('serviceWorker' in navigator) {
            var hadSW = false;
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                registrations.forEach(function(registration) {
                    hadSW = true;
                    registration.unregister();
                });
                // Clear all caches
                if ('caches' in window) {
                    caches.keys().then(function(names) {
                        var p = names.map(function(name) { return caches.delete(name); });
                        Promise.all(p).then(function() {
                            // If we had a SW, force reload to get correct content from server
                            if (hadSW && !sessionStorage.getItem('sw_cleared')) {
                                sessionStorage.setItem('sw_cleared', '1');
                                location.reload();
                            }
                        });
                    });
                } else if (hadSW && !sessionStorage.getItem('sw_cleared')) {
                    sessionStorage.setItem('sw_cleared', '1');
                    location.reload();
                }
            });
        }
    })();
    </script>`;

// 다국어 파일 목록 (한국어 제외)
const langDirs = ['en', 'ja', 'zh', 'es', 'de', 'fr', 'pt', 'ru', 'in', 'au', 'ca'];

let modified = 0;
for (const lang of langDirs) {
    const filePath = path.join(publicDir, lang, 'home.html');
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');
    
    // 기존 OLD 패턴 찾기 (줄바꿈 유연하게)
    if (content.includes('Service Worker bypass for localized') && !content.includes('sw_cleared')) {
        // 줄바꿈 종류 무관하게 교체
        content = content.replace(
            /\s*<!-- \[CRITICAL\] Service Worker bypass for localized landing pages -->[\s\S]*?<\/script>/,
            '\n' + NEW_BYPASS
        );
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${lang}/home.html — SW 자동 리로드로 업그레이드`);
        modified++;
    } else if (content.includes('sw_cleared')) {
        console.log(`⏩ ${lang}/home.html — 이미 자동 리로드 적용됨`);
    } else {
        console.log(`⚠️ ${lang}/home.html — SW 바이패스 없음`);
    }
}

// 비교 페이지들도 처리
const vsPages = ['en/vs-glofox.html', 'en/vs-mindbody.html', 'en/vs-vagaro.html', 'en/vs-zenplanner.html', 'ja/vs-hacomono.html'];
for (const vsPage of vsPages) {
    const filePath = path.join(publicDir, vsPage);
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('Service Worker bypass for localized') && !content.includes('sw_cleared')) {
        content = content.replace(
            /\s*<!-- \[CRITICAL\] Service Worker bypass for localized landing pages -->[\s\S]*?<\/script>/,
            '\n' + NEW_BYPASS
        );
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${vsPage} — SW 자동 리로드로 업그레이드`);
        modified++;
    }
}

console.log(`\n✅ 완료: ${modified}개 파일 업그레이드`);
