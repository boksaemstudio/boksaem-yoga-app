const { ESLint } = require('eslint');

async function main() {
    console.log('Running ESLint to get precise error breakdown...');
    const eslint = new ESLint();
    const results = await eslint.lintFiles(['src/**/*.js', 'src/**/*.jsx']);
    
    const ruleCount = {};
    const fileErrors = {};
    
    for (const result of results) {
        let hasError = false;
        
        for (const msg of result.messages) {
            if (msg.severity === 2) { // 2 means error
                hasError = true;
                const rule = msg.ruleId || 'syntax-error';
                ruleCount[rule] = (ruleCount[rule] || 0) + 1;
                
                if (!fileErrors[result.filePath]) {
                    fileErrors[result.filePath] = { count: 0, rules: {} };
                }
                fileErrors[result.filePath].count++;
                fileErrors[result.filePath].rules[rule] = (fileErrors[result.filePath].rules[rule] || 0) + 1;
            }
        }
    }
    
    console.log('\n=== ERROR RULES ===');
    Object.entries(ruleCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([rule, count]) => {
            console.log(`${String(count).padStart(4)} : ${rule}`);
        });
        
    console.log('\n=== FILE ERRORS ===');
    Object.entries(fileErrors)
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([file, data]) => {
            console.log(`${String(data.count).padStart(4)} : ${file.replace(/.*yoga-app\\/, '')}`);
            Object.entries(data.rules).forEach(([rule, count]) => {
                console.log(`         ${count}x ${rule}`);
            });
        });
}

main().catch(console.error);
