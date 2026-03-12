import { useState, useCallback } from 'react';

/**
 * AdminDashboard의 모달창 상태를 통합 관리하는 커스텀 훅
 */
export function useAdminModals() {
    const [modals, setModals] = useState({
        add: false,
        price: false,
        time: false,
        message: false,
        notice: false,
        bulkMessage: false,
        extend: false,
        note: false,
        edit: false,
        installGuide: false,
    });

    const [selectedMember, setSelectedMember] = useState(null);
    const [bulkMessageInitialText, setBulkMessageInitialText] = useState('');

    const openModal = useCallback((modalName, data = null) => {
        setModals(prev => ({ ...prev, [modalName]: true }));
        if (data?.member) {
            setSelectedMember(data.member);
        }
        if (data?.text !== undefined) {
             setBulkMessageInitialText(data.text);
        }
    }, []);

    const closeModal = useCallback((modalName) => {
        setModals(prev => ({ ...prev, [modalName]: false }));
        if (modalName === 'bulkMessage') {
            setBulkMessageInitialText('');
        }
    }, []);

    return {
        modals,
        openModal,
        closeModal,
        selectedMember,
        setSelectedMember,
        bulkMessageInitialText,
        setBulkMessageInitialText
    };
}
