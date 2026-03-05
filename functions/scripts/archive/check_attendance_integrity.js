import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '../service-account-key.json';
let serviceAccount;
try { serviceAccount = require(serviceAccountPath); } catch (e) { /* ignore */ }

try {
    if (serviceAccount) {
        if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
        if (!admin.apps.length) admin.initializeApp();
    }
} catch (e) { console.warn("Init failed:", e.message); }

const db = admin.firestore();

/**
 * 출석 데이터 무결성 조사
 * - 인덱스 누락 기간 동안 비정상 출석 회원 조사
 * - members의 credits/attendanceCount와 실제 attendance 기록 비교
 */
async function investigate() {
    console.log("=== 출석 데이터 무결성 조사 시작 ===\n");

    // 1. 모든 회원 로드
    const membersSnap = await db.collection('members').get();
    const members = {};
    membersSnap.forEach(doc => {
        members[doc.id] = { ...doc.data(), id: doc.id };
    });
    console.log(`총 회원 수: ${Object.keys(members).length}\n`);

    // 2. 최근 7일간 출석 기록 로드
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    const attSnap = await db.collection('attendance')
        .where('date', '>=', cutoffDate)
        .get();

    console.log(`최근 7일 출석 기록 수: ${attSnap.size}\n`);

    // 3. 회원별 실제 출석 횟수 집계
    const memberAttCounts = {}; // memberId -> { valid: N, denied: N, records: [] }
    attSnap.forEach(doc => {
        const d = doc.data();
        if (!d.memberId) return;
        if (!memberAttCounts[d.memberId]) {
            memberAttCounts[d.memberId] = { valid: 0, denied: 0, records: [] };
        }
        if (d.status === 'valid') {
            memberAttCounts[d.memberId].valid++;
        } else {
            memberAttCounts[d.memberId].denied++;
        }
        memberAttCounts[d.memberId].records.push({
            date: d.date,
            status: d.status,
            credits: d.credits,
            className: d.className,
            timestamp: d.timestamp,
            syncMode: d.syncMode || 'online',
            docId: doc.id
        });
    });

    // 4. 전체 출석 기록으로 실제 총 출석 수 집계
    const allAttSnap = await db.collection('attendance')
        .where('status', '==', 'valid')
        .get();
    
    const memberTotalAtt = {};
    allAttSnap.forEach(doc => {
        const d = doc.data();
        if (!d.memberId) return;
        memberTotalAtt[d.memberId] = (memberTotalAtt[d.memberId] || 0) + 1;
    });

    // 5. 이상 징후 감지
    const issues = [];

    for (const [memberId, member] of Object.entries(members)) {
        const memberCredits = member.credits ?? 0;
        const memberAttCount = member.attendanceCount ?? 0;
        const actualTotalAtt = memberTotalAtt[memberId] || 0;
        const recentData = memberAttCounts[memberId];

        // 5a. 출석 횟수 불일치 (회원 데이터 vs 실제 출석 기록)
        const countDiff = memberAttCount - actualTotalAtt;
        if (Math.abs(countDiff) > 1) {
            issues.push({
                memberId,
                name: member.name,
                type: 'COUNT_MISMATCH',
                detail: `회원데이터 attendanceCount=${memberAttCount}, 실제 valid 출석기록=${actualTotalAtt} (차이: ${countDiff})`,
                memberCredits,
                severity: Math.abs(countDiff) > 3 ? 'HIGH' : 'MEDIUM'
            });
        }

        // 5b. 음수 크레딧
        if (memberCredits < 0) {
            issues.push({
                memberId,
                name: member.name,
                type: 'NEGATIVE_CREDITS',
                detail: `크레딧이 ${memberCredits}으로 음수`,
                memberCredits,
                severity: 'HIGH'
            });
        }

        // 5c. 최근 7일 내 중복 출석 (같은 날, 같은 수업)
        if (recentData) {
            const dateClassMap = {};
            for (const rec of recentData.records) {
                if (rec.status !== 'valid') continue;
                const key = `${rec.date}_${rec.className}`;
                if (!dateClassMap[key]) dateClassMap[key] = [];
                dateClassMap[key].push(rec);
            }
            for (const [key, recs] of Object.entries(dateClassMap)) {
                if (recs.length > 1) {
                    // Check if they are actual duplicates (within 5 min) vs multi-session
                    issues.push({
                        memberId,
                        name: member.name,
                        type: 'DUPLICATE_CHECKIN',
                        detail: `같은 날 같은 수업 ${recs.length}회 출석: ${key} (syncMode: ${recs.map(r=>r.syncMode).join(', ')})`,
                        memberCredits,
                        severity: 'MEDIUM'
                    });
                }
            }
        }

        // 5d. 오프라인 동기화 출석 (검증 필요)
        if (recentData) {
            const offlineRecs = recentData.records.filter(r => r.syncMode === 'offline-restored');
            if (offlineRecs.length > 0) {
                issues.push({
                    memberId,
                    name: member.name,
                    type: 'OFFLINE_SYNC',
                    detail: `최근 7일 내 오프라인 동기화 출석 ${offlineRecs.length}건: ${offlineRecs.map(r => r.date).join(', ')}`,
                    memberCredits,
                    severity: 'LOW'
                });
            }
        }
    }

    // 6. pending_attendance 미처리 기록 확인
    const pendingSnap = await db.collection('pending_attendance').get();
    if (!pendingSnap.empty) {
        pendingSnap.forEach(doc => {
            const d = doc.data();
            issues.push({
                memberId: d.memberId,
                name: members[d.memberId]?.name || '알 수 없음',
                type: 'PENDING_UNPROCESSED',
                detail: `미처리 대기 출석: date=${d.date}, class=${d.classTitle}, status=${d.status}`,
                memberCredits: members[d.memberId]?.credits ?? '?',
                severity: 'HIGH'
            });
        });
    }

    // 7. 결과 출력
    console.log("=== 조사 결과 ===\n");

    if (issues.length === 0) {
        console.log("✅ 이상 징후가 발견되지 않았습니다.");
    } else {
        // Sort by severity
        const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        issues.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

        console.log(`⚠️  총 ${issues.length}건의 이상 징후 발견\n`);

        // Group by type
        const grouped = {};
        for (const issue of issues) {
            if (!grouped[issue.type]) grouped[issue.type] = [];
            grouped[issue.type].push(issue);
        }

        for (const [type, typeIssues] of Object.entries(grouped)) {
            const labels = {
                'COUNT_MISMATCH': '📊 출석 횟수 불일치',
                'NEGATIVE_CREDITS': '🔴 음수 크레딧',
                'DUPLICATE_CHECKIN': '🔁 중복 출석',
                'OFFLINE_SYNC': '📡 오프라인 동기화 출석',
                'PENDING_UNPROCESSED': '⏳ 미처리 대기 출석'
            };
            console.log(`\n--- ${labels[type] || type} (${typeIssues.length}건) ---`);
            for (const issue of typeIssues) {
                console.log(`  [${issue.severity}] ${issue.name} (${issue.memberId})`);
                console.log(`    └ ${issue.detail}`);
                console.log(`    └ 현재 크레딧: ${issue.memberCredits}`);
            }
        }
    }

    console.log("\n=== 조사 완료 ===");
    process.exit(0);
}

investigate().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
