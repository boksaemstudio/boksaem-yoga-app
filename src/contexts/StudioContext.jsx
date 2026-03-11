import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { STUDIO_CONFIG as STATIC_CONFIG } from '../studioConfig';
import { resolveStudioId } from '../utils/resolveStudioId';

const StudioContext = createContext();

export const useStudioConfig = () => {
    const context = useContext(StudioContext);
    if (!context) {
        throw new Error('useStudioConfig must be used within a StudioProvider');
    }
    return context;
};

export const StudioProvider = ({ children }) => {
    const [config, setConfig] = useState(STATIC_CONFIG);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 호스트네임 기반으로 스튜디오 ID를 동적으로 해석
        const studioId = resolveStudioId();
        const studioDocRef = doc(db, 'studios', studioId);

        let unsubscribeSnapshot = null;

        // [FIX] Wait for auth to be ready BEFORE querying Firestore
        // This prevents the race condition where StudioContext fires queries before anonymous auth completes
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // No user yet — trigger anonymous auth (kiosk mode)
                try {
                    await signInAnonymously(auth);
                } catch (e) {
                    console.warn('[스튜디오] 익명 인증 실패, 기본 설정으로 진행:', e);
                    setLoading(false);
                    return;
                }
                // onAuthStateChanged will fire again with the new user, so return here
                return;
            }

            // User is authenticated — safe to query Firestore
            // [AUTO-SEEDING] Check if config exists in Firestore, if not, push static config
            try {
                const snap = await getDoc(studioDocRef);
                if (!snap.exists()) {
                    console.log(`[스튜디오] ${studioId} 최초 실행 감지. 초기 설정 저장 중...`);
                    await setDoc(studioDocRef, STATIC_CONFIG);
                }
            } catch (e) {
                console.error('[스튜디오] 초기 설정 저장 실패:', e);
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

                    // Final Fallback for critical assets
                    if (!merged.ASSETS.LOGO?.WIDE || merged.ASSETS.LOGO.WIDE === '/') merged.ASSETS.LOGO.WIDE = '/assets/logo_wide.webp';
                    if (!merged.ASSETS.LOGO?.RYS200 || merged.ASSETS.LOGO.RYS200 === '/') merged.ASSETS.LOGO.RYS200 = '/assets/RYS200.webp';
                    if (!merged.ASSETS.LOGO?.SQUARE || merged.ASSETS.LOGO.SQUARE === '/') merged.ASSETS.LOGO.SQUARE = '/assets/logo_square.webp';
                }

                console.log('[스튜디오] 설정 동기화 완료:', merged.IDENTITY?.NAME);
                setConfig(merged);

                // Update CSS Variables dynamically
                const theme = merged.THEME || {};
                const primary = theme.PRIMARY_COLOR || '#D4AF37';
                document.documentElement.style.setProperty('--primary-theme-color', primary);
                document.documentElement.style.setProperty('--primary-theme-skeleton', theme.SKELETON_COLOR || 'rgba(212, 175, 55, 0.1)');
            }
            setLoading(false);
        }, (error) => {
            console.error('[스튜디오] 설정 동기화 오류:', error);
            setLoading(false);
        });
        }); // end onAuthStateChanged

        return () => {
            unsubscribeAuth();
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, []);

    const updateConfig = async (newConfig) => {
        try {
            const studioId = resolveStudioId();
            const studioDocRef = doc(db, 'studios', studioId);
            await setDoc(studioDocRef, newConfig, { merge: true });
            return true;
        } catch (e) {
            console.error('[스튜디오] 설정 업데이트 실패:', e);
            throw e;
        }
    };

    const value = {
        config,
        loading,
        updateConfig,
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
                    color: '#D4AF37'
                }}>
                    <div className="pulse">스튜디오 준비 중...</div>
                </div>
            )}
        </StudioContext.Provider>
    );
};
