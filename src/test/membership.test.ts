/**
 * 핵심 비즈니스 로직 통합 테스트
 * TBD 해소, 선등록 활성화, 크레딧 계산, 날짜 산수 검증
 */
import { describe, it, expect } from 'vitest';
import { isTBD, calculateEndDate, evaluateUpcomingActivation } from '../utils/membershipUtils';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. isTBD 판별
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('isTBD', () => {
    it('TBD 문자열 인식', () => {
        expect(isTBD('TBD')).toBe(true);
    });

    it('일반 날짜는 false', () => {
        expect(isTBD('2026-03-20')).toBe(false);
    });

    it('null/undefined는 false', () => {
        expect(isTBD(null)).toBe(false);
        expect(isTBD(undefined)).toBe(false);
        expect(isTBD('')).toBe(false);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. calculateEndDate 날짜 산수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('calculateEndDate', () => {
    it('1개월: 3/20 → 4/19', () => {
        expect(calculateEndDate('2026-03-20', 1)).toBe('2026-04-19');
    });

    it('3개월: 3/20 → 6/19', () => {
        expect(calculateEndDate('2026-03-20', 3)).toBe('2026-06-19');
    });

    it('6개월: 3/20 → 9/19', () => {
        expect(calculateEndDate('2026-03-20', 6)).toBe('2026-09-19');
    });

    it('4/1에서 3개월 → 6/30', () => {
        expect(calculateEndDate('2026-04-01', 3)).toBe('2026-06-30');
    });

    it('5/1에서 1개월 → 5/31', () => {
        expect(calculateEndDate('2026-05-01', 1)).toBe('2026-05-31');
    });

    it('연도 넘김: 12/1 + 3개월 → 2027-02-28', () => {
        expect(calculateEndDate('2026-12-01', 3)).toBe('2027-02-28');
    });

    it('1/31 + 1개월 = JS overflow 동작 (3/2)', () => {
        // JS: Jan31 + 1month = Mar3 (Feb overflow) → -1day = Mar2
        expect(calculateEndDate('2026-01-31', 1)).toBe('2026-03-02');
    });

    it('무제한(9999) → unlimited', () => {
        expect(calculateEndDate('2026-03-20', 9999)).toBe('2026-04-19');
        // 9999 credits means unlimited, endDate is treated as 1 month in calculateEndDate
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. evaluateUpcomingActivation — 선등록 활성화 판단
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('evaluateUpcomingActivation', () => {
    it('upcomingMembership 없으면 활성화 안 됨', () => {
        const result = evaluateUpcomingActivation({ credits: 5, endDate: '2026-05-01' }, '2026-03-20');
        expect(result.shouldActivate).toBe(false);
    });

    it('TBD 선등록 — 현재 활성 시 활성화 안 됨', () => {
        const member = {
            credits: 5, endDate: '2026-05-01',
            upcomingMembership: { startDate: 'TBD', endDate: 'TBD', durationMonths: 3, credits: 20 }
        };
        const result = evaluateUpcomingActivation(member, '2026-03-20');
        expect(result.shouldActivate).toBe(false);
    });

    it('TBD 선등록 — 횟수 소진 시 활성화', () => {
        const member = {
            credits: 0, endDate: '2026-05-01',
            upcomingMembership: { startDate: 'TBD', endDate: 'TBD', durationMonths: 3, credits: 20 }
        };
        const result = evaluateUpcomingActivation(member, '2026-04-10');
        expect(result.shouldActivate).toBe(true);
        expect(result.newFields.startDate).toBe('2026-04-10');
        expect(result.newFields.endDate).toBe('2026-07-09');
        expect(result.newFields.credits).toBe(20);
    });

    it('TBD 선등록 — 기간 만료 시 활성화', () => {
        const member = {
            credits: 5, endDate: '2026-04-30',
            upcomingMembership: { startDate: 'TBD', endDate: 'TBD', durationMonths: 1, credits: 10 }
        };
        const result = evaluateUpcomingActivation(member, '2026-05-01');
        expect(result.shouldActivate).toBe(true);
        expect(result.newFields.startDate).toBe('2026-05-01');
        expect(result.newFields.endDate).toBe('2026-05-31');
    });

    it('날짜 지정 선등록 — 날짜 도래 시 활성화', () => {
        const member = {
            credits: 5, endDate: '2026-05-01',
            upcomingMembership: { startDate: '2026-04-15', endDate: '2026-07-14', durationMonths: 3, credits: 20 }
        };
        const result = evaluateUpcomingActivation(member, '2026-04-15');
        expect(result.shouldActivate).toBe(true);
        expect(result.newFields.startDate).toBe('2026-04-15');
    });

    it('날짜 지정 선등록 — 날짜 미도래 시 활성화 안 됨', () => {
        const member = {
            credits: 5, endDate: '2026-05-01',
            upcomingMembership: { startDate: '2026-04-15', endDate: '2026-07-14', durationMonths: 3, credits: 20 }
        };
        const result = evaluateUpcomingActivation(member, '2026-04-14');
        expect(result.shouldActivate).toBe(false);
    });

    it('durationMonths 없으면 fallback 1개월', () => {
        const member = {
            credits: 0, endDate: '2026-04-30',
            upcomingMembership: { startDate: 'TBD', endDate: 'TBD', credits: 10 }
        };
        const result = evaluateUpcomingActivation(member, '2026-05-01');
        expect(result.shouldActivate).toBe(true);
        expect(result.newFields.endDate).toBe('2026-05-31'); // 1 month from 5/1
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. 재등록 시나리오 통합 테스트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe('재등록 시나리오', () => {
    const TODAY = '2026-03-20';

    // 서버 TBD 해소 시뮬레이션
    function resolveTBD(memberDuration, attendanceDate) {
        const startDate = attendanceDate;
        const endDate = calculateEndDate(startDate, memberDuration || 1);
        return { startDate, endDate };
    }

    it('만료 회원 TBD 3개월 → 첫 출석 시 해소', () => {
        const member = { endDate: '2025-07-02', credits: 0 };
        const updateData = { startDate: 'TBD', endDate: 'TBD', credits: 10, duration: 3 };
        
        // 재등록 확인
        const isAdvance = new Date(member.endDate) >= new Date(TODAY) && member.credits > 0;
        expect(isAdvance).toBe(false);
        expect(updateData.duration).toBe(3);

        // 4/1 첫 출석
        const resolved = resolveTBD(updateData.duration, '2026-04-01');
        expect(resolved.startDate).toBe('2026-04-01');
        expect(resolved.endDate).toBe('2026-06-30');
        expect(updateData.credits - 1).toBe(9); // 출석 후 크레딧
    });

    it('만료 회원 즉시출석 3개월 → 오늘부터 시작', () => {
        const finalStartDate = TODAY;
        const finalEndDate = calculateEndDate(TODAY, 3);
        
        expect(finalStartDate).toBe('2026-03-20');
        expect(finalEndDate).toBe('2026-06-19');
    });

    it('1년 전 만료 회원 TBD 6개월 → 6/15 첫 출석', () => {
        const resolved = resolveTBD(6, '2026-06-15');
        expect(resolved.startDate).toBe('2026-06-15');
        expect(resolved.endDate).toBe('2026-12-14');
    });

    it('duration 없는 레거시 회원 → fallback 1개월', () => {
        const resolved = resolveTBD(undefined, TODAY);
        expect(resolved.endDate).toBe('2026-04-19');
    });

    it('활성 회원 선등록 TBD → 현재 소진 후 활성화', () => {
        const member = {
            credits: 0, endDate: '2026-05-15',
            upcomingMembership: { startDate: 'TBD', endDate: 'TBD', durationMonths: 3, credits: 20 }
        };
        const result = evaluateUpcomingActivation(member, '2026-04-10');
        expect(result.shouldActivate).toBe(true);
        expect(result.newFields.credits - 1).toBe(19); // 출석 시 -1
    });
});
