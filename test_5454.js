import fetch from 'node-fetch'; // We will use native fetch in latest node

async function testMember(phoneLast4) {
    console.log(`Testing member lookup for: ${phoneLast4}`);
    const url = 'https://asia-northeast3-boksaem-yoga.cloudfunctions.net/getSecureMemberV2Call';
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: { phoneLast4 } })
        });
        
        const json = await res.json();
        console.log('Response status:', res.status);
        console.log('Response body:', JSON.stringify(json, null, 2));
    } catch (e) {
        console.error('Test failed:', e);
    }
}

testMember('5454');
