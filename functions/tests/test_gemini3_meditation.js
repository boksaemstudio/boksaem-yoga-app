const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const path = require("path");

// Load .env from functions directory
dotenv.config({ path: path.join(__dirname, "../.env") });

async function testGemini3() {
    const apiKey = process.env.GEMINI_KEY;
    if (!apiKey) {
        console.error("❌ No API KEY found in functions/.env");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
        You are a **Holistic Wellness Master AI** named '복순(Boksoon)' for '복샘요가'.
        Conduct a warm, empathetic conversation to deeply understand user's emotional AND physical state.
        
        Output Format (JSON ONLY):
        {
            "question": "Boksoon's warm, wise question (Korean)",
            "options": ["Option 1", "Option 2", "Option 3"],
            "isFinalAnalysis": false,
            "analysisSummary": "",
            "mappedDiagnosis": ""
        }
    `;

    console.log("🚀 Sending prompt to Gemini 3...");
    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.log("📥 Raw Response:\n", text);
        
        try {
            const parsed = JSON.parse(text);
            console.log("✅ JSON Parse Success:", parsed);
        } catch (e) {
            console.error("❌ JSON Parse Failed. Trying match extraction...");
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                console.log("📦 Extracted JSON String:", jsonMatch[0]);
                try {
                    const parsed2 = JSON.parse(jsonMatch[0]);
                    console.log("✅ Extracted JSON Success:", parsed2);
                } catch (e2) {
                    console.error("❌ Final Parse Failure:", e2.message);
                }
            } else {
                console.error("❌ No braces found in response.");
            }
        }
    } catch (error) {
        console.error("❌ API Call Failed:", error.message);
    }
}

testGemini3();
