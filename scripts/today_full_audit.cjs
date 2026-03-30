const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    // 1단계: 모든 회원 이름을 미리 캐싱
    const membersSnap = await db.collection('studios').doc('boksaem-yoga').collection('members').get();
    const nameMap = {};
    membersSnap.forEach(doc => { nameMap[doc.id] = doc.data().name || 'UNKNOWN'; });
    console.log('회원 캐시 완료:', Object.keys(nameMap).length, '명');

    // 2단계: 오늘 전체 출석 기록 (삭제된 것 포함)
    const todayStart = '2026-03-30T00:00:00Z';
    const todayEnd = '2026-03-30T23:59:59Z';
    
    const allAtt = await db.collection('studios').doc('boksaem-yoga').collection('attendance')
        .where('timestamp', '>=', todayStart)
        .where('timestamp', '<=', todayEnd)
        .get();
    
    let out = '=== 오늘(3/30) 전체 출석기록 완전 감사(삭제 포함) ===\n';
    out += '총 문서 수: ' + allAtt.size + '\n\n';
    
    let deleted = [];
    let active = [];
    
    allAtt.forEach(doc => {
        const d = doc.data();
        const entry = {
            id: doc.id,
            name: nameMap[d.memberId] || d.memberName || 'UNKNOWN(' + d.memberId + ')',
            time: d.timestamp,
            className: d.className || '',
            status: d.status || 'valid',
            deletedAt: d.deletedAt || null,
            deletedBy: d._deletedBy || null,
            type: d.type || '',
            method: d.method || ''
        };
        
        if (d.deletedAt) {
            deleted.push(entry);
        } else {
            active.push(entry);
        }
    });
    
    // 시간순 정렬
    active.sort((a,b) => a.time.localeCompare(b.time));
    deleted.sort((a,b) => a.time.localeCompare(b.time));
    
    out += '========================================\n';
    out += '--- 현재 살아있는(표시되는) 출석 기록 ---\n';
    out += '========================================\n';
    active.forEach((e, i) => {
        out += `${i+1}. ${e.time} | ${e.name} | ${e.className} | status:${e.status} | type:${e.type} | method:${e.method}\n`;
    });
    
    out += '\n========================================\n';
    out += '--- 삭제된(deletedAt 표시된) 출석 기록 ---\n';
    out += '========================================\n';
    deleted.forEach((e, i) => {
        out += `${i+1}. ${e.time} | ${e.name} | ${e.className} | status:${e.status} | deletedAt:${e.deletedAt} | deletedBy:${e.deletedBy}\n`;
    });
    
    out += '\n========================================\n';
    out += '요약:\n';
    out += '살아있는 기록: ' + active.length + '건\n';
    out += '삭제된 기록: ' + deleted.length + '건\n';
    out += '총 문서: ' + allAtt.size + '건\n';
    
    // 6시 이후 기록 별도 분석
    const after6pm = active.filter(e => {
        const hour = parseInt(e.time.split('T')[1].split(':')[0]);
        return hour >= 9; // UTC 9시 = KST 18시
    });
    out += '\n--- KST 18시(오후6시) 이후 살아있는 기록 ---\n';
    if (after6pm.length === 0) {
        out += '없음!\n';
    } else {
        after6pm.forEach(e => {
            out += `${e.time} | ${e.name} | ${e.className}\n`;
        });
    }
    
    const deletedAfter6 = deleted.filter(e => {
        const hour = parseInt(e.time.split('T')[1].split(':')[0]);
        return hour >= 9; // UTC 9시 = KST 18시
    });
    out += '\n--- KST 18시(오후6시) 이후 삭제된 기록 ---\n';
    if (deletedAfter6.length === 0) {
        out += '없음!\n';
    } else {
        deletedAfter6.forEach(e => {
            out += `${e.time} | ${e.name} | ${e.className} | deletedBy:${e.deletedBy}\n`;
        });
    }
    
    fs.writeFileSync(path.join(__dirname, 'today_full_audit.txt'), out);
    console.log('감사 완료. scripts/today_full_audit.txt 에 기록됨');
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
