import { create } from 'zustand';

/**
 * @typedef {Object} StudioState
 * @property {Object|null} config - 스튜디오 설정 객체 (IDENTITY, THEME, ASSETS 등)
 * @property {boolean} loading - 설정 로딩 중 여부
 * @property {(config: Object) => void} setConfig - 설정 업데이트
 * @property {(loading: boolean) => void} setLoading - 로딩 상태 변경
 * @property {(path: string, fallback?: any) => any} get - 점표기 경로로 설정값 접근
 */

/**
 * useStudioStore — Zustand Studio 설정 스토어
 * StudioProvider 내부에서 자동 동기화됨.
 * 
 * @example
 * const config = useStudioStore(s => s.config);
 * const name = useStudioStore(s => s.config?.IDENTITY?.NAME);
 * const get = useStudioStore(s => s.get);
 * const theme = get('THEME.PRIMARY_COLOR', '#D4A574');
 * 
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<StudioState>>}
 */
export const useStudioStore = create((set, get) => ({
    config: null,
    loading: true,

    setConfig: (config) => set({ config }),
    setLoading: (loading) => set({ loading }),

    get: (path, fallback) => {
        const { config } = get();
        if (!config) return fallback;
        return path.split('.').reduce(
            (obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined,
            config
        ) ?? fallback;
    },
}));
