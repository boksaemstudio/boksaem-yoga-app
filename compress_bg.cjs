const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = 'C:\\Users\\boksoon\\.gemini\\antigravity\\brain\\a4141fb1-3287-41cf-a9d3-f13f98ff973f';
const outputDir = path.join(__dirname, 'public', 'assets', 'bg');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const files = [
    'media__1776389046037.jpg',
    'media__1776389046060.jpg',
    'media__1776389046106.jpg'
];

async function processImages() {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, `random_bg_${i + 1}.webp`);

        try {
            await sharp(inputPath)
                .resize({ width: 1920, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toFile(outputPath);
            console.log(`Processed ${file} to ${outputPath}`);
        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    }
}

processImages();
