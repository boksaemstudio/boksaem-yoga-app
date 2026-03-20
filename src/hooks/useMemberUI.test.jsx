import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMemberUI } from './useMemberUI';

describe('useMemberUI — 통합 테스트 (RTL renderHook)', () => {
    it('초기 activeTab이 "home"이다', () => {
        const { result } = renderHook(() => useMemberUI());
        expect(result.current.activeTab).toBe('home');
    });

    it('setActiveTab으로 탭 전환', () => {
        const { result } = renderHook(() => useMemberUI());
        act(() => result.current.setActiveTab('history'));
        expect(result.current.activeTab).toBe('history');
    });

    it('greetingVisible 초기값 true + 토글', () => {
        const { result } = renderHook(() => useMemberUI());
        expect(result.current.greetingVisible).toBe(true);
        act(() => result.current.setGreetingVisible(false));
        expect(result.current.greetingVisible).toBe(false);
    });

    it('openConfirmModal + closeConfirmModal', () => {
        const { result } = renderHook(() => useMemberUI());
        const mockFn = vi.fn();

        act(() => result.current.openConfirmModal('삭제?', mockFn, true));
        expect(result.current.modals.confirm.isOpen).toBe(true);
        expect(result.current.modals.confirm.message).toBe('삭제?');

        act(() => result.current.closeConfirmModal());
        expect(result.current.modals.confirm.isOpen).toBe(false);
    });

    it('loginForm 초기값 + setLoginFormValue', () => {
        const { result } = renderHook(() => useMemberUI());
        expect(result.current.loginForm).toEqual({ name: '', phone: '', error: '' });

        act(() => result.current.setLoginFormValue('name', '홍길동'));
        expect(result.current.loginForm.name).toBe('홍길동');
        expect(result.current.loginForm.phone).toBe('');
    });

    it('scheduleView 기본값 calendar', () => {
        const { result } = renderHook(() => useMemberUI());
        expect(result.current.scheduleView).toBe('calendar');
    });

    it('lightboxImage 초기 null + 설정', () => {
        const { result } = renderHook(() => useMemberUI());
        expect(result.current.lightboxImage).toBe(null);
        act(() => result.current.setLightboxImage('https://example.com/img.jpg'));
        expect(result.current.lightboxImage).toBe('https://example.com/img.jpg');
    });

    it('installGuide 모달 열기/닫기', () => {
        const { result } = renderHook(() => useMemberUI());
        act(() => result.current.openInstallGuide());
        expect(result.current.modals.installGuide).toBe(true);
        act(() => result.current.closeInstallGuide());
        expect(result.current.modals.installGuide).toBe(false);
    });

    it('selectedNoticeId 초기 null + 설정', () => {
        const { result } = renderHook(() => useMemberUI());
        expect(result.current.selectedNoticeId).toBe(null);
        act(() => result.current.setSelectedNoticeId('notice-1'));
        expect(result.current.selectedNoticeId).toBe('notice-1');
    });

    it('scheduleBranch 기본값 gwangheungchang', () => {
        const { result } = renderHook(() => useMemberUI());
        expect(result.current.scheduleBranch).toBe('gwangheungchang');
    });

    it('scheduleMonth 기본값 current', () => {
        const { result } = renderHook(() => useMemberUI());
        expect(result.current.scheduleMonth).toBe('current');
    });
});
