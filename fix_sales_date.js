/**
 * 송대민 sales 레코드의 date를 UTC → KST로 수정
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
    readFileSync('./functions/service-account-key.json', 'utf-8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

(async () => {
    try {
        // 송대민의 sales 레코드 찾기
        const snapshot = await db.collection('sales')
            .where('memberName', '==', '송대민')
            .get();

        if (snapshot.empty) {
            console.log('❌ 송대민 sales 레코드를 찾을 수 없습니다.');
            process.exit(1);
        }

        for (const doc of snapshot.docs) {
            const data = doc.data();
            console.log(`발견: ${doc.id}, date=${data.date}, timestamp=${data.timestamp}`);
            
            if (data.date && data.date.includes('T')) {
                // ISO UTC → KST 날짜로 변환
                const d = new Date(data.date);
                const kstDate = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                
                console.log(`  수정: ${data.date} → ${kstDate}`);
                await doc.ref.update({ date: kstDate });
                console.log(`  ✅ 수정 완료`);
            } else {
                console.log(`  ℹ️ 이미 정상 형식: ${data.date}`);
            }
        }

        console.log('\n✅ 완료');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
