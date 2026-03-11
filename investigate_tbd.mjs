import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
    apiKey: "AIzaSyCmPRkDFnedx8MxsfY8W_cL1MF8pJaWXNk",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga"
});
const db = getFirestore(app);

async function investigate() {
    console.log('=== 전수조사 시작 ===\n');

    // 1. members에서 upcomingMembership이 있는 회원
    console.log('Loading members...');
    const membersSnap = await getDocs(collection(db, 'members'));
    let upcomingCount = 0, tbdCount = 0;

    membersSnap.forEach(doc => {
        const d = doc.data();
        if (d.upcomingMembership) {
            upcomingCount++;
            console.log(`[UPCOMING] ${d.name} (${doc.id})`);
            console.log(`  현재: s=${d.startDate} e=${d.endDate} cr=${d.credits}`);
            console.log(`  대기: ${JSON.stringify(d.upcomingMembership)}`);
        }
        if ((d.startDate === 'TBD' || d.endDate === 'TBD') && (d.attendanceCount || 0) > 0) {
            tbdCount++;
            console.log(`[TBD-BUT-ACTIVE] ${d.name} (${doc.id}) s=${d.startDate} e=${d.endDate} cr=${d.credits} att=${d.attendanceCount}`);
        }
    });

    console.log(`\n총 회원: ${membersSnap.size}, upcomingMembership 보유: ${upcomingCount}, TBD+출석: ${tbdCount}\n`);

    // 2. sales에서 startDate=TBD
    console.log('Loading sales...');
    const salesSnap = await getDocs(collection(db, 'sales'));
    let salesTbd = 0;
    salesSnap.forEach(doc => {
        const s = doc.data();
        if (s.startDate === 'TBD' || s.endDate === 'TBD') {
            salesTbd++;
            console.log(`[SALE-TBD] ${s.memberName || '?'} | ${s.item} | ${s.date} | s=${s.startDate} e=${s.endDate} | id=${doc.id} mid=${s.memberId}`);
        }
    });
    console.log(`\nSales TBD: ${salesTbd}`);
}

investigate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
