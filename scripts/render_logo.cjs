const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgContent = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Premium SaaS Gradients -->
    <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD700" />
      <stop offset="100%" stop-color="#FFA500" />
    </linearGradient>

    <!-- Deep Tech White Gradient -->
    <linearGradient id="whiteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#E2E8F0" />
    </linearGradient>

    <!-- Essential Shadow for legibility on absolute white or black backgrounds -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.45" />
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <g filter="url(#shadow)">
    <!-- First Line: P F (Pass Flow) -->
    <!-- Massive and tight tracking -->
    <text 
      x="512" 
      y="480" 
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
      font-size="480" 
      font-weight="900" 
      font-style="normal" 
      letter-spacing="-10" 
      text-anchor="middle" 
      fill="url(#primaryGradient)">
      PF
    </text>

    <!-- Second Line: Ai (Artificial Intelligence) -->
    <!-- Snug against the first line to fill the square perfectly -->
    <!-- Changed to primaryGradient to guarantee absolute visibility on both pure white and pitch black backgrounds -->
    <text 
      x="512" 
      y="910" 
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
      font-size="440" 
      font-weight="800" 
      letter-spacing="5" 
      text-anchor="middle" 
      fill="url(#primaryGradient)"
      stroke="#191919"
      stroke-width="8">
      Ai
    </text>
  </g>
</svg>
`;

async function buildTransparentLogo() {
  console.log("🚀 Generating Trendy Transparent P F Ai Logo...");
  const tempSvgPath = path.join(__dirname, 'temp_logo.svg');
  fs.writeFileSync(tempSvgPath, svgContent);

  const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'PF_Ai_Transparent.png');

  try {
    // Generate native transparent PNG directly
    await sharp(tempSvgPath)
      .png({ alphaQuality: 100 })
      .toFile(desktopPath);

    console.log(`✅ Success! Square Transparent PNG Logo saved to Desktop: ${desktopPath}`);
    fs.unlinkSync(tempSvgPath);
  } catch (err) {
    console.error("❌ Failed to render logo:", err);
  }
}

buildTransparentLogo();
