
const { onCall, onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const textToSpeech = require('@google-cloud/text-to-speech');
const admin = require("firebase-admin");

// Initialize Clients
const getGenAI = () => {
    const key = process.env.GEMINI_KEY || admin.app().options?.geminiKey; 
    if (!key) throw new Error("GEMINI_KEY not found");
    return new GoogleGenerativeAI(key);
};

const ttsClient = new textToSpeech.TextToSpeechClient();

exports.checkCapabilities = onRequest(async (req, res) => {
    const report = {
        models: {},
        voices: {},
        env: {
            node: process.version,
            hasGeminiKey: !!(process.env.GEMINI_KEY || admin.app().options?.geminiKey)
        }
    };

    // 1. Test Gemini Models
    const modelsToTest = [
        "gemini-2.0-flash-exp",
        "gemini-3-flash-preview", 
        "gemini-1.5-flash"
    ];

    try {
        const genAI = getGenAI();
        for (const modelName of modelsToTest) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                report.models[modelName] = { status: "OK", response: result.response.text().substring(0, 20) };
            } catch (e) {
                report.models[modelName] = { status: "ERROR", error: e.message };
            }
        }
    } catch (e) {
        report.models.globalError = e.message;
    }

    // 2. Test TTS Voices
    const voicesToTest = [
        "ko-KR-Neural2-A",
        "ko-KR-Neural2-B",
        "ko-KR-Chirp3-HD-Aoede"
    ];

    for (const voiceName of voicesToTest) {
        try {
            const [response] = await ttsClient.synthesizeSpeech({
                input: { text: "테스트" },
                voice: { languageCode: 'ko-KR', name: voiceName },
                audioConfig: { audioEncoding: 'MP3' },
            });
            report.voices[voiceName] = { status: "OK", size: response.audioContent.length };
        } catch (e) {
            report.voices[voiceName] = { status: "ERROR", error: e.message };
        }
    }

    res.json(report);
});
