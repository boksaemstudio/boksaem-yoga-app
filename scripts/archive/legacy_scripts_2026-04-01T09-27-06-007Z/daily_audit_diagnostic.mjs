import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/service-account-key.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function runAudit() {
    console.log("=== BOKSAEM YOGA DAILY AUDIT ===");
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    
    // 1. Check for Negative Credits
    console.log("\n[1] Checking for negative credits...");
    const negCredits = await db.collection('members').where('credits', '<', 0).get();
    if (negCredits.empty) {
        console.log("✅ No negative credits found.");
    } else {
        console.log(`❌ Found ${negCredits.size} members with negative credits:`);
        negCredits.forEach(doc => {
            const m = doc.data();
            console.log(`- ${m.name} (${m.phone}): ${m.credits}`);
        });
    }

    // 2. Check for Duplicate Attendance (Today)
    console.log("\n[2] Checking for duplicate attendance today...");
    const attendance = await db.collection('attendance').where('date', '==', today).get();
    const records = attendance.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const memberMap = new Map();
    const duplicates = [];

    records.forEach(r => {
        const key = `${r.memberId}_${r.classTime || 'unknown'}`;
        if (memberMap.has(key)) {
            duplicates.push({ existing: memberMap.get(key), new: r });
        } else {
            memberMap.set(key, r);
        }
    });

    if (duplicates.length === 0) {
        console.log("✅ No duplicate attendance found today.");
    } else {
        console.log(`⚠️ Found ${duplicates.length} potential duplicate attendance records today.`);
    }

    // 3. Check for Recent Errors
    console.log("\n[3] Checking for recent error logs (last 24h)...");
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const errors = await db.collection('error_logs').where('timestamp', '>', yesterday).get();
    if (errors.empty) {
        console.log("✅ No recent client errors reported.");
    } else {
        console.log(`⚠️ Found ${errors.size} recent client errors.`);
    }

    // 4. Check AI Usage
    console.log("\n[4] Checking AI usage today...");
    const aiLog = await db.collection('ai_usage').doc(today).get();
    if (aiLog.exists) {
        const data = aiLog.data();
        console.log(`AI Calls: ${data.count} / Limit: ${data.limit || 100}`);
    } else {
        console.log("ℹ️ No AI usage recorded for today yet.");
    }

    // 5. FCM Token Check
    console.log("\n[5] Checking FCM tokens...");
    const tokens = await db.collection('fcm_tokens').get();
    console.log(`Total FCM tokens registered: ${tokens.size}`);
    
    const tokenMap = new Map();
    tokens.forEach(doc => {
        const t = doc.data();
        if (!t.token) return;
        const key = `${t.memberId}_${t.token.substring(0, 10)}`;
        if (tokenMap.has(key)) tokenMap.get(key).push(doc.id);
        else tokenMap.set(key, [doc.id]);
    });
    
    let duplicatesCount = 0;
    tokenMap.forEach(v => { if (v.length > 1) duplicatesCount += v.length - 1; });
    console.log(`Duplicate tokens found (same member, similar token prefix): ${duplicatesCount}`);

    // 6. Attendance vs Classes
    console.log("\n[6] Today's Attendance Summary:");
    const classes = await db.collection('daily_classes').where('date', '==', today).get();
    console.log(`Classes scheduled today: ${classes.size}`);
    console.log(`Total attendance logs today: ${attendance.size}`);
}

runAudit().catch(console.error);
