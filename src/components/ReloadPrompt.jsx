import { useState, useEffect, useRef, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ArrowsClockwise, X } from '@phosphor-icons/react';

/**
 * 유휴 상태 자동 새로고침 + 수동 업데이트 프롬프트
 * 
 * - 키오스크(/checkin)처럼 항상 켜져 있는 페이지: 
 *   SW 업데이트 감지 → 30초 유휴 대기 → 자동 새로고침
 * - 관리자/회원 페이지: 기존처럼 업데이트 배너 표시
 */
const IDLE_TIMEOUT_MS = 30_000; // 30초 동안 터치/클릭/키 입력 없으면 유휴

function ReloadPrompt() {
  const [updating, setUpdating] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const pendingReloadRef = useRef(false);
  const idleTimerRef = useRef(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[SW] Registered');
      if (r) {
        r.update().catch(() => {});
        // 1시간마다 업데이트 체크
        setInterval(() => { r.update(); }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('[SW] registration error', error);
    },
  });

  // ━━━━ 유휴 감지: 터치/클릭/키 입력 추적 ━━━━
  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const events = ['touchstart', 'mousedown', 'keydown', 'scroll'];
    events.forEach(evt => window.addEventListener(evt, markActivity, { passive: true }));
    return () => events.forEach(evt => window.removeEventListener(evt, markActivity));
  }, [markActivity]);

  // ━━━━ 키오스크 자동 새로고침 로직 ━━━━
  const isKiosk = typeof window !== 'undefined' && window.location.pathname.startsWith('/checkin');

  const tryIdleReload = useCallback(() => {
    if (!pendingReloadRef.current) return;
    const idleMs = Date.now() - lastActivityRef.current;
    if (idleMs >= IDLE_TIMEOUT_MS) {
      console.log(`[SW] Kiosk idle for ${Math.round(idleMs/1000)}s — auto-reloading for update`);
      pendingReloadRef.current = false;
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (!needRefresh || !isKiosk) return;

    console.log('[SW] Update detected on kiosk — waiting for idle to auto-reload');
    pendingReloadRef.current = true;

    // 5초마다 유휴 상태 체크
    idleTimerRef.current = setInterval(tryIdleReload, 5_000);
    // 즉시 한 번도 체크 (이미 유휴일 수 있음)
    tryIdleReload();

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, [needRefresh, isKiosk, tryIdleReload]);

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

  // 키오스크: 자동 처리 → 배너 안 보여줌
  if (!needRefresh || isKiosk) {
    return null;
  }

  // 관리자/회원 앱: 업데이트 배너 표시
  return (
    <div style={{
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
        color: 'black',
        fontFamily: 'var(--font-main)',
        animation: 'slideUp 0.3s ease-out'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
             <div style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <ArrowsClockwise size={20} weight="bold" className="spin-hover" />
                 새로운 버전이 준비되었습니다
             </div>
             <button 
                onClick={() => setNeedRefresh(false)}
                style={{ background: 'none', border: 'none', color: 'black', cursor: 'pointer', padding: 0, opacity: 0.6 }}
             >
                 <X size={20} weight="bold" />
             </button>
        </div>
        <div style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: '500' }}>
            새로운 기능 활성화 및 최적화를 위해<br/>지금 업데이트를 진행해주세요.
        </div>
        <button
            onClick={handleUpdate}
            disabled={updating}
            style={{
                background: 'black', color: 'var(--primary-gold)',
                border: 'none', padding: '10px', borderRadius: '8px',
                fontWeight: 'bold', fontSize: '0.9rem', cursor: updating ? 'wait' : 'pointer',
                marginTop: '4px',
                opacity: updating ? 0.7 : 1
            }}
        >
            {updating ? '업데이트 중...' : '클릭하여 업데이트 및 재시작'}
        </button>
    </div>
  );
}

export default ReloadPrompt;
