const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

// Initialize client (assumes GOOGLE_APPLICATION_CREDENTIALS is set or default auth works)
const client = new textToSpeech.TextToSpeechClient();

async function listVoices() {
  try {
    const [result] = await client.listVoices({ languageCode: 'ko-KR' });
    const voices = result.voices;

    console.log('List of available voices for ko-KR:');
    voices.forEach(voice => {
      console.log(`Name: ${voice.name}`);
      console.log(`  SSML Gender: ${voice.ssmlGender}`);
      console.log(`  Natural Sample Rate Hertz: ${voice.naturalSampleRateHertz}`);
    });
    
    // Sort and filter for "Studio" or "Chirp" or "Neural"
    const highQuality = voices.filter(v => v.name.includes('Neural') || v.name.includes('Studio') || v.name.includes('Chirp'));
    console.log('\n--- High Quality Candidates ---');
    highQuality.forEach(v => console.log(v.name));

  } catch (err) {
    console.error('ERROR:', err);
  }
}

listVoices();
