/**
 * Firestore Automatic Backup Module
 * 하루 2회 (04:00, 14:00 KST) Firestore 전체 백업을 GCS로 내보내기
 * 30일 이상 지난 백업은 자동 삭제
 * 
 * @module modules/backup
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { admin, getKSTDateString, STUDIO_ID } = require("../helpers/common");
const { Storage } = require("@google-cloud/storage");

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "boksaem-yoga";
const BACKUP_BUCKET = `${PROJECT_ID}-firestore-backups`;
const RETENTION_DAYS = 30;

/**
 * GCS 버킷이 존재하지 않으면 생성
 */
async function ensureBucket(storage) {
    try {
        const [exists] = await storage.bucket(BACKUP_BUCKET).exists();
        if (!exists) {
            await storage.createBucket(BACKUP_BUCKET, {
                location: "asia-northeast3",
                storageClass: "NEARLINE", // 백업용 저비용 스토리지
            });
            console.log(`[Backup] Created bucket: ${BACKUP_BUCKET}`);
        }
    } catch (e) {
        // 권한 없으면 이미 존재한다고 가정
        console.warn(`[Backup] Bucket check skipped:`, e.message);
    }
}

/**
 * Firestore Export를 GCS로 실행
 */
async function runBackup(label) {
    const storage = new Storage();
    await ensureBucket(storage);

    const dateStr = getKSTDateString();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputUri = `gs://${BACKUP_BUCKET}/${dateStr}/${label}_${timestamp}`;

    const client = new admin.firestore.v1.FirestoreAdminClient();
    const databaseName = client.databasePath(PROJECT_ID, "(default)");

    console.log(`[Backup] Starting ${label} backup to ${outputUri}`);

    const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: outputUri,
        // 핵심 컬렉션만 백업 (스튜디오 데이터)
        collectionIds: [],  // 빈 배열 = 전체 백업
    });

    console.log(`[Backup] Export operation started: ${operation.name}`);

    // 백업 기록 저장
    const db = admin.firestore();
    await db.collection("_system").doc("backups").collection("history").add({
        label,
        outputUri,
        operationName: operation.name,
        studioId: STUDIO_ID,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "started",
        retentionDays: RETENTION_DAYS,
    });

    return operation.name;
}

/**
 * 30일 이상 된 백업 폴더 자동 삭제
 */
async function cleanupOldBackups() {
    const storage = new Storage();

    try {
        const [exists] = await storage.bucket(BACKUP_BUCKET).exists();
        if (!exists) {
            console.log("[Backup Cleanup] Bucket does not exist, skipping.");
            return 0;
        }
    } catch (e) {
        console.warn("[Backup Cleanup] Bucket check failed:", e.message);
        return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffStr = cutoffDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // 날짜 폴더 목록 (prefix로 조회)
    const bucket = storage.bucket(BACKUP_BUCKET);
    const [files] = await bucket.getFiles();

    // 날짜별 그룹화
    const dateFolders = new Set();
    files.forEach(f => {
        const match = f.name.match(/^(\d{4}-\d{2}-\d{2})\//);
        if (match) dateFolders.add(match[1]);
    });

    let deletedCount = 0;
    for (const dateFolder of dateFolders) {
        if (dateFolder < cutoffStr) {
            console.log(`[Backup Cleanup] Deleting old backup: ${dateFolder}`);
            const [oldFiles] = await bucket.getFiles({ prefix: `${dateFolder}/` });
            for (const file of oldFiles) {
                await file.delete();
                deletedCount++;
            }
        }
    }

    if (deletedCount > 0) {
        console.log(`[Backup Cleanup] Deleted ${deletedCount} files from backups older than ${RETENTION_DAYS} days.`);
    }

    // Firestore 기록도 정리
    const db = admin.firestore();
    const oldRecords = await db.collection("_system").doc("backups").collection("history")
        .where("startedAt", "<", cutoffDate)
        .get();

    if (!oldRecords.empty) {
        const batch = db.batch();
        oldRecords.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`[Backup Cleanup] Removed ${oldRecords.size} old backup records.`);
    }

    return deletedCount;
}

/**
 * 새벽 4시 자동 백업 (전일 마감 데이터 확보)
 */
exports.firestoreBackupMorningV2 = onSchedule({
    schedule: "0 4 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "512MiB",
    timeoutSeconds: 300,
}, async () => {
    try {
        const opName = await runBackup("morning");
        console.log(`[Backup] Morning backup started: ${opName}`);

        // 새벽 백업 시 오래된 백업 정리도 함께 실행
        const deleted = await cleanupOldBackups();
        console.log(`[Backup] Cleanup completed: ${deleted} files removed.`);
    } catch (error) {
        console.error("[Backup] Morning backup FAILED:", error);
    }
});

/**
 * 오후 2시 자동 백업 (오전 수업 데이터 확보)
 */
exports.firestoreBackupAfternoonV2 = onSchedule({
    schedule: "0 14 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    memory: "512MiB",
    timeoutSeconds: 300,
}, async () => {
    try {
        const opName = await runBackup("afternoon");
        console.log(`[Backup] Afternoon backup started: ${opName}`);
    } catch (error) {
        console.error("[Backup] Afternoon backup FAILED:", error);
    }
});
