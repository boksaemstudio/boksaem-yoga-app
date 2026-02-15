
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMemberError() {
    console.log('🔍 Searching for member "김혜련"...');
    
    // 1. Find Member
    const membersRef = db.collection('members');
    const snapshot = await membersRef.where('name', '==', '김혜련').get();

    if (snapshot.empty) {
        console.log('❌ Member "김혜련" not found.');
        return;
    }

    let memberId;
    let memberData;
    snapshot.forEach((doc) => {
        memberData = doc.data();
        console.log(`✅ Found Member: ${memberData.name} (ID: ${doc.id})`);
        console.log(`   - Phone: ${memberData.phone}`);
        console.log(`   - Credits: ${memberData.credits}`);
        console.log(`   - Status: ${memberData.status}`);
        console.log(`   - EndDate: ${memberData.endDate}`);
        memberId = doc.id;
    });

    if (!memberId) return;

    // 2. Check Recent Error Logs (General & AI)
    console.log('\n📋 Checking recent error logs related to this member...');
    
    const errorsRef = db.collection('error_logs');
    const errorSnapshot = await errorsRef.orderBy('timestamp', 'desc').limit(50).get();
    
    const aiErrorsRef = db.collection('ai_error_logs');
    const aiErrorSnapshot = await aiErrorsRef.orderBy('timestamp', 'desc').limit(30).get();

    const allErrors = [
        ...errorSnapshot.docs.map(d => ({ ...d.data(), type: 'General' })),
        ...aiErrorSnapshot.docs.map(d => ({ ...d.data(), type: 'AI' }))
    ].sort((a, b) => (b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime()) - (a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime()));

    let foundErrors = 0;
    allErrors.forEach(data => {
        const jsonContext = JSON.stringify(data.context || {});
        const isRelated = jsonContext.includes(memberId) || 
                          jsonContext.includes('김혜련') || 
                          (memberData.phone && jsonContext.includes(memberData.phone.slice(-4)));
        
        if (isRelated) {
            console.log('🔴 [RELATED ERROR FOUND]');
            console.log(`   [${data.type}] ${data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : new Date(data.timestamp).toLocaleString()) : 'N/A'}`);
            console.log(`   Error: ${data.error}`);
            console.log(`   Context: ${jsonContext}`);
            console.log('   ---');
            foundErrors++;
        }
    });

    if (foundErrors === 0) console.log('   No related error logs found.');

    // 3. Check Attendance Logs
    console.log(`\n📋 Checking attendance logs for member ${memberId}...`);
    const logsRef = db.collection('attendance');
    const logsSnapshot = await logsRef.where('memberId', '==', memberId).limit(10).get();

    if (logsSnapshot.empty) {
        console.log('   No attendance logs found for this member.');
    } else {
        const logs = logsSnapshot.docs.map(d => d.data());
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        logs.forEach(data => {
            console.log(`   [${new Date(data.timestamp).toLocaleString()}] Status: ${data.status}, Class: ${data.className || 'N/A'}`);
        });
    }
}

checkMemberError().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
