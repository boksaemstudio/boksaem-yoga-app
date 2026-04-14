import { useLanguageStore } from '../stores/useLanguageStore';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMemberUI } from './useMemberUI';
describe(t("g_4b29d0") || "useMemberUI \u2014 \uD1B5\uD569 \uD14C\uC2A4\uD2B8 (RTL renderHook)", () => {
  it(t("g_8f1d5c") || "\uCD08\uAE30 activeTab\uC774 \"home\"\uC774\uB2E4", () => {
    const {
      result
    } = renderHook(() => useMemberUI());
    expect(result.current.activeTab).toBe('home');
  });
  it(t("g_6dc4e2") || "setActiveTab\uC73C\uB85C \uD0ED \uC804\uD658", () => {
    const {
      result
    } = renderHook(() => useMemberUI());
    act(() => result.current.setActiveTab('history'));
    expect(result.current.activeTab).toBe('history');
  });
  it(t("g_5e9af9") || "greetingVisible \uCD08\uAE30\uAC12 true + \uD1A0\uAE00", () => {
    const {
      result
    } = renderHook(() => useMemberUI());
    expect(result.current.greetingVisible).toBe(true);
    act(() => result.current.setGreetingVisible(false));
    expect(result.current.greetingVisible).toBe(false);
  });
  it('openConfirmModal + closeConfirmModal', () => {
    const {
      result
    } = renderHook(() => useMemberUI());
    const mockFn = vi.fn();
    act(() => result.current.openConfirmModal(t("g_f876a2") || "\uC0AD\uC81C?", mockFn, true));
    expect(result.current.modals.confirm.isOpen).toBe(true);
    expect(result.current.modals.confirm.message).toBe(t("g_f876a2") || "\uC0AD\uC81C?");
    act(() => result.current.closeConfirmModal());
    expect(result.current.modals.confirm.isOpen).toBe(false);
  });
  it(t("g_9faf4d") || "loginForm \uCD08\uAE30\uAC12 + setLoginFormValue", () => {
    const {
      result
    } = renderHook(() => useMemberUI());
    expect(result.current.loginForm).toEqual({
      name: '',
      phone: '',
      error: ''
    });
    act(() => result.current.setLoginFormValue('name', t("g_d2b17c") || "\uD64D\uAE38\uB3D9"));
    expect(result.current.loginForm.name).toBe(t("g_d2b17c") || "\uD64D\uAE38\uB3D9");
    expect(result.current.loginForm.phone).toBe('');
  });
  it(t("g_7fd6e3") || "scheduleView \uAE30\uBCF8\uAC12 calendar", () => {
    const {
      result
    } = renderHook(() => useMemberUI());
    expect(result.current.scheduleView).toBe('calendar');
  });
  it(t("g_c6b53f") || "lightboxImage \uCD08\uAE30 null + \uC124\uC815", () => {
    const {
      result
    } = renderHook(() => useMemberUI());
    expect(result.current.lightboxImage).toBe(null);
    act(() => result.current.setLightboxImage('https://example.com/img.jpg'));
    expect(result.current.lightboxImage).toBe('https://example.com/img.jpg');
  });
  it(t("g_3db7b0") || "installGuide \uBAA8\uB2EC \uC5F4\uAE30/\uB2EB\uAE30", () => {
    const {
      result
    } = renderHook(() => useMemberUI());
    act(() => result.current.openInstallGuide());
    expect(result.current.modals.installGuide).toBe(true);
    act(() => result.current.closeInstallGuide());
    expect(result.current.modals.installGuide).toBe(false);
  });
  it(t("g_c42221") || "selectedNoticeId \uCD08\uAE30 null + \uC124\uC815", () => {
    const {
      result
    } = renderHook(() => useMemberUI());
    expect(result.current.selectedNoticeId).toBe(null);
    act(() => result.current.setSelectedNoticeId('notice-1'));
    expect(result.current.selectedNoticeId).toBe('notice-1');
  });
  it(t("g_699948") || "scheduleBranch \uAE30\uBCF8\uAC12 gwangheungchang", () => {
    const {
      result
    } = renderHook(() => useMemberUI());
    expect(result.current.scheduleBranch).toBe('gwangheungchang');
  });
  it(t("g_427f22") || "scheduleMonth \uAE30\uBCF8\uAC12 current", () => {
    const {
      result
    } = renderHook(() => useMemberUI());
    expect(result.current.scheduleMonth).toBe('current');
  });
});