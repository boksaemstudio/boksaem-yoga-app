const admin = require('firebase-admin');
const path = require('path');
const serviceAccountPath = path.resolve(__dirname, '../service-account-key.json');
try {
  const serviceAccount = require(serviceAccountPath);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (e) {
  console.log("Error loading service account, relying on default", e.message);
  if (!admin.apps.length) admin.initializeApp();
}

const db = admin.firestore();

// Helpers
const toKSTDateString = (date) => {
    const d = new Date(date);
    d.setHours(d.getHours() + 9);
    return d.toISOString().split('T')[0];
};

async function checkRevenue() {
    console.log("Fetching members and sales...");
    const membersSnap = await db.collection('members').get();
    const members = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const salesSnap = await db.collection('sales').get();
    const sales = salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const todayStr = toKSTDateString(new Date());
    const currentMonthStr = todayStr.substring(0, 7);
    const currentBranch = 'all';

    // --- useAdminData Logic ---
    let allRevenueItemsAdmin = [];
    members.forEach(m => {
        const amt = Number(m.amount) || 0;
        if (m.regDate && amt > 0) {
            allRevenueItemsAdmin.push({
                id: m.id, memberId: m.id, date: m.regDate, amount: amt, name: m.name, type: 'legacy'
            });
        }
    });

    sales.forEach(s => {
        let sDate = null;
        const rawDate = s.date || s.timestamp;
        if (rawDate) {
            if (typeof rawDate === 'string') {
                if (rawDate.includes('T')) {
                    const d = new Date(rawDate);
                    if (!isNaN(d.getTime())) sDate = toKSTDateString(d);
                } else {
                    sDate = rawDate;
                }
            } else if (rawDate.toDate) {
                sDate = toKSTDateString(rawDate.toDate());
            } else if (rawDate.seconds) {
                sDate = toKSTDateString(new Date(rawDate.seconds * 1000));
            }
        }
        if (!sDate) return;
        allRevenueItemsAdmin.push({
            id: s.id, memberId: s.memberId, date: sDate, amount: Number(s.amount) || 0, name: s.memberName, type: s.type, item: s.item
        });
    });

    const memberNameMap = new Map();
    members.forEach(m => memberNameMap.set(m.name, m.id));

    const uniqueRevenueItemsAdmin = [];
    const salesKeys = new Set(
        allRevenueItemsAdmin
            .filter(i => i.type !== 'legacy')
            .map(i => {
                 const resolvedId = i.memberId || memberNameMap.get(i.name);
                 return `${resolvedId}-${i.date}`;
            })
    );

    const seenKeys = new Set();
    let debugRemovedAdmin = [];

    allRevenueItemsAdmin.forEach(item => {
        const resolvedMemberId = item.memberId || memberNameMap.get(item.name);

        if (item.type === 'legacy') {
            const key = `${item.memberId}-${item.date}`;
            if (salesKeys.has(key)) return;
        }

        const uniqueKey = `${resolvedMemberId}-${item.date}-${item.amount}`;
        if (seenKeys.has(uniqueKey)) {
            debugRemovedAdmin.push(item);
            return;
        }
        seenKeys.add(uniqueKey);

        if (!item.memberId && resolvedMemberId) {
            uniqueRevenueItemsAdmin.push({ ...item, memberId: resolvedMemberId });
        } else {
            uniqueRevenueItemsAdmin.push(item);
        }
    });

    const monthlyRevenueAdmin = uniqueRevenueItemsAdmin
        .filter(i => i.date.startsWith(currentMonthStr))
        .reduce((sum, item) => sum + item.amount, 0);


    // --- useRevenueStats Logic ---
    const allItemsStats = [];
    const salesKeySetStats = new Set();

    sales.forEach(s => {
        let dateStr;
        const rawDate = s.date || s.timestamp;
        if (!rawDate) return;
        
        if (typeof rawDate === 'string' && rawDate.includes('T')) {
            const d = new Date(rawDate);
            // Replicate 'sv-SE' logic which uses local timezone. We'll approximate KST.
            d.setHours(d.getHours() + 9);
            dateStr = d.toISOString().split('T')[0];
        } else if (typeof rawDate === 'object' && rawDate.toDate) {
            const d = rawDate.toDate();
            d.setHours(d.getHours() + 9);
            dateStr = d.toISOString().split('T')[0];
        } else {
            dateStr = String(rawDate);
        }

        allItemsStats.push({
            id: s.id, memberId: s.memberId, date: dateStr, amount: Number(s.amount) || 0, name: s.memberName, type: s.type, item: s.item
        });
        if (s.memberId) {
            salesKeySetStats.add(`${s.memberId}_${dateStr}`);
        }
    });

    const legacyMemberDataStats = new Map();
    members.forEach(m => {
        const amt = Number(m.amount) || 0;
        if (m.regDate && amt > 0) {
            if (typeof m.regDate !== 'string' || m.regDate.length < 10) return;
            if (salesKeySetStats.has(`${m.id}_${m.regDate}`)) return;
            legacyMemberDataStats.set(m.id, {
                id: m.id, memberId: m.id, date: m.regDate, amount: amt, name: m.name, type: 'legacy', item: m.subject || '수강권'
            });
        }
    });

    const finalItemsStats = [...allItemsStats, ...Array.from(legacyMemberDataStats.values())];
    
    const dailyAmountsMap = new Map();
    finalItemsStats.forEach(item => {
        const currentObj = dailyAmountsMap.get(item.date) || { amount: 0 };
        currentObj.amount += item.amount;
        dailyAmountsMap.set(item.date, currentObj);
    });

    let monthlyRevenueStats = 0;
    // Assuming current month loop iterates over all days and reads from dailyAmountsMap
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const dKey = `${currentMonthStr}-${String(d).padStart(2, '0')}`;
        const dayData = dailyAmountsMap.get(dKey) || { amount: 0 };
        monthlyRevenueStats += dayData.amount;
    }

    console.log(`Admin Logic Revenue (${currentMonthStr}):`, monthlyRevenueAdmin);
    console.log(`Stats Logic Revenue (${currentMonthStr}):`, monthlyRevenueStats);
    console.log("Difference:", monthlyRevenueStats - monthlyRevenueAdmin);
    
    console.log("Removed by Admin Self-Deduplication this month:", debugRemovedAdmin.filter(i => i.date && i.date.startsWith(currentMonthStr)));

}

checkRevenue().catch(console.error);
