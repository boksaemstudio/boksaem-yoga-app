require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  console.log("--- AI Connection Diagnostic ---");
  const key = process.env.GEMINI_KEY;
  console.log("API Key Status:", key ? `Present (${key.substring(0,4)}...)` : "MISSING");
  
  if (!key) {
    console.error("❌ CRITICAL: No API Key found in env.");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(key);

  const modelsToTest = [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro"
  ];

  console.log("\n--- Testing Model Availability ---");
  let workingModel = null;

  for (const modelName of modelsToTest) {
      console.log(`\n👉 Testing: ${modelName}`);
      try {
          const model = genAI.getGenerativeModel({ model: modelName });
          // Generate minimal content
          const result = await model.generateContent("Hi");
          const response = result.response.text(); 
          console.log(`✅ SUCCESS! Response: ${response.substring(0, 20)}...`);
          workingModel = modelName;
          break; // Stop at first success
      } catch (e) {
          console.error(`❌ Failed: ${e.message.split(']')[1] || e.message}`); // Clean error log
      }
  }

  if (workingModel) {
      console.log(`\n✨ RECOMMENDED FIX: Change 'gemini-3-flash-preview' to '${workingModel}' in functions/utils/ai.js`);
  } else {
      console.error("\n❌ ALL MODELS FAILED. Check API Key permissions or Google Cloud Console.");
  }
}

test().catch(err => console.error("Fatal Script Error:", err));
