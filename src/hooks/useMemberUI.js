import { useState, useCallback } from 'react';

/**
 * MemberProfile 전용 UI 상태 (탭, 모달, 폼 입력 등) 통합 관리 훅
 */
export function useMemberUI() {
    const [activeTab, setActiveTab] = useState('home');
    const [selectedNoticeId, setSelectedNoticeId] = useState(null);
    const [scheduleView, setScheduleView] = useState('calendar');
    const [scheduleMonth, setScheduleMonth] = useState('current');
    const [scheduleBranch, setScheduleBranch] = useState('gwangheungchang');
    const [lightboxImage, setLightboxImage] = useState(null);
    const [greetingVisible, setGreetingVisible] = useState(true);

    const [modals, setModals] = useState({
        confirm: { isOpen: false, message: '', onConfirm: null, isConfirm: false },
        installGuide: false
    });

    const [loginForm, setLoginForm] = useState({
        name: '',
        phone: '',
        error: ''
    });

    const openConfirmModal = useCallback((message, onConfirm, isConfirm = false) => {
        setModals(m => ({ ...m, confirm: { isOpen: true, message, onConfirm, isConfirm } }));
    }, []);

    const closeConfirmModal = useCallback(() => {
        setModals(m => ({ ...m, confirm: { isOpen: false, message: '', onConfirm: null, isConfirm: false } }));
    }, []);

    const setLoginFormValue = useCallback((field, value) => {
        setLoginForm(prev => ({ ...prev, [field]: value }));
    }, []);

    const openInstallGuide = useCallback(() => setModals(m => ({ ...m, installGuide: true })), []);
    const closeInstallGuide = useCallback(() => setModals(m => ({ ...m, installGuide: false })), []);

    return {
        activeTab, setActiveTab,
        selectedNoticeId, setSelectedNoticeId,
        scheduleView, setScheduleView,
        scheduleMonth, setScheduleMonth,
        scheduleBranch, setScheduleBranch,
        lightboxImage, setLightboxImage,
        greetingVisible, setGreetingVisible,
        modals, openConfirmModal, closeConfirmModal,
        openInstallGuide, closeInstallGuide,
        loginForm, setLoginFormValue, setLoginForm
    };
}
