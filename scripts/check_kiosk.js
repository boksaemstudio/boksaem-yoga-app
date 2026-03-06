import { db } from '../src/firebase.js'; // Assuming this exports db
import { doc, getDoc } from 'firebase/firestore';

async function run() {
    try {
        const snapAll = await getDoc(doc(db, 'settings', 'kiosk'));
        const snapGw = await getDoc(doc(db, 'settings', 'kiosk_gwangheungchang'));
        
        console.log('All Settings:', snapAll.exists() ? { 
            active: snapAll.data().active, 
            imageSize: snapAll.data().imageUrl?.length 
        } : 'null');
        
        console.log('Gwangheungchang Settings:', snapGw.exists() ? { 
            active: snapGw.data().active, 
            imageSize: snapGw.data().imageUrl?.length 
        } : 'null');
        
    } catch(e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
