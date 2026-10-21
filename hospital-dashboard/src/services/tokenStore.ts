const API_TOKEN_KEY = 'lifelink-api-session-token-v1';

/**
 * Phase 5 integration seam only. sessionStorage is not a final production security
 * decision; coordinate cookies/token storage and CSRF protection with the backend.
 */
export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    try { return window.sessionStorage.getItem(API_TOKEN_KEY); } catch { return null; }
  },
  set(token: string) {
    if (typeof window === 'undefined') return;
    try { window.sessionStorage.setItem(API_TOKEN_KEY, token); } catch { /* Session can remain in memory on constrained browsers. */ }
  },
  clear() {
    if (typeof window === 'undefined') return;
    try { window.sessionStorage.removeItem(API_TOKEN_KEY); } catch { /* Nothing else to clear. */ }
  },
};
