const fs = require('fs');

// 1. Update firebase.json
const fbConfig = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const newSite = {
    "site": "passflowai",
    "public": "dist",
    "ignore": [
    "firebase.json",
    "**/.*",
    "**/node_modules/**"
    ],
    "rewrites": [
    {
        "source": "/",
        "destination": "/home.html"
    },
    {
        "source": "/features",
        "destination": "/features.html"
    },
    {
        "source": "/privacy",
        "destination": "/privacy.html"
    },
    {
        "source": "**",
        "destination": "/index.html"
    }
    ],
    "headers": [
    {
        "source": "**",
        "headers": [
        {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
        }
        ]
    },
    {
        "source": "sw.js",
        "headers": [
        {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
        }
        ]
    }
    ]
};

// Remove passflowai if we want, or just add passflowai. We'll add it.
let found = false;
fbConfig.hosting.forEach(s => { if (s.site === 'passflowai') found = true; });
if (!found) fbConfig.hosting.push(newSite);
fs.writeFileSync('firebase.json', JSON.stringify(fbConfig, null, 2));

// 2. Update .firebaserc
const rcConfig = JSON.parse(fs.readFileSync('.firebaserc', 'utf8'));
if (!rcConfig.targets) rcConfig.targets = {};
if (!rcConfig.targets['boksaem-yoga']) rcConfig.targets['boksaem-yoga'] = {};
if (!rcConfig.targets['boksaem-yoga'].hosting) rcConfig.targets['boksaem-yoga'].hosting = {};
rcConfig.targets['boksaem-yoga'].hosting['passflowai'] = ['passflowai'];
fs.writeFileSync('.firebaserc', JSON.stringify(rcConfig, null, 2));

console.log('✅ Configuration updated for passflowai site.');
