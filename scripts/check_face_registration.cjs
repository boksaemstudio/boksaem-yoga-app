const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'boksaem-yoga-firebase-adminsdk.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key not found. Please provide it or run this script in an authenticated environment.');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkFaceRegistrations() {
    try {
        const tenantId = 'boksaem-yoga';
        console.log(`\n🔍 Checking face registrations for tenant: ${tenantId}`);

        // 1. Get total active members
        const membersSnapshot = await db.collection(`studios/${tenantId}/members`)
            .where('status', '==', 'active')
            .get();
        const totalActiveMembers = membersSnapshot.size;

        // 2. Count members with face descriptors
        let registeredCount = 0;
        let membersWithFaces = [];

        membersSnapshot.forEach(doc => {
            const data = doc.data();
            // Check for valid faceDescriptor or faceDescriptors array
            const hasFace = (data.faceDescriptor && Object.keys(data.faceDescriptor).length > 0) || 
                            (Array.isArray(data.faceDescriptors) && data.faceDescriptors.length > 0);
            
            if (hasFace) {
                registeredCount++;
                membersWithFaces.push(data.name || `Member ${doc.id}`);
            }
        });

        // 3. Alternatively, check the dedicated 'face_biometrics' collection if it exists
        const biometricsSnapshot = await db.collection(`studios/${tenantId}/face_biometrics`).get();
        const biometricsCount = biometricsSnapshot.size;

        console.log(`\n================================`);
        console.log(`📊 활성 회원 총원: ${totalActiveMembers}명`);
        console.log(`📸 안면 인식 등록 (members 문서 기준): ${registeredCount}명`);
        console.log(`📸 안면 인식 등록 (face_biometrics 캐시 기준): ${biometricsCount}명`);
        console.log(`================================`);
        
        if (membersWithFaces.length > 0) {
            console.log(`\n[등록된 회원 목록 일부]`);
            console.log(membersWithFaces.slice(0, 10).join(', ') + (membersWithFaces.length > 10 ? ' ...등' : ''));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkFaceRegistrations();
