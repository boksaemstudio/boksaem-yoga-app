import { describe, it, expect, beforeEach } from 'vitest';
import { useStudioStore } from './useStudioStore';

describe('useStudioStore', () => {
    beforeEach(() => {
        useStudioStore.setState({ config: null, loading: true });
    });

    it('초기 loading이 true이다', () => {
        expect(useStudioStore.getState().loading).toBe(true);
    });

    it('초기 config가 null이다', () => {
        expect(useStudioStore.getState().config).toBe(null);
    });

    it('setConfig로 설정 저장', () => {
        const mockConfig = { IDENTITY: { NAME: '테스트 스튜디오' } };
        useStudioStore.getState().setConfig(mockConfig);
        expect(useStudioStore.getState().config).toEqual(mockConfig);
    });

    it('setLoading으로 상태 변경', () => {
        useStudioStore.getState().setLoading(false);
        expect(useStudioStore.getState().loading).toBe(false);
    });

    it('get 헬퍼로 점표기 경로 접근', () => {
        useStudioStore.getState().setConfig({ IDENTITY: { NAME: '테스트' } });
        expect(useStudioStore.getState().get('IDENTITY.NAME')).toBe('테스트');
    });

    it('get 헬퍼 fallback 동작', () => {
        useStudioStore.getState().setConfig({});
        expect(useStudioStore.getState().get('NONEXISTENT.PATH', '기본값')).toBe('기본값');
    });

    it('config null일 때 get이 fallback 반환', () => {
        expect(useStudioStore.getState().get('ANY.PATH', 'safe')).toBe('safe');
    });
});
