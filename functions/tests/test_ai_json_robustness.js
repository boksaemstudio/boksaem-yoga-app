const json5 = require('json5');

console.log("Testing JSON5 Robustness...");

const malformedJson = "{ key: 'value', trailing: 'comma', }"; // Unquoted keys, single quotes, trailing comma

try {
    console.log("Attempting to parse malformed JSON...");
    const result = json5.parse(malformedJson);
    console.log("SUCCESS! Parsed object:", result);
    
    if (result.key === 'value' && result.trailing === 'comma') {
        console.log("Verification PASSED: JSON5 handled the malformed input correctly.");
        process.exit(0);
    } else {
        console.error("Verification FAILED: Parsed object content is incorrect.");
        process.exit(1);
    }
} catch (error) {
    console.error("Verification FAILED: JSON5 threw an error:", error.message);
    process.exit(1);
}
