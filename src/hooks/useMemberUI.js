import { useState, useCallback, useEffect } from 'react';

/**
 * MemberProfile 전용 UI 상태 (탭, 모달, 폼 입력 등) 통합 관리 훅
 */
export function useMemberUI() {
    const [activeTab, setActiveTab] = useState('home');
    const [selectedNoticeId, setSelectedNoticeId] = useState(null);
    const [scheduleView, setScheduleView] = useState('calendar');
    const [scheduleMonth, setScheduleMonth] = useState('current');
    const [scheduleBranch, setScheduleBranch] = useState(null); // gwangheungchang 대신 null로 초기화하여 config.BRANCHES 적용되게 함
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
        if (!window.history.state?.modalOpen) window.history.pushState({ modalOpen: true }, '');
    }, []);

    const closeConfirmModal = useCallback(() => {
        setModals(m => {
            if (m.confirm.isOpen && window.history.state?.modalOpen) window.history.back();
            return { ...m, confirm: { isOpen: false, message: '', onConfirm: null, isConfirm: false } };
        });
    }, []);

    const setLoginFormValue = useCallback((field, value) => {
        setLoginForm(prev => ({ ...prev, [field]: value }));
    }, []);

    const openInstallGuide = useCallback(() => {
        setModals(m => ({ ...m, installGuide: true }));
        if (!window.history.state?.modalOpen) window.history.pushState({ modalOpen: true }, '');
    }, []);
    const closeInstallGuide = useCallback(() => {
        setModals(m => {
            if (m.installGuide && window.history.state?.modalOpen) window.history.back();
            return { ...m, installGuide: false };
        });
    }, []);

    // [PWA Back 버튼 인터셉트]
    useEffect(() => {
        const handlePopState = (e) => {
            setModals({ confirm: { isOpen: false, message: '', onConfirm: null, isConfirm: false }, installGuide: false });
            setLightboxImage(null);
            setSelectedNoticeId(null);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // lightbox, notice 래퍼
    const safeSetLightboxImage = useCallback((img) => {
        if (img && !window.history.state?.modalOpen) window.history.pushState({ modalOpen: true }, '');
        else if (!img && lightboxImage && window.history.state?.modalOpen) window.history.back();
        setLightboxImage(img);
    }, [lightboxImage]);

    const safeSetSelectedNoticeId = useCallback((id) => {
        if (id && !window.history.state?.modalOpen) window.history.pushState({ modalOpen: true }, '');
        else if (!id && selectedNoticeId && window.history.state?.modalOpen) window.history.back();
        setSelectedNoticeId(id);
    }, [selectedNoticeId]);

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
