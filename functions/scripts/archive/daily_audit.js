/**
 * ═══════════════════════════════════════════════════════════════
 *  복샘요가 일일 정기 점검 (Daily Audit)
 *  Run:  node functions/scripts/daily_audit.js [--auto-fix]
 * ═══════════════════════════════════════════════════════════════
 *
 * 점검 항목 (10개):
 *   1. 출석 데이터 중복            6. 회원 데이터 무결성
 *   2. 음수 크레딧                 7. AI 에러 로그 (24h)
 *   3. AI 할당량 사용률             8. 클라이언트 에러 로그 (24h)
 *   4. FCM 토큰 과다 등록          9. Firestore 쿼리 성능
 *   5. 오래된/고아 데이터          10. 보안 규칙 정적 분석
 *
 * --auto-fix : FCM 토큰 과다 자동 정리 (최신 3개만 유지)
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const { performance } = require("perf_hooks");

// ── Firebase 초기화 ──────────────────────────────────────────
const SA_PATH = path.join(__dirname, "..", "service-account-key.json");
if (!admin.apps.length) {
    const sa = require(SA_PATH);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
    admin.firestore().settings({ ignoreUndefinedProperties: true });
}
const db = admin.firestore();

// ── 설정 ─────────────────────────────────────────────────────
const CONFIG = {
    AI_DAILY_LIMIT: 10000,
    AI_QUOTA_WARN_PCT: 80,
    FCM_MAX_PER_MEMBER: 5,
    FCM_KEEP_COUNT: 3,
    STALE_TOKEN_DAYS: 90,
    PERF_WARN_MS: 3000,
    FCM_COLLECTIONS: ["fcm_tokens", "fcmTokens", "push_tokens"],
};
const AUTO_FIX = process.argv.includes("--auto-fix");

// ── 유틸 ─────────────────────────────────────────────────────
const KST = () =>
    new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

const KST_NOW = () =>
    new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

function severity(level) {
    return { ok: "✅", warn: "🟡", error: "🔴", info: "ℹ️" }[level] || "❓";
}

async function measure(label, fn) {
    const t0 = performance.now();
    const result = await fn();
    const ms = Math.round(performance.now() - t0);
    return { result, ms, label };
}

// ── 점검 결과 구조체 ──────────────────────────────────────────
const report = {
    date: KST(),
    timestamp: KST_NOW(),
    checks: [],
    issues: [],
    autoFixed: [],
};

function addCheck(name, status, detail, data = {}) {
    const entry = { name, status, detail, ...data };
    report.checks.push(entry);
    if (status === "warn" || status === "error") {
        report.issues.push(`[${severity(status)}] ${name}: ${detail}`);
    }
    console.log(`  ${severity(status)} ${detail}`);
}

// ═══════════════════════════════════════════════════════════════
//  1. 출석 데이터 중복 점검
// ═══════════════════════════════════════════════════════════════
async function checkAttendanceDuplicates() {
    console.log("\n📋 [1] 출석 데이터 중복 점검...");
    try {
        const today = KST();
        const todayStart = new Date(`${today}T00:00:00+09:00`);
        const todayEnd = new Date(`${today}T23:59:59+09:00`);

        const snap = await db
            .collection("attendance")
            .where("timestamp", ">=", todayStart)
            .where("timestamp", "<=", todayEnd)
            .get();

        const seen = new Map();
        const dupes = [];

        snap.docs.forEach((doc) => {
            const d = doc.data();
            const dateStr = d.date || today;
            // memberId + date + className(또는 classType) 조합으로 중복 판단
            const key = `${d.memberId}_${dateStr}_${d.className || d.classType || "unknown"}`;
            if (seen.has(key)) {
                dupes.push({ docId: doc.id, key, existing: seen.get(key) });
            } else {
                seen.set(key, doc.id);
            }
        });

        if (dupes.length === 0) {
            addCheck("출석 중복", "ok", `오늘 출석 ${snap.size}건, 중복 0건`, {
                total: snap.size,
            });
        } else {
            dupes.slice(0, 5).forEach((d) =>
                console.log(`    ⚠️ 중복: ${d.key} (${d.docId} vs ${d.existing})`)
            );
            addCheck(
                "출석 중복",
                "warn",
                `오늘 출석 ${snap.size}건 중 ${dupes.length}건 중복`,
                { total: snap.size, duplicates: dupes.length }
            );
        }
    } catch (e) {
        addCheck("출석 중복", "error", `점검 실패: ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  2. 음수 크레딧 회원 점검
// ═══════════════════════════════════════════════════════════════
async function checkNegativeCredits() {
    console.log("\n💰 [2] 음수 크레딧 회원 점검...");
    try {
        const snap = await db
            .collection("members")
            .where("credits", "<", 0)
            .get();

        if (snap.empty) {
            addCheck("음수 크레딧", "ok", "음수 크레딧 회원 0명");
        } else {
            snap.docs.forEach((doc) => {
                const d = doc.data();
                console.log(
                    `    ⚠️ ${d.name || doc.id}: credits=${d.credits}`
                );
            });
            addCheck("음수 크레딧", "warn", `${snap.size}명 음수 크레딧 발견`, {
                count: snap.size,
                members: snap.docs.map((d) => ({
                    id: d.id,
                    name: d.data().name,
                    credits: d.data().credits,
                })),
            });
        }
    } catch (e) {
        addCheck("음수 크레딧", "error", `점검 실패: ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  3. AI 할당량 사용률 점검
// ═══════════════════════════════════════════════════════════════
async function checkAIQuota() {
    console.log("\n🤖 [3] AI 할당량 사용률 점검...");
    try {
        const today = KST();
        const snap = await db.collection("ai_quota").doc(today).get();
        const count = snap.exists ? snap.data().count || 0 : 0;
        const pct = ((count / CONFIG.AI_DAILY_LIMIT) * 100).toFixed(1);

        // 어제 사용량도 비교
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toLocaleDateString("sv-SE", {
            timeZone: "Asia/Seoul",
        });
        const ySnap = await db.collection("ai_quota").doc(yStr).get();
        const yCount = ySnap.exists ? ySnap.data().count || 0 : 0;

        const trend =
            yCount > 0
                ? `(어제: ${yCount}, ${count > yCount ? "↑" : count < yCount ? "↓" : "→"})`
                : "";

        if (pct >= CONFIG.AI_QUOTA_WARN_PCT) {
            addCheck(
                "AI 할당량",
                "warn",
                `${count}/${CONFIG.AI_DAILY_LIMIT} (${pct}%) ${trend}`,
                { count, limit: CONFIG.AI_DAILY_LIMIT, pct: +pct, yesterday: yCount }
            );
        } else {
            addCheck(
                "AI 할당량",
                "ok",
                `${count}/${CONFIG.AI_DAILY_LIMIT} (${pct}%) ${trend}`,
                { count, limit: CONFIG.AI_DAILY_LIMIT, pct: +pct, yesterday: yCount }
            );
        }
    } catch (e) {
        addCheck("AI 할당량", "error", `점검 실패: ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  4. FCM 토큰 과다 등록 점검 + 자동 정리
// ═══════════════════════════════════════════════════════════════
async function checkFCMTokens() {
    console.log("\n🔔 [4] FCM 토큰 과다 등록 점검...");
    try {
        const memberTokens = {}; // memberId → [{ col, docId, updatedAt }]
        let total = 0;

        for (const col of CONFIG.FCM_COLLECTIONS) {
            try {
                const snap = await db.collection(col).get();
                total += snap.size;
                snap.docs.forEach((doc) => {
                    const d = doc.data();
                    const mid = d.memberId || d.userId || "unknown";
                    if (!memberTokens[mid]) memberTokens[mid] = [];
                    memberTokens[mid].push({
                        col,
                        docId: doc.id,
                        updatedAt:
                            d.updatedAt || d.createdAt || d.timestamp || null,
                    });
                });
            } catch (_) {
                /* collection 없음 */
            }
        }

        const excessive = Object.entries(memberTokens)
            .filter(([, tokens]) => tokens.length > CONFIG.FCM_MAX_PER_MEMBER)
            .sort((a, b) => b[1].length - a[1].length);

        // 오래된 토큰 (90일+)
        const staleThreshold = new Date(
            Date.now() - CONFIG.STALE_TOKEN_DAYS * 86400000
        );
        let staleCount = 0;
        Object.values(memberTokens).forEach((tokens) => {
            tokens.forEach((t) => {
                const ts = t.updatedAt?.toDate?.() || new Date(0);
                if (ts < staleThreshold) staleCount++;
            });
        });

        if (excessive.length > 0) {
            excessive.forEach(([mid, tokens]) =>
                console.log(`    ⚠️ ${mid}: ${tokens.length}개 토큰`)
            );

            // --auto-fix: 자동 정리
            if (AUTO_FIX) {
                console.log("    🔧 Auto-fix: 과다 토큰 자동 정리 중...");
                for (const [mid, tokens] of excessive) {
                    // 최신순 정렬
                    tokens.sort((a, b) => {
                        const ta = a.updatedAt?.toDate?.() || new Date(0);
                        const tb = b.updatedAt?.toDate?.() || new Date(0);
                        return tb - ta;
                    });
                    const toDelete = tokens.slice(CONFIG.FCM_KEEP_COUNT);
                    for (const t of toDelete) {
                        await db.collection(t.col).doc(t.docId).delete();
                    }
                    const msg = `${mid}: ${tokens.length}→${CONFIG.FCM_KEEP_COUNT}개`;
                    console.log(`    ✅ 정리: ${msg}`);
                    report.autoFixed.push(msg);
                }
            }

            addCheck(
                "FCM 토큰",
                "warn",
                `전체 ${total}개, ${excessive.length}명 과다(>${CONFIG.FCM_MAX_PER_MEMBER}), 오래된 ${staleCount}개`,
                {
                    total,
                    excessive: excessive.length,
                    stale: staleCount,
                    autoFixed: AUTO_FIX,
                }
            );
        } else {
            addCheck(
                "FCM 토큰",
                "ok",
                `전체 ${total}개, 과다 0명, 오래된 ${staleCount}개`,
                { total, stale: staleCount }
            );
        }
    } catch (e) {
        addCheck("FCM 토큰", "error", `점검 실패: ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  5. 오래된/고아 데이터 점검
// ═══════════════════════════════════════════════════════════════
async function checkOrphanData() {
    console.log("\n🗑️  [5] 오래된/고아 데이터 점검...");
    try {
        // 오래된 rate_limits 문서 (7일 이상)
        const weekAgo = new Date(Date.now() - 7 * 86400000);
        let staleRateLimits = 0;
        try {
            const snap = await db
                .collection("rate_limits")
                .where("lastReset", "<", weekAgo)
                .get();
            staleRateLimits = snap.size;
        } catch (_) {
            /* 인덱스 없을 수 있음 */
        }

        // 오래된 pending_approvals (해결 안 된 것 7일+)
        let stalePending = 0;
        try {
            const snap = await db
                .collection("pending_approvals")
                .where("status", "==", "pending")
                .get();
            snap.docs.forEach((doc) => {
                const created = doc.data().createdAt?.toDate?.();
                if (created && created < weekAgo) stalePending++;
            });
        } catch (_) { /* ignore index errors */ }

        // 오래된 ai_quota 문서 (30일 이상)
        let staleQuota = 0;
        try {
            const snap = await db.collection("ai_quota").get();
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);
            const monthStr = monthAgo.toLocaleDateString("sv-SE", {
                timeZone: "Asia/Seoul",
            });
            snap.docs.forEach((doc) => {
                if (doc.id < monthStr) staleQuota++;
            });
        } catch (_) { /* ignore errors if collection missing */ }

        const totalStale = staleRateLimits + stalePending + staleQuota;
        if (totalStale > 0) {
            if (staleRateLimits)
                console.log(
                    `    ℹ️ rate_limits: ${staleRateLimits}건 (7일+)`
                );
            if (stalePending)
                console.log(
                    `    ℹ️ pending_approvals: ${stalePending}건 미처리`
                );
            if (staleQuota)
                console.log(
                    `    ℹ️ ai_quota: ${staleQuota}건 (30일+ 오래된 기록)`
                );
            addCheck(
                "오래된 데이터",
                "info",
                `${totalStale}건 정리 가능`,
                { rateLimits: staleRateLimits, pending: stalePending, quota: staleQuota }
            );
        } else {
            addCheck("오래된 데이터", "ok", "정리 필요 없음");
        }
    } catch (e) {
        addCheck("오래된 데이터", "error", `점검 실패: ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  6. 회원 데이터 무결성
// ═══════════════════════════════════════════════════════════════
async function checkMemberIntegrity() {
    console.log("\n👤 [6] 회원 데이터 무결성 점검...");
    try {
        const snap = await db.collection("members").get();
        let missingName = 0;
        let missingPhone = 0;
        let missingPhoneLast4 = 0;
        let invalidCredits = 0;

        snap.docs.forEach((doc) => {
            const d = doc.data();
            if (!d.name || d.name.trim() === "") missingName++;
            if (!d.phone && !d.phoneLast4) missingPhone++;
            if (d.phone && !d.phoneLast4) missingPhoneLast4++;
            if (d.credits !== undefined && typeof d.credits !== "number")
                invalidCredits++;
        });

        const issues = [];
        if (missingName) issues.push(`이름 누락 ${missingName}명`);
        if (missingPhone) issues.push(`전화번호 완전 누락 ${missingPhone}명`);
        if (missingPhoneLast4) issues.push(`phoneLast4 미설정 ${missingPhoneLast4}명`);
        if (invalidCredits) issues.push(`크레딧 타입 오류 ${invalidCredits}명`);

        if (issues.length === 0) {
            addCheck(
                "회원 무결성",
                "ok",
                `전체 ${snap.size}명, 데이터 이상 없음`,
                { total: snap.size }
            );
        } else {
            issues.forEach((i) => console.log(`    ⚠️ ${i}`));
            addCheck(
                "회원 무결성",
                "warn",
                `전체 ${snap.size}명 중 ${issues.join(", ")}`,
                {
                    total: snap.size,
                    missingName,
                    missingPhone,
                    missingPhoneLast4,
                    invalidCredits,
                }
            );
        }
    } catch (e) {
        addCheck("회원 무결성", "error", `점검 실패: ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  7. AI 에러 로그 (최근 24시간)
// ═══════════════════════════════════════════════════════════════
async function checkAIErrors() {
    console.log("\n🚨 [7] AI 에러 로그 (24시간)...");
    try {
        const h24 = new Date(Date.now() - 86400000);
        const snap = await db
            .collection("ai_error_logs")
            .where("timestamp", ">=", h24)
            .orderBy("timestamp", "desc")
            .limit(10)
            .get();

        if (snap.empty) {
            addCheck("AI 에러", "ok", "최근 24시간 AI 에러 0건");
        } else {
            // 유형별 집계
            const contexts = {};
            snap.docs.forEach((doc) => {
                const ctx = doc.data().context || "unknown";
                contexts[ctx] = (contexts[ctx] || 0) + 1;
            });

            Object.entries(contexts).forEach(([ctx, cnt]) =>
                console.log(`    ⚠️ [${ctx}] ${cnt}건`)
            );

            const status = snap.size > 5 ? "error" : "warn";
            addCheck(
                "AI 에러",
                status,
                `최근 24시간 ${snap.size}건: ${Object.entries(contexts).map(([k, v]) => `${k}(${v})`).join(", ")}`,
                { count: snap.size, contexts }
            );
        }
    } catch (e) {
        addCheck("AI 에러", "error", `점검 실패: ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  8. 클라이언트 에러 로그 (최근 24시간)
// ═══════════════════════════════════════════════════════════════
async function checkClientErrors() {
    console.log("\n🐛 [8] 클라이언트 에러 로그 (24시간)...");
    try {
        const h24 = new Date(Date.now() - 86400000);
        const snap = await db
            .collection("error_logs")
            .where("timestamp", ">=", h24)
            .orderBy("timestamp", "desc")
            .limit(10)
            .get();

        if (snap.empty) {
            addCheck("클라이언트 에러", "ok", "최근 24시간 0건");
        } else {
            snap.docs.slice(0, 3).forEach((doc) => {
                const d = doc.data();
                console.log(
                    `    ⚠️ ${(d.message || d.error || "").substring(0, 80)}`
                );
            });
            addCheck(
                "클라이언트 에러",
                snap.size > 5 ? "error" : "warn",
                `최근 24시간 ${snap.size}건`,
                { count: snap.size }
            );
        }
    } catch (e) {
        // 컬렉션 없을 수 있음
        addCheck("클라이언트 에러", "ok", "컬렉션 없음 또는 0건");
    }
}

// ═══════════════════════════════════════════════════════════════
//  9. Firestore 쿼리 성능 측정
// ═══════════════════════════════════════════════════════════════
async function checkPerformance() {
    console.log("\n⚡ [9] Firestore 쿼리 성능 측정...");
    try {
        const tests = [
            await measure("회원 목록 (전체)", () =>
                db.collection("members").get()
            ),
            await measure("최근 출석 (50건)", () =>
                db
                    .collection("attendance")
                    .orderBy("timestamp", "desc")
                    .limit(50)
                    .get()
            ),
            await measure("오늘 출석", () => {
                const today = KST();
                return db
                    .collection("attendance")
                    .where("timestamp", ">=", new Date(`${today}T00:00:00+09:00`))
                    .get();
            }),
        ];

        const slow = tests.filter((t) => t.ms > CONFIG.PERF_WARN_MS);
        tests.forEach((t) => {
            const icon = t.ms > CONFIG.PERF_WARN_MS ? "🐌" : "⚡";
            const count =
                t.result?.size !== undefined ? ` (${t.result.size}건)` : "";
            console.log(`    ${icon} ${t.label}: ${t.ms}ms${count}`);
        });

        if (slow.length > 0) {
            addCheck(
                "DB 성능",
                "warn",
                `${slow.length}개 느린 쿼리 (>${CONFIG.PERF_WARN_MS}ms)`,
                { tests: tests.map((t) => ({ label: t.label, ms: t.ms })) }
            );
        } else {
            const avg = Math.round(
                tests.reduce((s, t) => s + t.ms, 0) / tests.length
            );
            addCheck("DB 성능", "ok", `평균 ${avg}ms, 느린 쿼리 없음`, {
                avgMs: avg,
            });
        }
    } catch (e) {
        addCheck("DB 성능", "error", `측정 실패: ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
// 10. 보안 규칙 정적 분석
// ═══════════════════════════════════════════════════════════════
function checkSecurityRules() {
    console.log("\n🔐 [10] 보안 규칙 정적 분석...");
    try {
        const rulesPath = path.join(__dirname, "..", "..", "firestore.rules");
        if (!fs.existsSync(rulesPath)) {
            addCheck("보안 규칙", "warn", "firestore.rules 파일을 찾을 수 없음");
            return;
        }

        const rules = fs.readFileSync(rulesPath, "utf8");
        const issues = [];

        // 위험 패턴 검사
        if (/allow\s+read\s*,?\s*write\s*:\s*if\s+true/g.test(rules)) {
            issues.push("'allow if true' 발견 — 즉시 수정 필요!");
        }
        if (/allow\s+(read|write)\s*:\s*if\s+true/g.test(rules)) {
            issues.push("무조건 허용 규칙 발견");
        }

        // match 블록 수 카운트
        const matchCount = (rules.match(/match\s+\//g) || []).length - 1; // 첫 번째는 root
        // isAuth/isStaff/isAdmin 사용 확인
        const authChecks = (rules.match(/is(Auth|Staff|Admin)\(\)/g) || [])
            .length;

        if (issues.length > 0) {
            issues.forEach((i) => console.log(`    🔴 ${i}`));
            addCheck("보안 규칙", "error", issues.join("; "), {
                matchCount,
                authChecks,
            });
        } else {
            addCheck(
                "보안 규칙",
                "ok",
                `${matchCount}개 컬렉션 규칙, ${authChecks}개 인증 체크 적용`,
                { matchCount, authChecks }
            );
        }
    } catch (e) {
        addCheck("보안 규칙", "error", `분석 실패: ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  종합 리포트 출력 + Firestore 기록
// ═══════════════════════════════════════════════════════════════
async function printSummary() {
    const W = 56;
    console.log("\n" + "═".repeat(W));
    console.log(`  📊 복샘요가 일일 점검 종합 결과 (${report.date})`);
    console.log("═".repeat(W));

    // 상태별 집계
    const counts = { ok: 0, warn: 0, error: 0, info: 0 };
    report.checks.forEach((c) => counts[c.status]++);

    console.log(
        `  ✅ 정상: ${counts.ok}  🟡 주의: ${counts.warn}  🔴 위험: ${counts.error}  ℹ️ 참고: ${counts.info}`
    );

    if (report.issues.length > 0) {
        console.log("\n  📌 조치 필요 항목:");
        report.issues.forEach((i) => console.log(`    ${i}`));
    }

    if (report.autoFixed.length > 0) {
        console.log("\n  🔧 자동 수정 완료:");
        report.autoFixed.forEach((f) => console.log(`    ✅ ${f}`));
    }

    if (report.issues.length === 0) {
        console.log("\n  🎉 모든 항목 정상! 이상 없음.");
    }

    console.log("═".repeat(W));

    // Firestore에 감사 기록 저장
    try {
        await db.collection("audit_logs").doc(report.date).set(
            {
                ...report,
                checks: report.checks, // Firestore에 배열 저장
                ranAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );
        console.log(`  💾 감사 기록 저장: audit_logs/${report.date}`);
    } catch (e) {
        console.log(`  ⚠️ 감사 기록 저장 실패: ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  메인 실행
// ═══════════════════════════════════════════════════════════════
async function runAudit() {
    console.log("╔" + "═".repeat(54) + "╗");
    console.log(
        `║  🔍 복샘요가 일일 정기 점검 (${report.date} ${report.timestamp.split(" ").pop()})  ║`
    );
    if (AUTO_FIX) console.log("║  🔧 --auto-fix 모드 활성화                          ║");
    console.log("╚" + "═".repeat(54) + "╝");

    // 순차 실행 (Firestore 커넥션 안정성)
    await checkAttendanceDuplicates();
    await checkNegativeCredits();
    await checkAIQuota();
    await checkFCMTokens();
    await checkOrphanData();
    await checkMemberIntegrity();
    await checkAIErrors();
    await checkClientErrors();
    await checkPerformance();
    checkSecurityRules(); // sync (파일 읽기)

    await printSummary();
}

runAudit()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("❌ Audit 치명적 오류:", e);
        process.exit(1);
    });
