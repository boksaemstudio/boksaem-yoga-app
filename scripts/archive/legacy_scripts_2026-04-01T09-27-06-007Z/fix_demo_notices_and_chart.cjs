const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TARGET = 'demo-yoga';
const BRAIN_DIR = 'C:\\Users\\boksoon\\.gemini\\antigravity\\brain\\7119611d-b558-45e5-9d5f-6402f24731fc';

function toBase64DataUri(filePath) {
    const buf = fs.readFileSync(filePath);
    return `data:image/png;base64,${buf.toString('base64')}`;
}

async function fix() {
    console.log('🖼️ Updating notices with images...');

    // Find the notice images
    const files = fs.readdirSync(BRAIN_DIR).filter(f => f.startsWith('notice_') && f.endsWith('.png'));
    console.log('Found images:', files);

    const springImg = files.find(f => f.includes('spring_event'));
    const schedImg = files.find(f => f.includes('schedule_change'));
    const discountImg = files.find(f => f.includes('discount_promo'));

    const springB64 = springImg ? toBase64DataUri(path.join(BRAIN_DIR, springImg)) : null;
    const schedB64 = schedImg ? toBase64DataUri(path.join(BRAIN_DIR, schedImg)) : null;
    const discountB64 = discountImg ? toBase64DataUri(path.join(BRAIN_DIR, discountImg)) : null;

    // Update notices with images
    const batch = db.batch();

    batch.set(db.doc(`studios/${TARGET}/notices/demo_notice_1`), {
        title: '[공지] 봄맞이 패스플로우 데모 업데이트 안내',
        content: '안녕하세요. 완벽한 스튜디오 관리를 돕는 패스플로우입니다.\n\n새로운 AI 브리핑 기능이 추가되었습니다. 대시보드에서 AI분석 버튼을 눌러보세요.\n\n문의사항은 demo@passflow.app으로 연락주세요.',
        author: '관리자',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isPinned: true,
        images: springB64 ? [springB64] : []
    });

    batch.set(db.doc(`studios/${TARGET}/notices/demo_notice_2`), {
        title: '[안내] 4월 수업 시간표 변경 공지',
        content: '4월부터 모닝 빈야사 수업이 07:00 → 06:30으로 변경됩니다.\n\n코어 인텐시브 수업이 신설됩니다 (매주 화, 목 20:00).\n\n자세한 시간은 주간시간표를 참고해주세요.',
        author: '엠마 원장',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isPinned: false,
        images: schedB64 ? [schedB64] : []
    });

    batch.set(db.doc(`studios/${TARGET}/notices/demo_notice_3`), {
        title: '[이벤트] 신규 회원 등록 20% 할인',
        content: '3월 한정! 신규 가입 시 3개월권 20% 할인 이벤트를 진행합니다.\n\n기간: 3/15 ~ 3/31\n대상: 신규 등록 회원\n\n자세한 내용은 프론트 데스크에 문의해 주세요.',
        author: '관리자',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        isPinned: false,
        images: discountB64 ? [discountB64] : []
    });

    await batch.commit();
    console.log('✅ Notices updated with images');

    // ───── ATTENDANCE DATA ─────
    console.log('\n📊 Seeding attendance data for chart...');

    // Get member IDs
    const membersSnap = await db.collection(`studios/${TARGET}/members`).where('status', '==', 'active').limit(100).get();
    const memberIds = membersSnap.docs.map(d => d.id);
    console.log(`Found ${memberIds.length} active members`);

    if (memberIds.length === 0) {
        console.log('No members found, skipping attendance');
        process.exit(0);
    }

    const now = new Date();
    let attBatch = db.batch();
    let ops = 0;
    const flush = async () => { if (ops > 0) { await attBatch.commit(); attBatch = db.batch(); ops = 0; } };

    const classNames = ['모닝 빈야사', '기구 필라테스', '힐링요가', '코어 인텐시브', '저녁 하타'];
    const instructors = ['엠마 원장', '소피 지점장', '루시 강사', '올리비아 강사'];
    const classTimes = ['07:00', '10:00', '14:00', '19:00', '21:00'];

    // Generate attendance for past 30 days
    for (let d = -30; d <= 0; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() + d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const dayOfWeek = date.getDay();

        // Weekdays: more attendance, weekends: less
        const baseCount = dayOfWeek === 0 || dayOfWeek === 6 ? 8 : 18;
        const attendanceCount = baseCount + Math.floor(Math.random() * 10) - 3;
        
        // Add some trend: more recent = slightly more attendance
        const trendBoost = Math.floor((d + 30) / 10);

        const todayCount = Math.max(3, attendanceCount + trendBoost);
        const selectedMembers = [...memberIds].sort(() => 0.5 - Math.random()).slice(0, todayCount);

        for (const branchId of ['A', 'B']) {
            const branchMembers = selectedMembers.slice(
                branchId === 'A' ? 0 : Math.floor(selectedMembers.length / 2),
                branchId === 'A' ? Math.floor(selectedMembers.length / 2) : selectedMembers.length
            );

            for (const memberId of branchMembers) {
                const timeIdx = Math.floor(Math.random() * classTimes.length);
                const logTime = new Date(`${dateStr}T${classTimes[timeIdx]}:00+09:00`);
                logTime.setMinutes(logTime.getMinutes() - Math.floor(Math.random() * 15));

                const logId = `att_${branchId}_${dateStr}_${memberId.slice(-6)}`;
                attBatch.set(db.doc(`studios/${TARGET}/attendance/${logId}`), {
                    id: logId,
                    memberId: memberId,
                    branchId: branchId,
                    timestamp: admin.firestore.Timestamp.fromDate(logTime),
                    className: classNames[timeIdx],
                    instructor: instructors[Math.floor(Math.random() * instructors.length)],
                    status: 'approved'
                });
                ops++;
                if (ops >= 400) await flush();
            }
        }
    }
    await flush();
    console.log('✅ Attendance data seeded for 30 days');

    console.log('\n🎉 All done - notices with images + attendance chart data!');
    process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
