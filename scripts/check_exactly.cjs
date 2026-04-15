const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '..', 'functions', 'service-account-key.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Mock toKSTDateString exactly as it behaves
const toKSTDateString = (d) => {
    const localMs = d.getTime();
    if (isNaN(localMs)) return '';
    try {
        const localDate = new Date(localMs);
        return localDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    } catch {
        return '';
    }
};

// Mock guessClassTime
const guessClassTime = (log) => {
    if (log.classTime && log.classTime !== '00:00') return log.classTime;
    if (!log.timestamp) return null;
    let d;
    if (log.timestamp && typeof log.timestamp.toDate === 'function') d = log.timestamp.toDate();
    else if (log.timestamp && log.timestamp._seconds) d = new Date(log.timestamp._seconds * 1000);
    else d = new Date(log.timestamp);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
};

const guessClassInfo = (log) => {
    if (!log.timestamp) return null;
    const time = guessClassTime(log);
    const className = (log.className && log.className !== '일반') ? log.className : '일반';
    const instructor = (log.instructor && log.instructor !== '선생님') ? log.instructor : '미지정';
    return { startTime: time || '00:00', className, instructor };
};

async function checkDetails() {
    const tenantDb = db.collection('studios').doc('boksaem-yoga');
    
    // 1. Fetch exactly like setupAttendanceListener (last 1000)
    const snap = await tenantDb.collection('attendance')
        .orderBy('timestamp', 'desc').limit(1000).get();
        
    const logs = [];
    snap.forEach(d => logs.push({ id: d.id, ...d.data() }));

    const currentBranch = 'gwangheungchang';
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    
    const branchLogs = currentBranch === 'all' ? logs : logs.filter(l => l.branchId === currentBranch);
    
    const enrichedBranchLogs = branchLogs.map(l => {
        if (!l.timestamp) return { ...l, isValidDate: false, logDate: '' };
        let d;
        if (l.timestamp && typeof l.timestamp.toDate === 'function') d = l.timestamp.toDate();
        else if (l.timestamp && l.timestamp._seconds) d = new Date(l.timestamp._seconds * 1000);
        else d = new Date(l.timestamp);
        return {
            ...l,
            isValidDate: true,
            logDate: toKSTDateString(d)
        };
    });
    
    const todayLogs = enrichedBranchLogs.filter(l => 
        l.isValidDate && l.logDate === todayStr && (currentBranch === 'all' || l.branchId === currentBranch)
    );
    
    const classGroups = {};
    
    todayLogs.forEach(log => {
        const info = guessClassInfo(log);
        const classTime = info?.startTime || '00:00';
        const canonicalClassName = info?.className || log.className || '일반';
        const canonicalInstructor = info?.instructor || log.instructor || '선생님';

        const key = canonicalClassName === '자율수련'
            ? `${canonicalClassName}-${log.branchId}`
            : `${canonicalClassName}-${canonicalInstructor}-${log.branchId}-${classTime}`;
        
        if (!classGroups[key]) {
            classGroups[key] = {
                className: canonicalClassName,
                instructor: canonicalClassName === '자율수련' ? '회원' : canonicalInstructor,
                branchId: log.branchId,
                classTime: canonicalClassName === '자율수련' ? '' : classTime,
                count: 0,
                memberNames: []
            };
        }
        if (log.status !== 'denied') {
            classGroups[key].count++;
            if (log.memberName) {
                if (!classGroups[key].memberNames.includes(log.memberName)) {
                    classGroups[key].memberNames.push(log.memberName);
                }
            }
        }
    });

    console.log("simulated classGroups keys:", Object.keys(classGroups));
    for (const k of Object.keys(classGroups)) {
        if (k.includes('마이솔')) {
            console.log(`[${k}] => ${classGroups[k].count}명`);
            console.log("  names:", classGroups[k].memberNames);
        }
    }
}
checkDetails().catch(console.error).finally(()=>process.exit(0));
