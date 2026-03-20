import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Firebase ──
vi.mock('firebase/firestore', () => ({
    doc: vi.fn((...args: any[]) => ({ __type: 'doc', args })),
    collection: vi.fn((...args: any[]) => ({ __type: 'collection', args })),
    CollectionReference: class {},
    DocumentReference: class {},
}));

vi.mock('../firebase', () => ({
    db: { __type: 'mockDb' },
}));

vi.mock('./resolveStudioId', () => ({
    resolveStudioId: vi.fn(() => 'test-studio'),
}));

import { tenantDb } from './tenantDb';
import { collection as mockCollection, doc as mockDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { resolveStudioId } from './resolveStudioId';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('tenantDb.collection', () => {
    it('올바른 테넌트 경로로 Firestore collection 호출', () => {
        tenantDb.collection('members');

        expect(resolveStudioId).toHaveBeenCalled();
        expect(mockCollection).toHaveBeenCalledWith(db, 'studios/test-studio/members');
    });

    it('중첩 경로도 올바르게 생성', () => {
        tenantDb.collection('settings/config');

        expect(mockCollection).toHaveBeenCalledWith(db, 'studios/test-studio/settings/config');
    });
});

describe('tenantDb.doc', () => {
    it('ID 지정 시 doc(db, path, id) 형태로 호출', () => {
        tenantDb.doc('members', 'abc123');

        expect(resolveStudioId).toHaveBeenCalled();
        expect(mockDoc).toHaveBeenCalledWith(db, 'studios/test-studio/members', 'abc123');
    });

    it('ID 미지정 시 collection 기반 자동 ID doc 생성', () => {
        tenantDb.doc('members');

        expect(resolveStudioId).toHaveBeenCalled();
        // ID 없이 호출하면 collection → doc 패턴
        expect(mockCollection).toHaveBeenCalledWith(db, 'studios/test-studio/members');
    });
});
