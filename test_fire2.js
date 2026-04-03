import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, writeFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./boksaem-yoga-firebase-adminsdk.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

async function check() {
    const doc = await db.collection('studios').doc('boksaem-yoga').get();
    const data = doc.data();
    console.log('--- IDENTITY ---');
    console.log(JSON.stringify(data.IDENTITY, null, 2));
    console.log('--- ASSETS ---');
    console.log(JSON.stringify(data.ASSETS?.LOGO, null, 2));
    console.log('--- KIOSK ---');
    console.log(JSON.stringify(data.KIOSK?.LOGOS, null, 2));

    const out = {
        name: data.IDENTITY?.NAME,
        logo_url: data.IDENTITY?.LOGO_URL,
        assets: data.ASSETS?.LOGO,
        kiosk: data.KIOSK?.LOGOS
    };
    writeFileSync('check_firestore_output.json', JSON.stringify(out, null, 2));
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
