const fs = require('fs');

const injectorPath = 'functions/helpers/liveInjector.js';
let injectorContent = fs.readFileSync(injectorPath, 'utf8');

// The liveInjector loops over daily_classes but hardcodes 'main_'
// Let's modify it to check both 'main' and 'branch2'
injectorContent = injectorContent.replace(
    /const docId = `main_\$\{todayStr\}`;/g,
    `// Support both main and branch2
            const branches = ['main', 'branch2'];
            for (const bId of branches) {
                const docId = \`\$\{bId\}_\$\{todayStr\}\`;`
);

// We need to close the loop properly.
// The easiest way is to use a regex that matches the whole block or just use string manipulation.
// Actually, `docId` is used here:
/*
            const docId = `main_${todayStr}`;
            const dailyDocRef = tenantDb.collection('daily_classes').doc(docId);
            const dailyDocSnap = await dailyDocRef.get();
*/

// Let's just do a manual string replace.
// Instead of messing with AST or complex regex, let's rewrite the injection logic slightly safely.

let newInjector = injectorContent.split("const docId = `main_${todayStr}`;");
if (newInjector.length === 2) {
    let top = newInjector[0];
    let bottom = newInjector[1];
    
    // We need to wrap the `const dailyDocRef ... ops++` inside a loop.
    // However, JS is tricky with block scopes.
    // It's safer to just replace 'main_' with a random branch for now if it's too complex to parse,
    // OR we can just write a loop and replace the closing braces.
    // Since this is a live injector, checking both branches is better.
    
    // Actually, I can just write a script that does a clean replace.
}
