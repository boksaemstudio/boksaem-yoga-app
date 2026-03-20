import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveStudioId, invalidateStudioId } from './resolveStudioId';

// ── Mock localStorage ──
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
    getItem: vi.fn((key: string) => mockStorage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { mockStorage[key] = String(value); }),
    removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
};

/**
 * window.location을 mock하는 헬퍼
 */
function setupWindow(hostname: string, search: string = '') {
    Object.defineProperty(globalThis, 'window', {
        value: {
            location: { hostname, search },
        },
        writable: true,
        configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
    });
}

beforeEach(() => {
    // 모듈-레벨 캐시 초기화
    invalidateStudioId();

    // localStorage mock 초기화
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    vi.clearAllMocks();
});

describe('resolveStudioId', () => {
    it('URL 파라미터 ?studio= 가 최우선', () => {
        setupWindow('localhost', '?studio=blue-yoga');
        invalidateStudioId();

        const result = resolveStudioId();
        expect(result).toBe('blue-yoga');
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('lastStudioId', 'blue-yoga');
    });

    it('localhost에서 기본값 boksaem-yoga 반환', () => {
        setupWindow('localhost', '');
        invalidateStudioId();

        const result = resolveStudioId();
        expect(result).toBe('boksaem-yoga');
    });

    it('복샘 Firebase 호스팅 도메인 인식', () => {
        setupWindow('boksaem-yoga.web.app', '');
        invalidateStudioId();

        const result = resolveStudioId();
        expect(result).toBe('boksaem-yoga');
    });

    it('서브도메인 파싱 (namaste.boksaem.app → namaste)', () => {
        setupWindow('namaste.boksaem.app', '');
        invalidateStudioId();

        const result = resolveStudioId();
        expect(result).toBe('namaste');
    });

    it('invalidateStudioId 후 재해석', () => {
        setupWindow('localhost', '?studio=first');
        invalidateStudioId();
        expect(resolveStudioId()).toBe('first');

        // 캐시 초기화 후 새로운 환경으로 재해석
        setupWindow('localhost', '?studio=second');
        invalidateStudioId();
        expect(resolveStudioId()).toBe('second');
    });

    it('캐시된 값은 invalidate 전까지 유지', () => {
        setupWindow('localhost', '?studio=cached-value');
        invalidateStudioId();
        expect(resolveStudioId()).toBe('cached-value');

        // window 바꿔도 캐시가 유지
        setupWindow('namaste.boksaem.app', '');
        expect(resolveStudioId()).toBe('cached-value');
    });
});
