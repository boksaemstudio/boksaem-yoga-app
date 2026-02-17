import { memo, useState, useEffect } from 'react';
import { useNetwork } from '../../context/NetworkContext';
import { WifiHigh, WifiSlash, CloudArrowUp } from '@phosphor-icons/react'; // [ICON] CloudArrowUp for sync
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const NetworkStatus = memo(() => {
    const { isOnline } = useNetwork();
    const [pendingCount, setPendingCount] = useState(0);

    // [SYNC] Monitor pending offline data count
    useEffect(() => {
        const q = query(
            collection(db, 'pending_attendance'),
            where('status', '==', 'pending-offline')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingCount(snapshot.size);
        }, (error) => {
            console.warn("[NetworkStatus] Failed to subscribe to pending count:", error);
        });

        return () => unsubscribe();
    }, []);

    // [UI] Only show if there are pending items AND we are in Kiosk mode (root path)
    // User Request: '출석체크앱에서만 현재 서버에 안보네게 있는지만 숫자로 알려주는것만 남겨놔'
    const isKioskMode = window.location.pathname === '/';

    if (!isKioskMode || pendingCount === 0) return null;

    return (
        <div 
            className="global-network-status"
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'rgba(255, 183, 77, 0.9)', // Orange background
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 183, 77, 1)',
                borderRadius: '30px',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#000', // Black text for contrast
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                pointerEvents: 'none',
            }}
        >
            <CloudArrowUp size={20} weight="duotone" />
            <span>대기 중인 데이터: {pendingCount}건</span>
        </div>
    );
});

NetworkStatus.displayName = 'NetworkStatus';

export default NetworkStatus;
