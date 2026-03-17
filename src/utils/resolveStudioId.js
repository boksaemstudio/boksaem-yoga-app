/**
 * [SaaS Core] 호스트네임 기반 Studio ID 동적 해석 유틸리티
 * 
 * 앱 시작 시 1회 해석 후 캐싱. URL ?studio= 파라미터로 재설정 가능.
 * 
 * @returns {string} studioId
 */
let _cachedStudioId = null;

export const resolveStudioId = () => {
    if (_cachedStudioId) return _cachedStudioId;

    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const params = new URLSearchParams(window.location.search);

    // 1. 최고 우선순위: URL 파라미터 강제 주입 (테스트용: ?studio=blue-yoga)
    const urlStudioId = params.get('studio');
    if (urlStudioId) {
        localStorage.setItem('lastStudioId', urlStudioId);
        _cachedStudioId = urlStudioId;
        return _cachedStudioId;
    }

    // 2. 개발 환경 로컬호스트
    if (host === 'localhost' || host === '127.0.0.1') {
        const localId = import.meta.env.VITE_LOCAL_STUDIO_ID || localStorage.getItem('lastStudioId') || 'boksaem-yoga';
        _cachedStudioId = localId === 'default' ? 'boksaem-yoga' : localId;
        return _cachedStudioId;
    }
    
    // 3. 복샘요가 기본 배포 도메인
    if (host.includes('boksaem-yoga.web.app') || host.includes('boksaem-yoga.firebaseapp.com')) {
        _cachedStudioId = 'boksaem-yoga';
        return _cachedStudioId;
    }

    // 4. 서브도메인 파싱 (namaste.boksaem.app -> namaste)
    const parts = host.split('.');
    if (parts.length >= 3 && parts[0] !== 'www') {
        _cachedStudioId = parts[0];
        return _cachedStudioId;
    }
    
    // 5. 알 수 없는 도메인 → 캐시된 ID 또는 기본값
    _cachedStudioId = localStorage.getItem('lastStudioId') || 'boksaem-yoga';
    return _cachedStudioId;
};

/** 테스트 또는 동적 전환 시 캐시 초기화 */
export const invalidateStudioId = () => { _cachedStudioId = null; };

