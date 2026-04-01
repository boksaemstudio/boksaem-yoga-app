import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We use the unofficial google-tts-api (free GTranslate TTS endpoint) as a quick way to generate natural voices locally
// Normally we'd use ElevenLabs or Google Cloud TTS API (paid), but this gives a decent natural voice quickly for free.
function downloadTTS(text, filename) {
    return new Promise((resolve, reject) => {
        // Encode the text for URL
        const encodedText = encodeURIComponent(text);
        
        // Use Google Translate's unofficial TTS endpoint (ko)
        // client=tw-ob generates a very clear, natural-sounding voice (better than the older 'ko' engines)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=ko&client=tw-ob`;
        
        const filePath = path.join(__dirname, '..', 'src', 'assets', 'audio', filename);
        const file = fs.createWriteStream(filePath);
        
        console.log(`Generating: ${filename} -> "${text}"`);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${filename}, status code: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log(`✅ Saved: ${filename}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => {});
            reject(err);
        });
    });
}

const scripts = [
    { text: "출석을 환영합니다.", file: "welcome.mp3" },
    { text: "꾸준한 수련을 응원합니다.", file: "success.mp3" },
    { text: "이미 출석하셨습니다. 연강 또는 동반 수강이신가요?", file: "duplicate_success.mp3" },
    { text: "마지막 수강일입니다. 선생님께 연장을 문의해 주세요.", file: "last_session.mp3" },
    { text: "수강 연장이나 등록이 필요합니다. 선생님께 문의해 주세요.", file: "error.mp3" },
    { text: "수강 연장이나 등록이 필요합니다. 선생님께 문의해 주세요.", file: "denied.mp3" }
];

async function generateAll() {
    console.log("🎙️ Starting Premium TTS Generation...");
    // Ensure directory exists
    const audioDir = path.join(__dirname, '..', 'src', 'assets', 'audio');
    if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
    }

    for (const item of scripts) {
        try {
            await downloadTTS(item.text, item.file);
            // Slight delay to prevent rate limits
            await new Promise(res => setTimeout(res, 1000));
        } catch (e) {
            console.error(`❌ Failed to generate ${item.file}:`, e.message);
        }
    }
    console.log("✨ All TTS files generated successfully!");
}

generateAll();
