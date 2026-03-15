const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, tenantDb, STUDIO_ID } = require('../helpers/common');

// 1. Helper to parse date to YYYY-MM and YYYY-MM-DD
function parseSalesDate(saleData) {
    let dateStr;
    const rawDate = saleData.date || saleData.timestamp;
    if (!rawDate) return null;
    
    if (typeof rawDate === 'string' && rawDate.includes('T')) {
        dateStr = new Date(rawDate).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    } else if (typeof rawDate === 'object' && rawDate.toDate) {
        dateStr = rawDate.toDate().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    } else {
        dateStr = String(rawDate); 
    }
    return dateStr;
}

// 2. Realtime Trigger: On Sale Created
exports.onSalesCreatedV2 = onDocumentCreated(`studios/{studioId}/sales/{saleId}`, async (event) => {
    const data = event.data.data();
    if (!data) return;

    const dateStr = parseSalesDate(data);
    if (!dateStr || dateStr.length < 10) return;

    const amount = Number(data.amount) || 0;
    if (amount <= 0) return;

    const isNew = data.type === 'register' || (!data.type && data.isNew !== false);
    const yearMonth = dateStr.substring(0, 7);
    const day = dateStr.substring(0, 10);

    const tdb = tenantDb();
    const statsRef = tdb.collection('stats').doc('revenue_summary');
    
    await tdb.raw().runTransaction(async (t) => {
        const doc = await t.get(statsRef);
        const stats = doc.exists ? doc.data() : { total: 0, monthly: {}, daily: {} };

        stats.total = (stats.total || 0) + amount;
        
        if (!stats.monthly) stats.monthly = {};
        if (!stats.monthly[yearMonth]) stats.monthly[yearMonth] = { total: 0, new: 0, reReg: 0 };
        stats.monthly[yearMonth].total += amount;
        if (isNew) stats.monthly[yearMonth].new += amount;
        else stats.monthly[yearMonth].reReg += amount;
        
        if (!stats.daily) stats.daily = {};
        if (!stats.daily[day]) stats.daily[day] = { total: 0, new: 0, reReg: 0 };
        stats.daily[day].total += amount;
        if (isNew) stats.daily[day].new += amount;
        else stats.daily[day].reReg += amount;
        
        stats.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        t.set(statsRef, stats, { merge: true });
    });
});

// 3. Realtime Trigger: On Sale Deleted
exports.onSalesDeletedV2 = onDocumentDeleted(`studios/{studioId}/sales/{saleId}`, async (event) => {
    const data = event.data.data();
    if (!data) return;

    const dateStr = parseSalesDate(data);
    if (!dateStr || dateStr.length < 10) return;

    const amount = Number(data.amount) || 0;
    if (amount <= 0) return;

    const isNew = data.type === 'register' || (!data.type && data.isNew !== false);
    const yearMonth = dateStr.substring(0, 7);
    const day = dateStr.substring(0, 10);

    const tdb = tenantDb();
    const statsRef = tdb.collection('stats').doc('revenue_summary');
    
    await tdb.raw().runTransaction(async (t) => {
        const doc = await t.get(statsRef);
        if (!doc.exists) return;
        const stats = doc.data();

        stats.total = Math.max(0, (stats.total || 0) - amount);
        
        if (stats.monthly && stats.monthly[yearMonth]) {
            stats.monthly[yearMonth].total = Math.max(0, stats.monthly[yearMonth].total - amount);
            if (isNew) stats.monthly[yearMonth].new = Math.max(0, stats.monthly[yearMonth].new - amount);
            else stats.monthly[yearMonth].reReg = Math.max(0, stats.monthly[yearMonth].reReg - amount);
        }
        
        if (stats.daily && stats.daily[day]) {
            stats.daily[day].total = Math.max(0, stats.daily[day].total - amount);
            if (isNew) stats.daily[day].new = Math.max(0, stats.daily[day].new - amount);
            else stats.daily[day].reReg = Math.max(0, stats.daily[day].reReg - amount);
        }
        
        stats.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        t.update(statsRef, stats);
    });
});

// 4. Callable Function: Manual Recalculate (Admin Only)
exports.recalculateAllSalesV2 = onCall(async (request) => {
    if (!request.auth || !request.auth.token.admin) {
        throw new HttpsError('permission-denied', 'Only administrators can perform this action.');
    }

    const tdb = tenantDb();
    const membersSnap = await tdb.collection('members').get();
    const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const salesSnap = await tdb.collection('sales').get();
    const sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const memberNameMap = new Map();
    members.forEach(m => memberNameMap.set(m.name, m.id));

    const salesKeySet = new Set();
    const memberIdsWithRegisterSales = new Set();
    const validSales = [];

    sales.forEach(s => {
        const resolvedMemberId = s.memberId || memberNameMap.get(s.memberName);
        const member = members.find(m => m.id === resolvedMemberId);
        
        const dateStr = parseSalesDate(s);
        if (!dateStr || dateStr.length < 10) return;

        let isNew = false;
        if (s.type === 'extend') isNew = false;
        else if (s.type === 'register' || !s.type) {
            if (member && member.regDate === dateStr) isNew = true;
            else isNew = false;
        }

        const rawAmount = Number(s.amount) || 0;
        if (resolvedMemberId) {
            if (s.type === 'register' || s.type === 'legacy' || (!s.type && isNew)) {
                memberIdsWithRegisterSales.add(resolvedMemberId);
            }
            salesKeySet.add(`${resolvedMemberId}_${dateStr}`);
        }
        validSales.push({ date: dateStr, amount: rawAmount, isNew });
    });

    members.forEach(m => {
        const amt = Number(m.amount) || 0;
        if (m.regDate && amt > 0) {
            if (typeof m.regDate !== 'string' || m.regDate.length < 10) return;
            if (memberIdsWithRegisterSales.has(m.id)) return;
            if (salesKeySet.has(`${m.id}_${m.regDate}`)) return;
            validSales.push({ date: m.regDate, amount: amt, isNew: true });
        }
    });

    const stats = {
        total: 0, monthly: {}, daily: {}, updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    validSales.forEach(s => {
        const yearMonth = s.date.substring(0, 7);
        const day = s.date.substring(0, 10);
        
        stats.total += s.amount;
        if (!stats.monthly[yearMonth]) stats.monthly[yearMonth] = { total: 0, new: 0, reReg: 0 };
        stats.monthly[yearMonth].total += s.amount;
        if (s.isNew) stats.monthly[yearMonth].new += s.amount;
        else stats.monthly[yearMonth].reReg += s.amount;
        
        if (!stats.daily[day]) stats.daily[day] = { total: 0, new: 0, reReg: 0 };
        stats.daily[day].total += s.amount;
        if (s.isNew) stats.daily[day].new += s.amount;
        else stats.daily[day].reReg += s.amount;
    });

    await tdb.collection('stats').doc('revenue_summary').set(stats);
    return { success: true, processedCount: validSales.length, totalRevenue: stats.total };
});
