/**
 * [SaaS Core] 스튜디오 환경 판별 유틸리티
 * 
 * 도메인/localStorage 기반 판별 로직을 한 곳에 집중시켜
 * 10개 이상 파일에 산재된 중복 로직을 제거합니다.
 */

import { resolveStudioId } from './resolveStudioId';

/**
 * 현재 접속 환경이 데모 스튜디오인지 판별
 * - passflow-demo 도메인
 * - passflowai 도메인  
 * - demo-yoga 스튜디오 ID
 */
export const isDemoStudio = (): boolean => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    const studioId = resolveStudioId();
    return (
        host.includes('passflow-demo') ||
        host.includes('passflowai') ||
        studioId === 'demo-yoga'
    ) && !sessionStorage.getItem('demoLogout');
};

/**
 * 현재 접속 환경이 SaaS 플랫폼 브랜드(PassFlow) 도메인인지 판별
 * - passflowai.web.app (공식 소개/데모 사이트)
 */
export const isPlatformDomain = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.location.hostname.includes('passflowai');
};
