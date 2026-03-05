
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMemberError() {
    console.log('🔍 Searching for member "이수연"...');
    
    // 1. Find Member
    const membersRef = db.collection('members');
    const snapshot = await membersRef.where('name', '==', '이수연').get();

    if (snapshot.empty) {
        console.log('❌ Member "이수연" not found.');
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
    console.log('\n📋 Checking recent error logs...');
    
    // General Errors
    const errorsRef = db.collection('error_logs');
    const errorSnapshot = await errorsRef.orderBy('timestamp', 'desc').limit(30).get();
    
    // AI Errors
    const aiErrorsRef = db.collection('ai_error_logs');
    const aiErrorSnapshot = await aiErrorsRef.orderBy('timestamp', 'desc').limit(20).get();

    const allErrors = [
        ...errorSnapshot.docs.map(d => ({ ...d.data(), type: 'General', id: d.id })),
        ...aiErrorSnapshot.docs.map(d => ({ ...d.data(), type: 'AI', id: d.id }))
    ].sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)); // Sort in memory

    let foundErrors = 0;
    if (allErrors.length === 0) {
        console.log('   No recent error logs found.');
    } else {
        allErrors.forEach(data => {
            const jsonContext = JSON.stringify(data.context || {});
            
            // Context matching
            const isRelated = jsonContext.includes(memberId) || 
                              jsonContext.includes('이수연') || 
                              jsonContext.includes('9496') || // Phone last 4
                              (memberData.phone && jsonContext.includes(memberData.phone));
            
            if (isRelated || foundErrors < 5) {
                if (isRelated) console.log('🔴 [RELATED ERROR]');
                console.log(`   [${data.type}] ${data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'N/A'}`);
                console.log(`   Error: ${data.error}`);
                console.log(`   Context: ${jsonContext}`);
                console.log('   ---');
                if (isRelated) foundErrors++;
            }
        });
    }

    // 3. Check Attendance Logs for this member
    console.log(`\n📋 Checking attendance logs for member ${memberId}...`);
    const logsRef = db.collection('attendance');
    // Removed orderBy to avoid index requirement for now
    const logsSnapshot = await logsRef
        .where('memberId', '==', memberId)
        .limit(20)
        .get();

    if (logsSnapshot.empty) {
        console.log('   No attendance logs found for this member.');
    } else {
        const logs = logsSnapshot.docs.map(d => d.data());
        // Sort in memory (Handle string or Timestamp)
        logs.sort((a, b) => {
            const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
            const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
            return timeB - timeA;
        });

        logs.forEach(data => {
            const timeStr = data.timestamp?.toMillis ? new Date(data.timestamp.toDate()).toLocaleString() : new Date(data.timestamp).toLocaleString();
            console.log(`   [${timeStr}] Status: ${data.status}, Class: ${data.className || 'N/A'}`);
        });
    }
}

checkMemberError().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
