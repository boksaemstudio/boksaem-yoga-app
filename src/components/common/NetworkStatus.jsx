import { useLanguageStore } from '../../stores/useLanguageStore';
import { memo, useState, useEffect } from 'react';
import { useNetworkStore } from '../../stores/useNetworkStore';
import { CloudArrowUp } from '@phosphor-icons/react'; // [ICON] CloudArrowUp for sync
import { getOfflineQueue } from '../../services/offlineStorage';
const NetworkStatus = memo(() => {
  const isOnline = useNetworkStore(s => s.isOnline);
  const [pendingCount, setPendingCount] = useState(0);

  // [SYNC] Monitor pending offline data count from IndexedDB
  useEffect(() => {
    let isMounted = true;
    const checkQueueInterval = setInterval(async () => {
      try {
        const queue = await getOfflineQueue();
        if (isMounted) setPendingCount(queue.length);
      } catch (err) {
        console.warn("[NetworkStatus] Failed to check offline queue:", err);
      }
    }, 3000); // 3초마다 큐 사이즈 감시

    return () => {
      isMounted = false;
      clearInterval(checkQueueInterval);
    };
  }, []);

  // [UI] Only show if there are pending items AND we are in Kiosk mode (root path)
  // User Request: '출석체크앱에서만 현재 서버에 안보네게 있는지만 숫자로 알려주는것만 남겨놔'
  const isKioskMode = window.location.pathname === '/';
  if (!isKioskMode || pendingCount === 0) return null;
  return <div className="network-status-badge">
            <CloudArrowUp size={20} weight="duotone" />
            <span>{t("g_559310") || t("g_559310") || t("g_559310") || t("g_559310") || t("g_559310") || "\uB300\uAE30 \uC911\uC778 \uB370\uC774\uD130:"}{pendingCount}{t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || t("g_230561") || "\uAC74"}</span>
        </div>;
});
NetworkStatus.displayName = 'NetworkStatus';
export default NetworkStatus;