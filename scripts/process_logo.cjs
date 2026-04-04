const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function go() {
    const inputImagePath = 'C:\\Users\\boksoon\\.gemini\\antigravity\\brain\\e0b4599c-5851-4fbd-a028-6a8611f04e80\\passflow_elegant_logo_final_1775215206621.png';
    const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'PassFlowAi_DemoLogo.png');

    try {
        const image = sharp(inputImagePath);
        const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            // Compute Euclidean distance from pure white
            const dist = Math.sqrt(Math.pow(255-r, 2) + Math.pow(255-g, 2) + Math.pow(255-b, 2));
            
            if (dist < 30) {
                // Background
                data[i+3] = 0;
            } else if (dist < 80) {
                // Edge blending to prevent jagged edges
                data[i+3] = Math.floor(((dist - 30) / 50) * 255);
            }
        }

        const processed = sharp(data, {
            raw: { width: info.width, height: info.height, channels: 4 }
        });

        const tempPath = path.join(__dirname, 'temp_mid.png');
        await processed.png().toFile(tempPath);
        
        // Re-read to trim (which automatically trims fully transparent pixels by default)
        const trimmed = sharp(tempPath).trim({ threshold: 1 });
        
        // Let's ensure it's square
        const meta = await trimmed.metadata();
        const maxDim = Math.max(meta.width, meta.height);
        
        await trimmed
            .resize({
                width: Math.floor(maxDim * 1.05), // minor 5% padding so it doesn't touch the exact edge
                height: Math.floor(maxDim * 1.05),
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png({ alphaQuality: 100 })
            .toFile(desktopPath);
        
        fs.unlinkSync(tempPath);
        console.log("✅ Success! Elegant transparent logo saved to: " + desktopPath);

    } catch(err) {
        console.error(err);
    }
}
go();
