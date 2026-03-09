import { db } from '../firebase';
import { collection, doc, query, where, orderBy, getDocs, addDoc, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';

/**
 * [ARCHITECTURAL CORE REFACTORING]
 * paymentService: 단순 데이터 Fetcher에서 실시간 데이터 스트리머로 진화
 * 땜질 처방이 아닌 근본적인 Single Source of Truth 아키텍처를 지향합니다.
 */

let notifyCallback = () => {};
let cachedSales = [];
let salesListenerUnsubscribe = null;

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
   * [ROOT SOLUTION] 실시간 매출 스트림 파이프라인 구축
   * 중복 구독을 방지하고, 에러 시 자가 치유 기능을 포함합니다.
   */
  setupSalesListener() {
    // 1. 기존 리스너가 있다면 안전하게 해제 (중복 구독 방지)
    if (salesListenerUnsubscribe) {
      console.log('[paymentService] Cleaning up existing sales listener...');
      salesListenerUnsubscribe();
      salesListenerUnsubscribe = null;
    }

    try {
      console.log('[paymentService] Core: Establishing real-time sales stream...');
      
      // 최신순 정렬 및 리소스 최적화를 위해 컬렉션 쿼리 정의
      // (운영 부하를 고려하여 필요 시 limit을 걸 수 있으나, 현재는 전수 동기화 지향)
      const q = query(
        collection(db, 'sales'),
        orderBy("timestamp", "desc")
      );

      // 2. 실시간 엔진 가동
      salesListenerUnsubscribe = onSnapshot(q, (snapshot) => {
        const newSales = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        // 정합성 검사: 데이터 변화가 실제로 있을 때만 캐시 갱신 및 UI 통지
        if (JSON.stringify(cachedSales) !== JSON.stringify(newSales)) {
          cachedSales = newSales;
          console.log(`[paymentService] Stream synchronized: ${cachedSales.length} records`);
          notifyCallback();
        }
      }, (error) => {
        console.error('[paymentService] Critical: Sales stream broken.', error);
        // [Safety Rail] 리스너 장애 시 5초 후 재연결 시도 (지속성 보장)
        setTimeout(() => paymentService.setupSalesListener(), 5000);
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

  /**
   * 매출 기록 추가 (Atomic Write)
   */
  async addSalesRecord(data) {
    try {
      const docRef = await addDoc(collection(db, 'sales'), {
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
      const saleRef = doc(db, 'sales', salesId);
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
      await deleteDoc(doc(db, 'sales', salesId));
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
      const q = query(collection(db, 'sales'), where("memberId", "==", memberId));
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
      const q = query(collection(db, 'sales'), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("[paymentService] getAllSales fallback failed:", e);
      return [];
    }
  }
};
