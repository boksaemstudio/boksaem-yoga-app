const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const admin = require('firebase-admin');

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: "boksaem-yoga"
    });
}

const db = getFirestore();

async function checkSongDaeMinPush() {
    try {
        console.log("Searching for '송대민'...");
        const membersRef = db.collection('members');
        const q = await membersRef.where('name', '==', '송대민').get();

        if (q.empty) {
            console.log("Member '송대민' not found.");
            return;
        }

        const memberId = q.docs[0].id;
        console.log(`Found member ID: ${memberId}`);

        console.log("Checking push tokens for this member...");
        const tokensSnap = await db.collection('fcm_tokens').where('memberId', '==', memberId).get();

        if (tokensSnap.empty) {
            console.log("No push tokens found for 송대민.");
        } else {
            console.log(`Found ${tokensSnap.size} push tokens for 송대민:`);
            tokensSnap.docs.forEach(doc => {
                console.log(`- Token: ${doc.id.substring(0, 20)}... Language: ${doc.data().language}, UpdatedAt: ${doc.data().updatedAt}`);
            });
        }

        console.log("\nChecking last notice push status...");
        const noticesSnap = await db.collection('notices').orderBy('timestamp', 'desc').limit(1).get();
        if (!noticesSnap.empty) {
            const notice = noticesSnap.docs[0].data();
            console.log(`Latest notice: "${notice.title}"`);
            console.log("Push Status:", JSON.stringify(notice.pushStatus, null, 2));
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

checkSongDaeMinPush();
