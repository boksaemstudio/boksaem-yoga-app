const sharp = require('sharp');
const fs = require('fs');

const inputPath = 'C:\\Users\\boksoon\\Desktop\\passflow_ai_logo.png';
const outputPath = 'C:\\Users\\boksoon\\Desktop\\passflow_ai_logo_transparent.png';

async function processImage() {
  console.log("Reading image...");
  if (!fs.existsSync(inputPath)) {
    console.error("Input file not found at " + inputPath);
    process.exit(1);
  }
  
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  
  console.log(`Image info: ${metadata.width}x${metadata.height}, channels: ${metadata.channels}`);
  
  const rawData = await image.ensureAlpha().raw().toBuffer();
  
  console.log("Processing pixels...");
  // Since we ensured alpha, there are 4 channels.
  for (let i = 0; i < rawData.length; i += 4) {
    const r = rawData[i];
    const g = rawData[i + 1];
    const b = rawData[i + 2];
    
    // We assume the background is black.
    // The alpha represents the brightness of the pixel.
    const alpha = Math.max(r, g, b);
    
    if (alpha > 0) {
      // Un-premultiply the RGB colors to prevent dark fringes when blended with a new background.
      rawData[i] = Math.min(255, Math.round((r * 255) / alpha));
      rawData[i + 1] = Math.min(255, Math.round((g * 255) / alpha));
      rawData[i + 2] = Math.min(255, Math.round((b * 255) / alpha));
    }
    
    rawData[i + 3] = alpha; // New alpha channel
  }

  console.log("Saving transparent image...");
  await sharp(rawData, {
    raw: {
      width: metadata.width,
      height: metadata.height,
      channels: 4,
    }
  }).png().toFile(outputPath);
  
  console.log("Success! Image saved to " + outputPath);
}

processImage().catch(console.error);
