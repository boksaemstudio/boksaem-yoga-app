/**
 * Test: Verify and enable self-hold config in Firestore using Application Default Credentials
 */
const admin = require('firebase-admin');

// Use Application Default Credentials (gcloud auth)
admin.initializeApp({
    projectId: 'boksaem-yoga'
});

const db = admin.firestore();

async function main() {
    console.log('=== 1. 현재 스튜디오 설정 확인 ===');
    
    const configDoc = await db.collection('studios').doc('config').get();
    if (!configDoc.exists) {
        console.log('studios/config 문서가 없습니다!');
        return;
    }
    
    const config = configDoc.data();
    console.log('ALLOW_SELF_HOLD:', config.POLICIES?.ALLOW_SELF_HOLD);
    console.log('HOLD_RULES:', JSON.stringify(config.POLICIES?.HOLD_RULES, null, 2));
    
    const needsUpdate = !config.POLICIES?.ALLOW_SELF_HOLD || !config.POLICIES?.HOLD_RULES || config.POLICIES.HOLD_RULES.length === 0;
    
    if (needsUpdate) {
        console.log('\n=== 2. 설정 업데이트 ===');
        const holdRules = config.POLICIES?.HOLD_RULES?.length > 0 
            ? config.POLICIES.HOLD_RULES 
            : [
                { durationMonths: 3, maxCount: 1, maxWeeks: 2 },
                { durationMonths: 6, maxCount: 2, maxWeeks: 4 }
            ];
        
        await db.collection('studios').doc('config').set({
            POLICIES: {
                ...(config.POLICIES || {}),
                ALLOW_SELF_HOLD: true,
                HOLD_RULES: holdRules
            }
        }, { merge: true });
        console.log('ALLOW_SELF_HOLD = true 저장 완료');
        console.log('HOLD_RULES:', JSON.stringify(holdRules, null, 2));
    } else {
        console.log('\nALLOW_SELF_HOLD 이미 true, HOLD_RULES 존재');
    }
    
    // 변경 후 확인
    console.log('\n=== 3. 최종 설정 확인 ===');
    const updatedDoc = await db.collection('studios').doc('config').get();
    const updated = updatedDoc.data();
    console.log('ALLOW_SELF_HOLD:', updated.POLICIES?.ALLOW_SELF_HOLD);
    console.log('HOLD_RULES:', JSON.stringify(updated.POLICIES?.HOLD_RULES, null, 2));
    
    // 회원 데이터 확인
    console.log('\n=== 4. 회원 홀딩 자격 확인 ===');
    const membersSnap = await db.collection('members').limit(5).get();
    const rules = updated.POLICIES?.HOLD_RULES || [];
    
    membersSnap.forEach(doc => {
        const m = doc.data();
        let dur = m.duration || 0;
        if (!dur && m.startDate && m.endDate && m.startDate !== 'TBD' && m.endDate !== 'TBD') {
            const s = new Date(m.startDate);
            const e = new Date(m.endDate);
            dur = Math.round((e - s) / (1000 * 60 * 60 * 24 * 30));
        }
        
        let matched = rules.find(r => r.durationMonths === dur);
        if (!matched && dur > 0 && rules.length > 0) {
            const eligible = rules.filter(r => r.durationMonths <= dur).sort((a, b) => b.durationMonths - a.durationMonths);
            matched = eligible[0] || null;
        }
        
        const usedCount = (m.holdHistory || []).filter(h => !h.cancelledAt).length;
        const canHold = matched && m.holdStatus !== 'holding' && usedCount < (matched?.maxCount || 1);
        
        console.log(`${m.name} | dur:${dur}mo | start:${m.startDate||'-'} | end:${m.endDate||'-'} | holdStatus:${m.holdStatus||'-'} | matchedRule:${matched?matched.durationMonths+'mo':'none'} | canHold:${canHold?'YES':'NO'}`);
    });
    
    console.log('\n=== 테스트 완료 ===');
    process.exit(0);
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
