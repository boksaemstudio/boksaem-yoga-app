/**
 * SW 해제 + 강제 리로드 스크립트 v3
 * sessionStorage 대신 URL 파라미터로 무한 리로드 방지
 * SW가 있으면 무조건 해제 → 리로드
 */
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

const NEW_BYPASS = `    <!-- [CRITICAL] Service Worker bypass + force-reload v3 -->
    <script>
    (function() {
        // Skip if already reloaded (check URL param)
        if (location.search.indexOf('swcleared=1') !== -1) return;
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(regs) {
                if (regs.length === 0) return; // No SW = page is clean
                // Unregister all SWs
                var tasks = regs.map(function(r) { return r.unregister(); });
                Promise.all(tasks).then(function() {
                    // Clear all caches then reload
                    if ('caches' in window) {
                        caches.keys().then(function(names) {
                            Promise.all(names.map(function(n) { return caches.delete(n); })).then(function() {
                                var sep = location.search ? '&' : '?';
                                location.replace(location.href + sep + 'swcleared=1');
                            });
                        });
                    } else {
                        var sep = location.search ? '&' : '?';
                        location.replace(location.href + sep + 'swcleared=1');
                    }
                });
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
    
    // 기존 v2 패턴 교체 (sw_cleared 사용하는 버전)
    const regex = /\s*<!-- \[CRITICAL\] Service Worker bypass[\s\S]*?<\/script>/;
    if (regex.test(content)) {
        content = content.replace(regex, '\n' + NEW_BYPASS);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${lang}/home.html — SW v3 업그레이드`);
        modified++;
    } else {
        console.log(`⚠️ ${lang}/home.html — 패턴 없음`);
    }
}

// vs 비교 페이지들
const vsPages = ['en/vs-glofox.html', 'en/vs-mindbody.html', 'en/vs-vagaro.html', 'en/vs-zenplanner.html', 'ja/vs-hacomono.html'];
for (const vsPage of vsPages) {
    const filePath = path.join(publicDir, vsPage);
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf8');
    const regex = /\s*<!-- \[CRITICAL\] Service Worker bypass[\s\S]*?<\/script>/;
    if (regex.test(content)) {
        content = content.replace(regex, '\n' + NEW_BYPASS);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${vsPage} — SW v3 업그레이드`);
        modified++;
    }
}

console.log(`\n✅ 완료: ${modified}개 파일 v3 업그레이드`);
