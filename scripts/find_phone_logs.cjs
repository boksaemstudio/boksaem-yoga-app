const fs = require('fs');
const readline = require('readline');

async function main() {
    console.log('--- 로그에서 전화번호/식별자 검색 시작 ---');
    const csvPath = 'C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\tests\\downloaded-logs-20260331-031943.csv';
    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        
        // Skip HTTP 200/204 lines that are just normal OK logs to reduce noise unless it contains 'warn' or 'error'
        if (line.includes('Check-in request for')) {
            // we already saw these
            continue;
        }

        // Print anything that looks like application logs (console.log from function)
        // jsonPayload or textPayload usually contains meaningful things
        // In the CSV, it's often at the end. Let's just catch anything with "deleted", "not found", or "010"
        if (/010[-\s]?\d{3,4}[-\s]?\d{4}/.test(line) || /찾을 수 없/i.test(line) || /삭제/i.test(line) || /warning/i.test(line) || /error/i.test(line)) {
            console.log(`[Line ${lineNum} MATCH] ${line.substring(0, 300)}...`);
        }
    }
    console.log('--- 검색 완료 ---');
}
main();
