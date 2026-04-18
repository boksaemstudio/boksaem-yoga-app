import { useLanguageStore } from '../stores/useLanguageStore';
import { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { useStudioStore } from '../stores/useStudioStore';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { STUDIO_CONFIG as STATIC_CONFIG } from '../studioConfig';
import { localizeConfig } from '../utils/demoLocalization';
import { resolveStudioId, onStudioChange } from '../utils/resolveStudioId';

const StudioContext = createContext();

export const useStudioConfig = () => {
    const context = useContext(StudioContext);
    if (!context) {
        throw new Error('useStudioConfig must be used within a StudioProvider');
    }
    return context;
};

export const StudioProvider = ({ children }) => {
    const t = useLanguageStore.getState().t;
    const [config, setConfig] = useState(STATIC_CONFIG);
    const [loading, setLoading] = useState(true);
    const [studioId, setStudioId] = useState(() => resolveStudioId());

    // [MULTI-STUDIO] 외부에서 switchStudio() 호출 시 studioId 변경 감지
    useEffect(() => {
        const unsub = onStudioChange((newId) => {
            setLoading(true);
            setStudioId(newId);
        });
        return unsub;
    }, []);

    // [CACHE HEAL] 스튜디오(테넌트)가 변경될 때마다 메모리 캐시를 날림
    useEffect(() => {
        import('../services/configService').then(({ configService }) => {
            configService.clearCache();
        });
    }, [studioId]);

    // [i18n] Re-localize config when language changes
    const currentLanguage = useLanguageStore(s => s.language);
    useEffect(() => {
        setConfig(prev => {
            if (!prev || currentLanguage === 'ko') return prev;
            return localizeConfig(prev, currentLanguage);
        });
    }, [currentLanguage]);


    useEffect(() => {
        const studioDocRef = doc(db, 'studios', studioId);

        let unsubscribeSnapshot = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {
                    console.warn((t("g_90531c") || "[스튜디오] 익명 인증 실패, 기본 설정으로 진행:"), e);
                    setLoading(false);
                    return;
                }
                return;
            }

            // [AUTO-SEEDING]
            try {
                const snap = await getDoc(studioDocRef);
                if (!snap.exists()) {
                    await setDoc(studioDocRef, STATIC_CONFIG);
                }
            } catch (e) {
                console.error((t("g_951aa6") || "[스튜디오] 초기 설정 저장 실패:"), e);
            }

        // [REAL-TIME SYNC]
        unsubscribeSnapshot = onSnapshot(studioDocRef, (snap) => {
            if (snap.exists()) {
                const cloudConfig = snap.data();
                
                // [DEEP-MERGE] Combine Static and Cloud to prevent missing keys
                const merged = JSON.parse(JSON.stringify(STATIC_CONFIG));
                const deepMerge = (target, source) => {
                    for (const key in source) {
                        // [TRUTHY ONLY] Ignore empty strings, nulls, or undefined from cloud
                        const val = source[key];
                        if (val === "" || val === null || val === undefined) continue;

                        if (typeof val === 'object' && !Array.isArray(val)) {
                            if (!target[key]) target[key] = {};
                            deepMerge(target[key], val);
                        } else {
                            target[key] = val;
                        }
                    }
                };
                deepMerge(merged, cloudConfig);

                // [SELF-HEALING] Enhanced Path Correction
                if (merged.ASSETS) {
                    const fixPaths = (obj) => {
                        for (const key in obj) {
                            if (typeof obj[key] === 'string' && (key === 'WIDE' || key === 'SQUARE' || key === 'RYS200' || key === 'MEMBER_BG' || obj[key].endsWith('.webp'))) {
                                let path = obj[key];
                                // Remove duplicate/missing slash issues
                                if (path.includes('assets/') && !path.startsWith('/assets/')) {
                                    path = path.substring(path.indexOf('assets/'));
                                }
                                if (!path.startsWith('/') && !path.startsWith('http')) {
                                    path = `/${path}`;
                                }
                                obj[key] = path;
                            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                                fixPaths(obj[key]);
                            }
                        }
                    };
                    fixPaths(merged.ASSETS);

                    // [FIX] Firestore의 절대 URL(https://도메인/logo.png) → 상대 경로(/logo.png) 정규화
                    const currentOrigin = window.location.origin;
                    const normalizeLogoUrl = (url) => {
                        if (!url || typeof url !== 'string') return url;
                        if (url.startsWith(currentOrigin)) return url.replace(currentOrigin, '');
                        return url;
                    };
                    if (merged.IDENTITY?.LOGO_URL) merged.IDENTITY.LOGO_URL = normalizeLogoUrl(merged.IDENTITY.LOGO_URL);
                    if (merged.ASSETS?.LOGO?.WIDE) merged.ASSETS.LOGO.WIDE = normalizeLogoUrl(merged.ASSETS.LOGO.WIDE);
                    if (merged.ASSETS?.LOGO?.SQUARE) merged.ASSETS.LOGO.SQUARE = normalizeLogoUrl(merged.ASSETS.LOGO.SQUARE);
                    if (merged.ASSETS?.LOGO?.RYS200) merged.ASSETS.LOGO.RYS200 = normalizeLogoUrl(merged.ASSETS.LOGO.RYS200);

                    // [SaaS] 중립적 기본 로고 — 테넌트가 자체 로고 등록 전까지 표시
                    if (!merged.ASSETS.LOGO?.WIDE || merged.ASSETS.LOGO.WIDE === '/') merged.ASSETS.LOGO.WIDE = '/assets/passflow_logo.png';
                    // [SaaS] RYS200은 복샘요가 전용 — Firestore에 없으면 강제 주입하지 않음
                    if (!merged.ASSETS.LOGO?.SQUARE || merged.ASSETS.LOGO.SQUARE === '/') merged.ASSETS.LOGO.SQUARE = '/assets/passflow_square_logo.png';
                }

                // [FIX] 원장님 요청: 데모 사이트에서도 SaaS 로고 변경 테스트가 가능하도록 하드코딩 오버라이드 제거.
                // 이제 관리자 앱에서 수정한 로고가 passflowai.web.app에도 정상 반영됩니다.

                

                let finalConfig = localizeConfig(merged, useLanguageStore.getState().language);
                setConfig(finalConfig);
                useStudioStore.getState().setConfig(finalConfig);
                // Update CSS Variables dynamically
                const theme = finalConfig.THEME || {};
                const primary = theme.PRIMARY_COLOR || 'var(--primary-gold)';
                document.documentElement.style.setProperty('--primary-theme-color', primary);
                document.documentElement.style.setProperty('--primary-theme-skeleton', theme.SKELETON_COLOR || 'rgba(var(--primary-rgb), 0.1)');
            }
            setLoading(false);
                useStudioStore.getState().setLoading(false);
        }, (error) => {
            console.error((t("g_4c2197") || "[스튜디오] 설정 동기화 오류:"), error);
            setLoading(false);
                useStudioStore.getState().setLoading(false);
        });
        }); // end onAuthStateChanged

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, [studioId]);

    const updateConfig = async (newConfig) => {
        try {
            const studioId = resolveStudioId();
            const studioDocRef = doc(db, 'studios', studioId);
            await setDoc(studioDocRef, newConfig, { merge: true });
            return true;
        } catch (e) {
            console.error((t("g_aaf0ca") || "[스튜디오] 설정 업데이트 실패:"), e);
            throw e;
        }
    };

    // [SaaS] 수동 새로고침 (onSnapshot이 자동이지만, 안전망용)
    const refreshConfig = async () => {
        try {
            const studioId = resolveStudioId();
            const snap = await import('firebase/firestore').then(m => m.getDoc(doc(db, 'studios', studioId)));
            if (snap.exists()) {
                setConfig(prev => ({ ...prev, ...snap.data() }));
            }
        } catch(e) { console.warn('[Studio] Manual refresh failed:', e); }
    };

    const value = {
        config,
        loading,
        updateConfig,
        refreshConfig,
        // Helper to get nested values safely with fallback
        get: (path, fallback) => {
            return path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, config) || fallback;
        }
    };

    return (
        <StudioContext.Provider value={value}>
            {!loading && children}
            {loading && (
                <div style={{
                    height: '100vh', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#08080A',
                    color: 'var(--primary-gold)'
                }}>
                    <div className="pulse">
                        {(() => {
                            if (typeof window === 'undefined') return 'Loading Studio...';
                            const lang = new URLSearchParams(window.location.search).get('lang') || 'ko';
                            const loadingMap = {
                                ko: (t("g_8916eb") || "스튜디오 준비 중..."),
                                en: 'Loading Studio...',
                                ja: (t("g_dbdc54") || "スタジオ準備中..."),
                                zh: (t("g_24d026") || "工作室加载中..."),
                                es: 'Cargando estudio...',
                                de: 'Studio wird geladen...',
                                fr: 'Chargement du studio...',
                                pt: 'Carregando estúdio...',
                                ru: 'Загрузка студии...',
                            };
                            return loadingMap[lang] || loadingMap.en;
                        })()}
                    </div>
                </div>
            )}
        </StudioContext.Provider>
    );
};
