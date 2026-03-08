const admin = require('firebase-admin');
const fs = require('fs');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'boksaem-yoga',
        storageBucket: 'boksaem-yoga.firebasestorage.app'
    });
}

const bucket = admin.storage().bucket();

async function listPhotos() {
    const today = '2026-03-07';
    const prefix = `attendance-photos/${today}/`;
    console.log(`Listing photos in ${prefix}...`);
    
    try {
        const [files] = await bucket.getFiles({ prefix });
        const fileInfo = files.map(f => ({
            name: f.name,
            size: f.metadata.size,
            updated: f.metadata.updated
        }));
        
        console.log(JSON.stringify(fileInfo, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error listing photos:', err);
        process.exit(1);
    }
}

listPhotos();
