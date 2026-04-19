/**
 * Auth Service — Login/Logout for Members, Instructors, Admins
 * TypeScript version
 */
import { auth, functions } from "../firebase";
import { signInAnonymously, signInWithCustomToken, Unsubscribe as AuthUnsubscribe } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { addDoc } from 'firebase/firestore';
import { tenantDb } from '../utils/tenantDb';
import { getCurrentStudioId } from '../utils/resolveStudioId';

// ── Types ──
export interface LoginResult {
    success: boolean;
    error?: string;
    message?: string;
    member?: Record<string, unknown>;
}

export interface InstructorLoginResult {
    success: boolean;
    name?: string;
    message?: string;
    authEstablished?: boolean;
}

// ── Helpers ──
const withTimeout = <T>(promise: Promise<T>, timeoutMs = 10000, errorMsg = '서버 응답 시간 초과'): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs))
    ]);
};

async function logLoginFailure(type: string, name: string, phoneLast4: string, errorMessage: string): Promise<void> {
    try {
        await addDoc(tenantDb.collection('login_failures'), {
            timestamp: new Date().toISOString(),
            type,
            attemptedName: name,
            attemptedPhone: phoneLast4,
            errorMessage,
            userAgent: navigator.userAgent,
            device: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        });
    } catch (e) {
        console.error('[Login Failure] Failed to log:', e);
    }
}

// ── Service ──
export const authService = {
    logLoginFailure,

    onAuthStateChanged(callback: (user: unknown) => void): AuthUnsubscribe {
        return auth.onAuthStateChanged(callback);
    },

    async ensureAuth(): Promise<void> {
        if (!auth.currentUser) await signInAnonymously(auth);
    },

    async loginMember(name: string, last4Digits: string): Promise<LoginResult> {
        try {
            if (!name || !last4Digits) return { success: false, error: 'INVALID_INPUT', message: '이름과 비밀번호를 모두 입력해주세요.' };
            const loginFunc = httpsCallable(functions, 'memberLoginV2Call');
            const safeName = String(name || '').trim();
            const response = await loginFunc({ name: safeName, phoneLast4: last4Digits, studioId: getCurrentStudioId() });
            const data = response.data as { success: boolean; token?: string; member?: Record<string, unknown>; message?: string };

            if (data.success && data.token) {
                try { await signInWithCustomToken(auth, data.token); }
                catch (authErr) { console.error('[Auth] Custom token auth failed:', authErr); return { success: false, error: 'AUTH_FAILED', message: '인증 세션 생성에 실패했습니다.' }; }
                return { success: true, member: { ...data.member, displayName: name.trim() } };
            } else {
                const errorMsg = data.message || 'No matching member found.';
                await logLoginFailure('member', name, last4Digits, errorMsg);
                return { success: false, error: 'NOT_FOUND', message: errorMsg };
            }
        } catch (e: unknown) {
            const err = e as Error & { code?: string };
            console.error('Login failed:', err);
            await logLoginFailure('member', name, last4Digits, err.message || 'SYSTEM_ERROR');
            const firebaseErrorMessages: Record<string, string> = {
                'internal': '서버 오류가 발생했습니다.', 'unavailable': '서버에 연결할 수 없습니다.',
                'deadline-exceeded': '서버 응답 시간이 초과되었습니다.', 'unauthenticated': '인증 정보가 올바르지 않습니다.',
                'permission-denied': '접근 권한이 없습니다.', 'resource-exhausted': '너무 많은 시도입니다.',
                'invalid-argument': '입력 정보를 확인해주세요.', 'not-found': '일치하는 Member 정보가 없습니다.'
            };
            const errorCode = (err.code || '').replace('functions/', '');
            return { success: false, error: 'SYSTEM_ERROR', message: firebaseErrorMessages[errorCode] || 'Login error occurred.' };
        }
    },

    async loginInstructor(name: string, last4Digits: string): Promise<InstructorLoginResult> {
        try {
            const verifyInstructor = httpsCallable(functions, 'verifyInstructorV2Call');
            const safeName = String(name || '').trim();
            const response = await withTimeout(verifyInstructor({ name: safeName, phoneLast4: last4Digits, studioId: getCurrentStudioId() }), 10000, 'Instructor 인증 시간 초과');
            const data = response.data as { success: boolean; token?: string; name?: string; message?: string };

            if (data.success) {
                let authEstablished = false;
                if (data.token) { try { await signInWithCustomToken(auth, data.token); authEstablished = true; } catch { /* fallback below */ } }
                if (!authEstablished) { try { await signInAnonymously(auth); authEstablished = true; } catch (anonErr) { console.error('[Auth] CRITICAL: Both auth methods failed:', anonErr); } }
                localStorage.setItem('instructorName', data.name || '');
                return { success: true, name: data.name, authEstablished };
            } else {
                await logLoginFailure('instructor', name, last4Digits, data.message || 'Authentication Failed');
                return { success: false, message: data.message || 'Authentication Failed' };
            }
        } catch (e: unknown) {
            const err = e as Error;
            console.error('Instructor login failed:', err);
            await logLoginFailure('instructor', name, last4Digits, err.message || 'SYSTEM_ERROR');
            return { success: false, message: '로그인 중 시스템 오류가 발생했습니다.' };
        }
    },

    async loginAdmin(email: string, password: string): Promise<LoginResult> {
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (e: unknown) {
            const err = e as Error;
            console.error('Admin login failed:', err);
            await logLoginFailure('admin', email, 'N/A', err.message || 'AUTH_ERROR');
            return { success: false, message: '로그인에 실패했습니다.' };
        }
    },

    async logoutAdmin(): Promise<void> {
        const { signOut } = await import("firebase/auth");
        return signOut(auth);
    }
};
