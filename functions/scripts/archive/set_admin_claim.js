/**
 * Firebase Admin Custom Claims Setup Script
 * 
 * 이 스크립트는 관리자 계정에 admin: true custom claim을 설정합니다.
 * firestore.rules의 isAdmin() 함수가 이 claim을 확인합니다.
 * 
 * 사용법:
 *   node scripts/set_admin_claim.js <USER_UID>
 * 
 * 예시:
 *   node scripts/set_admin_claim.js abc123xyz
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../service-account-key.json');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

async function setAdminClaim(uid) {
    if (!uid) {
        console.error('❌ Usage: node set_admin_claim.js <USER_UID>');
        console.log('\n현재 사용자 목록을 확인하려면:');
        console.log('  Firebase Console > Authentication > Users');
        process.exit(1);
    }

    try {
        // Set custom claims
        await admin.auth().setCustomUserClaims(uid, { 
            admin: true,
            instructor: true  // Admin also has instructor privileges
        });

        console.log(`✅ Admin claim set for UID: ${uid}`);
        
        // Verify
        const user = await admin.auth().getUser(uid);
        console.log(`📧 Email: ${user.email}`);
        console.log(`🔑 Custom Claims: ${JSON.stringify(user.customClaims)}`);
        console.log('\n⚠️  사용자가 다시 로그인해야 claim이 적용됩니다.');
        
    } catch (error) {
        console.error('❌ Error setting admin claim:', error.message);
        process.exit(1);
    }
}

// Run
const uid = process.argv[2];
setAdminClaim(uid).then(() => process.exit(0));
