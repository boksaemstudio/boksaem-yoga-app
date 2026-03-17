/**
 * 회원권 타입 라벨 중앙 변환 유틸리티 (SaaS 범용)
 * 
 * 우선순위:
 * 1. config.PRICING[key].label — Firestore 데이터 (요가원별 커스텀)
 * 2. config.MEMBERSHIP_TYPE_MAP[key] — studioConfig 기본 템플릿
 * 3. key 그대로 반환 (최후의 수단)
 * 
 * @param {string} key - 회원권 타입 키 (e.g., 'general', 'advanced')
 * @param {object} config - useStudioConfig().config
 * @returns {string} 한글 라벨
 */
export const getMembershipLabel = (key, config) => {
    if (!key) return '일반';
    const pricing = config?.PRICING || {};
    const typeMap = config?.MEMBERSHIP_TYPE_MAP || {};
    return pricing[key]?.label || typeMap[key] || key;
};
