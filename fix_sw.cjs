const fs = require('fs');
let html = fs.readFileSync('public/home.html', 'utf8');
const swScript = `    <!-- [CRITICAL] Service Worker bypass + force-reload v3 -->
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
if (!html.includes('swcleared=')) {
    html = html.replace('<head>', '<head>\n' + swScript);
    fs.writeFileSync('public/home.html', html);
    console.log('SW bypass added to home.html');
} else {
    console.log('SW bypass already exists');
}
