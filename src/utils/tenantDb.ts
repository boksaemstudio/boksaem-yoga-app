import { db } from '../firebase';
import { doc, collection, CollectionReference, DocumentReference } from 'firebase/firestore';
import { resolveStudioId } from './resolveStudioId';

/**
 * [SaaS Core] 테넌트 격리를 위한 Firestore 경로 생성 유틸리티
 * 
 * 모든 데이터는 studios/{studioId}/ 하위에 격리됩니다.
 * studioId는 resolveStudioId()로 동적 해석됩니다.
 */

interface TenantDb {
    collection: (path: string) => CollectionReference;
    doc: (path: string, id?: string) => DocumentReference;
}

export const tenantDb: TenantDb = {
    collection: (path: string): CollectionReference => {
        const studioId = resolveStudioId();
        return collection(db, `studios/${studioId}/${path}`);
    },

    doc: (path: string, id?: string): DocumentReference => {
        const studioId = resolveStudioId();
        if (id) {
            return doc(db, `studios/${studioId}/${path}`, id);
        } else {
            return doc(collection(db, `studios/${studioId}/${path}`));
        }
    },
};
