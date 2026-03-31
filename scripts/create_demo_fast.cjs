const admin = require('firebase-admin');

const serviceAccount = require('../functions/service-account-key.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function main() {
    process.stdout.write('🔥 쾌속 데모 데이터 구축 시작...\n');
    const sid = 'demo-yoga';

    // 1. 레지스트리 추가
    await db.collection('platform').doc('registry').collection('studios').doc(sid).set({
        id: sid,
        name: 'PassFlow 데모 시연 센터',
        nameEnglish: 'passflow-demo',
        ownerEmail: 'demo@passflow.app',
        status: 'active',
        plan: 'pro',
        createdAt: new Date().toISOString()
    });
    process.stdout.write('✅ 레지스트리 (슈퍼어드민 목록) 등록 완료!\n');

    // 2. 공통 컨텍스트 생성
    await db.collection('studios').doc(sid).set({
        IDENTITY: {
            NAME: 'PassFlow 데모 시연 센터',
            LOGO_URL: 'https://ui-avatars.com/api/?name=Demo&background=10b981&color=fff&size=512'
        },
        BRANCHES: [
            { id: '1', name: '역삼본점', color: '#10b981' }
        ]
    });

    // 3. 임의 회원 생성 (10명)
    const membersData = [
        { name: '김태리', phone: '010-1111-2222', plan: 'Yoga 3Months', expireDate: '2026-12-31' },
        { name: '손석구', phone: '010-3333-4444', plan: 'Pilates 10Class', expireDate: '2026-10-31' },
        { name: '아이유', phone: '010-5555-6666', plan: 'VIP Unlimited', expireDate: '2027-01-01' },
        { name: '박보검', phone: '010-7777-8888', plan: 'Yoga 1Month', expireDate: '2026-05-31' }
    ];

    for (let i = 0; i < membersData.length; i++) {
        const m = membersData[i];
        await db.collection('studios').doc(sid).collection('members').add({
            memberId: 'DEMO-' + (1000 + i),
            name: m.name,
            phone: m.phone.replace(/-/g, ''),
            formattedPhone: m.phone,
            membershipPlan: m.plan,
            regDate: '2026-01-01',
            expireDate: m.expireDate,
            totalCredits: 30,
            usedCredits: 5,
            branch: '1',
            status: 'active'
        });
    }

    process.stdout.write('✅ 가상 회원목록 주입 완료!\n');
    process.stdout.write('🎉 데모 스튜디오가 생성되었습니다! 데모 페이지 확인 가능.\n');
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
