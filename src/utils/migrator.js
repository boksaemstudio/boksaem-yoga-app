import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc, query, limit } from 'firebase/firestore';
import { parseCSV } from './csvParser';

export const runMigration = async (csvText, progressCallback) => {
    try {
        console.log("Starting migration...");
        if (progressCallback) progressCallback("CSV 파싱 중...");

        const members = parseCSV(csvText);
        console.log(`Parsed ${members.length} members from CSV.`);

        if (progressCallback) progressCallback("기존 데이터 삭제 중...");

        if (progressCallback) progressCallback("기존 데이터 삭제 중...");

        // 1. Delete all existing member-related data (Clean Slate)
        // Keep: daily_classes, notices, monthly_schedules
        const collectionsToWipe = ['members', 'attendance', 'sales', 'messages', 'fcm_tokens', 'pending_approvals'];
        const batchLimit = 400; // Safe batch limit

        for (const colName of collectionsToWipe) {
            if (progressCallback) progressCallback(`기존 ${colName} 삭제 중...`);
            console.log(`Wiping collection: ${colName}`);

            while (true) {
                // [SAFETY] Fetch only a batch to avoid OOM
                // Note: We need to import query/limit. Assuming dynamic import or add imports above.
                // Since this is a utils file, let's strict import at top or use the one if available.
                // I will update imports first in next step, but for logic here:

                // We will rely on getting the full snapshot if imports are tricky, OR better: use updated imports.
                // Let's assume standard imports are updated.

                const q = query(collection(db, colName), limit(batchLimit));
                const snapshot = await getDocs(q);

                if (snapshot.size === 0) break;

                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => batch.delete(doc.ref));

                await batch.commit();
                console.log(`Deleted ${snapshot.size} docs from ${colName}`);
            }
        }

        // 2. Prepare new data
        if (progressCallback) progressCallback("데이터 변환 중...");
        const newMembers = members.map(m => {
            // Branch Mapping
            let branchId = 'mapo'; // Default
            if (m['회원번호']?.includes('광흥창') || m['회원번호']?.includes('광흥장')) branchId = 'gwangheungchang';
            else if (m['회원번호']?.includes('마포')) branchId = 'mapo';
            else if (m['주소']?.includes('광흥창')) branchId = 'gwangheungchang';

            // Credit Parsing
            let credits = 0;
            let totalCredits = 0;
            let membershipType = '일반';
            const purchaseHistory = m['구매 내역'] || '';

            if (purchaseHistory.includes('무제한')) {
                credits = 9999;
                totalCredits = 9999;
                membershipType = '무제한';
            } else {
                const creditMatch = purchaseHistory.match(/(\d+)회/);
                if (creditMatch) {
                    credits = parseInt(creditMatch[1], 10);
                    totalCredits = credits;
                }
            }
            // If "심화" is in purchase history
            if (purchaseHistory.includes('심화')) membershipType = '심화';

            // Date Standardization (YYYY-MM-DD)
            const standardizeDate = (d) => {
                if (!d) return '';
                return d.replace(/\./g, '-').replace(/\//g, '-').trim();
            };

            return {
                name: m['이름'],
                phone: m['휴대폰'] || m['전화'],
                gender: m['성별'],
                branchId,
                homeBranch: branchId,
                membershipType,
                credits,
                totalCredits,
                startDate: standardizeDate(m['등록일자'] || m['구매 일자']),
                endDate: standardizeDate(m['만기일자']),
                regDate: standardizeDate(m['등록일자']),
                memo: m['기타정보1'] || '',
                rawPurchase: purchaseHistory // Keep raw data just in case
            };
        }).filter(m => m.name); // Filter empty rows

        // 3. Upload new members
        if (progressCallback) progressCallback(`데이터 업로드 중... (0/${newMembers.length})`);

        const uploadChunks = [];
        const uploadLimit = 400; // Batch limit
        let pendingMembers = [...newMembers];

        while (pendingMembers.length > 0) {
            uploadChunks.push(pendingMembers.splice(0, uploadLimit));
        }

        let uploadedCount = 0;
        for (const chunk of uploadChunks) {
            const batch = writeBatch(db);
            chunk.forEach(member => {
                const newRef = doc(collection(db, 'members'));
                batch.set(newRef, member);
            });
            await batch.commit();
            uploadedCount += chunk.length;
            if (progressCallback) progressCallback(`데이터 업로드 중... (${uploadedCount}/${newMembers.length})`);
        }

        console.log("Migration complete!");
        return { success: true, count: uploadedCount };

    } catch (e) {
        console.error("Migration failed:", e);
        return { success: false, error: e };
    }
};
