import { useLanguageStore } from '../stores/useLanguageStore';
export function initContextMenuGuard() {
  if (typeof window !== 'undefined') {
    window.addEventListener('contextmenu', e => {
      e.preventDefault();
    }, {
      passive: false
    });
  }
}
export function initAgentAdminMode() {
  if (import.meta.env.DEV && typeof window !== 'undefined' && (window.location.search.includes('agent_admin=true') || localStorage.getItem('agent_admin_mode') === 'true')) {
    window.__AGENT_ADMIN_MODE__ = true;
    console.log('🚀 Agent Admin Mode Enabled: Confirmation dialogs will be auto-processed.');
    window.confirm = msg => {
      console.log('[Agent Mode] Auto-confirming:', msg);
      return true;
    };
    window.prompt = (msg, defaultVal) => {
      console.log('[Agent Mode] Auto-prompting:', msg);
      const t = useLanguageStore.getState().t;
      if (msg.includes(t("g_64e330") || "migration")) return t("g_64e330") || "Migration";
      if (msg.includes(t("g_30e15a") || "delete")) return t("g_30e15a") || "Delete";
      return defaultVal || t("g_3ce813") || "confirm";
    };
    window.alert = msg => {
      console.log('[Agent Mode] Auto-alerting (Suppressed):', msg);
    };
  }
}