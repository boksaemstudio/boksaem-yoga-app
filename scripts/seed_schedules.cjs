const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// 한 달 스케줄을 랜덤으로 가득 채우는 함수
function generateMonthlyClasses(branchId, year, month) {
    const classes = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // 요일별 스케줄 템플릿 (0: 일, 1: 월 ... 6: 토)
    const templates = {
        1: [
            { classTime: "09:00", className: "모닝 요가", instructor: "김수현", capacity: 15 },
            { classTime: "12:00", className: "런치 힐링 요가", instructor: "이지은", capacity: 20 },
            { classTime: "18:30", className: "하타 요가 기본", instructor: "박서준", capacity: 15 },
            { classTime: "20:00", className: "빈야사 플로우", instructor: "이지은", capacity: 20 },
        ],
        2: [
            { classTime: "09:30", className: "체형 교정 필라테스", instructor: "최민지", capacity: 10 },
            { classTime: "19:00", className: "아쉬탕가 프라이머리", instructor: "정우성", capacity: 15 },
            { classTime: "20:30", className: "인요가 & 명상", instructor: "김수현", capacity: 20 },
        ],
        3: [
            { classTime: "09:00", className: "모닝 요가", instructor: "김수현", capacity: 15 },
            { classTime: "14:00", className: "테라피 요가", instructor: "최민지", capacity: 20 },
            { classTime: "18:30", className: "하타 (심화)", instructor: "박서준", capacity: 15 },
            { classTime: "20:00", className: "비트 빈야사", instructor: "이지은", capacity: 20 },
        ],
        4: [
            { classTime: "09:30", className: "체형 교정 필라테스", instructor: "최민지", capacity: 10 },
            { classTime: "19:00", className: "아쉬탕가 스탠딩", instructor: "정우성", capacity: 15 },
            { classTime: "20:30", className: "릴렉스 요가", instructor: "김수현", capacity: 20 },
        ],
        5: [
            { classTime: "09:00", className: "빈야사 요가", instructor: "이지은", capacity: 20 },
            { classTime: "18:30", className: "불금 파워 요가", instructor: "정우성", capacity: 20 },
            { classTime: "20:00", className: "와인 & 플로우", instructor: "박서준", capacity: 20 },
        ],
        6: [
            { classTime: "10:00", className: "주말 하타 요가 (90분)", instructor: "박서준", capacity: 30 },
            { classTime: "12:00", className: "초보를 위한 요가", instructor: "김수현", capacity: 20 },
        ],
        0: [
            { classTime: "10:00", className: "선데이 힐링 (인요가)", instructor: "최민지", capacity: 20 }
        ]
    };

    const getRandomAttendees = (capacity) => {
        return Array.from({ length: Math.floor(Math.random() * (capacity - 2)) + 2 }, (_, i) => `user_${i}`);
    };

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay();
        const dailyTemplates = templates[dayOfWeek] || [];

        dailyTemplates.forEach((temp, index) => {
            const classId = `class_${branchId}_${year}${String(month).padStart(2,'0')}${String(day).padStart(2,'0')}_${index}`;
            const attendeeCount = Math.floor(Math.random() * temp.capacity * 0.8) + 1; // 1~80% 예약
            classes.push({
                id: classId,
                classTime: temp.classTime,
                className: temp.className,
                instructor: temp.instructor,
                capacity: temp.capacity,
                attendees: getRandomAttendees(attendeeCount),
                waitlist: Math.random() > 0.8 ? ['wait_1'] : [],
                date: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            });
        });
    }

    return classes;
}

// 달별 스케줄 데이터를 청크 단위로 분할(저장 제한 우회)
function chunkClasses(classes) {
    const chunks = {};
    classes.forEach(cls => {
        const key = `${cls.date}`;
        if (!chunks[key]) chunks[key] = [];
        chunks[key].push(cls);
    });
    return chunks;
}

async function seedSchedule(tenantId) {
    console.log(`\n📅 Seeding schedule for ${tenantId}...`);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    const tenantDb = db.collection('studios').doc(tenantId);
    
    // 1. 기존 스케줄 데이터 싹 날리기 (강남, 홍대 등 찌꺼기 제거)
    const schedulesRef = tenantDb.collection('monthly_schedules');
    const oldDocs = await schedulesRef.get();
    const batchDelete = db.batch();
    oldDocs.forEach(doc => batchDelete.delete(doc.ref));
    await batchDelete.commit();
    console.log(`- Cleared old branches & schedules`);

    // 2. 'main' (본점) 지점으로 이번 달, 다음 달 꽉 채운 데이터 생성
    const branchId = 'main';
    const thisMonthClasses = generateMonthlyClasses(branchId, currentYear, currentMonth);
    const nextMonthClasses = generateMonthlyClasses(branchId, nextMonthYear, nextMonth);

    // 3. Document 1개 당 1개월 (너무 크면 에러나므로 구조를 맞춰 줍니다)
    // Firestore App 구조: 
    // - document ID: `${branchId}_${year}-${month}` (예: main_2026-03)
    // - 안에 `dailyClasses` 필드로 Object 구조
    
    const storeMonthData = async (y, m, classes) => {
        const docId = `${branchId}_${y}-${String(m).padStart(2, '0')}`;
        const chunked = chunkClasses(classes);
        await schedulesRef.doc(docId).set({
            year: y,
            month: m,
            branchId: branchId,
            dailyClasses: chunked,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`- Saved ${classes.length} classes for ${docId}`);
    };

    await storeMonthData(currentYear, currentMonth, thisMonthClasses);
    await storeMonthData(nextMonthYear, nextMonth, nextMonthClasses);

    // 4. 지점 정보를 완전히 'main' 만 남게 강제 덮어쓰기!
    const configData = {
        branches: [{ id: 'main', name: '본점', color: '#d4af37' }]
    };
    await tenantDb.set(configData, { merge: true });
    
    console.log(`✅ Schedule Seeding Complete for ${tenantId}`);
}

async function run() {
    await seedSchedule('demo-yoga');
    await seedSchedule('ssangmun-yoga');
    process.exit(0);
}

run().catch(console.error);
