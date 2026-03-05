const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const util = require('util');

// [IMPORTANT] Run this script from the 'functions' directory
// node scripts/generate_checkin_audio.js

async function generateAudio() {
    // Explicitly use service account key for authentication
    const keyPath = path.join(__dirname, '../service-account-key.json');
    const client = new TextToSpeechClient({
        keyFilename: keyPath
    });
    
    const messages = [
        { name: 'welcome', text: '안녕하세요, 반갑습니다.' },
        { name: 'success', text: '출석되었습니다.' },
        { name: 'duplicate_success', text: '두 번 연속 출석입니다.' },
        { name: 'denied', text: '선생님에게 문의해 주세요.' },
        { name: 'error', text: '번호를 다시 확인해 주세요.' }
    ];

    const outputDir = path.join(__dirname, '../../src/assets/audio');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const voice = { languageCode: 'ko-KR', name: 'ko-KR-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' };
    const audioConfig = { audioEncoding: 'MP3', speakingRate: 1.0 };

    for (const msg of messages) {
        console.log(`Generating audio for: "${msg.text}" -> ${msg.name}.mp3`);
        try {
            const [response] = await client.synthesizeSpeech({
                input: { text: msg.text },
                voice,
                audioConfig
            });
            const writeFile = util.promisify(fs.writeFile);
            await writeFile(path.join(outputDir, `${msg.name}.mp3`), response.audioContent, 'binary');
            console.log(`✅ Saved ${msg.name}.mp3`);
        } catch (err) {
            console.error(`❌ Failed to generate ${msg.name}:`, err);
        }
    }
}

generateAudio();
