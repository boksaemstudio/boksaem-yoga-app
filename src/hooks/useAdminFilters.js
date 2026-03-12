import { useState, useCallback } from 'react';

/**
 * AdminDashboard의 목록 필터링, 검색, 페이지네이션 상태를 통합 관리하는 훅
 */
export function useAdminFilters() {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [filterType, setFilterType] = useState('all');
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [currentLogPage, setCurrentLogPage] = useState(1);
    const itemsPerPage = 8;

    const [pushEnabled, setPushEnabled] = useState(() => {
        const saved = localStorage.getItem('admin_push_enabled');
        return saved === 'true' && Notification.permission === 'granted';
    });

    const handleToggleFilter = useCallback((type) => {
        setFilterType(prev => prev === type ? 'all' : type);
        setCurrentPage(1);
    }, []);

    const toggleMemberSelection = useCallback((id) => {
        setSelectedMemberIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const selectFilteredMembers = useCallback((filteredList) => {
        const allFilteredIds = filteredList.map(m => m.id);
        const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedMemberIds.includes(id));

        if (allSelected) {
            setSelectedMemberIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
        } else {
            setSelectedMemberIds(prev => [...new Set([...prev, ...allFilteredIds])]);
        }
    }, [selectedMemberIds]);

    const selectExpiringMembers = useCallback(() => {
        handleToggleFilter('expiring');
    }, [handleToggleFilter]);

    return {
        searchTerm, setSearchTerm,
        currentPage, setCurrentPage,
        filterType, setFilterType,
        selectedMemberIds, setSelectedMemberIds,
        pushEnabled, setPushEnabled,
        currentLogPage, setCurrentLogPage,
        itemsPerPage,
        handleToggleFilter,
        toggleMemberSelection,
        selectFilteredMembers,
        selectExpiringMembers
    };
}
