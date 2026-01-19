
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
    storageBucket: "boksaem-yoga.firebasestorage.app",
    messagingSenderId: "638854766032",
    appId: "1:638854766032:web:db6b919068aaf5808b2dd5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDatabaseSize() {
    console.log("--- 데이터베이스 통계 집계 중 ---");

    const collections = ['members', 'attendance', 'notices', 'messages'];

    for (const collName of collections) {
        try {
            const snapshot = await getDocs(collection(db, collName));
            console.log(`${collName}: ${snapshot.size} 개의 문서`);
        } catch (error) {
            console.error(`${collName} 집계 실패:`, error.message);
        }
    }

    process.exit(0);
}

checkDatabaseSize();
