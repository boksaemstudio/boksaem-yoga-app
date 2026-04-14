import { useState, useEffect, useRef, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ArrowsClockwise, X } from '@phosphor-icons/react';
import { useLanguageStore } from '../stores/useLanguageStore';

/**
 * PWA 업데이트 관리
 * 
 * - 키오스크(/checkin): SW controller 교체 감지 → 30초 유휴 대기 → 자동 새로고침
 * - 관리자/회원: 업데이트 배너 표시 (수동 클릭)
 */
const IDLE_TIMEOUT_MS = 30_000;
function ReloadPrompt() {
  const t = useLanguageStore(s => s.t);
  const [updating, setUpdating] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const pendingReloadRef = useRef(false);
  const idleTimerRef = useRef(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[SW] Registered');
      if (r) {
        r.update().catch(() => {});
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('[SW] registration error', error);
    }
  });

  // ━━━━ 유휴 감지 ━━━━
  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);
  useEffect(() => {
    const events = ['touchstart', 'mousedown', 'keydown', 'scroll'];
    events.forEach(evt => window.addEventListener(evt, markActivity, {
      passive: true
    }));
    return () => events.forEach(evt => window.removeEventListener(evt, markActivity));
  }, [markActivity]);

  // ━━━━ 키오스크 자동 새로고침: controllerchange 이벤트 사용 ━━━━
  // 항상 켜놓는 무인 앱: 키오스크만 — 유휴 시 자동 새로고침
  // [FIX] 관리자앱은 원장이 보고 있으므로 자동 리로드하면 깜박임 → 배너로 안내
  const isAlwaysOn = typeof window !== 'undefined' && window.location.pathname.startsWith('/checkin');
  const startIdleReloadLoop = useCallback(() => {
    if (idleTimerRef.current) return; // 이미 감시 중
    pendingReloadRef.current = true;
    console.log('[SW] Update detected — starting idle reload loop');
    idleTimerRef.current = setInterval(() => {
      if (!pendingReloadRef.current) {
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
        return;
      }
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= IDLE_TIMEOUT_MS) {
        console.log(`[SW] Idle for ${Math.round(idleMs / 1000)}s — auto-reloading`);
        pendingReloadRef.current = false;
        clearInterval(idleTimerRef.current);
        idleTimerRef.current = null;
        window.location.reload();
      }
    }, 5_000);
  }, []);
  useEffect(() => {
    if (!isAlwaysOn || !('serviceWorker' in navigator)) return;

    // [FIX] 중국 OS 태블릿: 첫 로드 시 controller 교체 이벤트가 즉시 발생하여 리로드 루프
    // → 페이지 로드 후 60초 이내 controllerchange는 무시
    const pageLoadedAt = Date.now();
    const GRACE_PERIOD_MS = 60_000;

    // autoUpdate 모드에서 실제 SW 교체 감지
    const onControllerChange = () => {
      const elapsed = Date.now() - pageLoadedAt;
      if (elapsed < GRACE_PERIOD_MS) {
        console.log(`[SW] Controller changed within grace period (${Math.round(elapsed / 1000)}s) — ignoring`);
        return;
      }
      console.log('[SW] Controller changed — new SW active');
      startIdleReloadLoop();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [isAlwaysOn, startIdleReloadLoop]);

  // needRefresh 트리거도 fallback으로 유지
  useEffect(() => {
    if (needRefresh && isAlwaysOn) {
      startIdleReloadLoop();
    }
  }, [needRefresh, isAlwaysOn, startIdleReloadLoop]);

  // ━━━━ 수동 업데이트 (관리자/회원 앱용) ━━━━
  const handleUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    console.log('[SW] Update button clicked');
    const fallbackTimer = setTimeout(() => {
      console.log('[SW] updateServiceWorker did not reload within 3s, forcing reload');
      window.location.reload();
    }, 3000);
    try {
      await updateServiceWorker(true);
    } catch (err) {
      console.warn('[SW] updateServiceWorker failed:', err);
      clearTimeout(fallbackTimer);
      window.location.reload();
    }
  };

  // 키오스크/관리자: 자동 처리 → 배너 안 보여줌
  if (!needRefresh || isAlwaysOn) {
    return null;
  }
  return <div style={{
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: 'var(--primary-gold)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    zIndex: 9999,
    color: 'var(--text-on-primary)',
    fontFamily: 'var(--font-main)',
    animation: 'slideUp 0.3s ease-out'
  }}>
        <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '20px'
    }}>
             <div style={{
        fontWeight: 'bold',
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
                 <ArrowsClockwise size={20} weight="bold" className="spin-hover" />
                 {t('새로운 버전이 준비되었습니다')}
             </div>
             <button onClick={() => setNeedRefresh(false)} style={{
        background: 'none',
        border: 'none',
        color: 'var(--text-on-primary)',
        cursor: 'pointer',
        padding: 0,
        opacity: 0.6
      }}>
                 <X size={20} weight="bold" />
             </button>
        </div>
        <div style={{
      fontSize: '0.85rem',
      opacity: 0.8,
      fontWeight: '500'
    }}>
            {t('새로운 기능 활성화 및 최적화를 위해')}<br />{t('지금 업데이트를 진행해주세요.')}
        </div>
        <button onClick={handleUpdate} disabled={updating} style={{
      background: 'black',
      color: 'var(--primary-gold)',
      border: 'none',
      padding: '10px',
      borderRadius: '8px',
      fontWeight: 'bold',
      fontSize: '0.9rem',
      cursor: updating ? 'wait' : 'pointer',
      marginTop: '4px',
      opacity: updating ? 0.7 : 1
    }}>
            {updating ? t('업데이트 중...') : t('클릭하여 업데이트 및 재시작')}
        </button>
    </div>;
}
export default ReloadPrompt;