const admin = require('firebase-admin');

// Ensure we don't initialize multiple times
if (!admin.apps.length) {
    const serviceAccount = require('../functions/service-account-key.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function run() {
    console.log('Searching Firebase Auth and special collections for target users...');
    let deletedCount = 0;

    // 1. Check Firebase Auth
    let nextPageToken;
    do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        for (const userRecord of listUsersResult.users) {
            const name = String(userRecord.displayName || '').toLowerCase();
            const phone = String(userRecord.phoneNumber || '');
            const email = String(userRecord.email || '').toLowerCase();
            
            if (name.includes('wqqqq') || name.includes('슈퍼어드민') || phone.includes('7788') || email.includes('wqqqq') || phone.includes('wqqqq')) {
                console.log(`Found target in Auth: [${userRecord.uid}] ${userRecord.displayName} | ${userRecord.phoneNumber} | ${userRecord.email}`);
                await admin.auth().deleteUser(userRecord.uid);
                console.log(` -> Deleted Auth User ${userRecord.uid}`);
                deletedCount++;
                
                // also delete any matching firestore doc in users, admins, staff, etc
                const checkCols = ['users', 'admins', 'staff', 'superadmins'];
                for (const col of checkCols) {
                    try {
                        await db.collection(col).doc(userRecord.uid).delete();
                        console.log(` -> Force deleted possible Firestore doc in ${col}`);
                    } catch (e) {}
                }
            }
        }
        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    // 2. Check explicitly superadmins or other settings collections
    try {
        const sysSettingsSnap = await db.collection('settings').get();
        for (const doc of sysSettingsSnap.docs) {
            const data = doc.data();
            const strData = JSON.stringify(data).toLowerCase();
            if (strData.includes('wqqqq') || strData.includes('7788') || strData.includes('슈퍼어드민')) {
                console.log(`Found target in settings: [${doc.id}] ${strData.slice(0, 50)}...`);
                // Not deleting settings root, maybe specific fields? 
            }
        }
    } catch (e) {}
    
    // 3. What if it's the `superadmins` collection
    try {
        const superAdminsSnap = await db.collection('superadmins').get();
        for (const doc of superAdminsSnap.docs) {
            const data = doc.data();
            const name = String(data.name || '').toLowerCase();
            const phone = String(data.phoneNumber || data.phone || '');
            const email = String(data.email || '').toLowerCase();
            
            if (name.includes('wqqqq') || name.includes('슈퍼어드민') || phone.includes('7788') || email.includes('wqqqq') || phone.includes('wqqqq')) {
                console.log(`Found target in superadmins: [${doc.id}] ${name} | ${phone} | ${email}`);
                await doc.ref.delete();
                console.log(` -> Deleted Superadmin ${doc.id}`);
                deletedCount++;
            }
        }
    } catch(e) {}

    // Check system_admins collection
    try {
        const sysAdminsSnap = await db.collection('system_admins').get();
        for (const doc of sysAdminsSnap.docs) {
            const data = doc.data();
             const name = String(data.name || '').toLowerCase();
            const phone = String(data.phoneNumber || data.phone || '');
            const email = String(data.email || '').toLowerCase();
            
            if (name.includes('wqqqq') || name.includes('슈퍼어드민') || phone.includes('7788') || email.includes('wqqqq') || phone.includes('wqqqq')) {
                console.log(`Found target in system_admins: [${doc.id}] ${name}`);
                await doc.ref.delete();
                console.log(` -> Deleted system_admin ${doc.id}`);
                deletedCount++;
            }
        }
    } catch(e) {}
    
    console.log(`Auth script completed. Total deleted: ${deletedCount}`);
}

run().catch(console.error);
