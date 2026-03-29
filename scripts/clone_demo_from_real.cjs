const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
}
const db = admin.firestore();

const SOURCE = 'boksaem-yoga';
const TARGET = 'demo-yoga';

// Anonymize names (e.g. 홍길동 -> 홍*동)
function anonymizeName(name) {
    if (!name) return '익명';
    if (name.length <= 1) return name;
    if (name.length === 2) return name[0] + '*';
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
}

async function cloneCollection(colName, transform = (doc) => doc) {
    console.log(`Cloning ${colName}...`);
    const targetRef = db.collection(`studios/${TARGET}/${colName}`);
    
    // Clear old data
    const oldDocs = await targetRef.get();
    let batch = db.batch();
    let count = 0;
    for (const doc of oldDocs.docs) {
        batch.delete(doc.ref);
        count++;
        if (count >= 400) { await batch.commit(); batch = db.batch(); count = 0; }
    }
    if (count > 0) await batch.commit();

    // Copy new data
    const sourceDocs = await db.collection(`studios/${SOURCE}/${colName}`).get();
    batch = db.batch();
    count = 0;
    
    for (const doc of sourceDocs.docs) {
        let data = doc.data();
        data = transform(data, doc.id);
        if (data) {
            batch.set(targetRef.doc(doc.id), data);
            count++;
            if (count >= 400) { await batch.commit(); batch = db.batch(); count = 0; }
        }
    }
    if (count > 0) await batch.commit();
    console.log(`✅ Cloned ${sourceDocs.size} docs for ${colName}`);
}

async function run() {
    try {
        console.log('🚀 Starting Demo Data Cloning from Real Studio...');
        
        // 1. Config & Settings
        const sourceConfig = await db.doc(`studios/${SOURCE}`).get();
        const confData = sourceConfig.data() || {};
        confData.name = '패스플로우 데모 요가';
        confData.ownerEmail = 'demo@passflow.app';
        if (confData.settings && confData.settings.IDENTITY) {
            confData.settings.IDENTITY.NAME = '패스플로우 데모 & 필라테스';
            confData.settings.IDENTITY.SLOGAN = '현장 데이터를 바탕으로 동작하는 실시간 데모 환경입니다.';
        }
        await db.doc(`studios/${TARGET}`).set(confData, { merge: true });
        console.log('✅ Cloned Studio Config');

        // Map keeping track of actual names vs anonymized names
        const nameMap = {};

        // 2. Members
        await cloneCollection('members', (data, id) => {
            if (!data.name) return null;
            nameMap[id] = anonymizeName(data.name);
            data.name = nameMap[id];
            if (data.phone) data.phone = data.phone.replace(/(\d{3})-\d{4}-(\d{4})/, '$1-****-$2');
            data.hasFaceDescriptor = false; // No faces in demo
            delete data.faceDescriptor;
            delete data.faceDescriptors;
            return data;
        });

        // 3. Attendance
        const limitDate = new Date();
        limitDate.setMonth(limitDate.getMonth() - 6); // Last 6 months only to save time
        const limitStr = limitDate.toISOString().split('T')[0];

        await cloneCollection('attendance', (data, id) => {
            if (data.date && data.date < limitStr) return null; // skip old
            if (data.memberName) data.memberName = nameMap[data.memberId] || anonymizeName(data.memberName);
            if (data.photoUrl) delete data.photoUrl; // Remove real photos
            return data;
        });

        // 4. Sales
        await cloneCollection('sales', (data) => {
            if (data.date && data.date < limitStr) return null;
            if (data.memberName) data.memberName = nameMap[data.memberId] || anonymizeName(data.memberName);
            return data;
        });

        // 5. Daily Classes
        await cloneCollection('daily_classes', (data) => {
            if (data.date && data.date < limitStr) return null;
            return data;
        });

        // 6. Pricing & Classes (Schedule) & Notices
        await cloneCollection('pricing');
        await cloneCollection('classes');
        await cloneCollection('notices');
        await cloneCollection('settings', (data) => data); // instructors, etc

        // 7. Push tracking
        await cloneCollection('push_messages');

        console.log('🎉 Demo Cloning Complete! Real data is now driving the demo app safely.');
        process.exit(0);
    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

run();
