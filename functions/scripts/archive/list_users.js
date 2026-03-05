/**
 * List Firebase Auth Users
 * 이 스크립트는 Firebase Auth에 등록된 모든 사용자를 나열합니다.
 * 관리자 UID를 찾아 set_admin_claim.js에 전달하세요.
 * 
 * 사용법: node scripts/list_users.js
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

async function listUsers() {
    console.log('📋 Firebase Auth Users:\n');
    
    try {
        const listResult = await admin.auth().listUsers(100);
        
        if (listResult.users.length === 0) {
            console.log('등록된 사용자가 없습니다.');
            return;
        }
        
        listResult.users.forEach((user, index) => {
            const isAnon = !user.email && user.providerData.length === 0;
            const claims = user.customClaims ? JSON.stringify(user.customClaims) : 'none';
            
            if (!isAnon) {
                console.log(`${index + 1}. UID: ${user.uid}`);
                console.log(`   Email: ${user.email || 'N/A'}`);
                console.log(`   Claims: ${claims}`);
                console.log(`   Created: ${new Date(user.metadata.creationTime).toLocaleDateString()}`);
                console.log('');
            }
        });
        
        const anonCount = listResult.users.filter(u => !u.email && u.providerData.length === 0).length;
        console.log(`\n(익명 사용자 ${anonCount}명 생략)`);
        
    } catch (error) {
        console.error('Error listing users:', error.message);
    }
}

listUsers().then(() => process.exit(0));
