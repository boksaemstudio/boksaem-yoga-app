import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

async function checkLogs() {
  try {
    const serviceAccountPath = 'C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\serviceAccountKey.json';
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Initialize Firebase Admin
    initializeApp({
      credential: cert(serviceAccount)
    });

    const db = getFirestore();
    
    // Check system_logs
    const logsRef = db.collection('tenants').doc('boksaem-yoga').collection('system_logs');
    const snapshot = await logsRef.orderBy('timestamp', 'desc').limit(10).get();
    
    console.log("=== Recent System Logs ===");
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`[${new Date(data.timestamp).toLocaleString()}] ${data.message}`);
      if (data.details) console.log(JSON.stringify(data.details, null, 2));
      console.log('---');
    });

  } catch (error) {
    console.error("Error fetching logs:", error);
  }
}

checkLogs();
