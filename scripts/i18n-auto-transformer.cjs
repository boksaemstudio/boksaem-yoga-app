const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const babel = require('@babel/core');

const SRC_DIR = path.resolve(__dirname, '../src');
const TRANSLATIONS_PATH = path.resolve(SRC_DIR, 'utils/translations.js');
const EXCLUDE_DIRS = ['utils', 'contexts', 'stores', 'services'];
const EXCLUDE_FILES = ['CommonIcons.jsx', 'main.jsx'];

function getFiles(dir, list = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (!EXCLUDE_DIRS.includes(file)) getFiles(filePath, list);
        } else if (/\.(jsx?)$/.test(file) && !EXCLUDE_FILES.includes(file)) {
            list.push(filePath);
        }
    }
    return list;
}

const allFiles = getFiles(SRC_DIR);

// We will collect new translation keys here
const newTranslations = {};
let totalModifiedFiles = 0;
let totalReplacedStrings = 0;

function hashKorean(text) {
    const clean = text.trim().replace(/\s+/g, '_').substring(0, 15);
    const hash = crypto.createHash('md5').update(text).digest('hex').substring(0, 6);
    return `g_${hash}`;
}

function i18nPlugin({ types: t }) {
    return {
        visitor: {
            Program(path) {
                this.needsImport = false;
                this.hasImport = false;
                
                // Track existing imports
                path.traverse({
                    ImportDeclaration: (importPath) => {
                        if (importPath.node.source.value.includes('useLanguageStore')) {
                            this.hasImport = true;
                        }
                    }
                });
            },
            
            // Extract and replace JSXText
            JSXText(path) {
                const text = path.node.value;
                if (/[가-힣]/.test(text) && text.trim().length > 0) {
                    // Ignore things clearly inside script tags or already translated
                    if (path.parent.type === 'JSXExpressionContainer') return;
                    
                    const trimmed = text.trim();
                    const key = hashKorean(trimmed);
                    newTranslations[key] = trimmed;
                    
                    // Replace with {t('key') || 'text'}
                    const callExpr = t.callExpression(t.identifier('t'), [t.stringLiteral(key)]);
                    const logicalOr = t.logicalExpression('||', callExpr, t.stringLiteral(trimmed));
                    const expContainer = t.jsxExpressionContainer(logicalOr);
                    
                    path.replaceWith(expContainer);
                    totalReplacedStrings++;
                    this.needsImport = true;
                    path.skip();
                }
            },
            
            // Extract and replace StringLiterals in JSXAttributes and Object properties
            StringLiteral(path) {
                const text = path.node.value;
                if (!/[가-힣]/.test(text)) return;
                
                // Exclude import paths, properties that are not text, console logs
                if (path.parent.type === 'ImportDeclaration') return;
                if (path.parent.type === 'CallExpression' && path.parent.callee.name === 'require') return;
                if (path.parent.type === 'CallExpression' && path.parent.callee.property && path.parent.callee.property.name === 'log') return;
                // Exclude already inside t()
                if (path.parent.type === 'CallExpression' && path.parent.callee.name === 't') return;

                const key = hashKorean(text);
                newTranslations[key] = text;

                const callExpr = t.callExpression(t.identifier('t'), [t.stringLiteral(key)]);
                const logicalOr = t.logicalExpression('||', callExpr, t.stringLiteral(text));
                
                if (path.parent.type === 'JSXAttribute') {
                    path.replaceWith(t.jsxExpressionContainer(logicalOr));
                } else {
                    path.replaceWith(logicalOr);
                }
                totalReplacedStrings++;
                this.needsImport = true;
                path.skip();
            },
            
            // Inject hook into component definition
            FunctionDeclaration(funcPath) {
                injectHook(funcPath, t);
            },
            ArrowFunctionExpression(funcPath) {
                if (funcPath.parent.type === 'VariableDeclarator') {
                    injectHook(funcPath, t);
                }
            }
        },
        post(file) {
            if (this.needsImport && !this.hasImport) {
                const relativePathPath = path.relative(path.dirname(file.opts.filename), path.resolve(SRC_DIR, 'stores/useLanguageStore')).replace(/\\/g, '/');
                const importPath = relativePathPath.startsWith('.') ? relativePathPath : `./${relativePathPath}`;
                
                const importAst = t.importDeclaration(
                    [t.importSpecifier(t.identifier('useLanguageStore'), t.identifier('useLanguageStore'))],
                    t.stringLiteral(importPath)
                );
                file.path.node.body.unshift(importAst);
            }
        }
    };
}

function injectHook(funcPath, t) {
    if (funcPath.node.body.type === 'BlockStatement') {
        const body = funcPath.node.body.body;
        let isComponent = false;
        let hasTHook = funcPath.scope.hasBinding('t') || funcPath.scope.hasOwnBinding('t');
        
        funcPath.traverse({
            JSXElement() { isComponent = true; },
            JSXFragment() { isComponent = true; }
        });

        if (isComponent && !hasTHook) {
            const hookAst = t.variableDeclaration('const', [
                t.variableDeclarator(
                    t.identifier('t'),
                    t.callExpression(t.identifier('useLanguageStore'), [
                        t.arrowFunctionExpression(
                            [t.identifier('s')],
                            t.memberExpression(t.identifier('s'), t.identifier('t'))
                        )
                    ])
                )
            ]);
            body.unshift(hookAst);
        }
    }
}

for (const filePath of allFiles) {
    try {
        const code = fs.readFileSync(filePath, 'utf-8');
        // Check if there are korean characters first
        if (!/[가-힣]/.test(code)) continue;

        const result = babel.transformSync(code, {
            filename: filePath,
            plugins: ['@babel/plugin-syntax-jsx', i18nPlugin]
        });

        if (result && result.code && result.code !== code) {
            fs.writeFileSync(filePath, result.code, 'utf-8');
            totalModifiedFiles++;
        }
    } catch (e) {
        console.log(`Failed to process ${filePath}: ${e.message}`);
    }
}

console.log(`Successfully modified ${totalModifiedFiles} files. Total strings replaced: ${totalReplacedStrings}`);
console.log(`Generated ${Object.keys(newTranslations).length} unique translation keys.`);

// Inject keys into translations.js
if (Object.keys(newTranslations).length > 0) {
    let content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
    const langHeaderRegex = new RegExp(`^\\s{4}ko:\\s*\\{`, 'm');
    const langMatch = content.match(langHeaderRegex);
    if (langMatch) {
        let braceCount = 0;
        let closingBracePos = -1;
        for (let i = langMatch.index; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    closingBracePos = i;
                    break;
                }
            }
        }
        
        let toInsert = `\n        // ═══ Auto Global ═══\n`;
        for (const [key, val] of Object.entries(newTranslations)) {
            // Basic escaping
            const safeVal = val.replace(/"/g, '\\"').replace(/\n/g, ' ');
            toInsert += `        "${key}": "${safeVal}",\n`;
        }
        content = content.slice(0, closingBracePos) + toInsert + '    ' + content.slice(closingBracePos);
        fs.writeFileSync(TRANSLATIONS_PATH, content, 'utf8');
        console.log(`Successfully wrote translations to translations.js`);
    }
}
