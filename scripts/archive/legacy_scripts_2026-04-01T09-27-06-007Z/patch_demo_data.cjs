/**
 * 🔧 데모앱 데이터 패치 스크립트
 * 
 * 문제:
 * 1. 출석 데이터가 'logs'에 저장됨 → 앱은 'attendance' 컬렉션 사용
 * 2. 매출 데이터에 'timestamp' 필드 없음 → 앱은 orderBy('timestamp') 사용
 * 3. 출석 데이터에 'timestamp' 필드 없음 → 정렬/필터 실패
 * 4. 출석 데이터에 'branchId' 필드 없음 → 'branch'로 저장됨
 * 
 * 해결:
 * 1. 'logs'의 데이터를 'attendance'로 복사
 * 2. 매출: 'date'에서 'timestamp' ISO 문자열 생성
 * 3. 출석: 'date'+'time'에서 'timestamp' ISO 생성, 'branch' → 'branchId' 
 */
const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: 'boksaem-yoga' });
const db = admin.firestore();
const STUDIO_ID = 'demo-yoga';
const studioRef = db.doc(`studios/${STUDIO_ID}`);

(async () => {
    console.log('🔧 데모앱 데이터 패치 시작...\n');
    
    // ═══════════════════════════════════════════════
    // STEP 1: logs → attendance 컬렉션 복사 (출석 데이터)
    // ═══════════════════════════════════════════════
    console.log('1️⃣ logs → attendance 컬렉션 복사...');
    const logsSnap = await studioRef.collection('logs').get();
    console.log(`   logs 컬렉션 문서 수: ${logsSnap.size}건`);
    
    let copiedCount = 0;
    for (let i = 0; i < logsSnap.docs.length; i += 400) {
        const batch = db.batch();
        const chunk = logsSnap.docs.slice(i, i + 400);
        
        chunk.forEach(doc => {
            const data = doc.data();
            
            // timestamp 필드 생성 (date + time → ISO string)
            let timestamp;
            if (data.date && data.time) {
                const [h, m] = data.time.split(':');
                const dt = new Date(data.date + 'T' + (h || '10').padStart(2, '0') + ':' + (m || '00').padStart(2, '0') + ':00+09:00');
                timestamp = dt.toISOString();
            } else if (data.date) {
                timestamp = new Date(data.date + 'T10:00:00+09:00').toISOString();
            } else {
                timestamp = new Date().toISOString();
            }
            
            const attendanceDoc = {
                ...data,
                timestamp,
                branchId: data.branch || data.branchId || 'gangnam',
                className: data.classType || data.className || '일반',
                type: 'checkin',
                status: 'valid',
            };
            
            // branch 필드도 유지 (호환성)
            delete attendanceDoc.checkInMethod;  // 불필요 필드 정리
            
            batch.set(studioRef.collection('attendance').doc(), attendanceDoc);
            copiedCount++;
        });
        
        await batch.commit();
    }
    console.log(`   ✅ ${copiedCount}건 attendance 컬렉션으로 복사 완료\n`);
    
    // ═══════════════════════════════════════════════
    // STEP 2: sales 문서에 timestamp 필드 추가
    // ═══════════════════════════════════════════════
    console.log('2️⃣ sales 문서에 timestamp 필드 추가...');
    const salesSnap = await studioRef.collection('sales').get();
    console.log(`   sales 컬렉션 문서 수: ${salesSnap.size}건`);
    
    let patchedCount = 0;
    for (let i = 0; i < salesSnap.docs.length; i += 400) {
        const batch = db.batch();
        const chunk = salesSnap.docs.slice(i, i + 400);
        
        chunk.forEach(doc => {
            const data = doc.data();
            // timestamp가 없는 문서만 패치
            if (!data.timestamp) {
                let timestamp;
                if (data.date) {
                    // 매출 시간은 업무 시간 중 랜덤
                    const hours = [9, 10, 11, 14, 15, 16, 17, 18];
                    const h = hours[Math.floor(Math.random() * hours.length)];
                    const m = Math.floor(Math.random() * 60);
                    timestamp = new Date(data.date + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00+09:00').toISOString();
                } else if (data.createdAt && data.createdAt.toDate) {
                    timestamp = data.createdAt.toDate().toISOString();
                } else {
                    timestamp = new Date().toISOString();
                }
                
                batch.update(doc.ref, { timestamp });
                patchedCount++;
            }
        });
        
        await batch.commit();
    }
    console.log(`   ✅ ${patchedCount}건 매출 문서 timestamp 패치 완료\n`);
    
    // ═══════════════════════════════════════════════
    // STEP 3: 이미 attendance에 있던 기존 문서들도 timestamp 패치
    // ═══════════════════════════════════════════════
    console.log('3️⃣ 기존 attendance 문서 timestamp 확인...');
    const attSnap = await studioRef.collection('attendance').get();
    let attPatchCount = 0;
    
    for (let i = 0; i < attSnap.docs.length; i += 400) {
        const batch = db.batch();
        const chunk = attSnap.docs.slice(i, i + 400);
        let batchHasUpdates = false;
        
        chunk.forEach(doc => {
            const data = doc.data();
            const updates = {};
            
            if (!data.timestamp && data.date) {
                const time = data.classTime || data.time || '10:00';
                const [h, m] = time.split(':');
                updates.timestamp = new Date(data.date + 'T' + (h || '10').padStart(2, '0') + ':' + (m || '00').padStart(2, '0') + ':00+09:00').toISOString();
            }
            
            if (!data.branchId && data.branch) {
                updates.branchId = data.branch;
            }
            
            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                attPatchCount++;
                batchHasUpdates = true;
            }
        });
        
        if (batchHasUpdates) await batch.commit();
    }
    console.log(`   ✅ ${attPatchCount}건 attendance 문서 패치 완료\n`);
    
    // ═══════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════
    console.log('═══════════════════════════════════════');
    console.log('🎉 데이터 패치 완료!');
    console.log('═══════════════════════════════════════');
    console.log(`📋 logs → attendance 복사: ${copiedCount}건`);
    console.log(`💰 매출 timestamp 패치: ${patchedCount}건`);
    console.log(`✅ attendance 필수 필드 패치: ${attPatchCount}건`);
    console.log(`🔗 확인: https://passflow-demo.web.app/admin`);
    console.log('═══════════════════════════════════════');
    
    process.exit(0);
})().catch(e => { console.error('❌ Error:', e); process.exit(1); });
