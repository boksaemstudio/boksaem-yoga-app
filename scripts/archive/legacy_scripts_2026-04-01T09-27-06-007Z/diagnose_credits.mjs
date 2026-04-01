import { db } from '../src/firebase.js';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

async function diagnose() {
    const today = '2026-03-08';
    console.log(`--- Diagnosing Credit Issue for ${today} ---`);

    const membersRef = collection(db, 'members');
    const targetNames = ['백현경', '고영애'];

    for (const name of targetNames) {
        console.log(`\n[Member: ${name}]`);
        const q = query(membersRef, where('name', '==', name));
        const snap = await getDocs(q);
        
        if (snap.empty) {
            console.log("Member not found.");
            continue;
        }

        const memberDoc = snap.docs[0];
        const memberData = memberDoc.data();
        console.log(`ID: ${memberDoc.id}`);
        console.log(`Current Credits: ${memberData.credits}`);
        console.log(`Membership: ${memberData.membershipType} (${memberData.startDate} ~ ${memberData.endDate})`);
        console.log(`Upcoming: ${JSON.stringify(memberData.upcomingMembership)}`);

        console.log("Recent Attendance:");
        const attRef = collection(db, 'attendance');
        const attQ = query(
            attRef, 
            where('memberId', '==', memberDoc.id),
            orderBy('timestamp', 'desc'),
            limit(5)
        );
        const attSnap = await getDocs(attQ);
        attSnap.forEach(d => {
            const data = d.data();
            console.log(`- ${data.date} ${new Date(data.timestamp).toLocaleTimeString()}: Status: ${data.status}, Credits in Rec: ${data.credits}, Class: ${data.className}`);
        });
    }
    process.exit();
}

diagnose();
