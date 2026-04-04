const admin = require("firebase-admin");
try { admin.initializeApp(); } catch(e){}
const db = admin.firestore();

async function run() {
    const snap = await db.collection("studios/boksaem-yoga/members").get();
    let found = false;
    snap.docs.forEach(d => {
        const data = d.data();
        if (data.name === '김민지' || data.name === '황지연' || data.phone?.endsWith('1234') || data.phone?.endsWith('2594')) {
            console.log(data.name, data.phone);
            found = true;
        }
    });
    if (!found) console.log("No members found with those names or phone endings.");
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
