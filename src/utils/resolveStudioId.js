/**
 * [SaaS Core] 호스트네임 기반 Studio ID 동적 해석 유틸리티
 * 
 * StudioContext의 useEffect와 updateConfig에서 동일한 로직이 중복되던 것을
 * 단일 유틸 함수로 추출하여 유지보수성 향상.
 * 
 * @returns {string} studioId
 */
export const resolveStudioId = () => {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const params = new URLSearchParams(window.location.search);

    // 1. 최고 우선순위: URL 파라미터 강제 주입 (테스트용: ?studio=blue-yoga)
    const urlStudioId = params.get('studio');
    if (urlStudioId) {
        localStorage.setItem('lastStudioId', urlStudioId);
        return urlStudioId;
    }

    // 2. 개발 환경 로컬호스트
    if (host === 'localhost' || host === '127.0.0.1') {
        const localId = import.meta.env.VITE_LOCAL_STUDIO_ID || localStorage.getItem('lastStudioId') || 'boksaem-yoga';
        // 개발중엔 무조건 boksaem-yoga로 fallback
        return localId === 'default' ? 'boksaem-yoga' : localId;
    }
    
    // 3. 복샘요가 기본 배포 도메인
    if (host.includes('boksaem-yoga.web.app') || host.includes('boksaem-yoga.firebaseapp.com')) {
        return 'boksaem-yoga';
    }

    // 4. 서브도메인 파싱 (namaste.boksaem.app -> namaste)
    const parts = host.split('.');
    if (parts.length >= 3 && parts[0] !== 'www') {
        return parts[0];
    }
    
    // 5. 알 수 없는 도메인 → 캐시된 ID 있나요? 아님 기본 복샘요가로
    return localStorage.getItem('lastStudioId') || 'boksaem-yoga';
};
