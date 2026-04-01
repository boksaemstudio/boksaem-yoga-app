const fs = require('fs');
const readline = require('readline');
const admin = require('firebase-admin');

const saPath = '../functions/service-account-key.json';
const sa = require(saPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(sa)
    });
}
const db = admin.firestore();

const csvPath = 'C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\tests\\downloaded-logs-20260331-031943.csv';

async function main() {
    console.log('--- 로그 파싱 시작 ---');
    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const memberIds = new Set();
    const regex = /\[Attendance\] Check-in request for ([a-zA-Z0-9_-]+) in/i;

    for await (const line of rl) {
        const match = line.match(regex);
        if (match && match[1]) {
            memberIds.add(match[1]);
        }
    }

    console.log(`로그에서 찾은 고유 회원 번호(memberId) 개수: ${memberIds.size}개`);
    console.log('이 회원들의 삭제 여부를 DB에서 확인합니다...\n');

    let foundDeleted = 0;
    
    // Check each branch if needed, but members are globally at studios/{studioId}/members usually in this app 
    // Wait, let's check studios/boksaem-yoga/members
    for (const mId of memberIds) {
        try {
            const docRef = db.doc(`studios/boksaem-yoga/members/${mId}`);
            const sn = await docRef.get();
            
            if (!sn.exists) {
                console.log(`❌ [삭제됨/존재안함] Member ID: ${mId} - DB에 문서가 없습니다.`);
                foundDeleted++;
                continue;
            }
            
            const data = sn.data();
            if (data.deletedAt) {
                console.log(`🗑️ [소프트삭제됨] Member ID: ${mId}, 이름: ${data.name}, 삭제일: ${data.deletedAt.toDate ? data.deletedAt.toDate().toISOString() : data.deletedAt}`);
                foundDeleted++;
            }
        } catch (e) {
            console.error(`에러 발생 (${mId}):`, e.message);
        }
    }

    console.log(`\n조사 완료. 문제 있는/삭제된 회원: ${foundDeleted}명`);
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
