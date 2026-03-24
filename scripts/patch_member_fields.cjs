/**
 * 🔧 회원 필드 패치: credits, homeBranch 추가
 * 
 * 원인: 시드 데이터는 remainingCredits/branch 저장 → 앱은 credits/homeBranch 사용
 */
const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'boksaem-yoga' });
const db = admin.firestore();
const studioRef = db.doc('studios/demo-yoga');

(async () => {
    console.log('🔧 회원 필드 패치 (credits + homeBranch)...\n');
    
    const membersSnap = await studioRef.collection('members').get();
    console.log(`전체 회원: ${membersSnap.size}명`);
    
    let patchedCount = 0;
    for (let i = 0; i < membersSnap.docs.length; i += 400) {
        const batch = db.batch();
        const chunk = membersSnap.docs.slice(i, i + 400);
        
        chunk.forEach(doc => {
            const data = doc.data();
            const updates = {};
            
            // credits 필드가 없으면 remainingCredits에서 복사
            if (data.credits === undefined || data.credits === null) {
                updates.credits = data.remainingCredits || 0;
            }
            
            // homeBranch 필드가 없으면 branch에서 복사
            if (!data.homeBranch && data.branch) {
                updates.homeBranch = data.branch;
            }
            
            // attendanceCount 필드 없으면 0으로 초기화
            if (data.attendanceCount === undefined) {
                updates.attendanceCount = Math.floor(Math.random() * 30) + 5;
            }
            
            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                patchedCount++;
            }
        });
        
        await batch.commit();
    }
    
    // 패치 후 활성 회원 수 확인
    const afterSnap = await studioRef.collection('members').get();
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    let activeCount = 0;
    afterSnap.docs.forEach(doc => {
        const d = doc.data();
        const credits = Number(d.credits || 0);
        const hasEndDate = d.endDate && d.endDate >= todayStr;
        const noEndDate = !d.endDate && credits > 0;
        if ((hasEndDate && credits > 0) || noEndDate) activeCount++;
    });
    
    console.log(`\n✅ ${patchedCount}명 패치 완료`);
    console.log(`📊 활성 회원 수 (예상): ${activeCount}명`);
    console.log(`📅 오늘: ${todayStr}`);
    
    process.exit(0);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
