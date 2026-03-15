import { db } from '../firebase';
import { doc, collection } from 'firebase/firestore';
import { resolveStudioId } from './resolveStudioId';

/**
 * [SaaS Core] 테넌트 격리를 위한 Firestore 경로 생성 유틸리티
 * 
 * 🚨 TENANT_MIGRATION_COMPLETE = false 인 동안은 기존 루트 레벨 경로를 그대로 사용합니다.
 * 데이터 마이그레이션 완료 후 이 플래그를 true로 바꾸면 자동으로 테넌트 격리 경로를 사용합니다.
 * 
 * 마이그레이션 절차:
 * 1. node scripts/migrate_tenant_data.cjs 실행
 * 2. Firestore 콘솔에서 /studios/boksaem-yoga/members 등 데이터 존재 확인
 * 3. 아래 플래그를 true로 변경 후 배포
 */

// ✅ 데이터 마이그레이션 완료 — 테넌트 격리 경로 활성화
const TENANT_MIGRATION_COMPLETE = true;

export const tenantDb = {
    /**
     * @param {string} path - 컬렉션 이름 (예: 'members', 'sales')
     * @returns {import('firebase/firestore').CollectionReference}
     */
    collection: (path) => {
        if (!TENANT_MIGRATION_COMPLETE) {
            // 마이그레이션 전: 기존 루트 레벨 경로 사용 (운영 안전)
            return collection(db, path);
        }
        const studioId = resolveStudioId();
        return collection(db, `studios/${studioId}/${path}`);
    },

    /**
     * @param {string} path - 컬렉션 이름
     * @param {string} id - 문서 ID
     * @returns {import('firebase/firestore').DocumentReference}
     */
    doc: (path, id) => {
        if (!TENANT_MIGRATION_COMPLETE) {
            // 마이그레이션 전: 기존 루트 레벨 경로 사용 (운영 안전)
            if (id) {
                return doc(db, path, id);
            } else {
                return doc(collection(db, path));
            }
        }
        const studioId = resolveStudioId();
        if (id) {
            return doc(db, `studios/${studioId}/${path}`, id);
        } else {
            return doc(collection(db, `studios/${studioId}/${path}`));
        }
    },
    
    // 글로벌/공용 컬렉션 접근 (설정, 에러로그 등 — 항상 루트 레벨)
    globalCollection: (path) => collection(db, path),
    globalDoc: (path, id) => doc(db, path, id),
};
