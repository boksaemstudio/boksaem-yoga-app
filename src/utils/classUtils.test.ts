import { describe, it, expect } from 'vitest';
import { guessClassTime, guessClassInfo } from './classUtils';

const mockSchedule = {
    branch_a: [
        { days: ['월', '수', '금'], startTime: '10:00', className: '하타', instructor: '김선생' },
        { days: ['화', '목'], startTime: '14:00', className: '빈야사', instructor: '이선생' },
        { days: ['월', '수', '금'], startTime: '18:00', className: '심화', instructor: '박선생' },
    ]
};

describe('guessClassTime', () => {
    it('should return existing classTime if valid', () => {
        const log = { classTime: '10:00', timestamp: '2026-03-16T09:55:00' };
        expect(guessClassTime(log)).toBe('10:00');
    });

    it('should return null for missing timestamp', () => {
        expect(guessClassTime({})).toBeNull();
    });

    it('should return actual time for 자율수련', () => {
        const log = {
            className: '자율수련',
            timestamp: '2026-03-16T11:30:00', // Monday
            branchId: 'branch_a'
        };
        expect(guessClassTime(log, mockSchedule)).toBe('11:30');
    });

    it('should match by className', () => {
        // Monday 9:55 → should match 하타 at 10:00
        const log = {
            className: '하타',
            timestamp: '2026-03-16T09:55:00', // Monday
            branchId: 'branch_a'
        };
        expect(guessClassTime(log, mockSchedule)).toBe('10:00');
    });

    it('should match by instructor', () => {
        const log = {
            instructor: '김선생',
            timestamp: '2026-03-16T10:05:00', // Monday
            branchId: 'branch_a'
        };
        expect(guessClassTime(log, mockSchedule)).toBe('10:00');
    });

    it('should return actual time when no schedule matches', () => {
        const log = {
            className: '알수없는수업',
            instructor: '없는선생',
            timestamp: '2026-03-16T15:30:00',
            branchId: 'branch_a'
        };
        expect(guessClassTime(log, mockSchedule)).toBe('15:30');
    });

    it('should return actual time for too distant match (>120 min)', () => {
        const log = {
            className: '하타',
            timestamp: '2026-03-16T05:00:00', // Monday, 5am, 5 hours from 10:00
            branchId: 'branch_a'
        };
        expect(guessClassTime(log, mockSchedule)).toBe('05:00');
    });

    it('should skip classTime if value is 00:00', () => {
        const log = {
            classTime: '00:00',
            className: '하타',
            timestamp: '2026-03-16T09:55:00',
            branchId: 'branch_a'
        };
        expect(guessClassTime(log, mockSchedule)).toBe('10:00');
    });
});

describe('guessClassInfo', () => {
    it('should return null for missing timestamp', () => {
        expect(guessClassInfo({})).toBeNull();
    });

    it('should return class info for 자율수련', () => {
        const log = {
            className: '자율수련',
            timestamp: '2026-03-16T11:30:00',
            branchId: 'branch_a'
        };
        const info = guessClassInfo(log, mockSchedule);
        expect(info).not.toBeNull();
        expect(info!.className).toBe('자율수련');
        expect(info!.startTime).toBe('11:30');
    });

    it('should return matched class info', () => {
        const log = {
            className: '하타',
            instructor: '김선생',
            timestamp: '2026-03-16T10:02:00',
            branchId: 'branch_a'
        };
        const info = guessClassInfo(log, mockSchedule);
        expect(info).not.toBeNull();
        expect(info!.className).toBe('하타');
        expect(info!.instructor).toBe('김선생');
        expect(info!.startTime).toBe('10:00');
    });

    it('should prioritize log data over static template', () => {
        const log = {
            className: '커스텀수업',
            instructor: '새선생',
            timestamp: '2026-03-16T10:00:00',
            branchId: 'branch_a'
        };
        const info = guessClassInfo(log, mockSchedule);
        expect(info!.className).toBe('커스텀수업');
        expect(info!.instructor).toBe('새선생');
    });
});
