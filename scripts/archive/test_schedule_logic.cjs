// Simulating client-side getCurrentClass logic
const STUDIO_CONFIG = {
    DEFAULT_SCHEDULE_TEMPLATE: {
        'gwangheungchang': [
            { days: ['월'], startTime: '10:00', className: '하타', instructor: '원장' },
            { days: ['월'], startTime: '14:00', className: '마이솔', instructor: '원장' },
            { days: ['월'], startTime: '19:00', className: '하타', instructor: '원장' },
            { days: ['월'], startTime: '20:20', className: '아쉬탕가', instructor: '원장' },
            { days: ['화'], startTime: '10:00', className: '아쉬탕가', instructor: '원장' },
            { days: ['화'], startTime: '14:00', className: '마이솔', instructor: '희정' },
            { days: ['화'], startTime: '19:00', className: '하타', instructor: '보윤' },
            { days: ['화'], startTime: '20:20', className: '인요가', instructor: '보윤' },
            { days: ['수'], startTime: '10:00', className: '하타+인', instructor: '미선' },
            { days: ['수'], startTime: '14:20', className: '하타인텐시브', instructor: '한아' },
            { days: ['수'], startTime: '19:00', className: '아쉬탕가', instructor: '정연' },
            { days: ['수'], startTime: '20:20', className: '하타', instructor: '정연' },
            { days: ['목'], startTime: '10:00', className: '하타', instructor: '미선' },
            { days: ['목'], startTime: '14:00', className: '마이솔', instructor: '희정' },
            { days: ['목'], startTime: '19:00', className: '하타', instructor: '미선' },
            { days: ['목'], startTime: '20:20', className: '아쉬탕가', instructor: '미선' },
            { days: ['금'], startTime: '10:00', className: '하타', instructor: '소영' },
            { days: ['금'], startTime: '14:20', className: '하타인텐시브', instructor: '은혜' },
            { days: ['금'], startTime: '19:00', className: '인요가', instructor: '한아' },
            { days: ['금'], startTime: '20:20', className: '하타', instructor: '한아' },
            { days: ['토'], startTime: '10:00', className: '하타', instructor: '원장' }, 
            { days: ['토'], startTime: '11:20', className: '아쉬탕가', instructor: '원장' },
            { days: ['일'], startTime: '11:20', className: '마이솔', instructor: '원장' },
            { days: ['일'], startTime: '14:00', className: '하타인텐시브', instructor: '원장' },
            { days: ['일'], startTime: '19:00', className: '하타', instructor: '혜실' },
        ],
    }
};

const getDayName = (dayIndex) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[dayIndex];
};

const getCurrentClass = (branchId, mockDate) => {
    const now = mockDate ? new Date(mockDate) : new Date();
    const dayName = getDayName(now.getDay());
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let classes = STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE[branchId] || [];
    
    // Filter by day
    classes = classes.filter(c => c.days.includes(dayName));
    
    // Sort by time
    classes.sort((a, b) => {
        const [h1, m1] = a.startTime.split(':').map(Number);
        const [h2, m2] = b.startTime.split(':').map(Number);
        return (h1 * 60 + m1) - (h2 * 60 + m2);
    });

    console.log(`[Schedule] ${dayName} (${branchId}): Found ${classes.length} classes`);
    classes.forEach(c => console.log(` - ${c.startTime} ${c.className}`));

    // Smart Matching Logic (Simulated)
    let selectedClass = null;
    let logicReason = '';

    // Standard loop
    for (const cls of classes) {
        const duration = cls.duration || 60; // Default 60 mins
        const [h, m] = cls.startTime.split(':').map(Number);
        const startMinutes = h * 60 + m;
        const endMinutes = startMinutes + duration;

        // 1. Next Class Incoming (30 mins before)
        if (currentMinutes >= startMinutes - 30 && currentMinutes < startMinutes) {
            selectedClass = cls;
            logicReason = `수업 전: ${cls.startTime} (시작 ${startMinutes - currentMinutes}분 전)`;
            break; 
        }

        // 2. Ongoing Class
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            selectedClass = cls;
            logicReason = `수업 중: ${cls.startTime} ~ ${Math.floor(endMinutes/60)}:${endMinutes%60}`;
            break;
        }

        // 3. Early Bird (60 mins before IF no previous class blocking)
        // (Skipped for simplicity in this script, usually priority 3)

        // 4. Post-Class Grace Period (30 mins after)
         if (currentMinutes >= endMinutes && currentMinutes <= endMinutes + 30) {
            selectedClass = cls;
            logicReason = `수업 후: ${cls.startTime} (종료 ${currentMinutes - endMinutes}분 경과)`;
            // Keep looking in case a next class starts soon? 
            // Usually we break here if we match, but priority 1 (next class) should come first in logic flow.
            // The original logic checks 'Next Class' first. 
            // So if I am at 13:50 (class starts 14:00), I match rule 1.
            // If I am at 13:20 (class ended 12:50?), match rule 4.
         }
    }
    
    return { selectedClass, logicReason };
};

// Test Cases
console.log('--- Testing Schedule Logic ---');

// Case 1: 2026-02-15 (Sun) 13:46 -> Should be Hatha Intensive (starts 14:00)
// 13:46 is 14 mins before 14:00.
console.log('\n[Case 1] 2026-02-15 13:46 (Sunday)');
const res1 = getCurrentClass('gwangheungchang', '2026-02-15T13:46:00'); // KST local time assumed for logic
if (res1.selectedClass) {
    console.log(`✅ Matched: ${res1.selectedClass.className} (${res1.logicReason})`);
} else {
    console.log('❌ No match (Fallback to Self Practice)');
}

// Case 2: 2026-02-15 (Sun) 14:10 -> Should be Hatha Intensive (Ongoing)
console.log('\n[Case 2] 2026-02-15 14:10 (Sunday)');
const res2 = getCurrentClass('gwangheungchang', '2026-02-15T14:10:00');
if (res2.selectedClass) {
     console.log(`✅ Matched: ${res2.selectedClass.className} (${res2.logicReason})`);
} else {
    console.log('❌ No match');
}

// Case 3: 2026-02-15 (Sun) 15:10 -> Should be Hatha Intensive (Grace Period, ended 15:00)
console.log('\n[Case 3] 2026-02-15 15:10 (Sunday)');
const res3 = getCurrentClass('gwangheungchang', '2026-02-15T15:10:00');
if (res3.selectedClass) {
     console.log(`✅ Matched: ${res3.selectedClass.className} (${res3.logicReason})`);
} else {
    console.log('❌ No match');
}

// Case 4: 2026-02-15 (Sun) 18:40 -> Should be Hatha (starts 19:00)
console.log('\n[Case 4] 2026-02-15 18:40 (Sunday)');
const res4 = getCurrentClass('gwangheungchang', '2026-02-15T18:40:00');
if (res4.selectedClass) {
     console.log(`✅ Matched: ${res4.selectedClass.className} (${res4.logicReason})`);
} else {
    console.log('❌ No match');
}
