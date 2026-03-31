/**
 * [SaaS Core] 테넌트 격리를 위한 Firebase Storage 경로 생성 유틸리티
 *
 * tenantDb.ts가 Firestore 경로를 격리하는 것과 동일한 패턴으로,
 * Firebase Storage의 파일 경로에 studios/{studioId}/ 접두사를 자동 추가합니다.
 *
 * @example
 *   tenantStoragePath('kiosk_notices/all/image.webp')
 *   // → 'studios/boksaem-yoga/kiosk_notices/all/image.webp'
 */
import { ref, StorageReference } from 'firebase/storage';
import { storage } from '../firebase';
import { resolveStudioId } from './resolveStudioId';

/**
 * 테넌트 격리된 Storage 경로 문자열을 반환합니다.
 * @param path - studios/{studioId}/ 없이 상대 경로
 * @returns 테넌트 접두사가 포함된 전체 경로
 */
export const tenantStoragePath = (path: string): string => {
    const studioId = resolveStudioId();
    return `studios/${studioId}/${path}`;
};

/**
 * 테넌트 격리된 StorageReference를 반환합니다.
 * @param path - studios/{studioId}/ 없이 상대 경로
 * @returns Firebase StorageReference
 */
export const tenantStorageRef = (path: string): StorageReference => {
    return ref(storage, tenantStoragePath(path));
};
