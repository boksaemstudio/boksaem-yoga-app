/**
 * Member권 타입 라벨 중앙 변환 유틸리티 (SaaS 범용)
 * 
 * 우선순위:
 * 1. config.PRICING[key].label — Firestore 데이터 (요가원별 커스텀)
 * 2. config.MEMBERSHIP_TYPE_MAP[key] — studioConfig 기본 템플릿
 * 3. key 그대로 반환 (최후의 수단)
 */

interface PricingEntry {
    label?: string;
    [key: string]: any;
}

interface MembershipConfig {
    PRICING?: Record<string, PricingEntry>;
    MEMBERSHIP_TYPE_MAP?: Record<string, string>;
    [key: string]: any;
}

export const getMembershipLabel = (key: string | null | undefined, config: MembershipConfig | null | undefined): string => {
    if (!key) return 'General';
    const pricing = config?.PRICING || {};
    const typeMap = config?.MEMBERSHIP_TYPE_MAP || {};
    return pricing[key]?.label || typeMap[key] || key;
};
