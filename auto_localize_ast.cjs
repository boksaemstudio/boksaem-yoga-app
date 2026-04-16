const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const crypto = require('crypto');

function sha1(str) {
  return crypto.createHash('sha1').update(str).digest('hex').substring(0, 6);
}

const targetFile = process.argv[2] || 'src/pages/SuperAdminPage.jsx';
let code = fs.readFileSync(targetFile, 'utf8');

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript'], 
});

const koreanRegex = /[\u3131-\uD79D]/;
const replacements = [];
const newTranslations = fs.existsSync('extracted_ko.json') ? JSON.parse(fs.readFileSync('extracted_ko.json', 'utf8')) : {};

function isInsideTCall(path) {
  let p = path.parentPath;
  while (p) {
    if (p.isCallExpression() && p.node.callee.name === 't') {
      return true;
    }
    p = p.parentPath;
  }
  return false;
}

traverse(ast, {
  JSXText(path) {
    const text = path.node.value;
    if (koreanRegex.test(text) && text.trim().length > 0) {
      const trimmed = text.trim();
      const key = 'g_' + sha1(trimmed);
      newTranslations[key] = trimmed;
      
      const leadingSpace = text.substring(0, text.indexOf(text.trim()));
      const trailingSpace = text.substring(text.indexOf(text.trim()) + text.trim().length);
      
      replacements.push({
        start: path.node.start,
        end: path.node.end,
        nodeType: 'JSXText',
        text: `${leadingSpace}{t("${key}") || ${JSON.stringify(trimmed)}}${trailingSpace}`
      });
    }
  },
  StringLiteral(path) {
    const text = path.node.value;
    if (koreanRegex.test(text) && !isInsideTCall(path)) {
      if (path.parentPath.isImportDeclaration()) return;
      if (path.parentPath.isObjectProperty() && path.parentPath.node.key === path.node) return;

      const key = 'g_' + sha1(text);
      newTranslations[key] = text;
      
      if (path.parentPath.isJSXAttribute()) {
        replacements.push({
          start: path.node.start,
          end: path.node.end,
          nodeType: 'StringLiteral',
          text: `{t("${key}") || ${JSON.stringify(text)}}`
        });
      } else {
        replacements.push({
          start: path.node.start,
          end: path.node.end,
          nodeType: 'StringLiteral',
          text: `(t("${key}") || ${JSON.stringify(text)})`
        });
      }
    }
  },
  TemplateElement(path) {
    const text = path.node.value.raw;
    if (koreanRegex.test(text) && path.parentPath.node.expressions.length === 0 && !isInsideTCall(path)) {
      const key = 'g_' + sha1(text);
      newTranslations[key] = text;
      
      if (path.parentPath.parentPath.isJSXAttribute()) {
          replacements.push({
            start: path.parentPath.node.start, 
            end: path.parentPath.node.end,
            nodeType: 'TemplateLiteral',
            text: `{t("${key}") || ${JSON.stringify(text)}}`
          });
      } else {
          replacements.push({
            start: path.parentPath.node.start,
            end: path.parentPath.node.end,
            nodeType: 'TemplateLiteral',
            text: `(t("${key}") || ${JSON.stringify(text)})`
          });
      }
    }
  }
});

replacements.sort((a, b) => b.start - a.start);

const safeReplacements = [];
let lastStart = Infinity;
for (const r of replacements) {
    if (r.end <= lastStart) {
        safeReplacements.push(r);
        lastStart = r.start;
    }
}

let modifiedCode = code;
for (const r of safeReplacements) {
  modifiedCode = modifiedCode.substring(0, r.start) + r.text + modifiedCode.substring(r.end);
}

if (!modifiedCode.includes('useLanguageStore')) {
  const firstImportMatch = modifiedCode.match(/import .*?;/);
  if (firstImportMatch) {
    // Check if there are relative path assumptions, we assume the component is in src/pages/ or src/components/
    const depth = (targetFile.match(/\//g) || []).length;
    const prefix = targetFile.includes('src/components/admin') ? '../../../' : targetFile.includes('src/pages/') ? '../' : '../../';
    modifiedCode = modifiedCode.replace(firstImportMatch[0], `import { useLanguageStore } from '${prefix}stores/useLanguageStore';\n${firstImportMatch[0]}`);
  }
}

fs.writeFileSync(targetFile, modifiedCode);
fs.writeFileSync('extracted_ko.json', JSON.stringify(newTranslations, null, 2));

console.log(`Success! Replaced ${safeReplacements.length} raw Korean strings in ${targetFile}`);
