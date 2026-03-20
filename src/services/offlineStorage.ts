/**
 * Offline Storage — IndexedDB action queue for offline-first resilience
 * TypeScript version
 */
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'yoga-offline-db';
const DB_VERSION = 1;
const QUEUE_STORE = 'action-queue';

export interface OfflineAction {
    id?: number;
    actionType: string;
    payload: Record<string, unknown>;
    timestamp: number;
    status: 'pending' | 'failed';
}

export const initOfflineDB = async (): Promise<IDBPDatabase> => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
            }
        },
    });
};

export const enqueueOfflineAction = async (actionType: string, payload: Record<string, unknown>): Promise<boolean> => {
    try {
        const db = await initOfflineDB();
        const tx = db.transaction(QUEUE_STORE, 'readwrite');
        const store = tx.objectStore(QUEUE_STORE);

        const actionRecord: OfflineAction = {
            actionType,
            payload,
            timestamp: Date.now(),
            status: 'pending'
        };

        await store.add(actionRecord);
        await tx.done;
        return true;
    } catch (error) {
        console.error('[OfflineStorage] Error enqueueing action:', error);
        return false;
    }
};

export const getOfflineQueue = async (): Promise<OfflineAction[]> => {
    try {
        const db = await initOfflineDB();
        return await db.getAll(QUEUE_STORE);
    } catch (error) {
        console.error('[OfflineStorage] Error getting queue:', error);
        return [];
    }
};

export const removeOfflineAction = async (id: number): Promise<void> => {
    try {
        const db = await initOfflineDB();
        const tx = db.transaction(QUEUE_STORE, 'readwrite');
        await tx.objectStore(QUEUE_STORE).delete(id);
        await tx.done;
    } catch (error) {
        console.error(`[OfflineStorage] Error removing action ${id}:`, error);
    }
};

export const clearOfflineQueue = async (): Promise<void> => {
    try {
        const db = await initOfflineDB();
        const tx = db.transaction(QUEUE_STORE, 'readwrite');
        await tx.objectStore(QUEUE_STORE).clear();
        await tx.done;
    } catch (error) {
        console.error('[OfflineStorage] Error clearing queue:', error);
    }
};
