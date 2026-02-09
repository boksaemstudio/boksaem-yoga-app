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

const admin = require('firebase-admin');
const serviceAccountPath = path.resolve(__dirname, '../service-account-key.json');
const serviceAccount = require(serviceAccountPath);

// Initialize test SDK
const test = require('firebase-functions-test')({
    projectId: 'boksaem-yoga-app',
}, serviceAccountPath);

// Initialize Admin (needed for logs in meditation.js)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const myFunctions = require('../index');

async function testPoseFeedback() {
    console.log("🧪 Testing AI Feedback with Pose Metrics (using firebase-functions-test)...");

    const wrapped = test.wrap(myFunctions.generateMeditationGuidance);

    // Case 1: High Stability
    console.log("\n▶️ Case 1: High Stability (95/100)");
    try {
        const result1 = await wrapped({
            data: {
                type: 'feedback_message',
                memberName: 'TestUser',
                mode: 'calm',
                diagnosis: 'stress',
                poseMetrics: {
                    stabilityScore: 95,
                    issues: []
                }
            }
        });
        console.log("✅ Result:", JSON.stringify(result1.feedbackPoints, null, 2));
    } catch (e) {
        console.error("❌ High Stability Test Failed:", e);
    }

    // Case 2: Low Stability with Issues
    console.log("\n▶️ Case 2: Low Stability (45/100) with Issues");
    try {
        const result2 = await wrapped({
            data: {
                type: 'feedback_message',
                memberName: 'TestUser',
                mode: 'focus',
                diagnosis: 'distracted',
                poseMetrics: {
                    stabilityScore: 45,
                    issues: ['leaning_left', 'head_drop']
                }
            }
        });
        console.log("✅ Result:", JSON.stringify(result2.feedbackPoints, null, 2));
    } catch (e) {
        console.error("❌ Low Stability Test Failed:", e);
    }
    
    test.cleanup();
}

testPoseFeedback();
