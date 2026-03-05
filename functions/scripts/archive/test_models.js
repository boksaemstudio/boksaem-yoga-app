
const { GoogleGenerativeAI } = require("@google/generative-ai");
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
require('dotenv').config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY || "YOUR_API_KEY"); // You need to set GEMINI_KEY in .env or manually here

async function testGemini() {
    console.log("Testing Gemini Model: gemini-3-flash-preview");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const result = await model.generateContent("Hello, are you there?");
        console.log("Gemini Response:", result.response.text());
        return true;
    } catch (error) {
        console.error("Gemini Error:", error.message);
        return false;
    }
}

async function testTTS() {
    console.log("Testing TTS Voice: ko-KR-Neural2-B");
    try {
        const client = new textToSpeech.TextToSpeechClient();
        const request = {
            input: { text: "안녕하세요, 복순이입니다." },
            voice: { languageCode: 'ko-KR', name: 'ko-KR-Neural2-B', ssmlGender: 'FEMALE' },
            audioConfig: { audioEncoding: 'MP3' },
        };
        const [response] = await client.synthesizeSpeech(request);
        console.log("TTS Success: Audio content generated");
        return true;
    } catch (error) {
        console.error("TTS Error:", error.message);
        return false;
    }
}

async function run() {
    await testGemini();
    // await testTTS(); // TTS requires Google Cloud credentials which might not be set in this environment easily
}

run();
