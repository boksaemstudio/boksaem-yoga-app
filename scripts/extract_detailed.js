import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import parser from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extract() {
  const translationsPath = path.join(__dirname, '../src/utils/translations.js');
  const module = await import('file://' + translationsPath.replace(/\\/g, '/'));
  const translations = module.translations;
  const koKeys = new Set(Object.keys(translations.ko || {}));
  const enKeys = new Set(Object.keys(translations.en || {}));
  
  const srcDir = path.join(__dirname, '../src');
  
  const walk = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
          file = path.join(dir, file);
          const stat = fs.statSync(file);
          if (stat && stat.isDirectory()) {
              results = results.concat(walk(file));
          } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
              results.push(file);
          }
      });
      return results;
  };
  
  const files = walk(srcDir);
  const extracted = {}; // { "key": "fallback text" }
  
  files.forEach(file => {
      const code = fs.readFileSync(file, 'utf8');
      try {
          const ast = parser.parse(code, {
              sourceType: 'module',
              plugins: ['jsx']
          });
          
          traverse(ast, {
              CallExpression(path) {
                  // match t('key')
                  if (path.node.callee.name === 't' && path.node.arguments.length > 0) {
                      const arg = path.node.arguments[0];
                      if (arg.type === 'StringLiteral') {
                          const key = arg.value;
                          let fallback = '';
                          
                          // Check for t('key') || 'fallback'
                          if (path.parentPath && path.parentPath.node.type === 'LogicalExpression' && path.parentPath.node.operator === '||') {
                              if (path.parentPath.node.right.type === 'StringLiteral') {
                                  fallback = path.parentPath.node.right.value;
                              }
                          }
                          
                          // If key looks like a translation key (no paths, no weird chars)
                          if (/^[a-zA-Z0-9_]+$/.test(key) || /^[가-힣a-zA-Z0-9_\s]+$/.test(key)) {
                              if (!koKeys.has(key) || !enKeys.has(key)) {
                                  extracted[key] = fallback || key; // If no fallback, use key as fallback
                              }
                          }
                      }
                  }
              }
          });
      } catch (e) {
          // ignore parsing errors for non-standard files
      }
  });
  
  // Also add keys from translations.ko that are NOT in translations.en
  Object.keys(translations.ko).forEach(k => {
      if (!translations.en[k]) {
          extracted[k] = translations.ko[k];
      }
  });

  // Also add keys in EN that incorrectly contain Korean characters
  const koreanVals = [];
  for (const k of enKeys) {
      if (/[가-힣]/.test(translations.en[k])) {
          extracted[k] = translations.ko[k] || translations.en[k];
      }
  }

  const resultList = Object.keys(extracted).map(k => ({ key: k, ko: extracted[k] }));
  
  fs.writeFileSync(path.join(__dirname, 'missing_detailed.json'), JSON.stringify(resultList, null, 2));
  console.log(`Extracted ${resultList.length} genuine missing translation keys.`);
}

extract();
