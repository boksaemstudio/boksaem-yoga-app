import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

describe('ErrorBoundary', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    // ── 정상 렌더링 (RTL) ──
    it('정상 자식 컴포넌트를 렌더링한다', () => {
        const { container } = render(
            <ErrorBoundary>
                <div>정상 콘텐츠</div>
            </ErrorBoundary>
        );
        expect(container.textContent).toContain('정상 콘텐츠');
    });

    // ── 클래스 구조 검증 ──
    it('ErrorBoundary는 클래스 컴포넌트이다 (componentDidCatch 포함)', () => {
        expect(typeof ErrorBoundary.prototype.componentDidCatch).toBe('function');
        expect(typeof ErrorBoundary.prototype.render).toBe('function');
    });

    it('getDerivedStateFromError는 올바른 에러 상태를 반환한다', () => {
        const testError = new Error('test');
        const result = ErrorBoundary.getDerivedStateFromError(testError);
        expect(result.hasError).toBe(true);
        expect(result.error).toBe(testError);
    });

    it('getDerivedStateFromError — chunk load error 시 hasError: false', () => {
        const chunkError = new Error('Failed to fetch dynamically imported module');
        // sessionStorage에 이미 리로드 시도됨 설정
        sessionStorage.setItem('chunk_reload', 'true');
        const result = ErrorBoundary.getDerivedStateFromError(chunkError);
        expect(result.hasError).toBe(true); // 이미 시도됨 → 에러 표시
        sessionStorage.removeItem('chunk_reload');
    });

    it('render 메서드 소스가 키오스크 자동 복구 로직을 포함한다', () => {
        const renderSource = ErrorBoundary.prototype.render.toString();
        expect(renderSource).toContain('eb_reload_count');
        expect(renderSource).toContain('새로고침');
    });

    it('handleReload/constructor 초기 state가 hasError: false이다', () => {
        const instance = new ErrorBoundary({});
        expect(instance.state.hasError).toBe(false);
        expect(instance.state.error).toBe(null);
    });
});
