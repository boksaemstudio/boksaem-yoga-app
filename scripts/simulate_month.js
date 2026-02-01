
import admin from 'firebase-admin';
import { createRequire } from 'module';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const serviceAccount = require('../functions/service-account-key.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = getFirestore();

// Helper to generate dates
const getPastDate = (daysAgo) => {
    const d = new Date();
    d.setHours(10, 0, 0, 0); // KST-ish working hours
    d.setDate(d.getDate() - daysAgo);
    return d;
};

// Personas
const PERSONAS = [
    {
        id: 'sim_active',
        name: '김활발',
        phone: '010-1111-1111',
        credits: 20,
        endDate: getPastDate(-60).toISOString().split('T')[0], // Ends 60 days in future
        status: 'active'
    },
    {
        id: 'sim_expired',
        name: '이만료',
        phone: '010-2222-2222',
        credits: 5,
        endDate: getPastDate(3).toISOString().split('T')[0], // Ended 3 days ago
        status: 'expired'
    },
    {
        id: 'sim_zero',
        name: '박배고파',
        phone: '010-0000-0000',
        credits: 0,
        endDate: getPastDate(-30).toISOString().split('T')[0],
        status: 'active' // Active but no credits
    }
];

async function simulateMonth() {
    console.log("🚀 Starting One-Month Simulation...");

    // 1. Create/Update Personas
    console.log("Creating Persona Members...");
    for (const p of PERSONAS) {
        const memberData = {
            name: p.name,
            phone: p.phone,
            phoneLast4: p.phone.slice(-4),
            credits: p.credits,
            endDate: p.endDate,
            membershipType: 'general',
            branchId: 'gwangheungchang',
            pushEnabled: true,
            createdAt: getPastDate(30).toISOString(),
            lastAttendance: null
        };
        await db.collection('members').doc(p.id).set(memberData, { merge: true });
        console.log(`- Set member: ${p.name} (${p.id})`);
    }

    // 2. Generate 30 Days of Activity
    console.log("\nGenerating 30 Days of Activity...");
    const logsBatch = db.batch();
    let logCount = 0;

    for (let i = 30; i >= 0; i--) {
        const currentDate = getPastDate(i);
        const dateStr = currentDate.toISOString().split('T')[0];

        // Skip Sundays mostly
        if (currentDate.getDay() === 0) continue;

        // Add Attendance for 'sim_active' every 3 days
        if (i % 3 === 0) {
            const logRef = db.collection('attendance').doc();
            logsBatch.set(logRef, {
                memberId: 'sim_active',
                memberName: '김활발',
                branchId: 'gwangheungchang',
                date: dateStr,
                timestamp: currentDate.toISOString(),
                status: 'attended',
                className: '하타 요가',
                instructor: '원장'
            });
            logCount++;
        }

        // Random traffic (Placeholder logs for stats)
        const dailyRandom = Math.floor(Math.random() * 5) + 2; // 2-7 people
        for (let j = 0; j < dailyRandom; j++) {
            const logRef = db.collection('attendance').doc();
            logsBatch.set(logRef, {
                memberId: `random_user_${j}`, // Placeholder ID
                memberName: `방문자_${j}`,
                branchId: 'gwangheungchang',
                date: dateStr,
                timestamp: currentDate.toISOString(),
                status: 'attended',
                className: '빈야사',
                instructor: '세연'
            });
            logCount++;
        }
    }

    await logsBatch.commit();
    console.log(`- Created ${logCount} attendance logs.`);

    // 3. Create Sales History for 'sim_active'
    console.log("\nGenerating Sales History...");
    await db.collection('sales_history').add({
        memberId: 'sim_active',
        memberName: '김활발',
        type: '회원권',
        itemName: '20회권',
        amount: 250000,
        paymentMethod: 'card',
        date: getPastDate(30).toISOString(),
        timestamp: getPastDate(30)
    });
    console.log("- Added sales record for 김활발");

    // 4. Create AI Messages for 'sim_active'
    console.log("\nGenerating AI Config/Messages...");
    await db.collection('ai_config').doc('sim_active').set({
        memberId: 'sim_active',
        memberName: '김활발',
        level: '초급',
        goals: ['유연성 향상', '스트레스 해소'],
        lastGenerated: new Date().toISOString()
    });

    // Add a recent advice message
    await db.collection('ai_messages').add({
        memberId: 'sim_active',
        type: 'advice',
        content: "꾸준한 수련이 돋보입니다! 허리 유연성을 위해 코브라 자세를 집에서도 가볍게 연습해보세요.",
        timestamp: new Date().toISOString(),
        read: false
    });
    console.log("- Added AI message for 김활발");

    console.log("\n✅ Simulation Data Injection Complete!");
    console.log("You can now test:");
    console.log("1. Check-in with 010-1111-1111 (Success)");
    console.log("2. Check-in with 010-0000-0000 (Fail - No Credits)");
    console.log("3. Login Member App as 010-1111-1111 / 1111 (assuming pw is last 4)");
}

simulateMonth().catch(console.error);
