const admin = require('./functions/node_modules/firebase-admin');
const sa = require('./functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(sa)
    });
}

const db = admin.firestore();

async function updateKioskLogo() {
    const docRef = db.doc('studios/demo-yoga');
    const doc = await docRef.get();
    const data = doc.data() || {};
    
    const kiosk = data.KIOSK || {};
    const logos = kiosk.LOGOS || [];
    // We update the first slot (index 0)
    logos[0] = '/assets/kiosk_logo_transparent.png';
    
    // Default background setting (none) and opacity
    const LOGO_BGS = kiosk.LOGO_BGS || [];
    LOGO_BGS[0] = 'transparent';
    const LOGO_OPACITIES = kiosk.LOGO_OPACITIES || [];
    LOGO_OPACITIES[0] = 1.0;

    await docRef.set({
        KIOSK: {
            ...kiosk,
            LOGOS: logos,
            LOGO_BGS: LOGO_BGS,
            LOGO_OPACITIES: LOGO_OPACITIES
        }
    }, { merge: true });
    
    console.log("Kiosk logo successfully updated in Firestore!");
}

updateKioskLogo()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
