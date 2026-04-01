const admin = require('firebase-admin');

// Ensure you have a service account key or use default credentials if running in a suitable environment
// For local execution, ensure GOOGLE_APPLICATION_CREDENTIALS is set, or initialize with a credential file.
// In this scratchpad, we will initialize app.
const serviceAccount = require('../../service-account.json'); // Adjust path
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function recalculate() {
    console.log('Starting revenue aggregation...');
    
    // 1. Get all members for legacy calculations
    const membersSnap = await db.collection('members').get();
    const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // 2. Get all sales
    const salesSnap = await db.collection('sales').get();
    const sales = salesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const memberNameMap = new Map();
    members.forEach(m => memberNameMap.set(m.name, m.id));

    const salesKeySet = new Set();
    const memberIdsWithRegisterSales = new Set();
    const validSales = [];

    // Process Sales collection
    sales.forEach(s => {
        const resolvedMemberId = s.memberId || memberNameMap.get(s.memberName);
        const member = members.find(m => m.id === resolvedMemberId);
        
        let dateStr;
        const rawDate = s.date || s.timestamp;
        if (!rawDate) return;
        
        if (typeof rawDate === 'string' && rawDate.includes('T')) {
            const d = new Date(rawDate);
            dateStr = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        } else if (typeof rawDate === 'object' && rawDate.toDate) {
            dateStr = rawDate.toDate().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        } else {
            dateStr = String(rawDate); 
        }

        let isNew = false;
        if (s.type === 'extend') {
            isNew = false;
        } else if (s.type === 'register' || !s.type) {
            if (member && member.regDate === dateStr) {
                isNew = true;
            } else {
                isNew = false;
            }
        }

        const rawAmount = Number(s.amount) || 0;

        if (resolvedMemberId) {
            if (s.type === 'register' || s.type === 'legacy' || (!s.type && isNew)) {
                memberIdsWithRegisterSales.add(resolvedMemberId);
            }
            salesKeySet.add(`${resolvedMemberId}_${dateStr}`);
        }

        validSales.push({ date: dateStr, amount: rawAmount, isNew, branchId: s.branchId || member?.homeBranch || 'all' });
    });

    // Process Legacy 
    members.forEach(m => {
        const amt = Number(m.amount) || 0;
        if (m.regDate && amt > 0) {
            if (typeof m.regDate !== 'string' || m.regDate.length < 10) return;
            if (memberIdsWithRegisterSales.has(m.id)) return;
            if (salesKeySet.has(`${m.id}_${m.regDate}`)) return;

            validSales.push({ date: m.regDate, amount: amt, isNew: true, branchId: m.homeBranch || 'all' });
        }
    });

    // Aggregate
    const stats = {
        total: 0,
        monthly: {},
        daily: {},
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    validSales.forEach(s => {
        if (!s.date || typeof s.date !== 'string') return;
        const yearMonth = s.date.substring(0, 7); // YYYY-MM
        const day = s.date.substring(0, 10); // YYYY-MM-DD
        
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

    await db.collection('stats').doc('revenue_summary').set(stats);
    console.log('Aggregated Stats written to stats/revenue_summary', stats.total);
    process.exit(0);
}

recalculate().catch(console.error);
