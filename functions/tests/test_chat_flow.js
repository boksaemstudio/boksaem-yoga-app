const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load .env manually
try {
    const envPath = path.resolve(__dirname, '../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_KEY=(.*)/);
    if (match) {
        process.env.GEMINI_KEY = match[1].trim();
    }
} catch (e) {
    console.error("Failed to load .env:", e);
}

const serviceAccountPath = path.resolve(__dirname, '../service-account-key.json');
const serviceAccount = require(serviceAccountPath);

const proxyquire = require('proxyquire');
const AIService = require('../utils/ai'); 

// Initialize test SDK
const test = require('firebase-functions-test')({
    projectId: 'boksaem-yoga-app',
}, serviceAccountPath);

const meditationModule = proxyquire('../modules/meditation', {
    '../helpers/common': {
        checkAIQuota: async () => { console.log("Mock checkAIQuota: Pass"); return true; },
        getAI: () => new AIService(process.env.GEMINI_KEY),
        logAIError: () => {},
        admin: admin
    }
});

async function testChatFlow() {
    console.log("🧪 Testing Chat Flow Constraints (Mocked Firestore)...");

    const wrapped = test.wrap(meditationModule.generateMeditationGuidance);

    // ... rest of test ...

    // Mock Chat History (3 turns already)
    const chatHistory = [
        { role: 'user', content: '요즘 너무 스트레스 받아.' },
        { role: 'assistant', content: '그렇군요. 많이 힘드셨겠어요.' },
        { role: 'user', content: '생각이 너무 많아서 잠도 안 와.' },
        { role: 'assistant', content: '생각을 비우는 연습이 필요해 보입니다.' },
        { role: 'user', content: '어떻게 해야 할까?' }
    ];

    try {
        const result = await wrapped({
            data: {
                type: 'question',
                memberName: 'TestUser',
                chatHistory: chatHistory,
                intentionFocus: 'mind'
            }
        });

        console.log("📝 AI Response:", result.message);
        
        // Validation 1: Check for banned terms
        const bannedTerms = ['V1', 'V2', 'V3', '모드', '옵션', '선택'];
        const hasBanned = bannedTerms.some(term => result.message.includes(term));
        if (hasBanned) {
            console.error("❌ Failed: Response contains banned terms.");
        } else {
            console.log("✅ Pass: No banned terms found.");
        }

        // Validation 2: Check for closing suggestion
        // This is harder to check deterministically without looking at the 'isFinalAnalysis' flag which might not be exposed in the response message itself but in the full object.
        // Let's just print the message for manual review.
        
    } catch (e) {
        console.error("❌ Chat Flow Test Failed:", e);
    }
    
    test.cleanup();
}

testChatFlow();
