import { create } from 'zustand';

/**
 * @typedef {Object} NetworkState
 * @property {boolean} isOnline - 현재 네트워크 연결 상태
 */

/**
 * useNetworkStore — Zustand 네트워크 상태 스토어
 * Provider 불필요. 브라우저 이벤트 자동 등록.
 * 
 * @example
 * const isOnline = useNetworkStore(s => s.isOnline);
 * 
 * @type {import('zustand').UseBoundStore<import('zustand').StoreApi<NetworkState>>}
 */
export const useNetworkStore = create((set) => {
    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
            set({ isOnline: true });
            window.dispatchEvent(new CustomEvent('SYNC_OFFLINE_QUEUE'));
        });
        window.addEventListener('offline', () => {
            set({ isOnline: false });
        });
    }

    return {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
});
