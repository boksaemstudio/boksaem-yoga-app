const https = require('https');
const fs = require('fs');
const path = require('path');

const text = "오늘 마지막 수련 후 재등록이 필요합니다.";
const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ko&q=${encodeURIComponent(text)}`;

// Use absolute path for safety
const outputPath = "c:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\src\\assets\\audio\\last_session.mp3";

console.log('Starting download to:', outputPath);

const file = fs.createWriteStream(outputPath);

https.get(url, (res) => {
    console.log('Status Code:', res.statusCode);
    if (res.statusCode !== 200) {
        console.error('Failed to download TTS, status code:', res.statusCode);
        process.exit(1);
    }
    
    res.pipe(file);
    
    file.on('finish', () => {
        file.close();
        console.log('Download complete and file closed.');
        const stats = fs.statSync(outputPath);
        console.log('File size:', stats.size, 'bytes');
    });
    
    file.on('error', (err) => {
        console.error('File write error:', err);
        process.exit(1);
    });
}).on('error', (err) => {
    console.error('HTTP request error:', err);
    process.exit(1);
});
