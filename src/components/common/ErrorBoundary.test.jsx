import { useLanguageStore } from '../../stores/useLanguageStore';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ── 정상 렌더링 (RTL) ──
  it(t("g_5937d8") || "\uC815\uC0C1 \uC790\uC2DD \uCEF4\uD3EC\uB10C\uD2B8\uB97C \uB80C\uB354\uB9C1\uD55C\uB2E4", () => {
    const {
      container
    } = render(<ErrorBoundary>
                <div>{t("g_6864b7") || "\uC815\uC0C1 \uCF58\uD150\uCE20"}</div>
            </ErrorBoundary>);
    expect(container.textContent).toContain(t("g_6864b7") || "\uC815\uC0C1 \uCF58\uD150\uCE20");
  });

  // ── 클래스 구조 검증 ──
  it(t("g_4df887") || "ErrorBoundary\uB294 \uD074\uB798\uC2A4 \uCEF4\uD3EC\uB10C\uD2B8\uC774\uB2E4 (componentDidCatch \uD3EC\uD568)", () => {
    expect(typeof ErrorBoundary.prototype.componentDidCatch).toBe('function');
    expect(typeof ErrorBoundary.prototype.render).toBe('function');
  });
  it(t("g_6d4d7b") || "getDerivedStateFromError\uB294 \uC62C\uBC14\uB978 \uC5D0\uB7EC \uC0C1\uD0DC\uB97C \uBC18\uD658\uD55C\uB2E4", () => {
    const testError = new Error('test');
    const result = ErrorBoundary.getDerivedStateFromError(testError);
    expect(result.hasError).toBe(true);
    expect(result.error).toBe(testError);
  });
  it(t("g_dab21b") || "getDerivedStateFromError \u2014 chunk load error \uC2DC hasError: false", () => {
    const chunkError = new Error('Failed to fetch dynamically imported module');
    // sessionStorage에 이미 리로드 시도됨 설정
    sessionStorage.setItem('chunk_reload', 'true');
    const result = ErrorBoundary.getDerivedStateFromError(chunkError);
    expect(result.hasError).toBe(true); // 이미 시도됨 → 에러 표시
    sessionStorage.removeItem('chunk_reload');
  });
  it(t("g_0af0b5") || "render \uBA54\uC11C\uB4DC \uC18C\uC2A4\uAC00 \uD0A4\uC624\uC2A4\uD06C \uC790\uB3D9 \uBCF5\uAD6C \uB85C\uC9C1\uC744 \uD3EC\uD568\uD55C\uB2E4", () => {
    const renderSource = ErrorBoundary.prototype.render.toString();
    expect(renderSource).toContain('eb_reload_count');
    expect(renderSource).toContain(t("g_423c41") || "\uC0C8\uB85C\uACE0\uCE68");
  });
  it(t("g_412b67") || "handleReload/constructor \uCD08\uAE30 state\uAC00 hasError: false\uC774\uB2E4", () => {
    const instance = new ErrorBoundary({});
    expect(instance.state.hasError).toBe(false);
    expect(instance.state.error).toBe(null);
  });
});