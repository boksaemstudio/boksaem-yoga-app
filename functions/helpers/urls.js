/**
 * SaaS URL 동적 생성
 * FCM 푸시 링크, 리다이렉트 URL 등을 동적으로 생성합니다.
 * 
 * @module helpers/urls
 */

const STUDIO_ID = process.env.STUDIO_ID || 'passflow-0324';

/**
 * 스튜디오 기본 URL 반환
 * 환경변수 STUDIO_HOST가 있으면 사용, 없으면 STUDIO_ID 기반 생성
 * @returns {string} 예: 'https://passflow-0324.web.app'
 */
const getStudioBaseUrl = () => {
    return process.env.STUDIO_HOST || `https://${STUDIO_ID}.web.app`;
};

/**
 * 스튜디오 내 특정 경로 URL 생성
 * @param {string} path - 경로 (예: '/instructor', '/member?tab=notices')
 * @returns {string} 전체 URL
 */
const getStudioUrl = (path) => `${getStudioBaseUrl()}${path}`;

/**
 * URL에서 경로만 추출 (상대 경로 변환)
 * @param {string} fullUrl - 전체 URL
 * @returns {string} 상대 경로
 */
const toRelativePath = (fullUrl) => {
    const baseUrl = getStudioBaseUrl();
    return fullUrl.replace(baseUrl, '');
};

module.exports = { getStudioBaseUrl, getStudioUrl, toRelativePath };
