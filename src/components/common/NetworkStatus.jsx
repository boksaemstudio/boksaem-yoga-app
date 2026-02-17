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
                background: isOnline ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 82, 82, 0.15)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${isOnline ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 82, 82, 0.4)'}`,
                borderRadius: '30px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: isOnline ? '#81c784' : '#ff8a80',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                pointerEvents: 'none', // Don't block clicks on elements behind
                opacity: 0.9
            }}
        >
            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isOnline ? '#4CAF50' : '#FF5252',
                    boxShadow: `0 0 8px ${isOnline ? '#4CAF50' : '#FF5252'}`
                }} />
                {isOnline && (
                    <div style={{
                        position: 'absolute',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        border: '1px solid #4CAF50',
                        animation: 'pulse-dot 2s infinite',
                        opacity: 0
                    }} />
                )}
            </div>
            
            {/* Status Text & Pending Count */}
            {isOnline ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <WifiHigh size={16} weight="bold" />
                    <span>온라인</span>
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <WifiSlash size={16} weight="bold" />
                    <span>오프라인</span>
                </div>
            )}

            {/* [SYNC] Show pending count if any */}
            {pendingCount > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginLeft: '8px',
                    paddingLeft: '8px',
                    borderLeft: '1px solid rgba(255,255,255,0.2)',
                    color: '#FFB74D' // Orange for pending state
                }}>
                    <CloudArrowUp size={16} weight="duotone" />
                    <span>대기: {pendingCount}</span>
                </div>
            )}

            <style>{`
                @keyframes pulse-dot {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>
        </div>
    );
});

NetworkStatus.displayName = 'NetworkStatus';

export default NetworkStatus;
