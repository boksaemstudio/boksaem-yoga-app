const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function audit() {
    // 1. FCM Token Analysis
    console.log('========================================');
    console.log('  전체 푸시 알림 시스템 전수조사 보고서');
    console.log('========================================\n');

    const snap = await db.collection('fcm_tokens').get();
    var member = 0, instructor = 0, unknown = 0, noMemberId = 0, withMemberId = 0, stale = 0;
    var now = Date.now();
    var twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

    snap.forEach(function(doc) {
        var x = doc.data();
        var role = x.role || 'unknown';
        if (role === 'member') member++;
        else if (role === 'instructor') instructor++;
        else unknown++;
        if (x.memberId) withMemberId++;
        else noMemberId++;
        if (x.updatedAt) {
            var t = new Date(x.updatedAt).getTime();
            if (t < twoWeeksAgo) stale++;
        }
    });

    console.log('[1] FCM 토큰 현황');
    console.log('  전체 토큰:', snap.size);
    console.log('  - member 역할:', member);
    console.log('  - instructor 역할:', instructor);
    console.log('  - unknown/미지정:', unknown);
    console.log('  - memberId 연결됨:', withMemberId);
    console.log('  - memberId 없음:', noMemberId);
    console.log('  - 2주 이상 미갱신:', stale);

    // 2. Member-linked tokens detail
    console.log('\n[2] 회원별 토큰 상세 (memberId 있음, 최대 10개)');
    var count = 0;
    snap.forEach(function(doc) {
        var x = doc.data();
        if (x.memberId && count < 10) {
            console.log('  -', x.memberId, '| role:', x.role || 'N/A', '| updated:', x.updatedAt || 'N/A', '| platform:', x.platform || 'N/A');
            count++;
        }
    });

    // 3. Tokens without memberId
    console.log('\n[3] memberId 없는 토큰 (최대 10개)');
    count = 0;
    snap.forEach(function(doc) {
        var x = doc.data();
        if (!x.memberId && count < 10) {
            console.log('  - token:', doc.id.substring(0, 12) + '...', '| role:', x.role || 'N/A', '| updated:', x.updatedAt || 'N/A', '| instructorName:', x.instructorName || 'N/A');
            count++;
        }
    });

    // 4. Member token registration check
    console.log('\n[4] 회원 중 pushEnabled=true인 회원 수');
    var membersSnap = await db.collection('members').where('pushEnabled', '==', true).get();
    console.log('  pushEnabled=true 회원:', membersSnap.size, '명');
    membersSnap.forEach(function(doc) {
        var x = doc.data();
        console.log('  -', x.name || 'N/A', '| fcmToken:', (x.fcmToken || 'N/A').substring(0, 12) + '...');
    });

    // 5. Push History Analysis
    console.log('\n[5] 최근 push_history 10건');
    var ph = await db.collection('push_history').orderBy('createdAt', 'desc').limit(10).get();
    if (ph.empty) {
        console.log('  ❌ push_history 기록 없음');
    } else {
        ph.forEach(function(doc) {
            var x = doc.data();
            var date = x.createdAt && x.createdAt.toDate ? x.createdAt.toDate().toISOString() : 'N/A';
            console.log('  - [' + x.type + '] ' + (x.title || '') + ' | 성공:' + x.successCount + ' 실패:' + x.failureCount + ' | ' + date);
        });
    }

    // 6. Recent Messages (push trigger docs)
    console.log('\n[6] 최근 메시지 발송 기록 5건 (pushStatus 확인)');
    var msgs = await db.collection('messages').orderBy('createdAt', 'desc').limit(5).get();
    if (msgs.empty) {
        console.log('  메시지 기록 없음');
    } else {
        msgs.forEach(function(doc) {
            var x = doc.data();
            var ps = x.pushStatus || {};
            console.log('  - to:', x.memberId || 'N/A', '| content:', (x.content || '').substring(0, 30), '| pushSent:', ps.sent, '| success:', ps.successCount, '| fail:', ps.failureCount, '| error:', ps.error || 'none');
        });
    }

    // 7. Recent Notices (push trigger docs)
    console.log('\n[7] 최근 공지사항 발송 기록 5건 (pushStatus 확인)');
    var notices = await db.collection('notices').orderBy('createdAt', 'desc').limit(5).get();
    if (notices.empty) {
        console.log('  공지사항 기록 없음');
    } else {
        notices.forEach(function(doc) {
            var x = doc.data();
            var ps = x.pushStatus || {};
            console.log('  - title:', (x.title || '').substring(0, 30), '| sendPush:', x.sendPush, '| pushSent:', ps.sent, '| success:', ps.successCount, '| fail:', ps.failureCount);
        });
    }

    // 8. Service Worker & firebase-messaging-sw.js check
    console.log('\n[8] 요약 & 진단');
    
    var issues = [];
    
    if (unknown > 0) {
        issues.push('⚠️ role 미지정 토큰 ' + unknown + '개: 공지사항 발송 시 언어/역할 기반 그룹핑에서 누락될 수 있음');
    }
    if (stale > 0) {
        issues.push('⚠️ 2주 이상 미갱신 토큰 ' + stale + '개: 만료된 토큰일 수 있어 발송 실패 원인');
    }
    if (noMemberId > 0 && unknown > 0) {
        issues.push('⚠️ memberId 없는 토큰 ' + noMemberId + '개: 개인 메시지 발송 대상에서 제외됨');
    }
    if (member === 0 && withMemberId === 0) {
        issues.push('❌ member 역할 토큰이 0개: 회원에게 개인 메시지 푸시가 전혀 전달 불가');
    }
    
    if (issues.length === 0) {
        console.log('  ✅ 심각한 문제 없음');
    } else {
        issues.forEach(function(i) { console.log('  ' + i); });
    }

    process.exit(0);
}

audit().catch(function(e) { console.error(e); process.exit(1); });
