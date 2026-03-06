import { db } from '../firebase';
import { collection, doc, query, where, orderBy, getDocs, addDoc, deleteDoc } from 'firebase/firestore';

let notifyCallback = () => {};
let cachedSales = [];

export const paymentService = {
  setNotifyCallback(callback) {
    notifyCallback = callback;
  },

  setupSalesListener() {
    try {
      const { onSnapshot } = require('firebase/firestore'); // ensure onSnapshot is available if not top-level
      const q = query(
        collection(db, 'sales'),
        orderBy("timestamp", "desc")
      );

      return onSnapshot(q, (snapshot) => {
        cachedSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        notifyCallback();
      }, (error) => {
        console.warn('[paymentService] Sales listener error:', error);
      });
    } catch (e) {
      console.error('[paymentService] Failed to setup sales listener:', e);
      return () => {};
    }
  },

  getSales() {
    return cachedSales;
  },

  async addSalesRecord(data) {
    try {
      await addDoc(collection(db, 'sales'), {
        ...data,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (e) {
      console.error("Add sales failed:", e);
      throw e;
    }
  },

  async updateSalesRecord(salesId, updates) {
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'sales', salesId), updates);
      console.log(`[paymentService] Sales record updated: ${salesId}`);
      notifyCallback();
      return true;
    } catch (e) {
      console.error("Update sales record failed:", e);
      throw e;
    }
  },

  async deleteSalesRecord(salesId) {
    try {
      await deleteDoc(doc(db, 'sales', salesId));
      console.log(`[paymentService] Sales record deleted: ${salesId}`);
      notifyCallback();
      return true;
    } catch (e) {
      console.error("Delete sales record failed:", e);
      throw e;
    }
  },

  async getSalesHistory(memberId) {
    try {
      const q = query(
        collection(db, 'sales'),
        where("memberId", "==", memberId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("Get sales history failed:", e);
      return [];
    }
  },

  async getAllSales() {
    try {
      const q = query(
        collection(db, 'sales'),
        orderBy("timestamp", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("Get all sales failed:", e);
      return [];
    }
  },

  async getSales() {
    return this.getAllSales();
  }
};
