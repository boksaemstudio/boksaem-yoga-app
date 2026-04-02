/**
 * [SaaS Core] 호스트네임 기반 Studio ID 동적 해석 유틸리티
 * 
 * 앱 시작 시 1회 해석 후 캐싱. URL ?studio= 파라미터로 재설정 가능.
 */
let _cachedStudioId: string | null = null;
let _onChangeCallbacks: Array<(studioId: string) => void> = [];

export const resolveStudioId = (): string => {
    if (_cachedStudioId) return _cachedStudioId;

    const host: string = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const params = new URLSearchParams(window.location.search);
    let targetStudioId = 'demo-yoga'; // SaaS 중립 기본값 (실 운영 DB 보호)

    // 1. 최고 우선순위: URL 파라미터 강제 주입
    const urlStudioId = params.get('studio');
    
    if (urlStudioId) {
        targetStudioId = urlStudioId;
    } 
    // 2. 개발 환경 로컬호스트
    else if (host === 'localhost' || host === '127.0.0.1') {
        // @ts-ignore
        const localId: string = import.meta.env?.VITE_LOCAL_STUDIO_ID || localStorage.getItem('lastStudioId') || 'boksaem-yoga';
        targetStudioId = localId === 'default' ? 'demo-yoga' : localId;
    } 
    // 3. 복샘요가 기본 배포 도메인
    else if (host.includes('boksaem-yoga.web.app') || host.includes('boksaem-yoga.firebaseapp.com')) {
        targetStudioId = 'boksaem-yoga';
    } 
    // 3-1. 데모앱 (리허설 + 고객 시연)
    else if (host.includes('passflow-demo') || host.includes('demo.passflow') || host.includes('passflowai')) {
        targetStudioId = 'demo-yoga';
    } 
    // 3-2. 쌍문요가
    else if (host.includes('ssangmun-yoga-0.web.app') || host.includes('ssangmun-yoga-0.firebaseapp.com')) {
        targetStudioId = 'ssangmun-yoga';
    } 
    // 4. 서브도메인 파싱
    else {
        const parts: string[] = host.split('.');
        if (parts.length >= 3 && parts[0] !== 'www') {
            targetStudioId = parts[0];
        } else {
            // 5. 알 수 없는 도메인 → 캐시된 ID 또는 기본값
            targetStudioId = localStorage.getItem('lastStudioId') || 'demo-yoga';
        }
    }

    // [AUTO-HEALER] 로컬 테스트 등 동일 도메인에서 스튜디오(Tenant)가 변경된 경우 캐시 초기화
    // 이전 스튜디오 컨텍스트의 데이터(member, instructor 등)가 새 스튜디오 DB에 없어 에러나는 고질적 버그 방지
    const previousStudioId = localStorage.getItem('lastStudioId');
    if (previousStudioId && previousStudioId !== targetStudioId) {
        console.warn(`[SaaS Context Auto-Heal] Studio changed from ${previousStudioId} to ${targetStudioId}. Wiping stale caches.`);
        localStorage.removeItem('member');
        localStorage.removeItem('instructorName');
        localStorage.removeItem('kiosk_member_cache');
        localStorage.removeItem('member_mbti');
        sessionStorage.removeItem('demoLogout');
    }

    _cachedStudioId = targetStudioId;
    localStorage.setItem('lastStudioId', targetStudioId);
    
    return _cachedStudioId;
};

/** 테스트 또는 동적 전환 시 캐시 초기화 */
export const invalidateStudioId = (): void => { _cachedStudioId = null; };

/** 런타임 스튜디오 전환 — 앱 전체에 즉시 적용 */
export const switchStudio = (newStudioId: string): void => {
    _cachedStudioId = newStudioId;
    localStorage.setItem('lastStudioId', newStudioId);
    _onChangeCallbacks.forEach(cb => cb(newStudioId));
};

/** 스튜디오 변경 리스너 등록 */
export const onStudioChange = (callback: (studioId: string) => void): (() => void) => {
    _onChangeCallbacks.push(callback);
    return () => {
        _onChangeCallbacks = _onChangeCallbacks.filter(cb => cb !== callback);
    };
};

/** 현재 스튜디오 ID 조회 (캐시된 값) */
export const getCurrentStudioId = (): string => resolveStudioId();
