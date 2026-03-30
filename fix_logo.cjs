const Jimp = require('jimp');

async function fixLogo() {
  const originalImagePath = 'C:\\Users\\boksoon\\.gemini\\antigravity\\brain\\750ec178-1063-4695-8ea0-77f9f71cb06c\\passflow_ai_logo_black_pass_1774841262488.png';
  const outputPath = 'C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\public\\assets\\passflow_ai_logo_transparent_dark.png';

  console.log('Reloading the original image...');
  const image = await Jimp.read(originalImagePath);
  
  // DALL-E 3 generates 1024x1024 regardless of prompt length. 
  // Center is 512. If we cut at y > 410, we cut the upper-middle!
  // Let's use y > 750 to safely remove any bottom dummy text while keeping the center logo intact.
  const cutoffY = image.bitmap.height * 0.70; // Bottom 30% only

  const distance = (r, g, b) => {
    return Math.sqrt(Math.pow(255 - r, 2) + Math.pow(255 - g, 2) + Math.pow(255 - b, 2));
  };

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    if (y > cutoffY) {
      this.bitmap.data[idx + 3] = 0; // Transparent
      return;
    }

    const red = this.bitmap.data[idx + 0];
    const green = this.bitmap.data[idx + 1];
    const blue = this.bitmap.data[idx + 2];
    const distFromWhite = distance(red, green, blue);

    if (distFromWhite < 15) {
      this.bitmap.data[idx + 3] = 0;
    } else if (distFromWhite < 80) {
      const alpha = Math.floor(((distFromWhite - 15) / 65) * 255);
      this.bitmap.data[idx + 3] = alpha;
    }
  });

  console.log('Removing white bg complete. Autocropping...');
  image.autocrop();

  await image.writeAsync(outputPath);
  console.log('Saved corrected file!');
}

fixLogo().catch(console.error);
