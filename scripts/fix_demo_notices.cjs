const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function fix() {
    const batch = db.batch();
    
    batch.set(db.doc('studios/demo-yoga/notices/demo_notice_1'), {
        title: '[공지] 봄맞이 패스플로우 데모 업데이트 안내',
        content: '안녕하세요. 완벽한 스튜디오 관리를 돕는 패스플로우입니다.\n\n새로운 AI 브리핑 기능이 추가되었습니다. 대시보드에서 AI분석 버튼을 눌러보세요.\n\n문의사항은 demo@passflow.app으로 연락주세요.',
        author: '관리자',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isPinned: true
    });
    
    batch.set(db.doc('studios/demo-yoga/notices/demo_notice_2'), {
        title: '[안내] 4월 수업 시간표 변경 공지',
        content: '4월부터 모닝 빈야사 수업이 07:00 → 06:30으로 변경됩니다.\n\n코어 인텐시브 수업이 신설됩니다 (매주 화, 목 20:00).\n\n자세한 시간은 주간시간표를 참고해주세요.',
        author: '엠마 원장',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isPinned: false
    });
    
    batch.set(db.doc('studios/demo-yoga/notices/demo_notice_3'), {
        title: '[이벤트] 신규 회원 등록 할인',
        content: '3월 한정! 신규 가입 시 3개월권 20% 할인 이벤트를 진행합니다.\n\n기간: 3/15 ~ 3/31\n대상: 신규 등록 회원\n\n자세한 내용은 프론트 데스크에 문의해 주세요.',
        author: '관리자',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        isPinned: false
    });
    
    await batch.commit();
    console.log('✅ 3 notices inserted with timestamp field');
    process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
