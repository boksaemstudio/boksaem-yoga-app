const getKSTTotalMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

const classes = [
  {
    "title": "마이솔",
    "duration": 60,
    "status": "normal",
    "instructor": "원장",
    "time": "11:20",
    "level": ""
  },
  {
    "title": "하타 인텐시브",
    "duration": 60,
    "status": "normal",
    "time": "14:00",
    "instructor": "원장",
    "level": ""
  },
  {
    "duration": 60,
    "level": "",
    "status": "normal",
    "title": "하타",
    "instructor": "혜실",
    "time": "19:00"
  }
];

function simulateMatch(currentTimeStr) {
    const currentMinutes = getKSTTotalMinutes(currentTimeStr);
    let selectedClass = null;
    let logicReason = "No Match";

    const sortedClasses = [...classes].sort((a, b) => a.time.localeCompare(b.time));

    for (let i = 0; i < sortedClasses.length; i++) {
        const cls = sortedClasses[i];
        const duration = cls.duration || 60;
        const [h, m] = cls.time.split(':').map(Number);
        const startMinutes = h * 60 + m;
        const endMinutes = startMinutes + duration;

        if (currentMinutes >= startMinutes - 30 && currentMinutes < startMinutes) {
            selectedClass = cls;
            logicReason = `수업 예정: ${cls.time}`;
            break;
        }

        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
            const nextCls = sortedClasses[i + 1];
            if (nextCls) {
                const [nh, nm] = nextCls.time.split(':').map(Number);
                const nextStart = nh * 60 + nm;
                if (currentMinutes >= nextStart - 30) {
                    selectedClass = nextCls;
                    logicReason = `다음 수업 우선: ${nextCls.time}`;
                    break;
                }
            }
            selectedClass = cls;
            logicReason = `수업 진행 중: ${cls.time}`;
            break;
        }

        if (currentMinutes >= startMinutes - 60 && currentMinutes < startMinutes - 30) {
            const prevCls = sortedClasses[i - 1];
            let isBlocked = false;
            if (prevCls) {
                const [ph, pm] = prevCls.time.split(':').map(Number);
                const prevEnd = (ph * 60 + pm) + (prevCls.duration || 60);
                if (currentMinutes < prevEnd) {
                    isBlocked = true;
                }
            }
            if (!isBlocked) {
                selectedClass = cls;
                logicReason = `조기 출석: ${cls.time}`;
                break;
            }
        }
    }

    if (!selectedClass) {
        for (let i = sortedClasses.length - 1; i >= 0; i--) {
            const cls = sortedClasses[i];
            const duration = cls.duration || 60;
            const [h, m] = cls.time.split(':').map(Number);
            const endMinutes = (h * 60 + m) + duration;
            if (currentMinutes >= endMinutes && currentMinutes <= endMinutes + 30) {
                selectedClass = cls;
                logicReason = `수업 종료 직후: ${cls.time}`;
                break;
            }
        }
    }

    return selectedClass ? { title: selectedClass.title, instructor: selectedClass.instructor, reason: logicReason } : null;
}

const testTimes = ["13:14", "13:42", "13:44", "13:46", "13:51", "13:53", "13:55", "13:58", "13:59"];

console.log("=== SIMULATION RESULTS ===");
testTimes.forEach(time => {
    const result = simulateMatch(time);
    console.log(`Time: ${time} -> ${result ? `${result.title} (${result.instructor}) [${result.reason}]` : "No Match"}`);
});
