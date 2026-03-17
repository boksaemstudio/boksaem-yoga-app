import { db } from '../firebase';
import { collection, doc, query, where, orderBy, getDocs, addDoc, deleteDoc, onSnapshot, updateDoc, limit, getDoc } from 'firebase/firestore';
import { tenantDb } from '../utils/tenantDb';

/**
 * [ARCHITECTURAL CORE REFACTORING]
 * paymentService: 단순 데이터 Fetcher에서 실시간 데이터 스트리머로 진화
 * 땜질 처방이 아닌 근본적인 Single Source of Truth 아키텍처를 지향합니다.
 */

let notifyCallback = () => {};
let cachedSales = [];
let salesListenerUnsubscribe = null;
let salesReconnectAttempts = 0;
const MAX_SALES_RECONNECT = 3;

export const paymentService = {
  /**
   * 중앙 관제 콜백 설정
   */
  setNotifyCallback(callback) {
    if (typeof callback === 'function') {
      notifyCallback = callback;
    }
  },

  /**
   * 실시간 매출 스트림 파이프라인 구축
   * 중복 구독을 방지하고, 에러 시 최대 3회 재연결합니다.
   */
  setupSalesListener() {
    if (salesListenerUnsubscribe) {
      salesListenerUnsubscribe();
      salesListenerUnsubscribe = null;
    }

    try {
      const q = query(
        tenantDb.collection('sales'),
        orderBy("timestamp", "desc"),
        limit(500)
      );

      salesListenerUnsubscribe = onSnapshot(q, (snapshot) => {
        salesReconnectAttempts = 0; // 성공 시 카운터 리셋
        const newSales = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        if (JSON.stringify(cachedSales) !== JSON.stringify(newSales)) {
          cachedSales = newSales;
          notifyCallback();
        }
      }, (error) => {
        console.error('[paymentService] Sales stream broken:', error);
        if (salesReconnectAttempts < MAX_SALES_RECONNECT) {
          salesReconnectAttempts++;
          console.warn(`[paymentService] Reconnecting... (${salesReconnectAttempts}/${MAX_SALES_RECONNECT})`);
          setTimeout(() => paymentService.setupSalesListener(), 5000);
        } else {
          console.error('[paymentService] Max reconnect attempts reached. Sales stream stopped.');
        }
      });

      return salesListenerUnsubscribe;
    } catch (e) {
      console.error('[paymentService] Failed to establish sales pipeline:', e);
      return () => {};
    }
  },

  /**
   * [ROOT SOLUTION] 매출 데이터 조회 인터페이스
   * 리액티브 캐시가 존재할 경우 즉시 반환하며, 하위 호환성을 위해 항상 Promise를 반환합니다.
   */
  async getSales() {
    if (cachedSales && cachedSales.length > 0) {
      return [...cachedSales]; // 원본 보존을 위한 얕은 복사
    }
    // 캐시가 비어있을 경우 (부팅 직후 등) Fallback으로 직접 조회
    return this.getAllSales();
  },

  async getRevenueStats() {
    // [NOTE] revenue_summary는 프론트에서 직접 사용하지 않으나 하위 호환성을 위해 유지
    try {
      const docRef = tenantDb.doc('stats', 'revenue_summary');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.warn('Failed to fetch revenue stats:', error);
      return null;
    }
  },

  /**
   * 매출 기록 추가 (Atomic Write)
   */
  async addSalesRecord(data) {
    try {
      const docRef = await addDoc(tenantDb.collection('sales'), {
        ...data,
        timestamp: new Date().toISOString()
      });
      console.log(`[paymentService] New sale recorded: ${docRef.id}`);
      return true;
    } catch (e) {
      console.error("[paymentService] Add sales failed:", e);
      throw e;
    }
  },

  /**
   * 매출 기록 수정
   */
  async updateSalesRecord(salesId, updates) {
    try {
      const saleRef = tenantDb.doc('sales', salesId);
      await updateDoc(saleRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      console.log(`[paymentService] Sales record updated: ${salesId}`);
      // 리스너가 감지하므로 여기서 notifyCallback() 수동 호출 불필요 (땜질 방지)
      return true;
    } catch (e) {
      console.error("[paymentService] Update sales record failed:", e);
      throw e;
    }
  },

  /**
   * 매출 기록 삭제
   */
  async deleteSalesRecord(salesId) {
    try {
      await deleteDoc(tenantDb.doc('sales', salesId));
      console.log(`[paymentService] Sales record deleted: ${salesId}`);
      return true;
    } catch (e) {
      console.error("[paymentService] Delete sales record failed:", e);
      throw e;
    }
  },

  /**
   * 특정 회원의 매출 이력 조회 (이미 캐시된 데이터에서 필터링하여 성능 최적화)
   */
  async getSalesHistory(memberId) {
    if (cachedSales && cachedSales.length > 0) {
      return cachedSales.filter(s => s.memberId === memberId);
    }

    // 만약 리스너가 아직 부팅 전이라면 Fallback으로 서버 1회 호출
    try {
      const q = query(tenantDb.collection('sales'), where("memberId", "==", memberId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("[paymentService] History fallback failed:", e);
      return [];
    }
  },

  /**
   * [Legacy Compatibility] 
   * 기존 코드들과의 호환성을 위해 유지하되, 내부적으로는 캐시를 활용함
   */
  async getAllSales() {
    if (cachedSales.length > 0) return cachedSales;
    
    try {
      const q = query(tenantDb.collection('sales'), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("[paymentService] getAllSales fallback failed:", e);
      return [];
    }
  }
};
