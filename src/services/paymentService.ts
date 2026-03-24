/**
 * Payment Service — Sales CRUD + Real-time Stream
 * TypeScript version
 */
import { query, where, orderBy, getDocs, addDoc, deleteDoc, onSnapshot, updateDoc, limit, getDoc, Unsubscribe } from 'firebase/firestore';
import { tenantDb } from '../utils/tenantDb';

// ── Types ──
export interface SalesRecord {
    id: string;
    memberId?: string;
    amount?: number;
    type?: string;
    method?: string;
    timestamp?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

// ── State ──
let notifyCallback: () => void = () => {};
let cachedSales: SalesRecord[] = [];
let salesListenerUnsubscribe: Unsubscribe | null = null;
let salesReconnectAttempts = 0;
const MAX_SALES_RECONNECT = 3;

// ── Service ──
export const paymentService = {
    setNotifyCallback(callback: () => void): void {
        if (typeof callback === 'function') notifyCallback = callback;
    },

    setupSalesListener(): Unsubscribe {
        if (salesListenerUnsubscribe) { salesListenerUnsubscribe(); salesListenerUnsubscribe = null; }
        try {
            const q = query(tenantDb.collection('sales'), orderBy("timestamp", "desc"), limit(500));
            salesListenerUnsubscribe = onSnapshot(q, (snapshot) => {
                salesReconnectAttempts = 0;
                const newSales: SalesRecord[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesRecord));
                if (JSON.stringify(cachedSales) !== JSON.stringify(newSales)) { cachedSales = newSales; notifyCallback(); }
            }, (error) => {
                console.error('[paymentService] Sales stream broken:', error);
                if (salesReconnectAttempts < MAX_SALES_RECONNECT) {
                    salesReconnectAttempts++;
                    console.warn(`[paymentService] Reconnecting... (${salesReconnectAttempts}/${MAX_SALES_RECONNECT})`);
                    setTimeout(() => paymentService.setupSalesListener(), 5000);
                }
            });
            return salesListenerUnsubscribe;
        } catch (e) {
            console.error('[paymentService] Failed to establish sales pipeline:', e);
            return (() => {}) as Unsubscribe;
        }
    },

    async getSales(): Promise<SalesRecord[]> {
        if (cachedSales && cachedSales.length > 0) return [...cachedSales];
        return this.getAllSales();
    },

    async getRevenueStats(): Promise<Record<string, unknown> | null> {
        try {
            const docRef = tenantDb.doc('stats', 'revenue_summary');
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data() as Record<string, unknown>) : null;
        } catch (error) {
            console.warn('Failed to fetch revenue stats:', error);
            return null;
        }
    },

    async addSalesRecord(data: Omit<SalesRecord, 'id'>): Promise<boolean> {
        try {
            await addDoc(tenantDb.collection('sales'), { ...data, timestamp: new Date().toISOString() });
            return true;
        } catch (e) {
            console.error("[paymentService] Add sales failed:", e);
            throw e;
        }
    },

    async updateSalesRecord(salesId: string, updates: Partial<SalesRecord>): Promise<boolean> {
        try {
            const saleRef = tenantDb.doc('sales', salesId);
            await updateDoc(saleRef, { ...updates, updatedAt: new Date().toISOString() });
            return true;
        } catch (e) {
            console.error("[paymentService] Update sales record failed:", e);
            throw e;
        }
    },

    async deleteSalesRecord(salesId: string): Promise<boolean> {
        try {
            // Soft Delete: 실제 삭제 대신 deletedAt 필드 설정 (복원 가능)
            await updateDoc(tenantDb.doc('sales', salesId), { 
                deletedAt: new Date().toISOString(),
                _deletedBy: 'admin'
            });
            return true;
        } catch (e) {
            console.error("[paymentService] Soft-delete sales record failed:", e);
            throw e;
        }
    },

    async restoreSalesRecord(salesId: string): Promise<boolean> {
        try {
            const { deleteField } = await import('firebase/firestore');
            await updateDoc(tenantDb.doc('sales', salesId), { 
                deletedAt: deleteField(),
                _deletedBy: deleteField()
            });
            return true;
        } catch (e) {
            console.error("[paymentService] Restore sales record failed:", e);
            throw e;
        }
    },

    async getDeletedSales(): Promise<SalesRecord[]> {
        try {
            const q = query(tenantDb.collection('sales'), where('deletedAt', '!=', null), orderBy('deletedAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesRecord));
        } catch (e) {
            console.warn("[paymentService] getDeletedSales failed:", e);
            return [];
        }
    },

    async getSalesHistory(memberId: string): Promise<SalesRecord[]> {
        if (cachedSales && cachedSales.length > 0) return cachedSales.filter(s => s.memberId === memberId);
        try {
            const q = query(tenantDb.collection('sales'), where("memberId", "==", memberId));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesRecord));
        } catch (e) {
            console.warn("[paymentService] History fallback failed:", e);
            return [];
        }
    },

    async getAllSales(): Promise<SalesRecord[]> {
        if (cachedSales.length > 0) return cachedSales;
        try {
            const q = query(tenantDb.collection('sales'), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalesRecord));
        } catch (e) {
            console.warn("[paymentService] getAllSales fallback failed:", e);
            return [];
        }
    }
};
