const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const sa = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function run() {
    // 1. 코드 내의 '토요하타' 문자열을 전부 '하타인텐시브'로 치환 (번역/설정 파일)
    const filesToPatch = [
        path.join(__dirname, '../src/utils/translations.js'),
        path.join(__dirname, '../src/studioConfig.js'),
        path.join(__dirname, '../src/components/AdminPriceManager.jsx')
    ];

    for (const fPath of filesToPatch) {
        if (fs.existsSync(fPath)) {
            let content = fs.readFileSync(fPath, 'utf8');
            content = content.replace(/토요하타/g, '하타인텐시브');
            fs.writeFileSync(fPath, content);
            console.log(`[Local] Patched: ${path.basename(fPath)}`);
        }
    }

    // 2. Firestore의 SCHEDULE_LEGEND를 실제 colors.ts와 100% 동기화!
    // colors.ts에서는: 기본(흰색/회색), 하타(파랑), 빈야사(초록), 심화/플라잉(주황), 키즈(노랑), 임산부(민트), 하타인텐시브(보라)
    
    const branches = ['mapo', 'gwangheungchang', 'demo-branch-1'];
    const newLegend = [
        { label: '일반/기본', color: '#E5E7EB', border: 'rgba(255, 255, 255, 0.15)', branches },
        { label: '하타', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)', branches },
        { label: '빈야사', color: '#34D399', border: 'rgba(16, 185, 129, 0.3)', branches },
        { label: '심화/플라잉', color: 'rgba(255, 190, 118, 1)', border: 'rgba(255, 190, 118, 0.5)', branches },
        { label: '키즈', color: '#EAB308', border: 'rgba(234, 179, 8, 0.4)', branches },
        { label: '임산부', color: 'rgba(129, 236, 236, 1)', border: 'rgba(129, 236, 236, 0.4)', branches },
        { label: '하타인텐시브', color: 'rgba(224, 86, 253, 0.9)', border: 'rgba(224, 86, 253, 0.4)', branches }
    ];

    const ref = db.collection('studios').doc('boksaem-yoga');
    await ref.update({
        'SCHEDULE_LEGEND': newLegend
    });
    console.log('[Firestore] Successfully updated SCHEDULE_LEGEND on boksaem-yoga');

    process.exit(0);
}

run().catch(console.error);
