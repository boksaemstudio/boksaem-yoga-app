const admin = require('firebase-admin');
const path = require('path');
const sa = require(path.join(__dirname, '..', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function auditFacialData() {
    console.log('==========================================');
    console.log('  안면 데이터 수집 현황 전수조사 보고서');
    console.log('==========================================\n');

    // 1. Total active members count
    var membersSnap = await db.collection('members').get();
    var totalMembers = membersSnap.size;
    var hasFace = 0, noFace = 0;
    var activeWithFace = 0, activeNoFace = 0;
    var membersWithFaceList = [];
    var membersWithoutFaceList = [];

    membersSnap.forEach(function(doc) {
        var m = doc.data();
        var isActive = m.status !== 'inactive' && m.status !== 'deleted';
        
        if (m.hasFaceDescriptor) {
            hasFace++;
            if (isActive) {
                activeWithFace++;
                membersWithFaceList.push({ name: m.name || 'N/A', updatedAt: m.faceUpdatedAt || 'N/A' });
            }
        } else {
            noFace++;
            if (isActive) {
                activeNoFace++;
                if (membersWithoutFaceList.length < 10) {
                    membersWithoutFaceList.push({ name: m.name || 'N/A', credits: m.credits, endDate: m.endDate });
                }
            }
        }
    });

    console.log('[1] 전체 회원 안면 데이터 현황');
    console.log('  전체 회원:', totalMembers, '명');
    console.log('  안면 데이터 있음:', hasFace, '명 (' + Math.round(hasFace/totalMembers*100) + '%)');
    console.log('  안면 데이터 없음:', noFace, '명');
    console.log('  활성 회원 중 안면 있음:', activeWithFace, '명');
    console.log('  활성 회원 중 안면 없음:', activeNoFace, '명');

    // 2. face_bio collection
    console.log('\n[2] face_bio 컬렉션 (실제 저장된 디스크립터)');
    var bioSnap = await db.collection('face_bio').get();
    console.log('  face_bio 문서 수:', bioSnap.size, '개');
    var bioCount = 0;
    bioSnap.forEach(function(doc) {
        var d = doc.data();
        if (bioCount < 5) {
            var descLen = d.descriptor ? (Array.isArray(d.descriptor) ? d.descriptor.length : Object.keys(d.descriptor).length) : 0;
            console.log('  - memberId:', doc.id.substring(0, 12) + '...', '| descriptor 길이:', descLen, '| updated:', d.updatedAt || 'N/A');
        }
        bioCount++;
    });

    // 3. Recent attendance with facialMatched
    console.log('\n[3] 최근 출석 중 안면매칭 사용 현황 (최근 50건)');
    var attSnap = await db.collection('attendance')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
    var matched = 0, unmatched = 0, withPhoto = 0;
    attSnap.forEach(function(doc) {
        var a = doc.data();
        if (a.facialMatched) matched++;
        else unmatched++;
        if (a.photoUrl) withPhoto++;
    });
    console.log('  최근 50건 중:');
    console.log('  - 안면매칭 성공:', matched, '건 (' + Math.round(matched/50*100) + '%)');
    console.log('  - 안면매칭 안됨:', unmatched, '건');
    console.log('  - 사진 첨부됨:', withPhoto, '건 (' + Math.round(withPhoto/50*100) + '%)');

    // 4. Photo in attendance (recent with photoUrl)
    console.log('\n[4] 최근 출석 사진 샘플 (최근 5건 중 사진 있는 것)');
    var photoCount = 0;
    attSnap.forEach(function(doc) {
        var a = doc.data();
        if (a.photoUrl && photoCount < 5) {
            console.log('  -', a.memberName || 'N/A', '|', a.date, '|', a.timestamp, '| photo:', a.photoUrl.substring(0, 60) + '...');
            photoCount++;
        }
    });
    if (photoCount === 0) console.log('  ❌ 사진이 첨부된 출석 기록이 없습니다.');

    // 5. Face data members list
    console.log('\n[5] 안면 데이터 보유 회원 목록');
    membersWithFaceList.forEach(function(m) {
        console.log('  ✅', m.name, '| 등록일:', m.updatedAt);
    });

    console.log('\n[6] 안면 데이터 미보유 활성 회원 (최대 10명)');
    membersWithoutFaceList.forEach(function(m) {
        console.log('  ❌', m.name, '| credits:', m.credits, '| 만료:', m.endDate || 'N/A');
    });

    // 7. Storage check for photos
    console.log('\n[7] Firebase Storage 사진 체크');
    try {
        var bucket = admin.storage().bucket();
        var [files] = await bucket.getFiles({ prefix: 'attendance_photos/', maxResults: 10 });
        console.log('  attendance_photos/ 파일 수 (최대 10):', files.length);
        files.forEach(function(f) {
            console.log('  -', f.name, '| size:', f.metadata.size, 'bytes | created:', f.metadata.timeCreated);
        });
    } catch (e) {
        console.log('  Storage 접근 실패:', e.message);
    }

    // 8. Summary
    console.log('\n[8] 종합 진단');
    var issues = [];
    if (hasFace === 0) {
        issues.push('❌ 안면 데이터가 전혀 수집되지 않고 있습니다.');
    }
    if (bioSnap.size === 0) {
        issues.push('❌ face_bio 컬렉션이 비어있습니다.');
    }
    if (matched === 0 && hasFace > 0) {
        issues.push('⚠️ 안면 데이터는 있으나 출석 매칭 사용 기록이 없습니다.');
    }
    if (withPhoto === 0) {
        issues.push('⚠️ 최근 출석에 사진이 전혀 첨부되지 않고 있습니다.');
    }
    var ratio = totalMembers > 0 ? Math.round(hasFace/totalMembers*100) : 0;
    if (ratio < 30 && hasFace > 0) {
        issues.push('⚠️ 안면 수집률이 ' + ratio + '%로 낮습니다. 키오스크에서 자동 수집이 진행 중입니다.');
    }
    if (issues.length === 0) {
        console.log('  ✅ 심각한 문제 없음');
    } else {
        issues.forEach(function(i) { console.log('  ' + i); });
    }

    process.exit(0);
}

auditFacialData().catch(function(e) { console.error(e); process.exit(1); });
