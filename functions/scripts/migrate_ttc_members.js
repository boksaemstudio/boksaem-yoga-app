const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const fs = require('fs');
const path = require('path');
const csvPath = 'C:\\Users\\boksoon\\.gemini\\antigravity\\scratch\\yoga-app\\src\\assets\\migration.csv';

async function migrateTtcMembers() {
    console.log('Starting TTC Member Migration using CSV...');

    try {
        // 1. Read and Parse CSV
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',');
        
        // Helper to handle CSV line splitting (ignoring commas in quotes if simple, but here used simple split)
        // Since we saw the CSV has quotes, we should be careful. 
        // Simple regex to split by comma ignoring quotes:
        const parseLine = (line) => {
            const matches = [];
            let match;
            const regex = /(?:^|,)(?:"([^"]*)"|([^",]*))/g;
            while ((match = regex.exec(line))) {
                // value is group 1 (quoted) or group 2 (unquoted)
                matches.push(match[1] || match[2] || '');
            }
            // Remove the last empty match from the end of line check
            if (matches.length > 0 && matches[matches.length - 1] === undefined) matches.pop();
            return matches;
        };

        const ttcMembers = [];
        
        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Simple split might fail with commas in value, but let's try the regex or simple split considering the file format.
            // The view_file output showed values quoted like "마포","Jenny 제니"...
            // The regex above should handle it.
            const cols = parseLine(line);
            
            // Columns based on header scan:
            // 0: 회원번호, 1: 이름, ..., 7: 휴대폰, ..., 18: 구매 내역
            
            const name = cols[1];
            const phone = cols[7]; // format 010-xxxx-xxxx
            const purchaseHistory = cols[18];

            if (purchaseHistory && purchaseHistory.toLowerCase().includes('ttc')) {
                ttcMembers.push({ name, phone, reason: `Purchase: ${purchaseHistory}` });
            } else if (name && name.toLowerCase().includes('ttc')) {
                ttcMembers.push({ name, phone, reason: `Name: ${name}` });
            }
        }

        console.log(`Found ${ttcMembers.length} TTC members in CSV.`);

        let updatedCount = 0;
        const batchSize = 100;
        let batch = db.batch();
        let batchOperationCount = 0;

        for (const ttcMem of ttcMembers) {
            // Find member in DB
            const membersSnap = await db.collection('members')
                .where('phone', '==', ttcMem.phone)
                .get();

            if (membersSnap.empty) {
                console.log(`[NOT FOUND] ${ttcMem.name} (${ttcMem.phone}) - Not in DB.`);
                continue;
            }

            const doc = membersSnap.docs[0];
            const memberData = doc.data();

            if (memberData.credits !== 99999) {
                batch.update(doc.ref, { 
                    credits: 99999,
                    // membershipType: 'ttc', 
                    updatedAt: new Date().toISOString(),
                    migrationNote: `TTC Migration from CSV: ${ttcMem.reason}`
                });
                
                console.log(`[UPDATE] ${memberData.name} (${ttcMem.phone}) -> Unlimited. Reason: ${ttcMem.reason}`);
                
                batchOperationCount++;
                updatedCount++;
            } else {
                console.log(`[SKIP] ${memberData.name} (${ttcMem.phone}) -> Already 99999.`);
            }

             if (batchOperationCount >= batchSize) {
                await batch.commit();
                batch = db.batch();
                batchOperationCount = 0;
            }
        }

        if (batchOperationCount > 0) {
            await batch.commit();
        }

        console.log(`Migration Complete. Updated ${updatedCount} members.`);

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrateTtcMembers();
