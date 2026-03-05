var admin = require("firebase-admin");
var serviceAccount = require("../service-account-key.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  if (!admin.apps.length)
    admin.initializeApp();
}

const db = admin.firestore();

async function fixAndCheck() {
    const today = "2026-02-15";
    const now = new Date();
    // KST 시간 계산 (간단히 +9시)
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const currentKSTMinutes = kstNow.getUTCHours() * 60 + kstNow.getUTCMinutes();
    
    console.log(`=== SYSTEM TIME CHECK (KST) ===`);
    console.log(`Current KST: ${kstNow.toUTCString()} (${currentKSTMinutes} mins)`);

    // 1. Get Official Schedule from daily_classes (Gwangheungchang & Mapo)
    const branches = ['gwangheungchang', 'mapo'];
    const officialInstructors = {}; // { "Branch | ClassName | Time": Instructor }
    const allTodayClasses = [];

    for (const branchId of branches) {
        const docId = `${branchId}_${today}`;
        const snap = await db.collection('daily_classes').doc(docId).get();
        if (snap.exists) {
            const classes = snap.data().classes || [];
            classes.forEach(c => {
                const key = `${branchId} | ${c.title} | ${c.time}`;
                officialInstructors[key] = c.instructor;
                allTodayClasses.push({ branchId, ...c });
            });
        }
    }

    console.log("\n=== OFFICIAL SCHEDULE (MONTHLY DATA) ===");
    allTodayClasses.forEach(c => {
        console.log(`[${c.branchId}] ${c.time} ${c.title} - 강사: ${c.instructor}`);
    });

    // 2. Fix '미지정' Attendance Records
    console.log("\n=== FIXING UNDESIGNATED ATTENDANCE RECORDS ===");
    const attSnap = await db.collection('attendance')
        .where('date', '==', today)
        .get();

    let fixCount = 0;
    const promises = [];

    for (const doc of attSnap.docs) {
        const data = doc.data();
        if (!data.instructor || data.instructor === '미지정') {
            // Find match in official schedule (by Branch & ClassName)
            // Note: In attendance record, we usually have branchId and className.
            // But attendance might not have 'time' saved in the same format?
            // Actually, we usually match by current time when checking in.
            // For now, let's use the ClassName + Branch matching since 'Hatta Intensive' only exists once today.
            
            const match = allTodayClasses.find(c => 
                c.branchId === data.branchId && 
                c.title === data.className
            );

            if (match && match.instructor && match.instructor !== '미지정') {
                console.log(`Fixing: ${data.memberName} (${data.className}) -> Instructor: ${match.instructor}`);
                promises.push(doc.ref.update({ instructor: match.instructor }));
                fixCount++;
            }
        }
    }

    await Promise.all(promises);
    console.log(`\n✅ Total records fixed: ${fixCount}`);

    // 3. Show Upcoming Classes
    console.log("\n=== UPCOMING CLASSES FOR TODAY ===");
    const upcoming = allTodayClasses.filter(c => {
        const [h, m] = c.time.split(':').map(Number);
        const classMinutes = h * 60 + m;
        return classMinutes >= currentKSTMinutes;
    }).sort((a, b) => a.time.localeCompare(b.time));

    if (upcoming.length === 0) {
        console.log("오늘 남은 수업이 없습니다.");
    } else {
        upcoming.forEach(c => {
            console.log(`[${c.branchId}] ${c.time} ${c.title} - 강사: ${c.instructor}`);
        });
    }
}

fixAndCheck().catch(console.error);
