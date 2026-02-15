import { db, auth } from "../firebase";
import {
    collection,
    getDocs,
    getDoc,
    setDoc,
    doc,
    query,
    where,
    writeBatch
} from "firebase/firestore";
import { STUDIO_CONFIG } from '../studioConfig';

// [Refactoring] Extracted from storage.js for better modularity

// Helper to get daily classes
export const getMonthlyClasses = async (branchId, year, month) => {
    if (!branchId) return {};

    const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month).padStart(2, '0')}-31`;

    const q = query(
        collection(db, 'daily_classes'),
        where('branchId', '==', branchId),
        where('date', '>=', startStr),
        where('date', '<=', endStr)
    );

    try {
        const snapshot = await getDocs(q);
        const monthlyData = {};
        snapshot.docs.forEach(doc => {
            monthlyData[doc.data().date] = doc.data().classes;
        });
        return monthlyData;
    } catch (e) {
        console.warn("Failed to fetch monthly classes:", e);
        return {};
    }
};

export const getMonthlyScheduleStatus = async (branchId, year, month) => {
    try {
        const metaDocId = `${branchId}_${year}_${month}`;
        const metaRef = doc(db, 'monthly_schedules', metaDocId);
        const metaSnap = await getDoc(metaRef);

        if (metaSnap.exists()) {
            return { exists: true, isSaved: metaSnap.data().isSaved };
        }

        // [FALLBACK] Check if 'daily_classes' exist for a sample day (e.g. 1st day)
        const sampleDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const dailyRef = doc(db, 'daily_classes', `${branchId}_${sampleDate}`);
        const dailySnap = await getDoc(dailyRef);

        if (dailySnap.exists()) {
            return { exists: true, isSaved: true, isLegacy: true };
        }

        // Try checking a few more days just in case 1st is empty/holiday
        for (let d = 2; d <= 5; d++) {
            const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dRef = doc(db, 'daily_classes', `${branchId}_${dStr}`);
            const dSnap = await getDoc(dRef);
            if (dSnap.exists()) return { exists: true, isSaved: true, isLegacy: true };
        }

        return { exists: false, isSaved: false };
    } catch (e) {
        console.warn("Status check failed:", e);
        return { exists: false, isSaved: false };
    }
};

export const updateDailyClasses = async (branchId, date, classes) => {
    try {
        const docRef = doc(db, 'daily_classes', `${branchId}_${date}`);
        await setDoc(docRef, {
            branchId,
            date,
            classes,
            updatedAt: new Date().toISOString()
        });
        return { success: true };
    } catch (e) {
        console.error("Update daily classes failed:", e);
        throw e;
    }
};

export const batchUpdateDailyClasses = async (branchId, updates) => {
    try {
        const batch = writeBatch(db);
        updates.forEach(update => {
            const docRef = doc(db, 'daily_classes', `${branchId}_${update.date}`);
            batch.set(docRef, {
                branchId,
                date: update.date,
                classes: update.classes,
                updatedAt: new Date().toISOString()
            });
        });
        await batch.commit();
        return { success: true };
    } catch (e) {
        console.error("Batch update failed:", e);
        throw e;
    }
};

// [NEW] Smart Creation Logic
export const createMonthlySchedule = async (branchId, year, month) => {
    console.log(`[Schedule] Creating for ${branchId} ${year}-${month}`);
    try {
        // 1. Fetch Weekly Template (Blueprint) from Firestore
        const templateRef = doc(db, 'weekly_templates', branchId);
        const templateSnap = await getDoc(templateRef);

        let template = [];
        if (templateSnap.exists()) {
            template = templateSnap.data().classes || [];
        } else {
            console.warn("Weekly template not found in Firestore, using config fallback.");
            template = STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE[branchId] || [];
        }

        // We delegate the logic back to the helper if passed, or implement it here?
        // Ideally duplicate helper here or import it.
        // Looking at storage.js, _generateScheduleFromTemplate seems missing in the view?
        // Wait, I missed _generateScheduleFromTemplate in the preview of storage.js!
        // It must be there but I missed it. I will implement it here to be safe.

        return generateScheduleFromTemplateImpl(branchId, year, month, template);
    } catch (e) {
        console.error("Create monthly schedule failed:", e);
        throw e;
    }
};

// Internal Helper Implementation
const generateScheduleFromTemplateImpl = async (branchId, year, month, template) => {
    const updates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const getDayName = (date) => ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

    // Transform template into map for easier lookup: "월" -> [Classes]
    const templateMap = {};
    template.forEach(cls => {
        cls.days.forEach(day => {
            if (!templateMap[day]) templateMap[day] = [];
            templateMap[day].push(cls);
        });
    });

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        const dayName = getDayName(date);
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        const classes = templateMap[dayName] || [];

        // Clean up classes
        const cleanedClasses = classes.map(cls => ({
            time: cls.startTime, // Map startTime -> time
            title: cls.className, // Map className -> title
            instructor: cls.instructor || '미지정',
            status: 'normal',
            level: cls.level || '',
            duration: cls.duration || 60
        }));

        updates.push({ date: dateStr, classes: cleanedClasses });
    }

    await batchUpdateDailyClasses(branchId, updates);

    // Save Metadata
    const metaDocId = `${branchId}_${year}_${month}`;
    await setDoc(doc(db, 'monthly_schedules', metaDocId), {
        branchId, year, month, isSaved: true, createdAt: new Date().toISOString(), createdBy: auth.currentUser?.email || 'admin'
    });

    return { success: true };
}


export const copyMonthlySchedule = async (branchId, fromYear, fromMonth, toYear, toMonth) => {
    try {
        console.log(`Copying schedule from ${fromYear}-${fromMonth} to ${toYear}-${toMonth}`);

        // Helper to get day name
        const getDayName = (date) => ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

        // 1. Scan Source Month Data
        const daysInSourceMonth = new Date(fromYear, fromMonth, 0).getDate();
        const fetchPromises = [];
        for (let d = 1; d <= daysInSourceMonth; d++) {
            const dStr = `${fromYear}-${String(fromMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            fetchPromises.push(getDoc(doc(db, 'daily_classes', `${branchId}_${dStr}`)).then(snap => ({ day: d, date: new Date(fromYear, fromMonth - 1, d), exists: snap.exists(), data: snap.data() })));
        }

        const results = await Promise.all(fetchPromises);
        const validDays = results.filter(r => r.exists && r.data.classes && r.data.classes.length > 0);

        if (validDays.length === 0) {
            throw new Error("지난 달 데이터가 전혀 없어 복사할 수 없습니다. 먼저 지난 달 스케줄을 확인해주세요.");
        }

        // 2. Extract "Best Template" for Weekdays
        const weeks = {};
        validDays.forEach(r => {
            const dayIdx = r.date.getDay();
            if (dayIdx === 0 || dayIdx === 6) return;

            const weekNum = Math.ceil(r.day / 7);
            if (!weeks[weekNum]) weeks[weekNum] = [];
            weeks[weekNum].push(r);
        });

        let bestWeekNum = null;
        let maxScore = -1;

        Object.entries(weeks).forEach(([weekNum, days]) => {
            const score = days.reduce((acc, curr) => acc + (curr.data.classes.length || 0), 0);
            if (score > maxScore) {
                maxScore = score;
                bestWeekNum = weekNum;
            }
        });

        const weekdayTemplate = {};
        if (bestWeekNum && weeks[bestWeekNum]) {
            weeks[bestWeekNum].forEach(r => {
                weekdayTemplate[getDayName(r.date)] = r.data.classes;
            });
        } else {
            validDays.forEach(r => {
                const name = getDayName(r.date);
                if (name !== '토' && name !== '일' && !weekdayTemplate[name]) {
                    weekdayTemplate[name] = r.data.classes;
                }
            });
        }

        // 3. Collect Saturdays
        const sourceSaturdays = validDays
            .filter(r => r.date.getDay() === 6)
            .sort((a, b) => a.day - b.day)
            .map(r => r.data.classes);

        // 4. Generate Target Month
        const updates = [];
        const daysInTargetMonth = new Date(toYear, toMonth, 0).getDate();
        let saturdayIndex = 0;

        for (let d = 1; d <= daysInTargetMonth; d++) {
            const targetDate = new Date(toYear, toMonth - 1, d);
            const dayName = getDayName(targetDate);
            const dateStr = `${toYear}-${String(toMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            let classesToCopy = [];

            if (dayName === '토') {
                if (sourceSaturdays.length > 0) {
                    classesToCopy = sourceSaturdays[saturdayIndex % sourceSaturdays.length];
                    saturdayIndex++;
                }
            } else if (dayName === '일') {
                classesToCopy = weekdayTemplate['일'] || [];
            } else {
                classesToCopy = weekdayTemplate[dayName] || [];
            }

            if (classesToCopy && classesToCopy.length > 0) {
                const cleanedClasses = classesToCopy.map(cls => ({
                    time: cls.time,
                    title: cls.title,
                    instructor: cls.instructor,
                    status: 'normal',
                    level: cls.level || '',
                    duration: cls.duration || 60
                }));
                updates.push({ date: dateStr, classes: cleanedClasses });
            }
        }

        if (updates.length > 0) {
            await batchUpdateDailyClasses(branchId, updates);

            const metaDocId = `${branchId}_${toYear}_${toMonth}`;
            await setDoc(doc(db, 'monthly_schedules', metaDocId), {
                branchId, year: toYear, month: toMonth, isSaved: true, createdAt: new Date().toISOString(), createdBy: auth.currentUser?.email || 'admin'
            });

            return { success: true, message: `지난달 데이터를 기반으로 새 스케줄이 생성되었습니다.\n(평일: ${bestWeekNum || 1}주차 패턴, 토요일: 순차 적용)` };
        }

        return { success: false, message: "복사할 데이터가 없습니다." };

    } catch (e) {
        console.error("Copy schedule failed:", e);
        throw e;
    }
};

export const deleteMonthlySchedule = async (branchId, year, month) => {
    try {
        console.log(`Deleting schedule for ${branchId} ${year}-${month}`);

        const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
        const endStr = `${year}-${String(month).padStart(2, '0')}-31`;

        const q = query(
            collection(db, 'daily_classes'),
            where('branchId', '==', branchId),
            where('date', '>=', startStr),
            where('date', '<=', endStr)
        );

        const snapshot = await getDocs(q);

        const batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
            count++;
        });

        const metaDocId = `${branchId}_${year}_${month}`;
        batch.delete(doc(db, 'monthly_schedules', metaDocId));

        if (count > 0 || snapshot.empty) await batch.commit();

        return { success: true, count };
    } catch (e) {
        console.error("Delete schedule failed:", e);
        throw e;
    }
};

// Config Getters
export const getInstructors = async () => {
    try {
        const docSnap = await getDoc(doc(db, 'settings', 'instructors'));
        if (docSnap.exists() && docSnap.data().list) return docSnap.data().list;

        const instructors = new Set();
        Object.values(STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE).forEach(schedule => {
            schedule.forEach(cls => {
                if (cls.instructor) instructors.add(cls.instructor);
            });
        });
        return Array.from(instructors).sort();
    } catch (e) {
        console.warn("Failed to load instructors:", e);
        return ['원장', '한아', '정연', '미선', '희정', '보윤', '소영', '은혜', '혜실', '세연', 'anu', '송미', '다나', '리안', '성희', '효원', '희연'];
    }
};

export const getClassTypes = async () => {
    try {
        const docSnap = await getDoc(doc(db, 'settings', 'classTypes'));
        if (docSnap.exists() && docSnap.data().list) return docSnap.data().list;

        const types = new Set();
        Object.values(STUDIO_CONFIG.DEFAULT_SCHEDULE_TEMPLATE).forEach(schedule => {
            schedule.forEach(cls => {
                if (cls.className) types.add(cls.className);
            });
        });
        return Array.from(types).sort();
    } catch (e) {
        console.warn("Failed to load class types:", e);
        return ['하타', '마이솔', '아쉬탕가', '인요가', '하타+인', '하타인텐시브', '임신부요가', '플라잉', '키즈플라잉', '빈야사', '인양요가', '힐링', '로우플라잉'];
    }
};

export const getClassLevels = async () => {
    try {
        const docSnap = await getDoc(doc(db, 'settings', 'classLevels'));
        if (docSnap.exists() && docSnap.data().list) return docSnap.data().list;
        return ['0.5', '1', '1.5', '2'];
    } catch {
        return ['0.5', '1', '1.5', '2'];
    }
};

export const updateInstructors = async (list) => {
    try {
        await setDoc(doc(db, 'settings', 'instructors'), { list, updatedAt: new Date().toISOString() }, { merge: true });
        return { success: true };
    } catch (e) {
        console.error("Failed to update instructors:", e);
        throw e;
    }
};

export const updateClassTypes = async (list) => {
    try {
        await setDoc(doc(db, 'settings', 'classTypes'), { list, updatedAt: new Date().toISOString() }, { merge: true });
        return { success: true };
    } catch (e) {
        console.error("Failed to update class types:", e);
        throw e;
    }
};

export const updateClassLevels = async (list) => {
    try {
        await setDoc(doc(db, 'settings', 'classLevels'), { list, updatedAt: new Date().toISOString() }, { merge: true });
        return { success: true };
    } catch (e) {
        console.error("Failed to update class levels:", e);
        throw e;
    }
};
