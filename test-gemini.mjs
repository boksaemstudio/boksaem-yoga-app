import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyD8UytbRqhGQUn-JWf6_uT660I6aJIxvGs";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function test() {
    try {
        console.log("Testing Gemini API...");
        const result = await model.generateContent("Say hello in one word.");
        console.log("Result:", result.response.text());
    } catch (error) {
        console.error("API Test Failed:", error);
    }
}

test();
