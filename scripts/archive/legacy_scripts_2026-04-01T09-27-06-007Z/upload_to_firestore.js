
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc, setDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
    apiKey: "AIzaSyCTjDayI1tiZO15eynRzKqrDK3TKj3D-yw",
    authDomain: "boksaem-yoga.firebaseapp.com",
    projectId: "boksaem-yoga",
    storageBucket: "boksaem-yoga.firebasestorage.app",
    messagingSenderId: "638854766032",
    appId: "1:638854766032:web:db6b919068aaf5808b2dd5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function uploadMembers() {
    try {
        const rawData = fs.readFileSync(path.resolve('src/data/migrated_members.json'), 'utf-8');
        const members = JSON.parse(rawData);

        console.log(`Uploading ${members.length} members to Firestore...`);

        // Firestore batches have a limit of 500 operations
        let count = 0;
        let batch = writeBatch(db);

        for (const member of members) {
            const memberRef = doc(db, 'members', member.id);
            batch.set(memberRef, member);
            count++;

            if (count % 500 === 0) {
                await batch.commit();
                console.log(`Committed ${count} members...`);
                batch = writeBatch(db);
            }
        }

        if (count % 500 !== 0) {
            await batch.commit();
        }

        console.log(`Successfully uploaded total ${count} members.`);
    } catch (error) {
        console.error("Error uploading members:", error);
    }
}

uploadMembers();
