// Firestore에서 에러 로그 가져오기
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
    readFileSync('./serviceAccountKey.json', 'utf-8')
);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function getErrorLogs() {
    try {
        const snapshot = await db.collection('error_logs')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();

        const errors = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            const errorKey = data.message || 'Unknown';

            if (!errors[errorKey]) {
                errors[errorKey] = {
                    count: 0,
                    firstSeen: data.timestamp,
                    lastSeen: data.timestamp,
                    examples: []
                };
            }

            errors[errorKey].count++;
            errors[errorKey].examples.push({
                id: doc.id,
                timestamp: data.timestamp,
                url: data.url,
                context: data.context
            });
        });

        console.log('\n=== 에러 로그 분석 결과 ===\n');

        Object.entries(errors).sort((a, b) => b[1].count - a[1].count).forEach(([msg, info]) => {
            console.log(`\n📛 에러: ${msg}`);
            console.log(`   발생 횟수: ${info.count}회`);
            console.log(`   최초 발생: ${new Date(info.firstSeen).toLocaleString()}`);
            console.log(`   최근 발생: ${new Date(info.lastSeen).toLocaleString()}`);
            console.log(`   예시 URL: ${info.examples[0]?.url || 'N/A'}`);
        });

        console.log(`\n\n총 ${snapshot.size}건의 에러 로그`);
        console.log(`고유 에러 유형: ${Object.keys(errors).length}개`);

    } catch (error) {
        console.error('에러 로그 조회 실패:', error);
    }
}

getErrorLogs();
