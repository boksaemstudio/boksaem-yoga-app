/**
 * Safe LocalStorage Wrapper
 * Prevents crashes in private browsing / restricted contexts
 */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    try { return localStorage.getItem(key); } 
    catch { return null; }
  },
  setItem(key: string, value: string): void {
    try { localStorage.setItem(key, value); } 
    catch { /* ignore */ }
  },
  removeItem(key: string): void {
    try { localStorage.removeItem(key); } 
    catch { /* ignore */ }
  }
};
