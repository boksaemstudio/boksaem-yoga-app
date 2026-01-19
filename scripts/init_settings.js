import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

const instructors = ['원장', '미선', '소영', '한아', '정연', '효원', '희정', '보윤', '은혜', '혜실', '세연', 'anu', '희연', '송미', '성희', '다나', '리안'];
const classTypes = ['하타', '아쉬탕가', '하타+인', '마이솔', '하타 인텐시브', '인요가', '빈야사', '힐링', '플라잉', '임신부요가', '키즈플라잉', '인양요가', '로우플라잉', '하타인텐시브'];

async function setupSettings() {
    try {
        await setDoc(doc(db, 'settings', 'instructors'), { list: instructors });
        await setDoc(doc(db, 'settings', 'classTypes'), { list: classTypes });
        console.log('✅ Settings initialized successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

setupSettings();
