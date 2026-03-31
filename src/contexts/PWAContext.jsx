import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useStudioConfig } from '../contexts/StudioContext';
import { PWAContext } from './PWAContextDef';

export const PWAProvider = ({ children }) => {
    const { config } = useStudioConfig();
    const location = useLocation();

    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [deviceOS, setDeviceOS] = useState('unknown');
    const [isStandalone, setIsStandalone] = useState(false);

    const isDemo = typeof window !== 'undefined' && (
        window.location.hostname.includes('passflowai') || 
        window.location.hostname.includes('demo') || 
        config?.STUDIO_ID === 'demo' || 
        config?.STUDIO_ID === 'demo-yoga'
    );

    useEffect(() => {
        // OS 감지
        const ua = navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) setDeviceOS('ios');
        else if (/android/.test(ua)) setDeviceOS('android');
        
        // PWA 설치 상태 감지
        const checkStandalone = () => {
            const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            setIsStandalone(isInstalled);
        };
        checkStandalone();
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            // 데모 환경에서는 설치 프롬프트를 노출하지 않음
            if (isDemo) {
                return;
            }
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if already installed
        window.addEventListener('appinstalled', () => {
            setDeferredPrompt(null);
            setIsStandalone(true);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    // Handle dynamic manifest and title
    useEffect(() => {
        const path = location.pathname.toLowerCase(); // [FIX] 대소문자 무시
        let manifestFile = '/manifest-checkin.json';
        const studioName = config?.IDENTITY?.NAME || "Studio";
        let appTitle = `${studioName} 출석체크`;

        if (path.startsWith('/admin')) {
            manifestFile = '/manifest-admin.json';
            appTitle = `${studioName} 관리자`;
        } else if (path.startsWith('/member')) {
            manifestFile = '/manifest-member.json';
            appTitle = '내요가'; // This title is specific and not using studioName
        } else if (path.startsWith('/instructor')) {
            manifestFile = '/manifest-instructor.json';
            appTitle = `${studioName} 선생님`;
        } else if (path === '/login') {
            appTitle = `${studioName} 로그인`;
        } else if (path === '/meditation') {
            appTitle = `${studioName} 명상`;
        }

        // Update manifest link
        let link = document.querySelector('link[rel="manifest"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'manifest';
            document.head.appendChild(link);
        }
        link.href = manifestFile;

        // Update title and meta
        document.title = appTitle;

        let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (!appleTitle) {
            appleTitle = document.createElement('meta');
            appleTitle.name = 'apple-mobile-web-app-title';
            document.head.appendChild(appleTitle);
        }
        appleTitle.content = appTitle;


    }, [location]);

    const installApp = async () => {
        if (!deferredPrompt) {

            return false;
        }

        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;


            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                return true;
            }
            return false;
        } catch (error) {
            console.error('[PWA] Prompt execution failed:', error);
            return false;
        }
    };

    return (
        <PWAContext.Provider value={{ deferredPrompt, installApp, isStandalone, deviceOS, isDemo }}>
            {children}
        </PWAContext.Provider>
    );
};
