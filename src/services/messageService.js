import { db } from '../firebase';
import { collection, doc, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, limit as firestoreLimit } from 'firebase/firestore';
import { STUDIO_CONFIG } from '../studioConfig';
export const messageService = {
  setNotifyCallback() {
    // Unused, but kept for interface consistency
  },

  async getMessagesByMemberId(memberId) {
    try {
      console.log(`[messageService] Fetching messages for member: ${memberId}`);

      const msgQuery = query(
        collection(db, 'messages'),
        where('memberId', '==', memberId),
        firestoreLimit(50)
      );
      const msgSnap = await getDocs(msgQuery);
      const individualMessages = msgSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'admin_individual'
      }));

      const noticeQuery = query(
        collection(db, 'notices'),
        firestoreLimit(20)
      );
      const noticeSnap = await getDocs(noticeQuery);
      const noticeMessages = noticeSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'notice',
        content: doc.data().content,
        timestamp: doc.data().timestamp || doc.data().date
      }));

      const allMessages = [...individualMessages, ...noticeMessages].sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      });

      return allMessages;
    } catch (e) {
      console.error("[messageService] getMessagesByMemberId failed:", e);
      return [];
    }
  },

  getPendingApprovals(callback) {
    try {
      const q = query(
        collection(db, 'message_approvals'),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (callback) callback(items);
      }, (error) => {
        console.warn("[messageService] Error fetching pending approvals:", error);
        if (callback) callback([]);
      });
    } catch (e) {
      console.error("[messageService] Failed to setup pending approvals listener:", e);
      if (callback) callback([]);
      return () => { };
    }
  },

  async approvePush(id) {
    try {
      const docRef = doc(db, 'message_approvals', id);
      await updateDoc(docRef, { status: 'approved', approvedAt: new Date().toISOString() });
      return { success: true };
    } catch (e) {
      console.error("Approve push failed:", e);
      throw e;
    }
  },

  async rejectPush(id) {
    try {
      await deleteDoc(doc(db, 'message_approvals', id));
      return { success: true };
    } catch (e) {
      console.error("Reject push failed:", e);
      throw e;
    }
  },

  async addMessage(memberId, content, scheduledAt = null, templateId = null) {
    try {
      if (!memberId || !content) throw new Error("Invalid message data");

      const messageData = {
        memberId,
        content,
        type: 'admin_individual',
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      if (scheduledAt) {
          messageData.scheduledAt = scheduledAt;
          messageData.status = 'scheduled';
      } else {
          messageData.status = 'pending';
      }

      if (templateId) {
          messageData.templateId = templateId;
      }

      const docRef = await addDoc(collection(db, 'messages'), messageData);
      console.log(`[messageService] Message added for ${memberId}: ${docRef.id}. Template: ${templateId || 'None'}`);
      return { success: true, id: docRef.id };
    } catch (e) {
      console.error("Add message failed:", e);
      throw e;
    }
  },

  async sendBulkMessages(memberIds, content, scheduledAt = null, templateId = null) {
      try {
          if (!memberIds || memberIds.length === 0) throw new Error("No members selected");
          if (!content) throw new Error("Content is empty");

          const chunks = [];
          for (let i = 0; i < memberIds.length; i += 400) {
              chunks.push(memberIds.slice(i, i + 400));
          }

          let totalCount = 0;

          for (const chunk of chunks) {
              const batch = writeBatch(db);
              
              chunk.forEach(memberId => {
                  const docRef = doc(collection(db, 'messages'));
                  const messageData = {
                      memberId,
                      content,
                      type: 'admin_individual',
                      createdAt: new Date().toISOString(),
                      timestamp: new Date().toISOString(),
                      status: scheduledAt ? 'scheduled' : 'pending'
                  };
                  
                  if (scheduledAt) {
                      messageData.scheduledAt = scheduledAt;
                  }
                  
                  if (templateId) {
                      messageData.templateId = templateId;
                  }

                  batch.set(docRef, messageData);
              });

              await batch.commit();
              totalCount += chunk.length;
          }

          console.log(`[messageService] Bulk sent ${totalCount} messages.`);
          return { success: true, count: totalCount };

      } catch (e) {
          console.error("Bulk message send failed:", e);
          throw e;
      }
  },

  async getMessages(memberId) {
    try {
      const q = query(
        collection(db, 'messages'),
        where("memberId", "==", memberId),
        orderBy("timestamp", "desc"),
        firestoreLimit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("Get messages failed:", e);
      return [];
    }
  },

  async sendBulkPushCampaign(targetMemberIds, title, body) {
    try {
      if (!body) throw new Error("Message body is required");

      const docRef = await addDoc(collection(db, 'push_campaigns'), {
        targetMemberIds: targetMemberIds || [],
        title: title || STUDIO_CONFIG.NAME + " 알림",
        body,
        status: 'pending',
        createdAt: new Date().toISOString(),
        totalTargets: targetMemberIds?.length || 0
      });

      console.log(`[messageService] Bulk push campaign created: ${docRef.id}. Status: pending.`);
      return { success: true, id: docRef.id };
    } catch (e) {
      console.error("Bulk push failed:", e);
      throw e;
    }
  }
};
