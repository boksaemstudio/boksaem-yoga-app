import { useRegisterSW } from 'virtual:pwa-register/react';
import { ArrowsClockwise, X } from '@phosphor-icons/react';

function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[SW] Registered');
      if (r) {
        // 등록 직후 즉시 업데이트 확인
        r.update().catch(() => {});
        // 백그라운드에서 1시간마다 업데이트가 있는지 조용히 체크
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('[SW] registration error', error);
    },
  });

  if (!needRefresh) {
      return null;
  }

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
            onClick={() => updateServiceWorker(true)} // true = 팝업 후 사용자가 명시적 승인 (새로고침 수행)
            style={{
                background: 'black', color: 'var(--primary-gold)',
                border: 'none', padding: '10px', borderRadius: '8px',
                fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer',
                marginTop: '4px'
            }}
        >
            클릭하여 업데이트 및 재시작
        </button>
    </div>
  );
}

export default ReloadPrompt;
