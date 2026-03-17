/**
 * Auth Service — Login/Logout for Members, Instructors, Admins
 * Extracted from storage.js
 */
import { auth, functions } from "../firebase";
import { signInAnonymously, signInWithCustomToken } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { addDoc } from 'firebase/firestore';
import { tenantDb } from '../utils/tenantDb';

// [NETWORK] Timeout wrapper for Cloud Function calls
const withTimeout = (promise, timeoutMs = 10000, errorMsg = '서버 응답 시간 초과') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    )
  ]);
};

/**
 * 로그인 실패 로깅
 */
async function logLoginFailure(type, name, phoneLast4, errorMessage) {
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

export const authService = {
  logLoginFailure,

  onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
  },

  async ensureAuth() {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  },

  async loginMember(name, last4Digits) {
    try {
      if (!name || !last4Digits) {
        return { success: false, error: 'INVALID_INPUT', message: '이름과 비밀번호를 모두 입력해주세요.' };
      }

      const loginFunc = httpsCallable(functions, 'memberLoginV2Call');
      const safeName = String(name || '').trim();
      const response = await loginFunc({ name: safeName, phoneLast4: last4Digits });
      
      if (response.data.success && response.data.token) {
        try {
          await signInWithCustomToken(auth, response.data.token);
        } catch (authErr) {
          console.error('[Auth] Custom token auth failed:', authErr);
          return { success: false, error: 'AUTH_FAILED', message: '인증 세션 생성에 실패했습니다.' };
        }
        return { success: true, member: { ...response.data.member, displayName: name.trim() } };
      } else {
        const errorMsg = response.data.message || '일치하는 회원 정보가 없습니다.';
        await logLoginFailure('member', name, last4Digits, errorMsg);
        return { success: false, error: 'NOT_FOUND', message: errorMsg };
      }
    } catch (e) {
      console.error('Login failed:', e);
      await logLoginFailure('member', name, last4Digits, e.message || 'SYSTEM_ERROR');
      
      const firebaseErrorMessages = {
        'internal': '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        'unavailable': '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.',
        'deadline-exceeded': '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
        'unauthenticated': '인증 정보가 올바르지 않습니다.',
        'permission-denied': '접근 권한이 없습니다.',
        'resource-exhausted': '너무 많은 시도입니다. 잠시 후 다시 시도해주세요.',
        'invalid-argument': '입력 정보를 확인해주세요.',
        'not-found': '일치하는 회원 정보가 없습니다.'
      };
      
      const errorCode = (e.code || '').replace('functions/', '');
      const userMessage = firebaseErrorMessages[errorCode] || '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      
      return { success: false, error: 'SYSTEM_ERROR', message: userMessage };
    }
  },

  async loginInstructor(name, last4Digits) {
    try {
      const verifyInstructor = httpsCallable(functions, 'verifyInstructorV2Call');
      const safeName = String(name || '').trim();
      const response = await withTimeout(
        verifyInstructor({ name: safeName, phoneLast4: last4Digits }),
        10000,
        '선생님 인증 시간 초과'
      );

      if (response.data.success) {
        let authEstablished = false;

        if (response.data.token) {
          try {
            await signInWithCustomToken(auth, response.data.token);
            authEstablished = true;
          } catch (authErr) {
            console.warn('[Auth] Custom token auth failed, trying anonymous:', authErr.code);
          }
        }

        if (!authEstablished) {
          try {
            await signInAnonymously(auth);
            authEstablished = true;
          } catch (anonErr) {
            console.error('[Auth] CRITICAL: Both auth methods failed:', anonErr.code);
          }
        }

        localStorage.setItem('instructorName', response.data.name);
        return { success: true, name: response.data.name, authEstablished };
      } else {
        await logLoginFailure('instructor', name, last4Digits, response.data.message || '인증 실패');
        return { success: false, message: response.data.message || '인증 실패' };
      }
    } catch (e) {
      console.error('Instructor login failed:', e);
      await logLoginFailure('instructor', name, last4Digits, e.message || 'SYSTEM_ERROR');
      return { success: false, message: '로그인 중 시스템 오류가 발생했습니다.' };
    }
  },

  async loginAdmin(email, password) {
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (e) {
      console.error('Admin login failed:', e);
      await logLoginFailure('admin', email, 'N/A', e.message || 'AUTH_ERROR');
      return { success: false, message: '로그인에 실패했습니다.' };
    }
  },

  async logoutAdmin() {
    const { signOut } = await import("firebase/auth");
    return signOut(auth);
  }
};
