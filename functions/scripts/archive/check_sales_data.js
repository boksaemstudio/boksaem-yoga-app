import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '../service-account-key.json';
let serviceAccount;

try {
    serviceAccount = require(serviceAccountPath);
} catch (e) {
    console.warn(`Warning: Could not load service account from ${serviceAccountPath}`, e.message);
}

if (!admin.apps.length) {
    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        admin.initializeApp();
    }
}

const db = admin.firestore();

async function simulateRevenueLogic() {
    console.log("=== REVENUE LOGIC SIMULATION START ===");
    
    const currentSales = [];
    const salesSnap = await db.collection('sales').get();
    salesSnap.forEach(doc => currentSales.push({ id: doc.id, ...doc.data() }));
    
    const currentMembers = [];
    const membersSnap = await db.collection('members').get();
    membersSnap.forEach(doc => currentMembers.push({ id: doc.id, ...doc.data() }));

    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const currentMonthStr = todayStr.substring(0, 7);
    console.log(`Today (KST): ${todayStr}, Target Month: ${currentMonthStr}`);

    const allRevenueItems = [];

    // Legacy Members Data
    currentMembers.forEach(m => {
        const amt = Number(m.amount) || 0;
        if (m.regDate && amt > 0) {
            allRevenueItems.push({
                id: m.id,
                memberId: m.id,
                date: m.regDate,
                amount: amt,
                name: m.name,
                type: 'legacy'
            });
        }
    });

    // New Sales Data
    currentSales.forEach(s => {
        const rawDate = s.date || s.timestamp;
        if (!rawDate) return;
        let dateStr;
        if (rawDate.includes('T')) {
            const d = new Date(rawDate);
            dateStr = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        } else {
            dateStr = rawDate;
        }

        allRevenueItems.push({
            id: s.id,
            memberId: s.memberId,
            date: dateStr,
            amount: Number(s.amount) || 0,
            name: s.memberName,
            type: s.type || 'unknown'
        });
    });

    const memberNameMap = new Map();
    currentMembers.forEach(m => memberNameMap.set(m.name, m.id));

    const salesKeys = new Set(
        allRevenueItems
            .filter(i => i.type !== 'legacy')
            .map(i => `${i.memberId || memberNameMap.get(i.name)}-${i.date}`)
    );

    const seenKeys = new Set();
    const uniqueRevenueItems = [];

    allRevenueItems.forEach(item => {
        const resolvedMemberId = item.memberId || memberNameMap.get(item.name);
        if (item.type === 'legacy') {
            const key = `${item.memberId}-${item.date}`;
            if (salesKeys.has(key)) return;
        }
        const uniqueKey = `${resolvedMemberId}-${item.date}-${item.amount}`;
        if (seenKeys.has(uniqueKey)) return;
        seenKeys.add(uniqueKey);
        uniqueRevenueItems.push(item);
    });

    async function getRevenue(branch) {
        const seenKeys = new Set();
        const uniqueRevenueItems = [];
        const memberNameMap = new Map();
        currentMembers.forEach(m => memberNameMap.set(m.name, m.id));

        const salesKeys = new Set(
            allRevenueItems
                .filter(i => i.type !== 'legacy')
                .map(i => `${i.memberId || memberNameMap.get(i.name)}-${i.date}`)
        );

        allRevenueItems.forEach(item => {
            const member = currentMembers.find(m => m.id === item.memberId);
            const saleBranch = item.branchId; // allRevenueItems에 branchId를 담아야 함
            const memberBranch = member?.homeBranch;

            if (branch !== 'all') {
                const matchFound = (saleBranch && saleBranch === branch) || 
                                   (!saleBranch && memberBranch && memberBranch === branch);
                if (!matchFound) return;
            }

            const resolvedMemberId = item.memberId || memberNameMap.get(item.name);
            if (item.type === 'legacy') {
                const key = `${item.memberId}-${item.date}`;
                if (salesKeys.has(key)) return;
            }
            const uniqueKey = `${resolvedMemberId}-${item.date}-${item.amount}`;
            if (seenKeys.has(uniqueKey)) return;
            seenKeys.add(uniqueKey);
            uniqueRevenueItems.push(item);
        });

        return uniqueRevenueItems
            .filter(i => i.date.startsWith(currentMonthStr))
            .reduce((sum, item) => sum + item.amount, 0);
    }

    // New Sales Data 에 branchId 추가
    allRevenueItems.length = 0; // 초기화
    // Legacy 복구
    currentMembers.forEach(m => {
        const amt = Number(m.amount) || 0;
        if (m.regDate && amt > 0) {
            allRevenueItems.push({
                id: m.id, memberId: m.id, date: m.regDate, amount: amt, name: m.name, type: 'legacy', branchId: m.homeBranch
            });
        }
    });
    currentSales.forEach(s => {
        const rawDate = s.date || s.timestamp;
        if (!rawDate) return;
        let dateStr = rawDate.includes('T') ? new Date(rawDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }) : rawDate;
        allRevenueItems.push({
            id: s.id, memberId: s.memberId, date: dateStr, amount: Number(s.amount) || 0, name: s.memberName, type: s.type || 'unknown', branchId: s.branchId
        });
    });

    const revAll = await getRevenue('all');
    const revGwang = await getRevenue('gwangheungchang');
    const revMapo = await getRevenue('mapo');

    console.log(`Computed Monthly Revenue (All): ${revAll.toLocaleString()}원`);
    console.log(`Computed Monthly Revenue (Gwang): ${revGwang.toLocaleString()}원`);
    console.log(`Computed Monthly Revenue (Mapo): ${revMapo.toLocaleString()}원`);

    console.log("=== REVENUE LOGIC SIMULATION COMPLETE ===");
}

simulateRevenueLogic().catch(console.error);
