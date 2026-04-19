import { useLanguageStore } from '../stores/useLanguageStore';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
            const isInstalled = window.matchMedia('(display-mode: standalone)').matches 
                || window.matchMedia('(display-mode: fullscreen)').matches 
                || window.navigator.standalone === true;
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
        
        // [ROOT FIX] 플랫폼 도메인 여부에 따라 루트(/) 경로 해석
        const isPlatform = window.location.hostname.includes('passflow') || window.location.hostname.includes('demo');
        const isCheckinRoot = path === '/' && !isPlatform;
        
        let manifestFile = '/manifest.json'; // 기본값 (포트레이트 모드)
        const studioName = config?.IDENTITY?.NAME || "Studio";

        // [i18n] Dynamic tab title based on language
        const langParam = new URLSearchParams(location.search).get('lang') || 'ko';
        const t = useLanguageStore.getState().t;
        const titleMap = {
            checkin: { ko: (t("g_660ceb") || "Check-in"), en: 'Check-in', ja: (t("g_0cd193") || "出席チェック"), zh: (t("g_6a0e66") || "签到"), es: 'Registro', de: 'Check-in', fr: 'Pointage', pt: 'Check-in', ru: 'Отметка' },
            admin: { ko: (t("g_ec873c") || "Admin"), en: 'Admin', ja: (t("g_9b4f13") || "管理者"), zh: (t("g_ef84e7") || "管理员"), es: 'Admin', de: 'Admin', fr: 'Admin', pt: 'Admin', ru: 'Админ' },
            member: { ko: (t("g_1d84d2") || "My Yoga"), en: 'My Yoga', ja: 'マイヨガ', zh: (t("g_ad3047") || "我的瑜伽"), es: 'Mi Yoga', de: 'Mein Yoga', fr: 'Mon Yoga', pt: 'Meu Yoga', ru: 'Моя Йога' },
            instructor: { ko: (t("g_620be2") || "Instructor"), en: 'Instructor', ja: 'インストラクター', zh: (t("g_0b5dd0") || "讲师"), es: 'Instructor', de: 'Trainer', fr: 'Instructeur', pt: 'Instrutor', ru: 'Тренер' },
            login: { ko: (t("g_e225a6") || "Login"), en: 'Login', ja: 'ログイン', zh: (t("g_21f1e8") || "登录"), es: 'Iniciar sesión', de: 'Anmelden', fr: 'Connexion', pt: 'Login', ru: 'Вход' },
            meditation: { ko: (t("g_31c9a1") || "명상"), en: 'Meditation', ja: (t("g_88bf24") || "瞑想"), zh: (t("g_9f834a") || "冥想"), es: 'Meditación', de: 'Meditation', fr: 'Méditation', pt: 'Meditação', ru: 'Медитация' },
            onboarding: { ko: (t("g_f23416") || "온보딩"), en: 'Onboarding', ja: 'オンボーディング', zh: (t("g_ef7e05") || "入职"), es: 'Incorporación', de: 'Onboarding', fr: 'Inscription', pt: 'Onboarding', ru: 'Онбординг' },
        };
        const getTitle = (key) => titleMap[key]?.[langParam] || titleMap[key]?.en || titleMap[key]?.ko;

        let appTitle = `PassFlow AI | ${studioName}`;

        if (path.startsWith('/checkin') || isCheckinRoot) {
            manifestFile = '/manifest-checkin.json';
            appTitle = `${studioName} ${getTitle('checkin')}`;
        } else if (path.startsWith('/admin')) {
            manifestFile = '/manifest-admin.json';
            appTitle = `${studioName} ${getTitle('admin')}`;
        } else if (path.startsWith('/member')) {
            manifestFile = '/manifest-member.json';
            appTitle = getTitle('member');
        } else if (path.startsWith('/instructor')) {
            manifestFile = '/manifest-instructor.json';
            appTitle = `${studioName} ${getTitle('instructor')}`;
        } else if (path.includes('login')) {
            appTitle = `${studioName} ${getTitle('login')}`;
        } else if (path.includes('meditation')) {
            appTitle = `${studioName} ${getTitle('meditation')}`;
        } else if (path.includes('onboarding')) {
            appTitle = `PassFlow AI ${getTitle('onboarding')}`;
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
