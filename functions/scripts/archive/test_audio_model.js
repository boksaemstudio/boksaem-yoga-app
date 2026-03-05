
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');

async function testModel(modelName) {
    try {
        const client = new TextToSpeechClient();
        console.log(`Testing model: ${modelName}...`);

        const request = {
            input: { text: "테스트 음성입니다." },
            voice: { languageCode: 'ko-KR', name: modelName },
            audioConfig: { audioEncoding: 'MP3' },
        };

        const [response] = await client.synthesizeSpeech(request);
        console.log(`Success! Audio content length: ${response.audioContent.length}`);
        return true;
    } catch (error) {
        console.error(`Failed to generate audio with ${modelName}:`, error.message);
        return false;
    }
}

async function main() {
    // Check credentials (assuming ADC or key file is set, which it should be for functions)
    // If not, this test might fail due to auth, but let's try.
    
    await testModel('ko-KR-Neural2-B');
    await testModel('ko-KR-Chirp3-HD-Aoede'); 
    await testModel('ko-KR-Chirp-HD-Aoede'); // Fallback check just in case
}

main();
