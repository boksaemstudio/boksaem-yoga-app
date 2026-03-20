import { describe, it, expect } from 'vitest';
import { isMemberActive, isMemberExpiring, getDormantSegments } from './adminCalculations';

describe('isMemberActive', () => {
    it('should return true for member with credits and valid endDate', () => {
        expect(isMemberActive({ id: '1', name: 'Test', credits: 10, endDate: '2099-12-31' })).toBe(true);
    });

    it('should return false for member with zero credits', () => {
        expect(isMemberActive({ id: '1', name: 'Test', credits: 0, endDate: '2099-12-31' })).toBe(false);
    });

    it('should return false for member with past endDate', () => {
        expect(isMemberActive({ id: '1', name: 'Test', credits: 10, endDate: '2020-01-01' })).toBe(false);
    });

    it('should return true for member with credits but no endDate', () => {
        expect(isMemberActive({ id: '1', name: 'Test', credits: 5 })).toBe(true);
    });

    it('should return false for member with no credits and no endDate', () => {
        expect(isMemberActive({ id: '1', name: 'Test', credits: 0 })).toBe(false);
    });
});

describe('isMemberExpiring', () => {
    it('should return true for member with 2 or fewer credits', () => {
        expect(isMemberExpiring({ id: '1', name: 'Test', credits: 2, endDate: '2099-12-31' })).toBe(true);
        expect(isMemberExpiring({ id: '1', name: 'Test', credits: 1, endDate: '2099-12-31' })).toBe(true);
    });

    it('should return false for member with many credits and distant endDate', () => {
        expect(isMemberExpiring({ id: '1', name: 'Test', credits: 20, endDate: '2099-12-31' })).toBe(false);
    });

    it('should return true for member with endDate within 7 days', () => {
        const soon = new Date();
        soon.setDate(soon.getDate() + 3);
        const endStr = soon.toISOString().split('T')[0];
        expect(isMemberExpiring({ id: '1', name: 'Test', credits: 20, endDate: endStr })).toBe(true);
    });

    it('should return true for no credits and no endDate', () => {
        expect(isMemberExpiring({ id: '1', name: 'Test', credits: 0 })).toBe(true);
    });
});

describe('getDormantSegments', () => {
    it('should return empty for active members with recent attendance', () => {
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 5);
        const members = [{
            id: '1', name: 'Active',
            credits: 10, endDate: '2099-12-31',
            lastAttendance: recentDate.toISOString().split('T')[0]
        }];
        const result = getDormantSegments(members);
        expect(result.all.length).toBe(0);
    });

    it('should detect dormant members (no attendance > 14 days)', () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 20);
        const members = [{
            id: '1', name: 'Dormant',
            credits: 10, endDate: '2099-12-31',
            lastAttendance: oldDate.toISOString().split('T')[0]
        }];
        const result = getDormantSegments(members);
        expect(result.all.length).toBe(1);
        expect(result.all[0].name).toBe('Dormant');
    });

    it('should skip expired members', () => {
        const members = [{
            id: '1', name: 'Expired',
            credits: 0, endDate: '2020-01-01',
            lastAttendance: '2020-01-01'
        }];
        const result = getDormantSegments(members);
        expect(result.all.length).toBe(0);
    });
});
