const fs = require('fs');

const data = JSON.parse(fs.readFileSync('missing_unique_keys.json', 'utf8'));
const keys = Object.keys(data);

const PARTS = 5;
const size = Math.ceil(keys.length / PARTS);

for (let i = 0; i < PARTS; i++) {
  const chunkKeys = keys.slice(i * size, (i + 1) * size);
  const chunkObj = {};
  for (const k of chunkKeys) {
    chunkObj[k] = data[k];
  }
  fs.writeFileSync(`missing_patch_part${i + 1}.json`, JSON.stringify(chunkObj, null, 2));
}

console.log(`Created ${PARTS} parts. Each has around ${size} keys.`);
