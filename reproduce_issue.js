
import { extractEndDateFromPeriod } from './src/utils/csvParser.js';

const testCases = [
    { period: "2024.01.01 ~ 2024.07.18", expected: "2024.07.18" },
    { period: "2026-07-18", expected: "2026-07-18" }, // The case user reported
    { period: "2025-10-31", expected: "2025-10-31" }
];

console.log("--- Testing extractEndDateFromPeriod ---");
testCases.forEach(tc => {
    const result = extractEndDateFromPeriod(tc.period);
    console.log(`Input: "${tc.period}" => Output: "${result}" (Expected: "${tc.expected}")`);
});
