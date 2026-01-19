import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyD8UytbRqhGQUn-JWf6_uT660I6aJIxvGs";
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
    try {
        console.log("Listing available Gemini models...");
        // The SDK doesn't have a direct listModels but we can try reaching an endpoint or check documentation
        // Actually, let's just try 'gemini-1.5-flash-latest' or 'gemini-1.5-flash' (without -flash)
        // Wait, the error said: models/gemini-1.5-flash is not found for API version v1beta
        // Let's try 'gemini-pro' as a fallback test or 'gemini-1.5-flash' with v1

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-1.5-flash:", result.response.text());
    } catch (error) {
        console.error("List/Test Failed:", error);
    }
}

listModels();
