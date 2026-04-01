import { useState, useEffect } from 'react';
import { storageService } from '../services/storage';

/**
 * useKioskNotice — 키오스크 공지 이미지 관리 훅
 * CheckInPage에서 추출. 지점별/전체 공지 구독 + 5분 자동복원 타이머.
 * 
 * @param {Object} options
 * @param {boolean} options.isReady - 초기화 완료 여부
 * @param {string} options.currentBranch - 현재 지점 ID
 * @param {Object|null} options.message - 현재 메시지 상태
 * @param {boolean} options.showSelectionModal - 선택 모달 표시 여부
 * @param {boolean} options.showDuplicateConfirm - 중복 확인 모달 표시 여부
 * @returns {{ kioskSettings, rawKioskSettings, kioskNoticeHidden, setKioskNoticeHidden }}
 */
export function useKioskNotice({ isReady, currentBranch, message, showSelectionModal, showDuplicateConfirm }) {
    const [kioskSettings, setKioskSettings] = useState({ active: false, imageUrl: null });
    const [rawKioskSettings, setRawKioskSettings] = useState({});
    const [kioskNoticeHidden, setKioskNoticeHidden] = useState(false);

    // 키오스크 공지 구독 (지점별 → 전체 fallback)
    useEffect(() => {
        if (!isReady) return;

        let unsubscribeBranch = null;
        let unsubscribeAll = null;

        unsubscribeBranch = storageService.subscribeToKioskSettings(currentBranch, (branchData) => {
            if (branchData) setRawKioskSettings(branchData);
            else setRawKioskSettings({});

            if (branchData && branchData.active && branchData.imageUrl) {
                setKioskSettings(branchData);
                setKioskNoticeHidden(false);
            } else {
                unsubscribeAll = storageService.subscribeToKioskSettings('all', (allData) => {
                    // Update raw settings from fallback if branch had no data
                    setRawKioskSettings(prev => Object.keys(prev).length > 0 ? prev : (allData || {}));

                    if (allData && allData.active && allData.imageUrl) {
                        setKioskSettings(allData);
                        setKioskNoticeHidden(false);
                    } else {
                        setKioskSettings({ active: false, imageUrl: null });
                    }
                });
            }
        });

        return () => {
            if (unsubscribeBranch) unsubscribeBranch();
            if (unsubscribeAll) unsubscribeAll();
        };
    }, [isReady, currentBranch]);

    // 5분 유휴 자동 복원
    useEffect(() => {
        if (!kioskSettings?.active || !kioskNoticeHidden || message || showSelectionModal || showDuplicateConfirm) return;

        let idleTimer;
        const resetNoticeTimer = () => {
            clearTimeout(idleTimer);
            if (kioskNoticeHidden) {
                idleTimer = setTimeout(() => setKioskNoticeHidden(false), 5 * 60 * 1000);
            }
        };

        resetNoticeTimer();
        window.addEventListener('touchstart', resetNoticeTimer, { passive: true });
        window.addEventListener('mousedown', resetNoticeTimer, { passive: true });
        window.addEventListener('keydown', resetNoticeTimer, { passive: true });

        return () => {
            clearTimeout(idleTimer);
            window.removeEventListener('touchstart', resetNoticeTimer);
            window.removeEventListener('mousedown', resetNoticeTimer);
            window.removeEventListener('keydown', resetNoticeTimer);
        };
    }, [kioskSettings?.active, kioskNoticeHidden, message, showSelectionModal, showDuplicateConfirm]);

    return { kioskSettings, rawKioskSettings, kioskNoticeHidden, setKioskNoticeHidden };
}
