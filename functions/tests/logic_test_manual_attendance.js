
// Logic Test for addManualAttendance (mocked)
const assert = require('assert');

// Mock Data
const existingSchedule = {
    classes: [
        { time: '10:00', title: 'Hatha Yoga', instructor: 'Instructor A', status: 'normal', duration: 60 },
        { time: '18:00', title: 'Vinyasa', instructor: 'Instructor B', status: 'normal', duration: 60 }
    ]
};

// The Logic to Test (extracted from storage.js)
function findMatchingClass(date, scheduleData) {
    const dayClasses = scheduleData.classes || [];
    const hour = date.getHours();
    const minute = date.getMinutes();
    const requestTimeMins = hour * 60 + minute;

    return dayClasses.find(cls => {
        if (!cls.time || cls.status === 'cancelled') return false;
        const [classHour, classMinute] = cls.time.split(':').map(Number);
        const classTimeMins = classHour * 60 + classMinute;

        // Match if within 30 minutes tolerance
        const diff = Math.abs(requestTimeMins - classTimeMins);
        return diff <= 30;
    });
}

// Run Test
(async () => {
    try {
        console.log("--- Testing Class Matching Logic ---");

        // Case 1: Exact Match
        const date1 = new Date('2026-01-26T10:00:00');
        const match1 = findMatchingClass(date1, existingSchedule);
        assert.ok(match1, "Should match 10:00 class");
        assert.strictEqual(match1.title, 'Hatha Yoga');
        console.log("PASS: Exact match");

        // Case 2: 20 mins late (should match)
        const date2 = new Date('2026-01-26T10:20:00');
        const match2 = findMatchingClass(date2, existingSchedule);
        assert.ok(match2, "Should match 10:00 class (within tolerance)");
        console.log("PASS: Tolerance match (+20m)");

        // Case 3: Too late (should fail)
        const date3 = new Date('2026-01-26T10:40:00');
        const match3 = findMatchingClass(date3, existingSchedule);
        assert.strictEqual(match3, undefined, "Should NOT match (too late)");
        console.log("PASS: No match (out of tolerance)");

        // Case 4: No schedule
        const match4 = findMatchingClass(date1, {});
        assert.strictEqual(match4, undefined, "Should NOT match (empty schedule)");
        console.log("PASS: Empty schedule handling");

        console.log("SUCCESS: Manual attendance matching logic verified.");
    } catch (e) {
        console.error("FAILURE:", e);
        process.exit(1);
    }
})();
