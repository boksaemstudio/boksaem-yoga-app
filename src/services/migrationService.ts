/**
 * Migration Service — CSV Import, phoneLast4 Migration, Data Cleanup
 * TypeScript version
 */
import { db } from "../firebase";
import { getDocs, getDoc, addDoc, updateDoc, setDoc, query, where, writeBatch } from 'firebase/firestore';
import { tenantDb } from '../utils/tenantDb';

// ── Types ──
export interface MigrationResult {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    errors: Array<{ row: number; name: string; error: string }>;
    members: Record<string, unknown>[];
    sales: Record<string, unknown>[];
}

type ProgressCallback = (current: number, total: number, label: string) => void;
type NotifyFn = () => void;
type LoadMembersFn = () => Promise<void>;
type CleanupFn = (onProgress: ProgressCallback | null) => Promise<void>;

// ── Service ──
export const migrationService = {
    async migratePhoneLast4(): Promise<{ success: boolean; count: number }> {
        try {
            const snapshot = await getDocs(tenantDb.collection('members'));
            let count = 0;
            const batchSize = 100;
            let batch = writeBatch(db);
            for (const d of snapshot.docs) {
                const data = d.data() as { phone?: string; phoneLast4?: string };
                if (data.phone && !data.phoneLast4) {
                    batch.update(tenantDb.doc('members', d.id), { phoneLast4: data.phone.slice(-4) });
                    count++;
                    if (count % batchSize === 0) { await batch.commit(); batch = writeBatch(db); }
                }
            }
            await batch.commit();
            const instDoc = await getDoc(tenantDb.doc('settings', 'instructors'));
            if (instDoc.exists()) {
                const list = ((instDoc.data() as { list?: Array<Record<string, unknown>> }).list || []);
                const updatedList = list.map((inst) => {
                    if (typeof inst === 'object' && (inst as { phone?: string }).phone && !(inst as { phoneLast4?: string }).phoneLast4) {
                        return { ...inst, phoneLast4: ((inst as { phone: string }).phone).slice(-4) };
                    }
                    return inst;
                });
                await setDoc(tenantDb.doc('settings', 'instructors'), { list: updatedList }, { merge: true });
            }
            return { success: true, count };
        } catch (e) { console.error('Migration failed:', e); throw e; }
    },

    async migrateMembersFromCSV(
        csvData: Array<Record<string, string>>,
        dryRun = false,
        onProgress: ProgressCallback | null = null,
        cleanupFn: CleanupFn | null = null,
        loadMembersFn: LoadMembersFn | null = null,
        notifyListenersFn: NotifyFn | null = null
    ): Promise<MigrationResult> {
        const { extractMonthsFromProduct, calculateEndDate, extractEndDateFromPeriod, convertToBranchId, parseCredits, parseAmount, parseLastVisit } = await import('../utils/csvParser.js');
        const results: MigrationResult = { total: csvData.length, success: 0, failed: 0, skipped: 0, errors: [], members: [], sales: [] };

        if (!dryRun && cleanupFn) {
            if (onProgress) onProgress(0, 0, '기존 데이터 정리 중...');
            await cleanupFn((current, total, colName) => { if (onProgress) onProgress(0, 0, `${colName} 삭제 중...`); });
        }

        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];
            try {
                if (onProgress) onProgress(i + 1, csvData.length, row['이름']);
                if (!row['이름'] || !row['휴대폰1']) { results.skipped++; results.errors.push({ row: i + 1, name: row['이름'], error: '필수 필드 누락' }); continue; }

                const branchId = convertToBranchId(row['회원번호']);
                const credits = parseCredits(row['남은횟수']);
                const phone = row['휴대폰1'].trim();
                const phoneLast4 = phone.slice(-4);
                let endDate = '';
                if (row['이용기간']) endDate = extractEndDateFromPeriod(row['이용기간']);
                if (!endDate && row['만기일자']) endDate = row['만기일자'];
                if (!endDate && row['판매일자'] && row['마지막 판매']) { const months = extractMonthsFromProduct(row['마지막 판매']); endDate = calculateEndDate(row['판매일자'], months); }

                const memberData = {
                    name: row['이름'].trim(), phone, phoneLast4, branchId, homeBranch: branchId,
                    credits, startDate: row['판매일자'] || row['등록일자'] || '', endDate: endDate || '',
                    attendanceCount: 0, lastAttendance: parseLastVisit(row['마지막출입']) || '',
                    createdAt: row['등록일자'] ? new Date(row['등록일자']).toISOString() : new Date().toISOString(),
                    updatedAt: new Date().toISOString(), streak: 0, pushEnabled: false
                };

                if (!dryRun) {
                    const existingQuery = query(tenantDb.collection('members'), where('phone', '==', phone));
                    const existingSnap = await getDocs(existingQuery);
                    let memberId: string;
                    if (existingSnap.empty) { const docRef = await addDoc(tenantDb.collection('members'), memberData); memberId = docRef.id; }
                    else { memberId = existingSnap.docs[0].id; const ec = (existingSnap.docs[0].data() as { createdAt?: string }).createdAt || new Date().toISOString(); await updateDoc(tenantDb.doc('members', memberId), { ...memberData, createdAt: ec }); }

                    const amount = parseAmount(row['판매금액']);
                    if (amount > 0 && row['판매일자']) {
                        const salesData = { memberId, memberName: memberData.name, amount, productName: row['마지막 판매'] || '', branchId, timestamp: new Date(row['판매일자']).toISOString() };
                        await addDoc(tenantDb.collection('sales'), salesData);
                        results.sales.push(salesData);
                    }
                }
                results.members.push(memberData);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({ row: i + 1, name: row['이름'], error: (error as Error).message });
            }
        }
        if (!dryRun) { if (loadMembersFn) await loadMembersFn(); if (notifyListenersFn) notifyListenersFn(); }
        return results;
    },

    async cleanupAllData(onProgress: ProgressCallback | null = null, notifyListenersFn: NotifyFn | null = null, loadMembersFn: LoadMembersFn | null = null): Promise<{ totalDeleted: number; stats: Record<string, number> }> {
        const collectionsToClear = ['members', 'sales', 'attendance', 'push_campaigns', 'push_history', 'notifications', 'messages', 'message_approvals', 'fcm_tokens', 'fcmTokens', 'push_tokens'];
        let totalDeleted = 0;
        const stats: Record<string, number> = {};
        for (const colName of collectionsToClear) {
            try {
                const snapshot = await getDocs(tenantDb.collection(colName));
                stats[colName] = snapshot.docs.length;
                if (snapshot.docs.length === 0) continue;
                for (let i = 0; i < snapshot.docs.length; i += 500) {
                    const batch = writeBatch(db);
                    const chunk = snapshot.docs.slice(i, i + 500);
                    chunk.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                    totalDeleted += chunk.length;
                    if (onProgress) onProgress(totalDeleted, snapshot.docs.length, colName);
                }
            } catch (e) { console.warn(`[Cleanup] Failed to clear ${colName}:`, e); }
        }
        if (loadMembersFn) await loadMembersFn();
        if (notifyListenersFn) notifyListenersFn();
        return { totalDeleted, stats };
    }
};
