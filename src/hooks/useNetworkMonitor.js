import { useEffect, useCallback } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { getKSTHour } from '../utils/dates';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { attendanceService } from '../services/attendanceService';

export const useNetworkMonitor = () => {
    const { isOnline, setIsOnline } = useNetwork(); // [NETWORK] GLOBAL Connectivity state

    // [NETWORK] Active Connection Check & Recovery
    const checkConnection = useCallback(async () => {
        try {
            console.log('[Network] Pinging server to verify connection...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            // Bypass Cache with timestamp
            const res = await fetch('/?t=' + new Date().getTime(), { 
                method: 'HEAD', 
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            // Any response means we reached the server
            if (res.ok || res.status < 500) { 
                console.log('[Network] Connection verified ✅');
                if (!isOnline) {
                    console.log('[Network] Restoring online state');
                    setIsOnline(true);
                }
                // [FIX] Try to sync any offline check-ins automatically
                attendanceService.syncPendingCheckins().catch(e => console.error("Offline sync error:", e));
                return true;
            }
            return false;
        } catch (e) {
            console.warn('[Network] Ping failed:', e);
            return false;
        }
    }, [isOnline, setIsOnline]);

    // [PERF] Warm-up & Keep-alive: 앱 시작 시 최우선 실행 (서버 깨우기)
    useEffect(() => {
        const initServer = async () => {
            const currentHour = getKSTHour();
            // 영업시간 (09:00 ~ 22:00) 외에는 핑 보내지 않음
            if (currentHour >= 9 && currentHour < 22) {
                await checkConnection();
                
                // [WARM-UP] Meditation AI (Cold Start 방지)
                const aiFn = httpsCallable(functions, 'generateMeditationGuidance');
                aiFn({ type: 'warmup' }).catch(e => console.debug("[System] AI Warm-up silent fail:", e));
            }
        };

        initServer();
        const interval = setInterval(initServer, 10 * 60 * 1000); 
        return () => clearInterval(interval);
    }, [checkConnection]);

    useEffect(() => {
        // [NETWORK] Background connection check to prevent permanent "Offline" on UI
        const intervalTime = isOnline ? 10 * 60 * 1000 : 30000;
        
        const interval = setInterval(() => {
            console.log(`[NetworkMonitor] Periodic network check (${isOnline ? 'Online mode' : 'Offline mode'})...`);
            checkConnection();
        }, intervalTime);

        // [NETWORK] Also check when window regains focus
        const handleFocus = () => {
            console.log('[NetworkMonitor] Window focused - Triggering network check');
            checkConnection();
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [isOnline, checkConnection]);

    return { checkConnection, isOnline };
};
