const admin = require('firebase-admin');
const path = require('path');
const sa = require('../functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(sa)
    });
}

const db = admin.firestore();
const tenantId = 'boksaem-yoga';
const branchId = 'mapo';

async function run() {
    console.log(`[1] Starting Schedule Legend Update...`);
    const configRef = db.collection('studios').doc(tenantId).collection('config').doc('settings');
    
    try {
        const configDoc = await configRef.get();
        if (configDoc.exists) {
            let data = configDoc.data();
            let legend = data.SCHEDULE_LEGEND || [
                { label: '일반', color: '#FFFFFF', border: '#DDDDDD', branches: ['main', 'mapo', 'gwangheungchang', 'mullae'] },
                { label: '심화/플라잉', color: 'rgba(255, 190, 118, 0.9)', border: 'rgba(255, 190, 118, 1)', branches: ['main', 'mapo', 'gwangheungchang', 'mullae'] },
                { label: '임산부', color: 'rgba(247, 143, 179, 0.9)', border: 'rgba(247, 143, 179, 1)', branches: ['mapo'] },
                { label: '토요하타/별도등록', color: 'rgba(168, 168, 168, 0.9)', border: 'rgba(168, 168, 168, 1)', branches: ['main', 'mapo'] }
            ];

            // Add or update Kids legend
            let kidsIndex = legend.findIndex(l => l.label.includes('키즈'));
            if (kidsIndex >= 0) {
                legend[kidsIndex].color = '#EAB308'; // Tailwind Yellow-500
                legend[kidsIndex].border = '#CA8A04'; // Tailwind Yellow-600
                console.log('Updated existing Kids legend to yellow.');
            } else {
                legend.splice(2, 0, {
                    label: '키즈',
                    color: '#EAB308',
                    border: '#CA8A04',
                    branches: ['mapo', 'gwangheungchang', 'mullae']
                });
                console.log('Added new Kids legend in yellow.');
            }

            await configRef.update({ SCHEDULE_LEGEND: legend });
            console.log('✅ Legend update complete.');
        } else {
            console.warn('⚠️ Config settings not found! Skipping legend update.');
        }
    } catch (e) {
        console.error('Error updating legend:', e);
    }

    console.log(`\n[2] Sorting April Friday Schedules for branch: ${branchId}...`);
    const fridays = ['2026-04-03', '2026-04-10', '2026-04-17', '2026-04-24'];
    
    for (const date of fridays) {
        const docId = `${branchId}_${date}`;
        const scheduleRef = db.collection('studios').doc(tenantId).collection('daily_classes').doc(docId);
        
        try {
            const snap = await scheduleRef.get();
            if (snap.exists) {
                const data = snap.data();
                if (data.classes && data.classes.length > 0) {
                    const sortedClasses = [...data.classes].sort((a, b) => {
                        const tA = a.time || '00:00';
                        const tB = b.time || '00:00';
                        return tA.localeCompare(tB);
                    });
                    
                    await scheduleRef.update({ classes: sortedClasses });
                    console.log(`✅ Sorted ${docId}`);
                }
            } else {
                console.log(`ℹ️ No schedule found for ${docId}`);
            }
        } catch (e) {
            console.error(`Error sorting ${docId}:`, e);
        }
    }

    console.log('🎉 All tasks finished successfully.');
}

run().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
