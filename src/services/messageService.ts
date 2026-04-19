/**
 * Message Service — Individual & Bulk Messages, Push Campaigns
 * TypeScript version
 */
import { db } from '../firebase';
import { doc, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, limit as firestoreLimit, Unsubscribe } from 'firebase/firestore';
import { tenantDb } from '../utils/tenantDb';

let isSendingBulkLock = false;

// ── Types ──
export interface Message {
    id: string;
    memberId?: string;
    content?: string;
    type?: string;
    status?: 'pending' | 'scheduled' | 'sent';
    scheduledAt?: string;
    templateId?: string;
    timestamp?: string;
    createdAt?: string;
    [key: string]: unknown;
}

export interface ApprovalItem {
    id: string;
    status?: string;
    approvedAt?: string;
    [key: string]: unknown;
}

// ── Service ──
export const messageService = {
    setNotifyCallback(): void { /* kept for interface consistency */ },

    async getMessagesByMemberId(memberId: string): Promise<Message[]> {
        try {
            const msgQuery = query(tenantDb.collection('messages'), where('memberId', '==', memberId), orderBy('timestamp', 'desc'), firestoreLimit(50));
            const msgSnap = await getDocs(msgQuery);
            const individualMessages: Message[] = msgSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'admin_individual' } as Message));

            const noticeQuery = query(tenantDb.collection('notices'), firestoreLimit(20));
            const noticeSnap = await getDocs(noticeQuery);
            const noticeMessages: Message[] = noticeSnap.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, type: 'notice', content: data.content as string, timestamp: (data.timestamp || data.date) as string } as Message;
            });

            return [...individualMessages, ...noticeMessages].sort((a, b) => new Date(b.timestamp || '0').getTime() - new Date(a.timestamp || '0').getTime());
        } catch (e) {
            console.error("[messageService] getMessagesByMemberId failed:", e);
            return [];
        }
    },

    getPendingApprovals(callback: (items: ApprovalItem[]) => void): Unsubscribe {
        try {
            const q = query(tenantDb.collection('message_approvals'), orderBy('createdAt', 'desc'));
            return onSnapshot(q, (snapshot) => {
                callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ApprovalItem)));
            }, (error) => {
                console.warn("[messageService] Error fetching pending approvals:", error);
                callback([]);
            });
        } catch (e) {
            console.error("[messageService] Failed to setup pending approvals listener:", e);
            callback([]);
            return (() => {}) as Unsubscribe;
        }
    },

    async approvePush(id: string): Promise<{ success: boolean }> {
        const docRef = tenantDb.doc('message_approvals', id);
        await updateDoc(docRef, { status: 'approved', approvedAt: new Date().toISOString() });
        return { success: true };
    },

    async rejectPush(id: string): Promise<{ success: boolean }> {
        await deleteDoc(tenantDb.doc('message_approvals', id));
        return { success: true };
    },

    async addMessage(memberId: string, content: string, scheduledAt: string | null = null, sendMode: string = 'push_first'): Promise<{ success: boolean; id: string }> {
        if (!memberId || !content) throw new Error("Invalid message data");
        const messageData: Record<string, unknown> = {
            memberId, content, type: 'admin_individual',
            createdAt: new Date().toISOString(), timestamp: new Date().toISOString(),
            status: scheduledAt ? 'scheduled' : 'pending',
            sendMode // 'push_only' | 'push_first' | 'sms_only'
        };
        if (scheduledAt) messageData.scheduledAt = scheduledAt;

        const docRef = await addDoc(tenantDb.collection('messages'), messageData);
        return { success: true, id: docRef.id };
    },

    async sendBulkMessages(memberIds: string[], content: string, scheduledAt: string | null = null, sendMode: string = 'push_first'): Promise<{ success: boolean; count: number }> {
        if (!memberIds || memberIds.length === 0) throw new Error("No members selected");
        if (!content) throw new Error("Content is empty");
        if (isSendingBulkLock) throw new Error("현재 전송이 진행 중입니다. 중복 발송을 방지하기 위해 잠시 Waitlisted at position 중입니다.");
        
        isSendingBulkLock = true;
        try {
            const chunks: string[][] = [];
            for (let i = 0; i < memberIds.length; i += 400) chunks.push(memberIds.slice(i, i + 400));
        let totalCount = 0;

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(memberId => {
                const docRef = doc(tenantDb.collection('messages'));
                const messageData: Record<string, unknown> = {
                    memberId, content, type: 'admin_individual',
                    createdAt: new Date().toISOString(), timestamp: new Date().toISOString(),
                    status: scheduledAt ? 'scheduled' : 'pending',
                    sendMode // 'push_only' | 'push_first' | 'sms_only'
                };
                if (scheduledAt) messageData.scheduledAt = scheduledAt;
                batch.set(docRef, messageData);
            });
            await batch.commit();
            totalCount += chunk.length;
        }
        return { success: true, count: totalCount };
        } finally {
            setTimeout(() => { isSendingBulkLock = false; }, 3000);
        }
    },

    async getMessages(memberId: string): Promise<Message[]> {
        try {
            const q = query(tenantDb.collection('messages'), where("memberId", "==", memberId), orderBy("timestamp", "desc"), firestoreLimit(50));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
        } catch (e) {
            console.warn("Get messages failed:", e);
            return [];
        }
    },

    async sendBulkPushCampaign(targetMemberIds: string[], title: string, body: string, studioName = ''): Promise<{ success: boolean; id: string }> {
        if (!body) throw new Error("Message body is required");
        const docRef = await addDoc(tenantDb.collection('push_campaigns'), {
            targetMemberIds: targetMemberIds || [], title: title || (studioName ? studioName + " 알림" : "알림"),
            body, status: 'pending', createdAt: new Date().toISOString(), totalTargets: targetMemberIds?.length || 0
        });
        return { success: true, id: docRef.id };
    }
};
