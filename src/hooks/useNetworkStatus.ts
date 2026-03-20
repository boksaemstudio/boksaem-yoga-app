import { useState, useEffect } from 'react';

interface UseNetworkStatusReturn {
    isOnline: boolean;
}

/**
 * useNetworkStatus — 네트워크 상태 모니터링 커스텀 훅
 * 
 * online/offline 이벤트를 청취하여 현재 연결 상태를 반환합니다.
 * 오프라인→온라인 전환 시 SYNC_OFFLINE_QUEUE 커스텀 이벤트를 발생시킵니다.
 */
export const useNetworkStatus = (): boolean => {
    const [isOnline, setIsOnline] = useState<boolean>(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = (): void => {
            setIsOnline(true);
            window.dispatchEvent(new CustomEvent('SYNC_OFFLINE_QUEUE'));
        };

        const handleOffline = (): void => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
};
