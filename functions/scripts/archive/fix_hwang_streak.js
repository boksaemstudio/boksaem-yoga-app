const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Duplicated calculateStreak to test
const calculateGap = (lastDate, currentDate) => {
    if (!lastDate) return 999;
    const last = new Date(lastDate);
    const current = new Date(currentDate);
    return Math.floor((current - last) / (1000 * 60 * 60 * 24));
};

const calculateStreak = (records, currentDate) => {
    if (!records || records.length === 0) return 1;
    // Deduplicate dates using Set to fix streak breaking on multi-session days
    const uniqueDates = Array.from(new Set(records.map(r => r.date).filter(Boolean)));
    const dates = uniqueDates.sort().reverse();
    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
        const gap = calculateGap(dates[i + 1], dates[i]);
        if (gap === 1) streak++;
        else break;
    }
    return streak;
};

async function checkHwang() {
    const snap = await db.collection('members').where('name', '==', '황화정').get();
    
    if (snap.empty) {
        console.log("Member not found");
        return;
    }
    const member = snap.docs[0];
    const memberId = member.id;
    
    const recentSnap = await db.collection('attendance')
        .where('memberId', '==', memberId)
        .orderBy('timestamp', 'desc')
        .limit(30)
        .get();
        
    const records = recentSnap.docs.map(d => d.data()).filter(r => r.status === 'valid');
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());

    const correctStreak = calculateStreak(records, today);
    console.log(`Current streak in DB: ${member.data().streak}`);
    console.log(`Correct streak calculated: ${correctStreak}`);
    
    if (member.data().streak !== correctStreak) {
        await db.collection('members').doc(memberId).update({ streak: correctStreak });
        console.log('Fixed member streak.');
    } else {
        console.log('Streak is already correct.');
    }
}

checkHwang().catch(console.error);
