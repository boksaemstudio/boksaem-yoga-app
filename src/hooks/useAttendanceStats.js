import { useMemo } from 'react';

/**
 * Custom hook for calculating attendance statistics
 * 출석 통계 계산을 위한 커스텀 훅
 * 
 * @param {Array} attendanceLogs - 출석 로그 배열
 * @param {string} memberId - 회원 ID (선택적, 특정 회원의 통계만 계산)
 * @returns {Object} 통계 객체
 */
export const useAttendanceStats = (attendanceLogs = [], memberId = null) => {
    const stats = useMemo(() => {
        if (!attendanceLogs || attendanceLogs.length === 0) {
            return {
                total: 0,
                byClass: {},
                byBranch: {},
                byMonth: {},
                recent: [],
                streak: 0
            };
        }

        // Filter by memberId if provided
        const logs = memberId
            ? attendanceLogs.filter(log => log.memberId === memberId)
            : attendanceLogs;

        // Total attendance count
        const total = logs.length;

        // Count by class type
        const byClass = {};
        logs.forEach(log => {
            const className = log.className || '자율수련';
            byClass[className] = (byClass[className] || 0) + 1;
        });

        // Count by branch
        const byBranch = {};
        logs.forEach(log => {
            const branchId = log.branchId || 'unknown';
            byBranch[branchId] = (byBranch[branchId] || 0) + 1;
        });

        // Count by month (YYYY-MM format)
        const byMonth = {};
        logs.forEach(log => {
            if (log.timestamp) {
                const kstDate = new Date(log.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                const month = kstDate.substring(0, 7); // Extract YYYY-MM
                byMonth[month] = (byMonth[month] || 0) + 1;
            }
        });

        // Get recent logs (last 10)
        const recent = [...logs]
            .sort((a, b) => {
                const timeA = a.timestamp || '';
                const timeB = b.timestamp || '';
                return timeB.localeCompare(timeA);
            })
            .slice(0, 10);

        // Calculate attendance streak (consecutive days)
        let streak = 0;
        if (logs.length > 0) {
            const sortedLogs = [...logs].sort((a, b) => {
                const timeA = a.timestamp || '';
                const timeB = b.timestamp || '';
                return timeB.localeCompare(timeA);
            });

            const uniqueDates = [...new Set(
                sortedLogs.map(log => {
                    if (!log.timestamp) return null;
                    return new Date(log.timestamp).toLocaleDateString('sv-SE', {
                        timeZone: 'Asia/Seoul'
                    });
                }).filter(Boolean)
            )];

            if (uniqueDates.length > 0) {
                streak = 1;
                const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

                // Start from most recent date
                let currentDate = new Date(uniqueDates[0]);

                // Only count if most recent attendance is today or yesterday
                const todayDate = new Date(today);
                const daysDiff = Math.floor((todayDate - currentDate) / (1000 * 60 * 60 * 24));

                if (daysDiff <= 1) {
                    for (let i = 1; i < uniqueDates.length; i++) {
                        const prevDate = new Date(uniqueDates[i]);
                        const diff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));

                        if (diff === 1) {
                            streak++;
                            currentDate = prevDate;
                        } else {
                            break;
                        }
                    }
                } else {
                    streak = 0;
                }
            }
        }

        return {
            total,
            byClass,
            byBranch,
            byMonth,
            recent,
            streak
        };
    }, [attendanceLogs, memberId]);

    return stats;
};

/**
 * Custom hook for calculating average attendance per period
 * 기간별 평균 출석 계산을 위한 커스텀 훅
 * 
 * @param {Array} attendanceLogs - 출석 로그 배열
 * @param {number} days - 기간 (일수)
 * @returns {number} 평균 출석 횟수
 */
export const useAverageAttendance = (attendanceLogs = [], days = 30) => {
    return useMemo(() => {
        if (!attendanceLogs || attendanceLogs.length === 0) return 0;

        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - days);

        const recentLogs = attendanceLogs.filter(log => {
            if (!log.timestamp) return false;
            const logDate = new Date(log.timestamp);
            return logDate >= startDate && logDate <= today;
        });

        return Math.round((recentLogs.length / days) * 10) / 10; // Round to 1 decimal
    }, [attendanceLogs, days]);
};

/**
 * Custom hook for getting attendance on a specific date
 * 특정 날짜의 출석 기록을 가져오는 커스텀 훅
 * 
 * @param {Array} attendanceLogs - 출석 로그 배열
 * @param {string} date - 날짜 문자열 (YYYY-MM-DD)
 * @param {string} branchId - 지점 ID (선택적)
 * @returns {Array} 해당 날짜의 출석 로그
 */
export const useAttendanceByDate = (attendanceLogs = [], date, branchId = null) => {
    return useMemo(() => {
        if (!attendanceLogs || !date) return [];

        return attendanceLogs.filter(log => {
            if (!log.timestamp) return false;

            const logDate = new Date(log.timestamp).toLocaleDateString('sv-SE', {
                timeZone: 'Asia/Seoul'
            });

            const dateMatch = logDate === date;
            const branchMatch = !branchId || log.branchId === branchId;

            return dateMatch && branchMatch;
        });
    }, [attendanceLogs, date, branchId]);
};
