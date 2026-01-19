
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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

const gwang_slots = [
    { className: "하타", startTime: "10:00", days: ["월", "목", "금", "토"] },
    { className: "아쉬탕가", startTime: "10:00", days: ["화"] },
    { className: "하타+인", startTime: "10:00", days: ["수"] },
    { className: "아쉬탕가 LED", startTime: "11:20", days: ["토"] },
    { className: "마이솔", startTime: "11:20", days: ["일"] },
    { className: "마이솔", startTime: "14:00", days: ["월", "화", "목"] },
    { className: "하타 인텐시브", startTime: "14:00", days: ["수", "금", "일"] },
    { className: "하타", startTime: "19:00", days: ["월", "화", "목", "일"] },
    { className: "아쉬탕가", startTime: "19:00", days: ["수"] },
    { className: "인요가", startTime: "19:00", days: ["금"] },
    { className: "아쉬탕가", startTime: "20:20", days: ["월", "목"] },
    { className: "인요가", startTime: "20:20", days: ["화"] },
    { className: "하타", startTime: "20:20", days: ["수", "금"] }
];

const mapo_slots = [
    { className: "하타", startTime: "10:00", days: ["월", "화", "수", "일"] },
    { className: "빈야사", startTime: "10:00", days: ["목"] },
    { className: "힐링", startTime: "10:00", days: ["금"] },
    { className: "리안(빈야사)", startTime: "10:00", days: ["토"] },
    { className: "플라잉", startTime: "11:20", days: ["토"] },
    { className: "임산부요가", startTime: "11:50", days: ["화", "목"] },
    { className: "키즈플라잉", startTime: "17:00", days: ["수"] },
    { className: "인요가", startTime: "18:40", days: ["월"] },
    { className: "플라잉(기초)", startTime: "18:40", days: ["화"] },
    { className: "하타", startTime: "18:40", days: ["수", "일"] },
    { className: "플라잉(고급)", startTime: "18:40", days: ["목"] },
    { className: "아쉬탕가", startTime: "18:40", days: ["금"] },
    { className: "하타", startTime: "19:50", days: ["월", "금"] },
    { className: "아쉬탕가", startTime: "19:50", days: ["화"] },
    { className: "플라잉(중급)", startTime: "19:50", days: ["수"] },
    { className: "플라잉(입문)", startTime: "19:50", days: ["목"] },
    { className: "플라잉(기초)", startTime: "21:00", days: ["월"] },
    { className: "하타", startTime: "21:00", days: ["화"] },
    { className: "빈야사", startTime: "21:00", days: ["수"] },
    { className: "인양요가", startTime: "21:00", days: ["목"] },
    { className: "로우플라잉", startTime: "21:00", days: ["금"] }
];

async function setupSchedules() {
    await setDoc(doc(db, "schedules", "gwangheungchang"), { slots: gwang_slots });
    await setDoc(doc(db, "schedules", "mapo"), { slots: mapo_slots });
    console.log("Schedule data initialized.");
}

setupSchedules();
