import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc, query, limit as firestoreLimit } from 'firebase/firestore';
import { parseCSV } from './csvParser';

/**
 * 구매내역에서 기간(개월 수) 추출
 * @param {string} purchaseText - 구매내역 텍스트 (예: "10회권 1개월", "무제한 6개월")
 * @returns {number|null} - 개월 수 또는 null
 */
const parseDurationFromPurchase = (purchaseText) => {
    if (!purchaseText) return null;

    // "1개월", "3개월", "6개월" 등의 패턴 매칭
    const monthMatch = purchaseText.match(/(\d+)\s*개월/);
    if (monthMatch) {
        return parseInt(monthMatch[1], 10);
    }

    return null;
};

/**
 * 날짜에 개월 수를 더하여 새로운 날짜 반환
 * @param {string} dateString - YYYY-MM-DD 형식의 날짜
 * @param {number} months - 더할 개월 수
 * @returns {string} - YYYY-MM-DD 형식의 새 날짜 또는 빈 문자열
 */
const addMonths = (dateString, months) => {
    if (!dateString || !months) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
};

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

                const q = query(collection(db, colName), firestoreLimit(batchLimit));
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
            // Branch Mapping (회원번호 기반)
            // - 광흥창점이 본점으로 가장 먼저 생겼을 때는 분류하지 않았음
            // - 광흥창/마포가 명시되지 않은 경우 → 광흥창으로 기본 설정
            let branchId = 'gwangheungchang'; // Default (본점)
            const memberNumber = m['회원번호'] || '';

            if (memberNumber.includes('마포')) {
                branchId = 'mapo';
            }
            // 광흥창이 포함되어 있거나, 아무것도 없으면 광흥창 (기본값)

            // Credit Parsing (구매 내역 분석)
            let credits = 0;
            let totalCredits = 0;
            let membershipType = '일반';
            const purchaseHistory = m['구매 내역'] || '';

            // [Logic] 회원권 종류 및 횟수 분석
            if (purchaseHistory.includes('무제한')) {
                credits = 9999;
                totalCredits = 9999;
                membershipType = '무제한';
            } else {
                const creditMatch = purchaseHistory.match(/(\d+)회/);
                const monthMatch = purchaseHistory.match(/(\d+)\s*개월/);

                if (creditMatch) {
                    // 1. 횟수권 (예: "10회", "3개월 10회")
                    credits = parseInt(creditMatch[1], 10);
                    totalCredits = credits;
                    membershipType = '일반';
                } else if (monthMatch) {
                    // 2. 기간제 무제한 (예: "3개월", "1개월") - 횟수 언급 없이 기간만 있는 경우
                    credits = 9999;
                    totalCredits = 9999;
                    membershipType = '무제한';
                }
            }

            // If "심화" is in purchase history
            if (purchaseHistory.includes('심화')) membershipType = '심화';

            // Date Standardization (YYYY-MM-DD)
            const standardizeDate = (d) => {
                if (!d) return '';
                return d.replace(/\./g, '-').replace(/\//g, '-').trim();
            };

            // CSV 파일 필드 매핑:
            // - "회원번호" -> branchId 파싱 (광흥창/마포, 없으면 광흥창 기본값)
            // - "이름" -> name
            // - "휴대폰" -> phone
            // - "등록날짜" -> startDate (수련 시작일)
            // - "구매 일자" -> regDate (결제/등록 접수일)
            // - "만기일자" -> endDate (회원권 만료일)
            // - "구매 내역" -> 회원권 종류, 횟수, 기간 파싱
            const startDate = standardizeDate(m['등록날짜'] || m['등록일자']);
            const regDate = standardizeDate(m['구매 일자'] || m['등록일자']);
            const explicitEndDate = standardizeDate(m['만기일자']);

            // endDate 계산 로직:
            // 1순위: CSV에 만기일자가 있으면 그것 사용
            // 2순위: 무제한 회원권이면 'unlimited'
            // 3순위: 구매내역에서 기간 파싱하여 계산
            let endDate = explicitEndDate;

            if (!endDate && purchaseHistory.includes('무제한')) {
                endDate = 'unlimited';
            } else if (!endDate) {
                const duration = parseDurationFromPurchase(purchaseHistory);
                if (duration && startDate) {
                    endDate = addMonths(startDate, duration);
                    console.log(`[Migration] Calculated endDate for ${m['이름']}: ${startDate} + ${duration}개월 = ${endDate}`);
                }
            }

            return {
                name: m['이름'],
                phone: m['휴대폰'] || m['전화'],
                branchId,
                homeBranch: branchId,
                membershipType,
                credits,
                totalCredits,
                startDate,
                endDate,
                regDate,
                notes: '', // 빈 메모로 초기화
                phoneLast4: (m['휴대폰'] || m['전화'] || '').slice(-4), // 조회 최적화
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
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
