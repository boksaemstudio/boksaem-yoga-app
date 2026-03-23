import { describe, it, expect } from 'vitest';
import { guessClassTime, guessClassInfo } from './classUtils';

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
            timestamp: '2026-03-16T11:30:00',
            branchId: 'branch_a'
        };
        expect(guessClassTime(log)).toBe('11:30');
    });

    it('should return actual time from timestamp when no classTime', () => {
        const log = {
            className: '하타',
            timestamp: '2026-03-16T09:55:00',
            branchId: 'branch_a'
        };
        // SaaS: template 없이 timestamp에서 시각 추출
        expect(guessClassTime(log)).toBe('09:55');
    });

    it('should skip classTime if value is 00:00', () => {
        const log = {
            classTime: '00:00',
            className: '하타',
            timestamp: '2026-03-16T09:55:00',
            branchId: 'branch_a'
        };
        expect(guessClassTime(log)).toBe('09:55');
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
        const info = guessClassInfo(log);
        expect(info).not.toBeNull();
        expect(info!.className).toBe('자율수련');
        expect(info!.startTime).toBe('11:30');
    });

    it('should use log data directly (SaaS: no template dependency)', () => {
        const log = {
            className: '하타',
            instructor: '김선생',
            classTime: '10:00',
            timestamp: '2026-03-16T10:02:00',
            branchId: 'branch_a'
        };
        const info = guessClassInfo(log);
        expect(info).not.toBeNull();
        expect(info!.className).toBe('하타');
        expect(info!.instructor).toBe('김선생');
        expect(info!.startTime).toBe('10:00');
    });

    it('should return 일반 for missing className', () => {
        const log = {
            timestamp: '2026-03-16T10:00:00',
            branchId: 'branch_a'
        };
        const info = guessClassInfo(log);
        expect(info!.className).toBe('일반');
        expect(info!.instructor).toBe('미지정');
    });

    it('should return 일반 for className equal to 일반', () => {
        const log = {
            className: '일반',
            instructor: '선생님',
            timestamp: '2026-03-16T10:00:00'
        };
        const info = guessClassInfo(log);
        expect(info!.className).toBe('일반');
        expect(info!.instructor).toBe('미지정');
    });
});
