// This is a test script to be run with Node.
// Since we don't have the full browser environment/firebase, we will mock the necessary parts.

import { storageService } from './src/services/storage.js';

// Mocking dependencies that storage.js needs but we don't want to load fully
// We can't easily mock imports for ES modules in a simple node script without extra tools,
// but we can try to call the function and expect it to fail gracefully into the catch block.

async function testFallback() {
    console.log("Testing getAIExperience Fallback...");
    try {
        // We expect this to fail generation and trigger the fallback
        const result = await storageService.getAIExperience(
            "테스트회원",
            10,
            "월",
            14,
            null,
            null,
            5,
            30,
            'ko'
        );

        console.log("Result received:", result);

        if (result && result.message && result.isFallback) {
            console.log("✅ Success: Fallback message returned correctly.");
            console.log("Message:", result.message);
        } else {
            console.error("❌ Failed: Did not return expected fallback object.");
        }
    } catch (e) {
        console.error("❌ Failed: Function threw an uncaught error:", e);
    }
}

// Mocking some globals that storage.js might access
global.localStorage = {
    getItem: () => null,
    setItem: () => null
};

testFallback();
