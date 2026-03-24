/**
 * Firestore 백업 관리 CLI
 * 
 * 사용법:
 *   node scripts/backup_manager.cjs list          — 백업 목록 조회
 *   node scripts/backup_manager.cjs restore <uri> — 특정 백업에서 복원
 * 
 * 주의: restore는 기존 데이터에 덮어쓰기 됩니다. 신중하게 사용하세요.
 */

const admin = require("firebase-admin");
const path = require("path");

// Service Account
const serviceAccountPath = path.join(__dirname, "../functions/service-account-key.json");
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const PROJECT_ID = serviceAccount.project_id;
const BACKUP_BUCKET = `${PROJECT_ID}-firestore-backups`;

async function listBackups() {
    const { Storage } = require("@google-cloud/storage");
    const storage = new Storage({ credentials: serviceAccount, projectId: PROJECT_ID });

    console.log(`\n📦 백업 버킷: gs://${BACKUP_BUCKET}\n`);

    try {
        const [exists] = await storage.bucket(BACKUP_BUCKET).exists();
        if (!exists) {
            console.log("❌ 백업 버킷이 아직 없습니다. 첫 백업이 실행되면 자동 생성됩니다.");
            return;
        }
    } catch (e) {
        console.error("버킷 확인 실패:", e.message);
        return;
    }

    const [files] = await storage.bucket(BACKUP_BUCKET).getFiles();

    // 날짜별 그룹화
    const dateFolders = {};
    files.forEach(f => {
        const match = f.name.match(/^(\d{4}-\d{2}-\d{2})\//);
        if (match) {
            if (!dateFolders[match[1]]) dateFolders[match[1]] = { count: 0, size: 0, paths: new Set() };
            dateFolders[match[1]].count++;
            dateFolders[match[1]].size += parseInt(f.metadata.size || 0);
            // 백업 폴더 경로 (날짜/label_timestamp 까지)
            const parts = f.name.split("/");
            if (parts.length >= 2) dateFolders[match[1]].paths.add(`gs://${BACKUP_BUCKET}/${parts[0]}/${parts[1]}`);
        }
    });

    const sortedDates = Object.keys(dateFolders).sort().reverse();
    
    if (sortedDates.length === 0) {
        console.log("📭 아직 백업이 없습니다.");
        return;
    }

    console.log(`총 ${sortedDates.length}일치 백업:\n`);
    console.log("날짜           | 파일 수 | 크기       | 복원 URI");
    console.log("─".repeat(90));

    for (const date of sortedDates) {
        const info = dateFolders[date];
        const sizeStr = (info.size / 1024 / 1024).toFixed(1) + " MB";
        const uris = [...info.paths];
        console.log(`${date}       | ${String(info.count).padStart(5)}  | ${sizeStr.padStart(9)} | ${uris[0]}`);
        if (uris.length > 1) {
            for (let i = 1; i < uris.length; i++) {
                console.log(`               |        |           | ${uris[i]}`);
            }
        }
    }

    console.log(`\n💡 복원하려면: node scripts/backup_manager.cjs restore <URI>`);
    console.log(`   예: node scripts/backup_manager.cjs restore gs://${BACKUP_BUCKET}/${sortedDates[0]}/morning_...`);
}

async function restoreBackup(uri) {
    if (!uri || !uri.startsWith("gs://")) {
        console.error("❌ 유효한 GCS URI를 입력하세요. 예: gs://boksaem-yoga-firestore-backups/2026-03-24/morning_...");
        process.exit(1);
    }

    console.log(`\n⚠️  경고: 복원은 기존 데이터에 덮어쓰기됩니다!`);
    console.log(`   복원 소스: ${uri}`);
    console.log(`   프로젝트: ${PROJECT_ID}\n`);

    // 확인 프롬프트
    const readline = require("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    const answer = await new Promise(resolve => {
        rl.question("정말 복원하시겠습니까? (yes 입력): ", resolve);
    });
    rl.close();

    if (answer !== "yes") {
        console.log("❌ 복원이 취소되었습니다.");
        return;
    }

    console.log("\n🔄 복원 시작...");

    const client = new admin.firestore.v1.FirestoreAdminClient({
        credentials: serviceAccount,
    });

    const databaseName = client.databasePath(PROJECT_ID, "(default)");

    try {
        const [operation] = await client.importDocuments({
            name: databaseName,
            inputUriPrefix: uri,
            collectionIds: [], // 전체 복원
        });

        console.log(`✅ 복원 작업이 시작되었습니다.`);
        console.log(`   작업 ID: ${operation.name}`);
        console.log(`\n⏳ 복원은 데이터 크기에 따라 수 분에서 수십 분 소요될 수 있습니다.`);
        console.log(`   Firebase 콘솔에서 진행 상황을 확인하세요.`);
    } catch (e) {
        console.error("❌ 복원 실패:", e.message);
    }
}

// CLI Entry Point
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
    case "list":
        listBackups().catch(e => { console.error(e); process.exit(1); });
        break;
    case "restore":
        restoreBackup(arg).catch(e => { console.error(e); process.exit(1); });
        break;
    default:
        console.log(`
📦 Firestore 백업 관리 CLI

사용법:
  node scripts/backup_manager.cjs list              — 백업 목록 조회
  node scripts/backup_manager.cjs restore <GCS_URI>  — 특정 백업에서 복원

예시:
  node scripts/backup_manager.cjs list
  node scripts/backup_manager.cjs restore gs://boksaem-yoga-firestore-backups/2026-03-24/morning_2026-03-24T...
        `);
}
