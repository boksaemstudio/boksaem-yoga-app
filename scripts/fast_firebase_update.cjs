const fs = require('fs');

const file = 'firebase.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// Only the third site (passflowai) has the rewrites we want to clean
if (data.hosting && data.hosting[2] && data.hosting[2].site === 'passflowai') {
    if (data.hosting[2].rewrites) {
        // Keep ONLY sitemap, robots, and ** (catchall)
        // Remove hardcoded .html rewrites
        data.hosting[2].rewrites = data.hosting[2].rewrites.filter(r => 
            !r.source.endsWith('.html') || r.destination.includes('yandex') || r.destination === '/index.html'
        );
    }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('firebase.json scrubbed');
