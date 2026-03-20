export function initContextMenuGuard() {
  if (typeof window !== 'undefined') {
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    }, { passive: false });
  }
}

export function initAgentAdminMode() {
  if (import.meta.env.DEV && typeof window !== 'undefined' && (window.location.search.includes('agent_admin=true') || localStorage.getItem('agent_admin_mode') === 'true')) {
    window.__AGENT_ADMIN_MODE__ = true;
    console.log('🚀 Agent Admin Mode Enabled: Confirmation dialogs will be auto-processed.');
    window.confirm = (msg) => { console.log('[Agent Mode] Auto-confirming:', msg); return true; };
    window.prompt = (msg, defaultVal) => {
      console.log('[Agent Mode] Auto-prompting:', msg);
      if (msg.includes('마이그레이션')) return '마이그레이션';
      if (msg.includes('삭제')) return '삭제';
      return defaultVal || '확인';
    };
    window.alert = (msg) => { console.log('[Agent Mode] Auto-alerting (Suppressed):', msg); };
  }
}
