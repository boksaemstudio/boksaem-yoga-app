
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('./functions/service-account-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function simulateOfflineCheckIn() {
    console.log('=== Simulating Offline Check-in for Expired Member ===');
    
    // 1. Create a dummy expired member or use existing
    // We'll use 'Seo Yeon-hee' ID: 'OoedtcTZwrtyxmhXlOHT'
    const memberId = 'OoedtcTZwrtyxmhXlOHT';
    const branchId = 'mapo'; 
    const now = new Date();
    const today = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    console.log(`Target Member: ${memberId}`);
    console.log(`Date: ${today}`);

    // 2. Add to pending_attendance
    const pendingRef = db.collection('pending_attendance').doc();
    const pendingData = {
        memberId,
        branchId,
        classTitle: '자율수련',
        instructor: '미지정',
        date: today,
        timestamp: now.toISOString(),
        status: 'pending-offline'
    };

    await pendingRef.set(pendingData);
    console.log(`Checking-in offline (Doc: ${pendingRef.id})...`);
    console.log('Use Firestore console or wait for Function triggers to see if it becomes Valid or Denied.');
    
    // Note: We can't easily wait for the trigger result here without listening to 'attendance'
    // but the point is to confirm the logic flaw by code review, which we already did.
    // This script is just to prove the trigger fires.
}

simulateOfflineCheckIn();
