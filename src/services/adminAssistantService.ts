/**
 * Admin AI Assistant Service
 * 관리자 AI 비서 — Cloud Function 호출 및 대화 상태 관리
 */
import { functions } from "../firebase";
import { httpsCallable } from "firebase/functions";
import { getCurrentStudioId } from "../utils/resolveStudioId";

export interface AssistantMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    category?: string;
    suggestions?: string[];
}

export interface AssistantQuota {
    used: number;
    limit: number;
}

export interface AssistantHistoryItem {
    id: string;
    question: string;
    answer: string;
    category: string;
    timestamp: string;
}

/**
 * AI 비서에게 질문
 */
export const askAssistant = async (
    question: string,
    conversationHistory: AssistantMessage[]
): Promise<{ answer: string; category: string; suggestions: string[]; quota: AssistantQuota }> => {
    const fn = httpsCallable(functions, 'adminAskAI');
    const history = conversationHistory.map(m => ({
        role: m.role,
        content: m.content
    }));
    
    const result = await fn({ question, conversationHistory: history, studioId: getCurrentStudioId() });
    return result.data as { answer: string; category: string; suggestions: string[]; quota: AssistantQuota };
};

/**
 * 대화 히스토리 로드 (Firestore)
 */
export const getAssistantHistory = async (limit = 50): Promise<AssistantHistoryItem[]> => {
    const fn = httpsCallable(functions, 'getAssistantHistory');
    const result = await fn({ limit, studioId: getCurrentStudioId() });
    return result.data as AssistantHistoryItem[];
};
