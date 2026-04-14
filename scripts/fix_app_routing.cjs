const fs = require('fs');

let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(
    '<Route path="/features.html" element={<HardReload target="/features.html" />} />',
    '<Route path="/features" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><FeaturesPage /></Suspense></ErrorBoundary>} />\n                <Route path="/features.html" element={<HardReload target="/features" />} />'
);

c = c.replace(
    '<Route path="/home.html" element={<HardReload target="/home.html" />} />',
    '<Route path="/home" element={<ErrorBoundary fallback={<ErrorFallback />}><Suspense fallback={<LoadingScreen />}><LandingPage /></Suspense></ErrorBoundary>} />\n                <Route path="/home.html" element={<HardReload target="/home" />} />'
);

fs.writeFileSync('src/App.jsx', c);
console.log('App.jsx routing patched successfully');
