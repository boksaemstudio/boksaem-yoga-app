/**
 * 2월 매출 더블링 원인 조사
 * members와 sales 컬렉션에서 2월 데이터를 비교합니다.
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

(async () => {
    try {
        console.log('='.repeat(80));
        console.log('📊 2월 매출 더블링 원인 조사');
        console.log('='.repeat(80));

        // 1. sales 컬렉션에서 2월 데이터 조회
        console.log('\n📋 [1] sales 컬렉션 전체 조회...\n');
        const salesSnap = await db.collection('sales').orderBy('timestamp', 'desc').get();
        
        console.log(`총 sales 레코드 수: ${salesSnap.size}건\n`);
        
        salesSnap.docs.forEach((doc, idx) => {
            const d = doc.data();
            console.log(`[${idx + 1}] ID: ${doc.id}`);
            console.log(`  memberId: ${d.memberId}`);
            console.log(`  memberName: ${d.memberName}`);
            console.log(`  type: ${d.type}`);
            console.log(`  item: ${d.item}`);
            console.log(`  amount: ${d.amount}`);
            console.log(`  date: ${d.date}`);
            console.log(`  timestamp: ${d.timestamp}`);
            console.log(`  paymentMethod: ${d.paymentMethod}`);
            console.log(`  branchId: ${d.branchId}`);
            console.log('-'.repeat(60));
        });

        // 2. members 컬렉션에서 2월 regDate 가진 회원 조회
        console.log('\n\n📋 [2] members 컬렉션 - 2월 regDate 가진 회원...\n');
        const membersSnap = await db.collection('members').get();
        
        const febMembers = [];
        membersSnap.docs.forEach(doc => {
            const d = doc.data();
            if (d.regDate && d.regDate.startsWith('2026-02')) {
                febMembers.push({ id: doc.id, ...d });
            }
        });

        console.log(`2월 등록 회원 수: ${febMembers.length}명\n`);
        
        febMembers.forEach((m, idx) => {
            console.log(`[${idx + 1}] ID: ${m.id}`);
            console.log(`  name: ${m.name}`);
            console.log(`  regDate: ${m.regDate}`);
            console.log(`  amount: ${m.amount}`);
            console.log(`  subject: ${m.subject}`);
            console.log(`  homeBranch: ${m.homeBranch}`);
            console.log(`  credits: ${m.credits}`);
            console.log('-'.repeat(60));
        });

        // 3. 중복 분석
        console.log('\n\n📋 [3] 중복 분석...\n');
        
        const salesFeb = salesSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(s => s.date && s.date.startsWith('2026-02'));
        
        console.log(`2월 sales 레코드 수: ${salesFeb.length}건`);
        console.log(`2월 members (regDate) 레코드 수: ${febMembers.length}건\n`);
        
        // 매칭 시도
        salesFeb.forEach(s => {
            const dateStr = s.date.split('T')[0];
            const matchingMember = febMembers.find(m => m.name === s.memberName && m.regDate === dateStr);
            if (matchingMember) {
                console.log(`⚠️ 중복 발견: ${s.memberName} - ${dateStr}`);
                console.log(`  sales amount: ${s.amount}, member amount: ${matchingMember.amount}`);
                console.log(`  salesKey: "${s.memberName}-${dateStr}"`);
                console.log(`  memberKey: "${matchingMember.name}-${matchingMember.regDate}"`);
                console.log(`  키 일치 여부: ${(s.memberName + '-' + dateStr) === (matchingMember.name + '-' + matchingMember.regDate) ? '✅ 일치' : '❌ 불일치'}`);
            } else {
                console.log(`ℹ️ sales에만 존재: ${s.memberName} - ${dateStr}`);
                console.log(`  매칭 시도 member: ${febMembers.map(m => m.name + '-' + m.regDate).join(', ')}`);
            }
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
