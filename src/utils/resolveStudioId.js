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

    if (host === 'localhost' || host === '127.0.0.1') {
        return import.meta.env.VITE_LOCAL_STUDIO_ID || 'default';
    }
    
    if (host.includes('boksaem-yoga.web.app')) {
        return 'boksaem_gwangheungchang';
    }

    // Future-proofing: subdomain 파싱 또는 custom domain 매핑
    const parts = host.split('.');
    return parts.length > 2 ? parts[0] : 'default';
};
