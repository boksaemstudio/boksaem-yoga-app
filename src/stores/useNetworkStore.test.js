import { describe, it, expect, beforeEach } from 'vitest';
import { useNetworkStore } from './useNetworkStore';

describe('useNetworkStore', () => {
    beforeEach(() => {
        useNetworkStore.setState({ isOnline: true });
    });

    it('초기 isOnline이 true이다', () => {
        expect(useNetworkStore.getState().isOnline).toBe(true);
    });

    it('isOnline을 false로 변경 가능', () => {
        useNetworkStore.setState({ isOnline: false });
        expect(useNetworkStore.getState().isOnline).toBe(false);
    });

    it('setState 후 getState에 반영된다', () => {
        useNetworkStore.setState({ isOnline: false });
        useNetworkStore.setState({ isOnline: true });
        expect(useNetworkStore.getState().isOnline).toBe(true);
    });
});
