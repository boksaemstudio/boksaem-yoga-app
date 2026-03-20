/**
 * 테스트 글로벌 setup
 * 
 * jsdom 환경에서만 RTL cleanup 실행.
 * node 환경(유틸 테스트)에서는 아무것도 하지 않음.
 */
if (typeof window !== 'undefined') {
    // jsdom 환경 — RTL 관련 setup
    import('@testing-library/jest-dom').catch(() => {});
}
