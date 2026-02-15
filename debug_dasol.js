import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

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

async function investigate() {
    console.log("=== 1. 회원 정보 조회 (정다솔) ===");
    const memberQuery = query(collection(db, 'members'), where('name', '==', '정다솔'));
    const memberSnap = await getDocs(memberQuery);
    
    let memberIds = [];
    memberSnap.forEach(doc => {
        const data = doc.data();
        memberIds.push(doc.id);
        console.log(`ID: ${doc.id}, Name: ${data.name}, Phone: ${data.phone}, Branch: ${data.homeBranch}`);
    });

    if (memberIds.length === 0) {
        console.log("정다솔 회원을 찾을 수 없습니다.");
        return;
    }

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    
    for (const memberId of memberIds) {
        console.log(`\n=== 2. 출석 기록 조회 (ID: ${memberId}, Date: ${today}) ===`);
        const attendanceQuery = query(
            collection(db, 'attendance'), 
            where('memberId', '==', memberId),
            orderBy('timestamp', 'desc'),
            limit(10)
        );
        const attendanceSnap = await getDocs(attendanceQuery);
        attendanceSnap.forEach(doc => {
            console.log(JSON.stringify({id: doc.id, ...doc.data()}, null, 2));
        });

        console.log(`\n=== 3. 에러 로그 조회 (ID: ${memberId}) ===`);
        const errorQuery = query(
            collection(db, 'error_logs'), 
            where('memberId', '==', memberId),
            orderBy('timestamp', 'desc'),
            limit(5)
        );
        try {
            const errorSnap = await getDocs(errorQuery);
            errorSnap.forEach(doc => {
                console.log(JSON.stringify({id: doc.id, ...doc.data()}, null, 2));
            });
        } catch (e) {
            console.log("error_logs 조회 실패 (인덱스 부족 등):", e.message);
        }
    }
}

investigate();
