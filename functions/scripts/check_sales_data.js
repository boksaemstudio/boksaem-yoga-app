/**
 * 매출 데이터 소실 원인 조사 스크립트
 * 황화정 회원의 members 데이터와 sales 데이터를 모두 확인
 */
const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
    if (!admin.apps.length) admin.initializeApp();
}

const db = admin.firestore();

async function investigateSalesData() {
    console.log("=== 매출 데이터 소실 원인 조사 ===\n");

    // 1. 황화정 회원 데이터 조회
    console.log("--- 1. 황화정 회원 데이터 (members 컬렉션) ---");
    const membersSnap = await db.collection('members').where('name', '==', '황화정').get();
    
    if (membersSnap.empty) {
        console.log("❌ '황화정' 회원 데이터 없음!");
    } else {
        membersSnap.forEach(doc => {
            const data = doc.data();
            console.log(`\n📋 ID: ${doc.id}`);
            console.log(`   이름: ${data.name}`);
            console.log(`   regDate: ${data.regDate}`);
            console.log(`   startDate: ${data.startDate}`);
            console.log(`   endDate: ${data.endDate}`);
            console.log(`   credits: ${data.credits}`);
            console.log(`   amount: ${data.amount}`);
            console.log(`   homeBranch: ${data.homeBranch}`);
            console.log(`   membershipType: ${data.membershipType}`);
            console.log(`   subject: ${data.subject}`);
            console.log(`   duration: ${data.duration}`);
            console.log(`   updatedAt: ${data.updatedAt}`);
            console.log(`   전체 데이터:`, JSON.stringify(data, null, 2));
        });
    }

    // 2. 황화정 회원의 sales 기록 조회
    console.log("\n\n--- 2. 황화정 매출 기록 (sales 컬렉션) ---");
    if (!membersSnap.empty) {
        for (const memberDoc of membersSnap.docs) {
            const memberId = memberDoc.id;
            const salesSnap = await db.collection('sales').where('memberId', '==', memberId).get();
            
            if (salesSnap.empty) {
                console.log(`❌ 회원 ID ${memberId}에 대한 sales 기록 없음!`);
            } else {
                console.log(`✅ 총 ${salesSnap.size}건의 매출 기록 발견:`);
                salesSnap.forEach(doc => {
                    const data = doc.data();
                    console.log(`\n   📊 Sales ID: ${doc.id}`);
                    console.log(`   date: ${data.date}`);
                    console.log(`   amount: ${data.amount}`);
                    console.log(`   type: ${data.type}`);
                    console.log(`   item: ${data.item}`);
                    console.log(`   memberName: ${data.memberName}`);
                    console.log(`   timestamp: ${data.timestamp}`);
                });
            }
        }
    }

    // 3. 이름으로도 sales 검색
    console.log("\n\n--- 3. 이름으로 sales 검색 ---");
    const salesByNameSnap = await db.collection('sales').where('memberName', '==', '황화정').get();
    if (salesByNameSnap.empty) {
        console.log("❌ memberName='황화정'인 sales 기록 없음.");
    } else {
        console.log(`✅ 이름으로 ${salesByNameSnap.size}건 발견:`);
        salesByNameSnap.forEach(doc => {
            const data = doc.data();
            console.log(`   Sales ID: ${doc.id}, date: ${data.date}, amount: ${data.amount}, memberId: ${data.memberId}`);
        });
    }

    // 4. 2026년 2월 전체 sales 기록 확인
    console.log("\n\n--- 4. 2026년 2월 전체 sales 기록 ---");
    const allSalesSnap = await db.collection('sales').orderBy('timestamp', 'desc').get();
    const febSales = [];
    allSalesSnap.forEach(doc => {
        const data = doc.data();
        if (data.date && data.date.startsWith('2026-02')) {
            febSales.push({ id: doc.id, ...data });
        }
    });
    
    console.log(`📊 2026년 2월 매출 기록: 총 ${febSales.length}건`);
    febSales.forEach(s => {
        console.log(`   ${s.date} | ${s.memberName || 'N/A'} | ${s.amount?.toLocaleString()}원 | ${s.type} | ${s.item}`);
    });

    // 5. 전체 members에서 amount > 0인 레거시 매출 데이터 확인
    console.log("\n\n--- 5. members 컬렉션에서 amount > 0인 회원 (레거시 매출) ---");
    const allMembersSnap = await db.collection('members').get();
    let legacyCount = 0;
    allMembersSnap.forEach(doc => {
        const data = doc.data();
        const amt = Number(data.amount) || 0;
        if (amt > 0 && data.regDate) {
            legacyCount++;
            if (data.regDate.startsWith('2026-02')) {
                console.log(`   ${data.name} | regDate: ${data.regDate} | amount: ${amt} | startDate: ${data.startDate} | endDate: ${data.endDate}`);
            }
        }
    });
    console.log(`\n총 레거시 매출 대상 회원: ${legacyCount}명`);

    console.log("\n=== 조사 완료 ===");
}

investigateSalesData().catch(console.error);
