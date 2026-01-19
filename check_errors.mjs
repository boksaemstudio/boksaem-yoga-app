import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
    storageBucket: "boksaem-yoga.firebasestorage.app",
    messagingSenderId: "655961733074",
    appId: "1:655961733074:web:c1e6c0a5c5e5c5e5c5e5c5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRecentErrors() {
    console.log("🔍 최근 에러 로그 조회 중...\n");

    const q = query(
        collection(db, "error_logs"),
        orderBy("timestamp", "desc"),
        limit(20)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log("✅ 에러 로그가 없습니다!");
        process.exit(0);
    }

    console.log(`📊 총 ${snapshot.size}개의 최근 에러 발견:\n`);

    const errors = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        errors.push({
            id: doc.id,
            message: data.message,
            url: data.url,
            timestamp: data.timestamp,
            userId: data.userId,
            stack: data.stack
        });
    });

    // 에러 메시지별로 그룹화
    const grouped = {};
    errors.forEach(err => {
        const key = err.message.substring(0, 80);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(err);
    });

    // 결과 출력
    Object.entries(grouped).forEach(([msg, errs], index) => {
        console.log(`${index + 1}. [${errs.length}건] ${msg}`);
        console.log(`   최근 발생: ${errs[0].timestamp}`);
        console.log(`   URL: ${errs[0].url}`);
        if (errs[0].stack) {
            const stackLines = errs[0].stack.split('\n').slice(0, 3).join('\n   ');
            console.log(`   Stack: ${stackLines}`);
        }
        console.log('');
    });

    process.exit(0);
}

checkRecentErrors().catch(err => {
    console.error("❌ 조회 실패:", err);
    process.exit(1);
});
