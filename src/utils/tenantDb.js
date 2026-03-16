import { db } from '../firebase';
import { doc, collection } from 'firebase/firestore';
import { resolveStudioId } from './resolveStudioId';

/**
 * [SaaS Core] 테넌트 격리를 위한 Firestore 경로 생성 유틸리티
 * 
 * 모든 데이터는 studios/{studioId}/ 하위에 격리됩니다.
 * studioId는 resolveStudioId()로 동적 해석됩니다.
 */

export const tenantDb = {
    /**
     * @param {string} path - 컬렉션 이름 (예: 'members', 'sales')
     * @returns {import('firebase/firestore').CollectionReference}
     */
    collection: (path) => {
        const studioId = resolveStudioId();
        return collection(db, `studios/${studioId}/${path}`);
    },

    /**
     * @param {string} path - 컬렉션 이름
     * @param {string} id - 문서 ID
     * @returns {import('firebase/firestore').DocumentReference}
     */
    doc: (path, id) => {
        const studioId = resolveStudioId();
        if (id) {
            return doc(db, `studios/${studioId}/${path}`, id);
        } else {
            return doc(collection(db, `studios/${studioId}/${path}`));
        }
    },
};
