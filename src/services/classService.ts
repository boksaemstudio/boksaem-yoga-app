/**
 * Class Service — Smart Class Matching & Daily Class Cache
 * TypeScript version
 */
import { getDoc } from 'firebase/firestore';
import { tenantDb } from '../utils/tenantDb';
import { getKSTTotalMinutes } from '../utils/dates';

// ── Types ──
export interface ClassInfo {
    time: string;
    title?: string;
    className?: string;
    instructor?: string;
    status?: 'normal' | 'cancelled';
    duration?: number;
    level?: string;
}

export interface MatchedClass {
    title: string;
    instructor: string;
    time: string;
    debugReason: string;
}

interface CachedEntry {
    classes: ClassInfo[];
    fetchedAt: number;
}

// ── State ──
let cachedDailyClasses: Record<string, CachedEntry> = {};
const DAILY_CLASS_CACHE_TTL = 10 * 60 * 1000;

// ── Service ──
export const classService = {
    async _refreshDailyClassCache(branchId: string, date: string | null = null): Promise<void> {
        const targetDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const cacheKey = `${branchId}_${targetDate}`;
        try {
            const docRef = tenantDb.doc('daily_classes', cacheKey);
            const docSnap = await getDoc(docRef);
            cachedDailyClasses[cacheKey] = {
                classes: docSnap.exists() ? ((docSnap.data() as { classes?: ClassInfo[] }).classes || []) : [],
                fetchedAt: Date.now()
            };
        } catch (e) {
            console.warn(`[Class] Failed to refresh daily classes for ${cacheKey}:`, e);
        }
    },

    async getCurrentClass(branchId: string, instructorName: string | null = null, membershipTypeHint: string | null = null): Promise<MatchedClass | null> {
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const cacheKey = `${branchId}_${today}`;

        const cached = cachedDailyClasses[cacheKey];
        const now = Date.now();
        const isStale = !cached || !cached.classes || cached.classes.length === 0 || (now - (cached.fetchedAt || 0)) > DAILY_CLASS_CACHE_TTL;

        if (isStale) {
            try {
                const docRef = tenantDb.doc('daily_classes', cacheKey);
                const docSnap = await getDoc(docRef);
                const classes = docSnap.exists() ? ((docSnap.data() as { classes?: ClassInfo[] }).classes || []) : [];
                cachedDailyClasses[cacheKey] = { classes, fetchedAt: Date.now() };
            } catch (e) {
                console.warn("[Class] Failed to fetch classes:", e);
                return null;
            }
        }

        let classes = (cachedDailyClasses[cacheKey]?.classes || []).filter(c => c.status !== 'cancelled');

        if (instructorName) {
            const q = instructorName.trim();
            classes = classes.filter(c => {
                const target = (c.instructor || '').trim();
                return target === q || target.includes(q) || q.includes(target);
            });
        }

        classes.sort((a, b) => a.time.localeCompare(b.time));
        if (classes.length === 0) return null;

        const currentMinutes = getKSTTotalMinutes();
        let selectedClass: ClassInfo | null = null;
        let logicReason = "No Match";

        // Priority 0: Membership Type Hint Matching
        if (membershipTypeHint) {
            const keyword = membershipTypeHint.trim().toLowerCase();
            const ignoredHints = ['일반', 'General', '심화', 'Advanced', 'ttc (지도자과정)'];
            if (!ignoredHints.includes(keyword)) {
                const hintMatchedClass = classes.find(c => {
                    const title = (c.title || c.className || '').toLowerCase();
                    return title.includes(keyword) || keyword.includes(title);
                });
                if (hintMatchedClass) {
                    return {
                        title: hintMatchedClass.title || hintMatchedClass.className || '',
                        instructor: hintMatchedClass.instructor || '',
                        time: hintMatchedClass.time,
                        debugReason: `Member권 기반 매칭: ${membershipTypeHint}`
                    };
                }
            }
        }

        // Smart Matching Algorithm
        for (let i = 0; i < classes.length; i++) {
            const cls = classes[i];
            const duration = cls.duration || 60;
            const [h, m] = cls.time.split(':').map(Number);
            const startMinutes = h * 60 + m;
            const endMinutes = startMinutes + duration;

            if (currentMinutes >= startMinutes - 30 && currentMinutes < startMinutes) {
                selectedClass = cls; logicReason = `Upcoming class: ${cls.time}`; break;
            }
            if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                const nextCls = classes[i + 1];
                if (nextCls) {
                    const [nh, nm] = nextCls.time.split(':').map(Number);
                    const nextStart = nh * 60 + nm;
                    if (currentMinutes >= nextStart - 30) {
                        selectedClass = nextCls; logicReason = `Next class priority: ${nextCls.time}`; break;
                    }
                }
                selectedClass = cls; logicReason = `Class in progress: ${cls.time}`; break;
            }
            if (currentMinutes >= startMinutes - 60 && currentMinutes < startMinutes - 30) {
                const prevCls = classes[i - 1];
                let isBlocked = false;
                if (prevCls) {
                    const [ph, pm] = prevCls.time.split(':').map(Number);
                    const prevEnd = (ph * 60 + pm) + (prevCls.duration || 60);
                    if (currentMinutes < prevEnd) isBlocked = true;
                }
                if (!isBlocked) { selectedClass = cls; logicReason = `Early check-in: ${cls.time}`; break; }
            }
        }

        // Post-Class Grace Period
        if (!selectedClass) {
            for (let i = classes.length - 1; i >= 0; i--) {
                const cls = classes[i];
                const duration = cls.duration || 60;
                const [h, m] = cls.time.split(':').map(Number);
                const endMinutes = (h * 60 + m) + duration;
                if (currentMinutes >= endMinutes && currentMinutes <= endMinutes + 30) {
                    selectedClass = cls;
                    logicReason = `Post-class grace: ${cls.time} (${currentMinutes - endMinutes}min after end)`;
                    break;
                }
            }
        }

        if (selectedClass) {
            return {
                title: selectedClass.title || selectedClass.className || '',
                instructor: selectedClass.instructor || '',
                time: selectedClass.time,
                debugReason: logicReason
            };
        }
        return null;
    },

    async getDailyClasses(branchId: string, instructorName: string | null = null, date: string | null = null): Promise<ClassInfo[]> {
        const targetDate = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const cacheKey = `${branchId}_${targetDate}`;

        const cached = cachedDailyClasses[cacheKey];
        if (!cached || !cached.classes) {
            try {
                const docRef = tenantDb.doc('daily_classes', cacheKey);
                const docSnap = await getDoc(docRef);
                const classes = docSnap.exists() ? ((docSnap.data() as { classes?: ClassInfo[] }).classes || []) : [];
                cachedDailyClasses[cacheKey] = { classes, fetchedAt: Date.now() };
            } catch { return []; }
        }

        let classes = (cachedDailyClasses[cacheKey]?.classes || []).filter(c => c.status !== 'cancelled');
        if (instructorName) {
            const target = instructorName.trim();
            classes = classes.filter(c => (c.instructor || '').trim() === target);
        }
        return classes.sort((a, b) => a.time.localeCompare(b.time));
    }
};
