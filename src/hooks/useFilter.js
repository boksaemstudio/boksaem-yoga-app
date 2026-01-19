import { useMemo } from 'react';

/**
 * Custom hook for filtering and sorting members
 * 회원 필터링 및 정렬을 위한 커스텀 훅
 * 
 * @param {Array} members - 전체 회원 배열
 * @param {string} currentBranch - 현재 선택된 지점 ID ('all' 또는 'gwangheungchang' 또는 'mapo')
 * @param {string} searchTerm - 검색어
 * @param {string} filterType - 필터 타입 ('all', 'active', 'expiring', 'expired')
 * @returns {Object} { filteredMembers, stats }
 */
export const useFilteredMembers = (members, currentBranch, searchTerm = '', filterType = 'all') => {
    const filteredMembers = useMemo(() => {
        if (!members || members.length === 0) return [];

        let result = members;

        // 1. Branch Filter
        if (currentBranch && currentBranch !== 'all') {
            result = result.filter(m => m.homeBranch === currentBranch);
        }

        // 2. Search Filter
        if (searchTerm && searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            result = result.filter(m => {
                const name = (m.name || '').toLowerCase();
                const phone = (m.phone || '').toLowerCase();
                const phoneLast4 = (m.phoneLast4 || '').toLowerCase();
                return name.includes(term) || phone.includes(term) || phoneLast4.includes(term);
            });
        }

        // 3. Type Filter
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filterType === 'active') {
            result = result.filter(m => {
                if (!m.endDate) return false;
                const endDate = new Date(m.endDate);
                endDate.setHours(0, 0, 0, 0);
                return endDate >= today;
            });
        } else if (filterType === 'expiring') {
            // Expiring within 7 days
            const sevenDaysLater = new Date(today);
            sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

            result = result.filter(m => {
                if (!m.endDate) return false;
                const endDate = new Date(m.endDate);
                endDate.setHours(0, 0, 0, 0);
                return endDate >= today && endDate <= sevenDaysLater;
            });
        } else if (filterType === 'expired') {
            result = result.filter(m => {
                if (!m.endDate) return false;
                const endDate = new Date(m.endDate);
                endDate.setHours(0, 0, 0, 0);
                return endDate < today;
            });
        }

        return result;
    }, [members, currentBranch, searchTerm, filterType]);

    // Calculate stats
    const stats = useMemo(() => {
        const total = filteredMembers.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const active = filteredMembers.filter(m => {
            if (!m.endDate) return false;
            const endDate = new Date(m.endDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate >= today;
        }).length;

        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

        const expiring = filteredMembers.filter(m => {
            if (!m.endDate) return false;
            const endDate = new Date(m.endDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate >= today && endDate <= sevenDaysLater;
        }).length;

        const expired = filteredMembers.filter(m => {
            if (!m.endDate) return false;
            const endDate = new Date(m.endDate);
            endDate.setHours(0, 0, 0, 0);
            return endDate < today;
        }).length;

        return { total, active, expiring, expired };
    }, [filteredMembers]);

    return { filteredMembers, stats };
};

/**
 * Custom hook for sorting members
 * 회원 정렬을 위한 커스텀 훅
 * 
 * @param {Array} members - 회원 배열
 * @param {string} sortBy - 정렬 기준 ('name', 'credits', 'endDate', 'lastAttended')
 * @param {string} sortOrder - 정렬 순서 ('asc', 'desc')
 * @returns {Array} 정렬된 회원 배열
 */
export const useSortedMembers = (members, sortBy = 'name', sortOrder = 'asc') => {
    return useMemo(() => {
        if (!members || members.length === 0) return [];

        const sorted = [...members].sort((a, b) => {
            let aVal, bVal;

            switch (sortBy) {
                case 'name':
                    aVal = (a.name || '').toLowerCase();
                    bVal = (b.name || '').toLowerCase();
                    break;
                case 'credits':
                    aVal = a.credits || 0;
                    bVal = b.credits || 0;
                    break;
                case 'endDate':
                    aVal = a.endDate || '';
                    bVal = b.endDate || '';
                    break;
                case 'lastAttended':
                    aVal = a.lastAttended || '';
                    bVal = b.lastAttended || '';
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [members, sortBy, sortOrder]);
};

/**
 * Hook that combines filtering and sorting
 * 필터링과 정렬을 결합한 훅
 */
export const useFilteredAndSortedMembers = (
    members,
    currentBranch,
    searchTerm = '',
    filterType = 'all',
    sortBy = 'name',
    sortOrder = 'asc'
) => {
    const { filteredMembers, stats } = useFilteredMembers(members, currentBranch, searchTerm, filterType);
    const sortedMembers = useSortedMembers(filteredMembers, sortBy, sortOrder);

    return { members: sortedMembers, stats };
};
