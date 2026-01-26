import { db } from './src/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function checkMember(name, last4) {
    console.log(`Checking member: ${name} (${last4})`);
    const q = query(collection(db, 'members'), where('name', '==', name));
    const snapshot = await getDocs(q);

    const matches = snapshot.docs.filter(doc => {
        const phone = doc.data().phone || '';
        return phone.endsWith(last4);
    });

    console.log(`Found ${matches.length} matches:`);
    matches.forEach(doc => {
        console.log(`ID: ${doc.id}, Data:`, JSON.stringify(doc.data(), null, 2));
    });
}

// 이 스크립트는 실제 환경에서 실행하기 위해 node 환경이 필요하거나,
// 프로젝트의 테스트 환경을 이용해야 합니다.
// 여기서는 로직만 확인합니다.
