import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyD8UytbRqhGQUn-JWf6_uT660I6aJIxvGs";
const genAI = new GoogleGenerativeAI(API_KEY);

async function listAllModels() {
    try {
        console.log("Listing available Gemini models via direct fetch...");
        // Use the native fetch to call the list endpoint since the SDK might be restricted
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(` - ${m.name} (${m.displayName})`));
        } else {
            console.log("No models returned. Response:", JSON.stringify(data));
        }
    } catch (error) {
        console.error("List All Models Failed:", error);
    }
}

listAllModels();
