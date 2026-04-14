"use strict";
const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
        results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
        results.push(file);
    }
  });
  return results;
}
const files = walk('./src');
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.match(/[^a-zA-Z0-9_]t\(["']/g)) {
    if (!content.includes('const t =') && !content.includes('let t =') && !content.includes('var t =') && !content.includes('function t(') && !content.includes('const { t } =') && !content.includes('import { t }')) {
       console.log('MIGHT BE MISSING t:', f);
    }
  }
});
