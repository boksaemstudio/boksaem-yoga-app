import React, { useEffect, useState } from 'react';
import { onMessage } from 'firebase/messaging';
import { messaging } from '../../firebase';
import { CheckCircle, BellRinging, X } from '@phosphor-icons/react';

const NotificationListener = () => {
    const [toast, setToast] = useState(null);

    useEffect(() => {
        // [FOREGROUND] Handle incoming messages while app is open
        const unsubscribe = onMessage(messaging, (payload) => {

            // 1. Show custom Toast
            const { title, body } = payload.notification || {};
            if (title) {
                setToast({ title, body, visible: true });

                // Hide after 5 seconds
                setTimeout(() => {
                    setToast(null);
                }, 5000);
            }

            // 2. Set App Badge if supported
            if (navigator.setAppBadge) {
                navigator.setAppBadge(1).catch(e => console.warn('Badge failed', e));
            }
        });

        // Clear badge on mount
        if (navigator.clearAppBadge) {
            navigator.clearAppBadge().catch(e => console.warn('Clear badge failed', e));
        }

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    if (!toast) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(30, 30, 30, 0.95)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'start',
            gap: '12px',
            minWidth: '320px',
            maxWidth: '90vw',
            border: '1px solid rgba(255,215,0,0.3)',
            backdropFilter: 'blur(10px)',
            animation: 'slideDown 0.3s ease-out'
        }}>
            <BellRinging size={28} color="#FFD700" weight="fill" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 'bold', color: '#FFD700' }}>{toast.title}</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', lineHeight: '1.4' }}>{toast.body}</p>
            </div>
            <button
                onClick={() => setToast(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', padding: '4px', cursor: 'pointer' }}
            >
                <X size={20} />
            </button>
            <style>
                {`
                @keyframes slideDown {
                    from { transform: translate(-50%, -100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                `}
            </style>
        </div>
    );
};

export default NotificationListener;
