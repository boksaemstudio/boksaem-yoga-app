import { memo, useState, useEffect } from 'react';
import { useNetworkStore } from '../../stores/useNetworkStore';
import { WifiHigh, WifiSlash, CloudArrowUp } from '@phosphor-icons/react'; // [ICON] CloudArrowUp for sync
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

    return (
        <div className="network-status-badge">
            <CloudArrowUp size={20} weight="duotone" />
            <span>대기 중인 데이터: {pendingCount}건</span>
        </div>
    );
});

NetworkStatus.displayName = 'NetworkStatus';

export default NetworkStatus;
