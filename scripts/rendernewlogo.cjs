const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Deep Gold Gradient for the Ring and Dumbbell -->
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D4AF37" />
      <stop offset="100%" stop-color="#996515" />
    </linearGradient>

    <!-- White/Gold Lotus Gradient -->
    <linearGradient id="lotusGradient" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#FFF5E1" />
    </linearGradient>

    <!-- Shadow for depth -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.2" />
    </filter>
  </defs>

  <g filter="url(#shadow)">
    <!-- Pilates Magic Circle (Outer boundary fills square nicely) -->
    <circle cx="512" cy="512" r="460" stroke="url(#goldGradient)" stroke-width="48" fill="none"/>
    
    <!-- Side Pads for Magic Circle -->
    <rect x="22" y="412" width="60" height="200" rx="30" fill="url(#goldGradient)" />
    <rect x="942" y="412" width="60" height="200" rx="30" fill="url(#goldGradient)" />

    <!-- Dumbbell (Health/Gym) Base -->
    <g transform="translate(0, 50)">
      <!-- Handle -->
      <rect x="432" y="730" width="160" height="40" fill="url(#goldGradient)" />
      <!-- Left Weights -->
      <rect x="272" y="680" width="160" height="140" rx="30" fill="url(#goldGradient)" />
      <!-- Right Weights -->
      <rect x="592" y="680" width="160" height="140" rx="30" fill="url(#goldGradient)" />
      <!-- Inner cuts to make it look like weight plates -->
      <line x1="332" y1="680" x2="332" y2="820" stroke="#08080A" stroke-width="8" />
      <line x1="692" y1="680" x2="692" y2="820" stroke="#08080A" stroke-width="8" />
    </g>

    <!-- Lotus Flower (Yoga) Top -->
    <g transform="translate(0, -30)">
      <!-- Center Petal -->
      <path d="M 512 750 C 400 680, 420 280, 512 160 C 604 280, 624 680, 512 750 Z" fill="url(#lotusGradient)" />
      
      <!-- Inner Left/Right -->
      <path d="M 512 750 C 350 720, 200 480, 250 330 C 350 460, 480 680, 512 750 Z" fill="url(#lotusGradient)" opacity="0.9" />
      <path d="M 512 750 C 674 720, 824 480, 774 330 C 674 460, 544 680, 512 750 Z" fill="url(#lotusGradient)" opacity="0.9" />
      
      <!-- Outer Left/Right -->
      <path d="M 512 750 C 350 780, 120 630, 90 500 C 250 580, 450 710, 512 750 Z" fill="url(#lotusGradient)" opacity="0.8" />
      <path d="M 512 750 C 674 780, 904 630, 934 500 C 774 580, 574 710, 512 750 Z" fill="url(#lotusGradient)" opacity="0.8" />
    </g>
  </g>
</svg>
`;

async function buildTransparentLogo() {
  const tempSvgPath = path.join(__dirname, 'temp_logo2.svg');
  fs.writeFileSync(tempSvgPath, svgContent);

  const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'PassFlowAi_DemoLogo.png');

  try {
    await sharp(tempSvgPath)
      .resize({ width: 1024, height: 1024, fit: 'cover' })
      .png({ alphaQuality: 100 })
      .toFile(desktopPath);

    console.log('✅ Logo successfully generated and saved to Desktop: ' + desktopPath);
    fs.unlinkSync(tempSvgPath);
  } catch (err) {
    console.error('❌ Failed:', err);
  }
}

buildTransparentLogo();
