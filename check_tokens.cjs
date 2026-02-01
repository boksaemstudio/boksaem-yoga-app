const admin = require("firebase-admin");

if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: "boksaem-yoga"
    });
}

const db = admin.firestore();

async function checkMemberTokens(memberName) {
    try {
        console.log(`--- Checking tokens for ${memberName} ---`);
        const membersSnap = await db.collection("members").where("name", "==", memberName).get();

        if (membersSnap.empty) {
            console.log("Member not found.");
            return;
        }

        const member = membersSnap.docs[0];
        const memberId = member.id;
        console.log(`Member ID: ${memberId}`);
        console.log(`member.pushEnabled: ${member.data().pushEnabled}`);

        const collections = ["fcm_tokens", "fcmTokens", "push_tokens"];
        for (const col of collections) {
            console.log(`Searching in collection [${col}]...`);
            const tokensSnap = await db.collection(col).where("memberId", "==", memberId).get();
            console.log(`Result: ${tokensSnap.size} tokens found.`);
            tokensSnap.forEach(doc => {
                const data = doc.data();
                console.log(`  - DocID: ${doc.id}`);
                console.log(`    updateAt: ${data.updatedAt}`);
            });
        }
    } catch (err) {
        console.error("ERROR in script:", err);
    }
}

checkMemberTokens("송대민").then(() => console.log("--- End of check ---")).catch(console.error);
