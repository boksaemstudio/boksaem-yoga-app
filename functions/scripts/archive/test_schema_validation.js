const AIService = require("../utils/ai"); // Import directly to avoid firebase-admin init in common.js
const { SchemaType } = require("@google/generative-ai");

const fs = require('fs');
const path = require('path');

// Manually load .env from root
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} else {
    console.warn("⚠️ .env file not found at:", envPath);
}

async function testSchemaValidation() {
    console.log("🧪 Testing Gemini Structured Output (Schema Validation)...\n");

    const apiKey = process.env.GEMINI_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ GEMINI_KEY or VITE_GEMINI_API_KEY not found in permissions environment.");
        process.exit(1);
    }

    try {
        const ai = new AIService(apiKey);
        const prompt = "Recommend 2 colors for a calm mood. Output valid JSON.";
        
        const colorSchema = {
            type: SchemaType.OBJECT,
            properties: {
                colors: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: { type: SchemaType.STRING },
                            hex: { type: SchemaType.STRING },
                            mood: { type: SchemaType.STRING }
                        },
                        required: ["name", "hex", "mood"]
                    }
                }
            },
            required: ["colors"]
        };

        console.log("📤 Sending request with Schema...");
        const result = await ai.generateExperience(prompt, colorSchema);

        console.log("\n✅ Result Received:");
        console.log(JSON.stringify(result, null, 2));

        if (result && result.colors && Array.isArray(result.colors)) {
            console.log("\n✨ Schema Validation SUCCESS!");
        } else {
            console.error("\n❌ Schema Validation FAILED: Structure mismatch");
        }

    } catch (error) {
        console.error("\n❌ Test Failed:", error);
    }
}

testSchemaValidation();
