const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function main() {
    const result = await admin.auth().listUsers(100);
    console.log(`Total users: ${result.users.length}`);
    result.users.forEach(u => {
        const providers = (u.providerData || []).map(p => p.providerId).join(',') || 'custom/anonymous';
        console.log(`UID: ${u.uid} | Email: ${u.email || 'N/A'} | Provider: ${providers} | Claims: ${JSON.stringify(u.customClaims || {})} | Anonymous: ${!u.email && !u.phoneNumber}`);
    });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
