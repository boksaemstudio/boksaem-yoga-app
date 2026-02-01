import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PWAContext } from './PWAContextDef';

export const PWAProvider = ({ children }) => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const location = useLocation();

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            console.log('[PWA] beforeinstallprompt event fired');
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if already installed
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App was installed');
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    // Handle dynamic manifest and title
    useEffect(() => {
        const path = location.pathname;
        let manifestFile = '/manifest-checkin.json';
        let appTitle = '복샘요가 출석체크';

        if (path.startsWith('/admin')) {
            manifestFile = '/manifest-admin.json';
            appTitle = '복샘요가 관리자';
        } else if (path.startsWith('/member')) {
            manifestFile = '/manifest-member.json';
            appTitle = '내요가';
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

        console.log(`[PWA] Manifest updated: ${manifestFile}`);
    }, [location]);

    const installApp = async () => {
        if (!deferredPrompt) {
            console.log('[PWA] No deferredPrompt available');
            return false;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] User choice outcome: ${outcome}`);

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            return true;
        }
        return false;
    };

    return (
        <PWAContext.Provider value={{ deferredPrompt, installApp }}>
            {children}
        </PWAContext.Provider>
    );
};
