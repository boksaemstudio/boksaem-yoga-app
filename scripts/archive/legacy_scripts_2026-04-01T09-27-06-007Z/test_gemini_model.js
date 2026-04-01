import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

async function test() {
    console.log("Testing model: gemini-2.5-flash");
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });
        const result = await model.generateContent("Say hello in JSON format: { 'msg': 'hello' }");
        console.log("Success with JSON mode:", result.response.text());
    } catch (e) {
        console.log("Failed with JSON mode:", e.message);
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent("Say hello");
            console.log("Success WITHOUT JSON mode:", result.response.text());
        } catch (e2) {
            console.log("Failed EVERYTHING for 2.5:", e2.message);

            console.log("Testing model: gemini-1.5-flash as fallback check");
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent("Say hello");
                console.log("Success with 1.5:", result.response.text());
            } catch (e3) {
                console.log("Even 1.5 failed. Check API key.");
            }
        }
    }
}

test();
