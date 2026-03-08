import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetDir = path.join(__dirname, '..', 'src');

const results = {
    memoryLeaks: [],
    reactAntiPatterns: [],
    securityRisks: [],
    hardcodedStrings: [],
    unhandledPromises: [],
    accessibility: [],
    architecture: []
};

// Regex Patterns
const useEffectMissingCleanup = /useEffect\([^\]]+(?:addEventListener|setInterval|setTimeout)[^}]+(?!\s*return\s*(?:\([^)]*\)\s*=>|function))\s*\}\s*,/g;
const inlineFunctionsInRender = /onClick=\{\s*(?:\([^)]*\)\s*=>|function)/g;
const missingDependencyInHook = /use(?:Effect|Callback|Memo)\([\s\S]*?,\s*\[\s*\]\s*\)/g;
const directDomManipulation = /document\.(?:getElementById|querySelector)/g;
const hardcodedColors = /#[a-fA-F0-9]{3,6}\b/g;
const hardcodedTexts = />[가-힣\s]+</g;
const localStoargeUsage = /localStorage\.(?:get|set)Item/g;
const firebaseInsecureRules = /allow\s+(?:read|write):\s+if\s+true/gi;

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDirectory(fullPath);
        } else if (/\.(js|jsx)$/.test(file)) {
            scanFile(fullPath);
        }
    }
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(targetDir, filePath);
    const lines = content.split('\n');

    // Memory Leaks (Missing cleanup in useEffect)
    let match;
    while ((match = useEffectMissingCleanup.exec(content)) !== null) {
        results.memoryLeaks.push({ file: relPath, issue: 'Potential missing cleanup for interval/listener in useEffect' });
    }

    // React Anti-Patterns (Inline functions causing re-renders)
    let inlineCount = (content.match(inlineFunctionsInRender) || []).length;
    if (inlineCount > 5) {
        results.reactAntiPatterns.push({ file: relPath, issue: `Found ${inlineCount} inline functions in render (performance hit)` });
    }

    // Architecture (Direct DOM manipulation in React)
    if (directDomManipulation.test(content)) {
        results.architecture.push({ file: relPath, issue: 'Direct DOM manipulation detected (violates React paradigm)' });
    }

    // Storage/Security (Unencrypted LocalStorage)
    if (localStoargeUsage.test(content)) {
        results.securityRisks.push({ file: relPath, issue: 'Uses localStorage directly (Warning: sensitive data exposure risk)' });
    }

    lines.forEach((line, i) => {
        const lineNum = i + 1;
        // Hardcoded Colors
        if (hardcodedColors.test(line) && !relPath.includes('studioConfig') && !relPath.includes('CosmicParticles')) {
            results.hardcodedStrings.push({ file: relPath, line: lineNum, issue: 'Hardcoded HEX color' });
        }
        
        // Promises lacking catch
        if (line.includes('.then(') && !line.includes('.catch(') && !content.includes('catch (')) {
            results.unhandledPromises.push({ file: relPath, line: lineNum, issue: 'Promise chain missing .catch()' });
        }

        // Accessibility (images without alt)
        if (/<img[^>]+(?<!alt=)[^>]*>/g.test(line) && !line.includes('alt=')) {
            results.accessibility.push({ file: relPath, line: lineNum, issue: '<img> tag missing alt attribute' });
        }
    });
}

// Check Firestore Rules
try {
    const rulesPath = path.join(__dirname, '..', 'firestore.rules');
    const rulesConfig = fs.readFileSync(rulesPath, 'utf8');
    if (firebaseInsecureRules.test(rulesConfig)) {
        results.securityRisks.push({ file: 'firestore.rules', issue: 'CRITICAL: allow read/write: if true detected!' });
    }
} catch (e) {}

scanDirectory(targetDir);

// Summarize for the committee
const summary = {
    totalFilesScanned: 0,
    categories: Object.keys(results).reduce((acc, key) => {
        acc[key] = results[key].length;
        return acc;
    }, {})
};

fs.writeFileSync(path.join(__dirname, '..', 'scripts', '1000_agents_audit_result.json'), JSON.stringify({ summary, details: results }, null, 2));
console.log('Audit complete. Results saved.');
