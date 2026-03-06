// src/hooks/useAlwaysOnGuardian.js
import { useEffect, useRef } from 'react';

/**
 * 키오스크 앱의 Always-On 상태를 보장하는 커스텀 훅
 * - 화면 꺼짐 방지 (Wake Lock API)
 * - 브라우저 절전 모드 복귀 시 화면 강제 깨움
 * - 3분 단위 Heartbeat 체크 (터치 부활)
 */
export const useAlwaysOnGuardian = (isReady, checkKioskActive) => {
    const wakeLockRef = useRef(null);
    const heartbeatTimerRef = useRef(null);

    useEffect(() => {
        let isComponentMounted = true;

        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && isComponentMounted && window.location.pathname === '/') {
                try {
                    if (wakeLockRef.current !== null) {
                        return; // Already have a lock
                    }
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                    console.log('Wake Lock is active! (Screen will not sleep)');

                    wakeLockRef.current.addEventListener('release', () => {
                        console.log('Wake Lock was released.');
                        wakeLockRef.current = null;
                        if (document.visibilityState === 'visible' && isComponentMounted && window.location.pathname === '/') {
                            setTimeout(requestWakeLock, 1000); // Try again
                        }
                    });
                } catch (err) {
                    console.warn(`Wake Lock error: ${err.name}, ${err.message}`);
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('Tab became visible, checking kiosk state and re-requesting wake lock...');
                if (window.location.pathname === '/') {
                    requestWakeLock();
                    if (typeof checkKioskActive === 'function') {
                        checkKioskActive(); 
                    }
                }
            } else {
                console.log('Tab became hidden. CheckInPage might pause.');
            }
        };

        if (isReady && window.location.pathname === '/') {
            requestWakeLock();
            document.addEventListener('visibilitychange', handleVisibilityChange);
            
            // [STABILITY] Heartbeat every 3 minutes to just enforce UI thread is alive
            heartbeatTimerRef.current = setInterval(() => {
                if (window.location.pathname === '/') {
                    console.log("[HEARTBEAT] Kiosk is alive");
                    requestWakeLock(); // re-assert just in case
                }
            }, 3 * 60 * 1000);
        }

        return () => {
            isComponentMounted = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current !== null) {
                wakeLockRef.current.release()
                    .then(() => {
                        wakeLockRef.current = null;
                    })
                    .catch(e => console.error("Error releasing wake lock on unmount:", e));
            }
            if (heartbeatTimerRef.current) {
                clearInterval(heartbeatTimerRef.current);
            }
        };
    }, [isReady, checkKioskActive]);
};
