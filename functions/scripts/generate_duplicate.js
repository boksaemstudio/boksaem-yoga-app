const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const util = require('util');

async function generateAudio() {
    // Explicitly use service account key for authentication
    const keyPath = path.join(__dirname, '../service-account-key.json');
    const client = new TextToSpeechClient({
        keyFilename: keyPath
    });

    const outputDir = path.join(__dirname, '../../src/assets/audio');
    
    const voice = { languageCode: 'ko-KR', name: 'ko-KR-Chirp3-HD-Aoede', ssmlGender: 'FEMALE' };
    const audioConfig = { audioEncoding: 'MP3', speakingRate: 1.0 };

    console.log(`Generating female voice audio for duplicate_success`);
    try {
        const [response] = await client.synthesizeSpeech({
            input: { text: '연속 출석입니다.' },
            voice,
            audioConfig
        });
        const writeFile = util.promisify(fs.writeFile);
        await writeFile(path.join(outputDir, `duplicate_success.mp3`), response.audioContent, 'binary');
        console.log(`✅ Saved duplicate_success.mp3`);
    } catch (err) {
        console.error(`❌ Failed to generate audio:`, err);
    }
}

generateAudio();
