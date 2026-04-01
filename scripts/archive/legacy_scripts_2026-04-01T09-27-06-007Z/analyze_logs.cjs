const fs = require('fs');
const readline = require('readline');

const csvPath = 'C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\tests\\downloaded-logs-20260331-031943.csv';

async function processLineByLine() {
  const fileStream = fs.createReadStream(csvPath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber++;
    // print logs that contain interesting keywords or are not just 'Callable request verification passed' / INFO
    if (line.includes('error') || line.includes('fail') || line.includes('not found') || line.includes('deleted') || line.includes('삭제')) {
        console.log(`[Line ${lineNumber}] MATCH: ${line.substring(0, 300)}...`);
        continue;
    }
    
    // Also print if textPayload contains "Member" and "not found" or similar
    if (line.includes('Member') && line.includes('not found')) {
        console.log(`[Line ${lineNumber}] MATCH: ${line.substring(0, 300)}...`);
        continue;
    }

    if (line.includes('does not exist') || line.includes('지워진')) {
        console.log(`[Line ${lineNumber}] MATCH: ${line.substring(0, 300)}...`);
        continue;
    }
  }
}

processLineByLine();
