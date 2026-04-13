const fs = require('fs');
const path = require('path');
const parser = require('@babel/core');

function walk(dir, fileList = []) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                if (file !== 'node_modules' && file !== '.git' && file !== 'dist') walk(fullPath, fileList);
            } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
                fileList.push(fullPath);
            }
        }
    } catch(e) {}
    return fileList;
}

const allFiles = walk('../src/components/admin');
let allIssues = [];

allFiles.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (!content.includes('t(')) return;
    
    try {
        const ast = parser.parseSync(content, {
            filename: f,
            presets: ['@babel/preset-react'],
            sourceType: 'module'
        });
        
        parser.traverse(ast, {
            CallExpression(pathObj) {
                if (pathObj.node.callee.name === 't') {
                    if (!pathObj.scope.hasBinding('t')) {
                        allIssues.push(`[${f}:${pathObj.node.loc.start.line}] t is not defined`);
                    }
                }
            }
        });
    } catch(e) {
        console.error('Error parsing', f, e.message);
    }
});

console.log('ISSUES FOUND:');
allIssues.forEach(i => console.log(i));