const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require('./functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteDoc(id) {
    try {
        await db.collection('sales').doc(id).delete();
        console.log(`Successfully deleted document: ${id}`);
    } catch (error) {
        console.error('Error deleting document:', error);
    }
}

// User specified incorrect record ID: bLRdBnlOU3GS1qEprPWQ (924,000 won)
deleteDoc('bLRdBnlOU3GS1qEprPWQ');
