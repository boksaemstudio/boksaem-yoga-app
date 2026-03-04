require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');
const { SolapiMessageService } = require("solapi");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Initialize Solapi Service
const apiKey = process.env.SOLAPI_API_KEY;
const apiSecret = process.env.SOLAPI_API_SECRET;
const senderNumber = process.env.SOLAPI_SENDER_NUMBER || "01022232789";

if (!apiKey || !apiSecret) {
    console.error("Missing Solapi API keys in .env");
    process.exit(1);
}

const messageService = new SolapiMessageService(apiKey, apiSecret);

// Helper for delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function resendFailedSMS() {
    try {
        console.log("Fetching recent failed messages from the last 2 hours...");
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        
        // Query to find messages that were created recently
        const snapshot = await db.collection('messages')
            .where('createdAt', '>=', twoHoursAgo)
            .get();
        
        const failedDocs = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.solapiStatus && data.solapiStatus.sent === false && data.solapiStatus.error && data.solapiStatus.error.includes("TooManyRequests")) {
                failedDocs.push({ id: doc.id, ...data });
            }
        });

        console.log(`Found ${failedDocs.length} messages that failed due to TooManyRequests.`);

        let successCount = 0;
        let failCount = 0;

        for (const [index, msg] of failedDocs.entries()) {
            console.log(`[${index + 1}/${failedDocs.length}] Resending to member ${msg.memberId}...`);
            
            // Get member phone number
            const memberDoc = await db.collection('members').doc(msg.memberId).get();
            if (!memberDoc.exists) {
                console.warn(`Member ${msg.memberId} not found. Skipping.`);
                failCount++;
                continue;
            }

            const memberData = memberDoc.data();
            if (!memberData.phone) {
                console.warn(`Member ${msg.memberId} has no phone. Skipping.`);
                failCount++;
                continue;
            }

            const cleanPhone = memberData.phone.replace(/-/g, '');
            
            const payload = {
                to: cleanPhone,
                from: senderNumber,
                text: msg.content,
                subject: "복샘요가 알림",
            };

            if (msg.templateId) {
                payload.kakaoOptions = {
                    pfId: process.env.KAKAO_PFID,
                    templateId: msg.templateId
                };
            }

            try {
                // Send with Solapi
                const result = await messageService.sendOne(payload);
                console.log(`  -> Sent successfully to ${cleanPhone}`);
                
                // Update Firestore
                await db.collection('messages').doc(msg.id).update({
                    solapiStatus: {
                        sent: true,
                        sentAt: new Date().toISOString(),
                        method: msg.templateId ? 'ALIMTALK' : 'LMS',
                        result: result,
                        recipient: cleanPhone,
                        retried: true
                    }
                });
                successCount++;
            } catch (error) {
                console.error(`  -> Failed to send to ${cleanPhone}:`, error.message);
                
                await db.collection('messages').doc(msg.id).update({
                    "solapiStatus.retryError": error.message,
                    "solapiStatus.retryFailedAt": new Date().toISOString()
                });
                failCount++;
            }

            // Sleep 250ms to prevent rate limiting
            await delay(250);
        }

        console.log("--- Resend Complete ---");
        console.log(`Success: ${successCount}`);
        console.log(`Failed: ${failCount}`);

    } catch (error) {
        console.error("Error during resend process:", error);
    }
}

resendFailedSMS();
