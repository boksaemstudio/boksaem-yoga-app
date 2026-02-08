/**
 * 로그인 실패 로그 조회 및 분석 스크립트
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
    readFileSync('./functions/service-account-key.json', 'utf-8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkLoginFailures() {
    try {
        console.log('📋 최근 로그인 실패 조회 중...\n');
        
        const snapshot = await db.collection('login_failures')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();

        if (snapshot.empty) {
            console.log('✅ 로그인 실패 기록이 없습니다.\n');
            return;
        }

        console.log(`총 ${snapshot.size}건의 로그인 실패 기록\n`);
        console.log('='.repeat(120));

        // 통계 분석
        const stats = {
            total: snapshot.size,
            byType: { instructor: 0, member: 0 },
            byError: {},
            byDevice: { mobile: 0, desktop: 0 },
            byUser: {}
        };

        const failures = [];

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            failures.push({
                id: doc.id,
                ...data
            });

            // 통계 수집
            stats.byType[data.type]++;
            stats.byError[data.errorMessage] = (stats.byError[data.errorMessage] || 0) + 1;
            stats.byDevice[data.device] = (stats.byDevice[data.device] || 0) + 1;
            
            const userKey = `${data.attemptedName} (${data.attemptedPhone})`;
            stats.byUser[userKey] = (stats.byUser[userKey] || 0) + 1;
        });

        // 최근 10건 상세 출력
        console.log('\n📂 최근 로그인 실패 (최대 10건)\n');
        failures.slice(0, 10).forEach((f, idx) => {
            console.log(`[${idx + 1}] ${f.timestamp}`);
            console.log(`  타입: ${f.type === 'instructor' ? '강사' : '회원'}`);
            console.log(`  시도한 이름: "${f.attemptedName}"`);
            console.log(`  시도한 번호: "${f.attemptedPhone}"`);
            console.log(`  에러: ${f.errorMessage}`);
            console.log(`  디바이스: ${f.device}`);
            console.log(`  UserAgent: ${f.userAgent.substring(0, 80)}...`);
            console.log('-'.repeat(120));
        });

        // 통계 출력
        console.log('\n\n📊 통계 분석\n');
        console.log('='.repeat(120));
        
        console.log(`\n총 실패 건수: ${stats.total}`);
        
        console.log('\n【타입별 실패】');
        console.log(`  강사: ${stats.byType.instructor}건 (${(stats.byType.instructor/stats.total*100).toFixed(1)}%)`);
        console.log(`  회원: ${stats.byType.member}건 (${(stats.byType.member/stats.total*100).toFixed(1)}%)`);

        console.log('\n【에러 메시지별】');
        Object.entries(stats.byError)
            .sort((a, b) => b[1] - a[1])
            .forEach(([error, count]) => {
                console.log(`  ${error}: ${count}건 (${(count/stats.total*100).toFixed(1)}%)`);
            });

        console.log('\n【디바이스별】');
        console.log(`  모바일: ${stats.byDevice.mobile}건 (${(stats.byDevice.mobile/stats.total*100).toFixed(1)}%)`);
        console.log(`  데스크톱: ${stats.byDevice.desktop}건 (${(stats.byDevice.desktop/stats.total*100).toFixed(1)}%)`);

        console.log('\n【사용자별 실패 횟수 (Top 10)】');
        Object.entries(stats.byUser)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([user, count], idx) => {
                console.log(`  ${idx + 1}. ${user}: ${count}회`);
            });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function clearLoginFailures() {
    try {
        const confirm = process.argv.includes('--clear-confirmed');
        if (!confirm) {
            console.log('⚠️  로그인 실패 기록을 삭제하려면 --clear-confirmed 플래그를 추가하세요.');
            console.log('   예: node check_login_failures.js --clear-confirmed\n');
            return;
        }

        console.log('🗑️  로그인 실패 기록 삭제 중...\n');
        
        const snapshot = await db.collection('login_failures').get();
        const batch = db.batch();
        
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`✅ ${snapshot.size}건의 기록을 삭제했습니다.\n`);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

(async () => {
    try {
        await checkLoginFailures();
        
        if (process.argv.includes('--clear') || process.argv.includes('--clear-confirmed')) {
            await clearLoginFailures();
        }
        
        console.log('\n✅ 완료\n');
        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();
