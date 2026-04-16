import { useLanguageStore } from '../stores/useLanguageStore';
import { useState, useCallback, useEffect } from 'react';

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
    installGuide: false
  });
  const [selectedMember, setSelectedMember] = useState(null);
  const [bulkMessageInitialText, setBulkMessageInitialText] = useState('');
  const openModal = useCallback((modalName, data = null) => {
    setModals(prev => ({
      ...prev,
      [modalName]: true
    }));
    if (data?.member) {
      setSelectedMember(data.member);
    }
    if (data?.text !== undefined) {
      setBulkMessageInitialText(data.text);
    }
    // [PWA Back Button] 모달 열 때 히스토리 스택 추가
    window.history.pushState({
      modalOpen: true
    }, '');
  }, []);
  const closeModal = useCallback(modalName => {
    setModals(prev => {
      // 이미 전부 닫혀있으면 뒤로가기 스택 조작 안함
      const isOpen = prev[modalName] || selectedMember;
      if (isOpen) {
        // 직접 X 눌러서 닫을 땐 히스토리 하나 빼주어야 백버튼 꼬이지 않음
        if (window.history.state?.modalOpen) {
          window.history.back();
        }
      }
      if (modalName === 'bulkMessage') {
        setBulkMessageInitialText('');
      }
      return {
        ...prev,
        [modalName]: false
      };
    });
  }, [selectedMember]);

  // [PWA Back 버튼 인터셉트]
  useEffect(() => {
    const handlePopState = e => {
      // 안드로이드 물리 백버튼 / iOS 스와이프 백 감지 시, 열려있는 모든 창 닫기
      setModals({
        add: false,
        price: false,
        time: false,
        message: false,
        notice: false,
        bulkMessage: false,
        extend: false,
        note: false,
        edit: false,
        installGuide: false
      });
      setSelectedMember(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 멤버 상세용 (MemberDetailModal) 직접 열기/닫기 처리
  useEffect(() => {
    if (selectedMember && !window.history.state?.modalOpen) {
      window.history.pushState({
        modalOpen: true
      }, '');
    }
  }, [selectedMember]);
  return {
    modals,
    openModal,
    closeModal,
    selectedMember,
    setSelectedMember: member => {
      if (!member && selectedMember && window.history.state?.modalOpen) {
        window.history.back(); // 닫기 눌렀을 때
      }
      setSelectedMember(member);
    },
    bulkMessageInitialText,
    setBulkMessageInitialText
  };
}