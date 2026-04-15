import { useLanguageStore } from '../stores/useLanguageStore';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { localizeMembers } from '../utils/demoLocalization';
import { storageService } from '../services/storage';
// [Refactor] Ensuring initialization order for SaaS engine
import { useStudioConfig } from '../contexts/StudioContext';
import { useAdminData } from '../hooks/useAdminData';
import { useNavigate } from 'react-router-dom';
import { safeParseDate, toKSTDateString, toKSTTimeString } from '../utils/dates';
import { BellRinging } from '@phosphor-icons/react';
import AdminRevenue from '../components/AdminRevenue';
import AdminPriceManager from '../components/AdminPriceManager';
import AdminMemberDetailModal from '../components/AdminMemberDetailModal';
import InstallGuideModal from '../components/admin/modals/InstallGuideModal';
import NoticeModal from '../components/admin/modals/NoticeModal';
import MessageModal from '../components/admin/modals/MessageModal';
import BulkMessageModal from '../components/admin/modals/BulkMessageModal';
import MemberNoteModal from '../components/admin/modals/MemberNoteModal';
import ExtensionModal from '../components/admin/modals/ExtensionModal';
import MemberAddModal from '../components/admin/modals/MemberAddModal';
import { TimeTableModal, PriceTableModal } from '../components/admin/modals/ImageModals';
import MembersTab from '../components/admin/tabs/MembersTab';
import StatsTab from '../components/admin/tabs/StatsTab';
import NoticesTab from '../components/admin/tabs/NoticesTab';
import LogsTab from '../components/admin/tabs/LogsTab';
import PushHistoryTab from '../components/admin/tabs/PushHistoryTab';
import DataMigrationTab from '../components/admin/tabs/DataMigrationTab';
import KioskSettingsTab from '../components/admin/tabs/KioskSettingsTab';
import AdminHeader from '../components/admin/AdminHeader';
import AdminNav from '../components/admin/AdminNav';
import StudioSettingsTab from '../components/admin/tabs/StudioSettingsTab';
import BookingsTab from '../components/admin/tabs/BookingsTab';
import TrashTab from '../components/admin/tabs/TrashTab';
import OperationsGuideTab from '../components/admin/tabs/OperationsGuideTab';
import AdminInsights from '../components/AdminInsights';
import AdminAIAssistant from '../components/admin/AdminAIAssistant';
import { usePWA } from '../hooks/usePWA';
import ScheduleTab from '../components/admin/tabs/ScheduleTab';
import { getContrastText } from '../utils/colors';
import TrialPaywall from '../components/common/TrialPaywall';

// [REFACTOR] State Management Custom Hooks
import { useAdminModals } from '../hooks/useAdminModals';
import { useAdminFilters } from '../hooks/useAdminFilters';

// [Refactor] Logic moved to useAdminData or provided by simple functions if local only
// Removing local definitions of isMemberActive and isMemberExpiring as they are imported from useAdminData

const isMemberDormant = (m, logs, isMemberActiveFn) => {
  // 1. Check if member is deleted/inactive? (Optional, but "Dormant" usually implies they are still valid members who just stopped coming)
  // Let's include all members who have credits but stopped coming.
  // If credits == 0, they are Expired, not just Dormant. But they can be both.
  // Let's focus on "Active but not attending".

  /*
     Definition:
     - Has credits > 0 (Active)
     - No attendance for 14 days
  */
  const active = isMemberActiveFn ? isMemberActiveFn(m) : Number(m.credits || 0) > 0;
  if (!active) return false;
  const today = new Date();
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(today.getDate() - 14);
  let lastAttDate = null;
  if (m.lastAttendance) {
    lastAttDate = safeParseDate(m.lastAttendance);
  } else if (m.attendanceCount > 0) {
    // Fallback: If no lastAttendance field but has count, try to find in loaded logs
    // Note: 'logs' passed here might be limited.
    // If not found in recent logs, assume it was long ago -> Dormant.
    const lastLog = logs.find(l => l.memberId === m.id);
    if (lastLog) {
      lastAttDate = safeParseDate(lastLog.timestamp || lastLog.date);
    } else {
      // Not in recent logs -> Likely Dormant
      return true;
    }
  } else {
    // Attendance Count 0
    // Check Reg Date
    if (m.regDate) {
      const regDate = new Date(m.regDate);
      return regDate < twoWeeksAgo;
    }
    return false;
  }
  return lastAttDate && lastAttDate < twoWeeksAgo;
};
const AdminDashboard = () => {
  const t = useLanguageStore(s => s.t);
  const lang = useLanguageStore(s => s.language) || 'ko';
  const {
    config,
    loading
  } = useStudioConfig();
  const navigate = useNavigate();
  const initialTab = new URLSearchParams(window.location.search).get('tab') || 'logs';
  const [activeTab, setActiveTab] = useState(initialTab);
  const isDemoSite = typeof window !== 'undefined' && window.location.hostname.includes('demo');
  const [isAllExpanded, setIsAllExpanded] = useState(isDemoSite ? true : false);
  // [Refactor] Use Custom Hook for Data & Logic
  const adminData = useAdminData(activeTab, 'all');
  const {
    currentBranch,
    setCurrentBranch,
    members,
    sales,
    logs,
    notices,
    stats,
    aiInsight,
    loadingInsight,
    images,
    optimisticImages,
    setOptimisticImages,
    todayClasses,
    pushTokens,
    aiUsage,
    pendingApprovals,
    summary,
    handleApprovePush,
    handleRejectPush,
    refreshData,
    isMemberActive,
    isMemberExpiring,
    revenueTrend,
    memberStatusDist,
    getDormantSegments,
    todayReRegMemberIds,
    revenueStats
  } = adminData;

  // [REFACTOR] Admin UI & Modals Hook
  const {
    modals,
    openModal,
    closeModal,
    selectedMember,
    setSelectedMember,
    bulkMessageInitialText,
    setBulkMessageInitialText
  } = useAdminModals();
  const {
    installApp
  } = usePWA();

  // [PWA] Removed auto-show install guide for Admin Dashboard to prevent repeated nagging in in-app browsers

  // Dynamic Pricing State & Real-time Sync
  const [pricingConfig, setPricingConfig] = useState(config?.PRICING || {});
  const themeColor = config?.THEME?.PRIMARY_COLOR || 'var(--primary-gold)';
  const themeContrastText = getContrastText(themeColor);
  useEffect(() => {
    if (!config) return; // Guard: don't fetch pricing before config is ready
    const loadPricing = async () => {
      const data = await storageService.getPricing();
      if (data) setPricingConfig(data);
    };
    loadPricing();

    // [ROOT SOLUTION] 가격 정보 실시간 동기화 구독
    const unsubscribe = storageService.subscribe(() => {
      loadPricing();
    }, ['settings']);

    // [ROOT FIX] 푸시 토큰 Role 수동 복원 (관리자 앱 열 때마다 FCM 갱신)
    // 회원이 Member앱을 열어 토큰이 member로 갱신되더라도, 관리자 앱을 열면 'admin' role 누적 추가
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && localStorage.getItem('admin_push_enabled') === 'true') {
      storageService.requestPushPermission(undefined, 'admin').catch(() => {});
    }
    return () => unsubscribe();
  }, [config]);

  // [REFACTOR] Filters & Pagination Hook
  const {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    filterType,
    setFilterType,
    selectedMemberIds,
    setSelectedMemberIds,
    pushEnabled,
    setPushEnabled,
    currentLogPage,
    setCurrentLogPage,
    itemsPerPage,
    handleToggleFilter,
    toggleMemberSelection,
    selectFilteredMembers,
    selectExpiringMembers
  } = useAdminFilters();

  // NOTE: Loading guard moved to JSX return below — all hooks must run first (Rules of Hooks)
  // 탭 변경 시 URL 업데이트 (pushState 적용)
  const handleTabChange = tabId => {
    if (activeTab === tabId) return;
    setActiveTab(tabId);
    window.history.pushState({ tab: tabId }, '', `?tab=${tabId}`);
  };

  // 브라우저 뒤로가기 지원
  useEffect(() => {
    const handlePopState = (e) => {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab && tab !== activeTab) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  // 전부 펼치기/접기 토글
  const handleToggleAllCards = () => {
    const next = !isAllExpanded;
    setIsAllExpanded(next);
    window.dispatchEvent(new CustomEvent('toggleAllCards', {
      detail: next
    }));
  };

  // Auth Logout
  const handleLogout = async () => {
    const isAgentMode = window.__AGENT_ADMIN_MODE__ === true;
    if (isAgentMode || confirm(t("g_27f0a7") || "\uAD00\uB9AC\uC790 \uBAA8\uB4DC\uB97C \uC885\uB8CC\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) {
      sessionStorage.setItem('demoAdminLogout', 'true');
      await storageService.logoutAdmin();
      navigate('/login');
    }
  };

  // 필터링된 멤버 목록을 메모이제이션하여 성능 최적화
  const filteredMembers = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul'
    });
    // const todayObj = new Date(todayStr);  // Unused

    // Helper logic duplicated from refreshData for consistency
    // [FIX] Use shared logic to ensure consistency with stats
    const checkIsActive = m => isMemberActive(m);
    const checkIsExpiring = m => isMemberExpiring(m);
    if (filterType === 'attendance') {
      const attendanceList = [];

      // Show ALL logs for today (allow multiple attendances per member)
      logs.forEach(l => {
        if (!l.timestamp) return;
        const logDate = toKSTDateString(l.timestamp);
        if (logDate === todayStr && (currentBranch === 'all' || l.branchId === currentBranch)) {
          const member = members.find(m => m.id === l.memberId);
          // Even if member is deleted, show the log if possible (or skip)
          if (member) {
            // [FIX] Robust Time string
            let timeObj;
            if (typeof l.timestamp === 'string') timeObj = new Date(l.timestamp);else if (l.timestamp.toDate) timeObj = l.timestamp.toDate();else if (l.timestamp.seconds) timeObj = new Date(l.timestamp.seconds * 1000);else timeObj = new Date(l.timestamp);
            attendanceList.push({
              ...member,
              logId: l.id,
              attendanceTime: toKSTTimeString(l.timestamp),
              attendanceClass: l.className,
              instructorName: l.instructor,
              attendanceStatus: l.status,
              denialReason: l.denialReason,
              originalLog: l,
              credits: l.credits !== undefined ? l.credits : member.credits
            });
          }
        }
      });

      // Sort by attendance time desc
      return attendanceList.sort((a, b) => String(b.attendanceTime || '').localeCompare(String(a.attendanceTime || '')));
    }
    let baseList = members;
    if (filterType === 'installed' && pushTokens) {
      const instructorTokens = pushTokens.filter(tk => tk.role === 'instructor');
      const uniqueInstructors = [];
      const seenNames = new Set();
      instructorTokens.forEach(tk => {
        // [FIX] 강사는 이름으로 중복 체크 (같은 강사가 여러 기기에서 토큰 등록 시 중복 방지)
        const instructorName = tk.instructorName || "";
        if (!seenNames.has(instructorName)) {
          seenNames.add(instructorName);
          uniqueInstructors.push({
            id: tk.memberId || `instructor_${instructorName}`,
            name: instructorName,
            phone: '',
            role: 'instructor',
            installedAt: tk.updatedAt || tk.createdAt || new Date().toISOString(),
            pushEnabled: true,
            homeBranch: tk.branchId || config.BRANCHES?.[0]?.id
          });
        }
      });
      baseList = [...members, ...uniqueInstructors];
    }
    return baseList.filter(m => {
      if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return false;
      const matchesSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (m.phone || '').includes(searchTerm);
      if (!matchesSearch) return false;
      if (filterType === 'active') return checkIsActive(m);
      // [FIX] Registration Filter: New OR Re-Reg (createdAt fallback 포함)
      if (filterType === 'registration') {
        const isNewByRegDate = m.regDate === todayStr;
        const isNewByCreatedAt = m.createdAt && typeof m.createdAt === 'string' && m.createdAt.startsWith(todayStr);
        return isNewByRegDate || isNewByCreatedAt || todayReRegMemberIds.includes(m.id);
      }
      // if (filterType === 'attendance') handled above
      if (filterType === 'expiring') return checkIsExpiring(m);
      if (filterType === 'dormant') return isMemberDormant(m, logs, isMemberActive);
      // [New] Installed Filter
      if (filterType === 'installed') {
        return !!m.installedAt || pushTokens && pushTokens.some(tk => tk.memberId === m.id);
      }
      // [NEW] Bio Missing Filter (Active members without face descriptor)
      if (filterType === 'bio_missing') return !m.hasFaceDescriptor && isMemberActive(m);
      return true; // 'all'
    }).sort((a, b) => {
      if (filterType === 'installed') {
        // Sort by install date desc
        const getInstallDate = m => {
          if (m.installedAt) return new Date(m.installedAt);
          const tk = pushTokens ? pushTokens.find(pt => pt.memberId === m.id) : null;
          return tk ? new Date(tk.updatedAt || tk.createdAt || 0) : new Date(0);
        };
        return getInstallDate(b) - getInstallDate(a);
      }
      if (filterType === 'registration') {
        const dateA = new Date(a.lastPaymentDate || a.regDate || 0);
        const dateB = new Date(b.lastPaymentDate || b.regDate || 0);
        return dateB - dateA; // Descending (latest first)
      }
      return String(a.name || '').localeCompare(String(b.name || ''), 'ko');
    });
  }, [members, logs, searchTerm, filterType, currentBranch, isMemberActive, isMemberExpiring, todayReRegMemberIds, pushTokens]);
  const dormantCount = useMemo(() => {
    return members.filter(m => {
      if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return false;
      return isMemberDormant(m, logs, isMemberActive);
    }).length;
  }, [members, logs, currentBranch, isMemberActive]);

  // [NEW] Dormant members list for ChurnReportPanel
  const dormantMembersList = useMemo(() => {
    const branchMembers = members.filter(m => currentBranch === 'all' || m.homeBranch === currentBranch);
    const segments = getDormantSegments(branchMembers);
    return segments['all'] || [];
  }, [members, currentBranch, getDormantSegments]);

  // [FIX] bioMissingCount & facialDataRatio 계산 추가
  const {
    bioMissingCount,
    facialDataRatio,
    facialDataCount
  } = useMemo(() => {
    const branchMembers = members.filter(m => currentBranch === 'all' || m.homeBranch === currentBranch);
    const activeCount = branchMembers.filter(m => isMemberActive(m)).length;
    const withFaceCount = branchMembers.filter(m => isMemberActive(m) && m.hasFaceDescriptor).length;
    const missingCount = activeCount - withFaceCount;
    const ratio = activeCount > 0 ? Math.round(withFaceCount / activeCount * 100) : 0;
    return {
      bioMissingCount: missingCount,
      facialDataRatio: ratio,
      facialDataCount: withFaceCount
    };
  }, [members, currentBranch, isMemberActive]);
  const extendedSummary = {
    ...summary,
    dormantMembersCount: dormantCount,
    bioMissingCount,
    facialDataRatio,
    facialDataCount
  };
  const handleInstallClick = async () => {
    const result = await installApp();
    if (!result) {
      openModal('installGuide');
    }
  };
  const handleForceUpdate = async () => {
    if (!window.confirm(t('confirm_clear_cache') || 'Clear all caches and refresh? (You may be logged out)')) return;
    console.log('[App] Forcing update and clearing ALL caches...');

    // [CRITICAL] 1. Delete ALL Firestore/Firebase IndexedDB databases
    try {
      const dbs = await indexedDB.databases();
      const targetDbs = dbs.filter(db => db.name && (db.name.includes('firestore') || db.name.includes('firebase')));
      for (const dbInfo of targetDbs) {
        console.log(`[App] Deleting IndexedDB: ${dbInfo.name}`);
        indexedDB.deleteDatabase(dbInfo.name);
      }
      console.log(`[App] Cleared ${targetDbs.length} IndexedDB database(s).`);
    } catch (err) {
      console.warn('[App] Failed to clear IndexedDB:', err);
    }

    // 2. Clear ALL Cache Storage (Service Worker caches)
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
        console.log(`[App] Deleted cache: ${name}`);
      }
      console.log(`[App] Cleared ${cacheNames.length} cache(s).`);
    } catch (err) {
      console.warn('[App] Failed to clear Cache Storage:', err);
    }

    // 3. Unregister ALL Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[App] SW Unregistered:', registration);
      }
    }

    // Force reload ignoring cache
    window.location.reload(true);
  };
  const handleBranchChange = e => {
    const branch = e.target.value;
    setCurrentBranch(branch);
    storageService.setBranch(branch);
  };
  const handleImageCountChange = async e => {
    const count = e.target.value;
    setOptimisticImages(prev => ({
      ...prev,
      pricing_image_count: count
    }));
    try {
      await storageService.updateImage('pricing_image_count', count);
    } catch (err) {
      console.error('Failed to update image count:', err);
      alert(t("g_ad790b") || "\uC774\uBBF8\uC9C0 \uAC1C\uC218 \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
    }
  };
  const handleImageUpload = async (e, target) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: Check file size before processing
    if (file.size > 5 * 1024 * 1024) {
      alert(t("g_a287d2") || "\uD30C\uC77C \uC6A9\uB7C9\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4. (\uCD5C\uB300 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = async () => {
        // Setup canvas for compression
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900; // Reduced from 1200
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 0.8 quality (High quality for text readability)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        if (target === 'notice') {
          // Managed by hook
          // setNewNotice({ ...newNotice, image: compressedBase64 });
          console.warn('Notice image upload not implemented');
        } else {
          try {
            // [FIX] Set optimistic state IMMEDIATELY and persist it in this component
            setOptimisticImages(prev => ({
              ...prev,
              [target]: compressedBase64
            }));
            await storageService.updateImage(target, compressedBase64);

            // Removed setImages call as it is handled by subscription in hook
          } catch (err) {
            console.error(`[Admin] Upload failed for ${target}:`, err);
            alert(t("g_65c5cb") || "\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. (5MB \uC774\uD558\uC778\uC9C0 \uD655\uC778\uD574\uC8FC\uC138\uC694)");
          }
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };
  const handleOpenEdit = member => {
    openModal('edit', {
      member
    });
  };
  const handleOpenEditById = useCallback(memberId => {
    let member = members.find(m => m.id === memberId);
    if (!member) {
      const instructorToken = pushTokens.find(tk => tk.memberId === memberId && tk.role === 'instructor');
      if (instructorToken) {
        member = {
          id: memberId,
          name: instructorToken.instructorName || t("g_9564f6") || "",
          phone: '',
          role: 'instructor'
        };
      }
    }
    if (member) {
      handleOpenEdit(member);
    } else {
      alert(t("g_32f321") || "\uC0AD\uC81C\uB418\uAC70\uB098 \uCC3E\uC744 \uC218 \uC5C6\uB294 \uD68C\uC6D0\uC785\uB2C8\uB2E4.");
    }
  }, [members, pushTokens]);
  const handleAddSalesRecord = async salesData => {
    try {
      await storageService.addSalesRecord(salesData);
      // Refresh sales data
      // const updatedSales = await storageService.getSales();
      // Managed by hook
      // setSales(updatedSales);
      await refreshData(); // Use refreshData instead
      return true;
    } catch (error) {
      console.error('Error adding sales record:', error);
      alert(t("g_15768d") || "\uD310\uB9E4 \uAE30\uB85D \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
      return false;
    }
  };

  // Wrapper for AdminMemberDetailModal - expects (memberId, dataToUpdate)
  const handleMemberModalUpdate = async (memberId, dataToUpdate) => {
    try {
      await storageService.updateMember(memberId, dataToUpdate);
      refreshData();
      return true;
    } catch (error) {
      console.error('Error updating member:', error);
      return false;
    }
  };
  const [pushLoading, setPushLoading] = useState(false);
  const handleSubscribePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        setPushEnabled(false);
        localStorage.setItem('admin_push_enabled', 'false');
        // [ROOT FIX] role='admin'만 삭제 — instructor 토큰 보호
        await storageService.deletePushToken('admin');
        alert(t("g_69df26") || "\uC774 \uAE30\uAE30\uC5D0\uC11C \uC54C\uB9BC \uC218\uC2E0\uC744 \uAED0\uC2B5\uB2C8\uB2E4. (\uBE0C\uB77C\uC6B0\uC800 \uAD8C\uD55C\uC740 \uC720\uC9C0\uB429\uB2C8\uB2E4)");
        return;
      }

      // [ROOT FIX] role='admin'으로 토큰 저장 — memberId 없어도 저장됨
      const result = await storageService.requestPushPermission(undefined, 'admin');
      if (result === 'granted') {
        setPushEnabled(true);
        localStorage.setItem('admin_push_enabled', 'true');
        alert(t("g_977dac") || "\uC6D0\uACA9 \uD478\uC2DC \uC54C\uB9BC \uC218\uC2E0 \uB300\uC0C1\uC73C\uB85C \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      } else if (result === 'denied') {
        setPushEnabled(false);
        localStorage.setItem('admin_push_enabled', 'false');
        alert(t("g_ab4047") || "\uD478\uC2DC \uC54C\uB9BC \uAD8C\uD55C\uC774 \uAC70\uBD80\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uBE0C\uB77C\uC6B0\uC800 \uC124\uC815\uC5D0\uC11C \uAD8C\uD55C\uC744 \uD5C8\uC6A9\uD574\uC8FC\uC138\uC694.");
      } else {
        alert(t("g_c95ed0") || "\uC54C\uB9BC \uC124\uC815 \uC911 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
      }
    } finally {
      setPushLoading(false);
    }
  };

  // --- RENDER ---
  // [CRITICAL] Guard against early access before config/data is ready
  if (!config || loading) {
    return <div style={{
      background: '#08080A',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--primary-gold)'
    }}>Loading Admin Console...</div>;
  }
  return <TrialPaywall>
        <div className="admin-container">
            <AdminHeader config={config} handleForceUpdate={handleForceUpdate} handleInstallClick={handleInstallClick} handleLogout={handleLogout} refreshData={refreshData} loadingInsight={loadingInsight} aiUsage={aiUsage} pushEnabled={pushEnabled} pushLoading={pushLoading} handleSubscribePush={handleSubscribePush} themeContrastText={themeContrastText} activeTab={activeTab} currentBranch={currentBranch} handleBranchChange={handleBranchChange} isAllExpanded={isAllExpanded} handleToggleAllCards={handleToggleAllCards} />

            <AdminNav activeTab={activeTab} setActiveTab={handleTabChange} pendingApprovals={pendingApprovals} config={config} />

            {/* Main Content Area */}
            <div style={{
        flex: 1,
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        paddingBottom: '100px'
      }}>
                {activeTab === 'push_history' && <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
                        {/* AI Approval Pending Section */}
                        {pendingApprovals.length > 0 && <div className="dashboard-card" style={{
            border: '1px solid var(--primary-gold)',
            background: 'rgba(var(--primary-rgb), 0.05)'
          }}>
                                <h3 className="card-label" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--primary-gold)',
              marginBottom: '16px'
            }}>
                                    <BellRinging size={20} weight="fill" />{t("g_52b38c") || "AI \uBC1C\uC1A1 \uC81C\uC548 (\uC2B9\uC778 \uB300\uAE30)"}</h3>
                                <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
                                    {pendingApprovals.map(item => <div key={item.id} style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(var(--primary-rgb), 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                                            <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                                                <div>
                                                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: 'var(--text-primary)'
                    }}>{item.memberName}{t("g_8a9e83") || "\uB2D8\uAED8 \uC81C\uC548"}</div>
                                                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--primary-gold)',
                      marginTop: '2px'
                    }}>{t("g_197e93") || "\uC0AC\uC720:"}{item.reason || t("g_eb9db0") || "\uAD00\uB9AC \uD544\uC694 \uD68C\uC6D0"}</div>
                                                </div>
                                                <div style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                                                    <button onClick={() => handleRejectPush(item.id)} className="action-btn sm" style={{
                      width: 'auto',
                      background: 'rgba(244, 63, 94, 0.1)',
                      color: '#F43F5E',
                      border: '1px solid rgba(244, 63, 94, 0.2)'
                    }}>{t("g_30e15a") || "\uC0AD\uC81C"}</button>
                                                    <button onClick={() => handleApprovePush(item.id, item.title || t("g_c12d41") || "\uC548\uBD80 \uBA54\uC2DC\uC9C0")} className="action-btn sm primary" style={{
                      width: 'auto',
                      boxShadow: '0 4px 12px var(--primary-gold-glow)'
                    }}>{t("g_c6fff9") || "\uC2B9\uC778 \uBC1C\uC1A1"}</button>
                                                </div>
                                            </div>
                                            <div style={{
                  padding: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  borderLeft: '3px solid var(--primary-gold)'
                }}>
                                                {item.body || item.content}
                                            </div>
                                        </div>)}
                                </div>
                            </div>}
                        <PushHistoryTab onSelectMember={handleOpenEditById} setActiveTab={setActiveTab} pendingApprovals={pendingApprovals} onApprove={handleApprovePush} onReject={handleRejectPush} />
                    </div>}

                {activeTab === 'revenue' && <AdminRevenue members={members} sales={sales} currentBranch={currentBranch} revenueStats={revenueStats} />}

                {activeTab === 'pricing' && <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '30px'
        }}>
                        <AdminPriceManager />
                        <hr style={{
            borderColor: 'rgba(255,255,255,0.05)',
            margin: '20px 0'
          }} />
                        <div className="dashboard-card">
                            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
                                <h3 className="card-label" style={{
                margin: 0
              }}>{t("g_e83d83") || "\uAC00\uACA9\uD45C \uAC1C\uC694 (\uC774\uBBF8\uC9C0)"}</h3>
                                <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                                    <span style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)'
                }}>{t("g_b3bc08") || "\uC774\uBBF8\uC9C0 \uAC1C\uC218:"}</span>
                                    <select value={optimisticImages.pricing_image_count || images.pricing_image_count || '2'} onChange={handleImageCountChange} style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  outline: 'none'
                }}>
                                        <option value="1">{t("g_e7c1c9") || "1\uC7A5"}</option>
                                        <option value="2">{t("g_c75ce0") || "2\uC7A5"}</option>
                                        <option value="3">{t("g_666f7b") || "3\uC7A5"}</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}>
                                {Array.from({
                length: parseInt(optimisticImages.pricing_image_count || images.pricing_image_count || '2')
              }).map((_, i) => {
                const index = i + 1;
                const imgKey = `price_table_${index}`;
                const imgSrc = optimisticImages[imgKey] || images[imgKey];
                return <div key={imgKey} style={{
                  background: 'rgba(255,255,255,0.02)',
                  padding: '20px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)'
                }}>
                                            <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: '800',
                    marginBottom: '15px',
                    color: 'rgba(255,255,255,0.7)'
                  }}>{t("g_ecb1fa") || "\uC694\uAE08\uD45C \uC774\uBBF8\uC9C0"}{index}</h3>
                                            {imgSrc ? <img src={imgSrc} alt={`가격표 ${index}`} style={{
                    width: '100%',
                    borderRadius: '12px',
                    marginBottom: '15px'
                  }} /> : <div style={{
                    width: '100%',
                    padding: '40px 0',
                    textAlign: 'center',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '12px',
                    marginBottom: '15px',
                    color: '#666'
                  }}>{t("g_7f1c78") || "\uC774\uBBF8\uC9C0\uAC00 \uB4F1\uB85D\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4"}</div>}
                                            <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}>
                                                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, imgKey)} style={{
                      display: 'none'
                    }} id={`up-price-${index}`} />
                                                <label htmlFor={`up-price-${index}`} className="action-btn sm" style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.7rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}>{t("g_0d4e26") || "\uAC00\uACA9\uD45C \uBCC0\uACBD"}</label>
                                            </div>
                                        </div>;
              })}
                            </div>
                        </div>
                    </div>}

                {activeTab === 'members' && <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
                        {aiInsight && <AdminInsights briefing={aiInsight.message} />}


                        <MembersTab members={isDemoSite ? localizeMembers(members, lang) : members} filteredMembers={isDemoSite ? localizeMembers(filteredMembers, lang) : filteredMembers} summary={extendedSummary} searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterType={filterType} handleToggleFilter={handleToggleFilter} selectExpiringMembers={selectExpiringMembers} selectedMemberIds={selectedMemberIds} toggleMemberSelection={toggleMemberSelection} selectFilteredMembers={selectFilteredMembers} currentPage={currentPage} setCurrentPage={setCurrentPage} itemsPerPage={itemsPerPage} handleOpenEdit={handleOpenEdit} setShowAddModal={b => b ? openModal('add') : closeModal('add')} setShowBulkMessageModal={b => b ? openModal('bulkMessage') : closeModal('bulkMessage')} pushTokens={pushTokens} getDormantSegments={getDormantSegments} setBulkMessageInitialText={setBulkMessageInitialText} setActiveTab={setActiveTab} onNoteClick={m => openModal('note', {
            member: m
          })} todayReRegMemberIds={todayReRegMemberIds} sales={sales} />
                </div>}

                {activeTab === 'schedule' && <ScheduleTab images={images} optimisticImages={optimisticImages} handleImageUpload={handleImageUpload} />}

                {activeTab === 'stats' && <StatsTab summary={extendedSummary} stats={stats} revenueTrend={revenueTrend} memberStatusDist={memberStatusDist} />}

                {activeTab === 'notices' && <NoticesTab notices={notices} setShowNoticeModal={b => b ? openModal('notice') : closeModal('notice')} refreshData={refreshData} />}

                {activeTab === 'logs' && <LogsTab todayClasses={todayClasses} logs={logs} currentLogPage={currentLogPage} setCurrentLogPage={setCurrentLogPage} members={members} onMemberClick={handleOpenEdit} summary={extendedSummary} />}

                {activeTab === 'bookings' && <BookingsTab currentBranch={currentBranch} />}

                {activeTab === 'data_migration' && config.FEATURES?.ENABLE_DATA_MIGRATION && <DataMigrationTab />}

                {activeTab === 'kiosk' && <KioskSettingsTab />}

                {activeTab === 'trash' && <TrashTab />}

                {activeTab === 'guide' && <OperationsGuideTab />}

                {activeTab === 'settings' && <StudioSettingsTab />}

                {activeTab === 'ai_assistant' && <AdminAIAssistant />}
            </div>


            {/* --- MODALS --- */}
            <MemberAddModal isOpen={modals.add} onClose={() => closeModal('add')} onSuccess={refreshData} />
            <MemberNoteModal isOpen={modals.note} onClose={() => closeModal('note')} key={selectedMember?.id || 'note-modal-empty'} member={selectedMember && members.find(m => m.id === selectedMember.id) || selectedMember} onSuccess={refreshData} />
            <NoticeModal isOpen={modals.notice} onClose={() => closeModal('notice')} onSuccess={refreshData} />
            <BulkMessageModal isOpen={modals.bulkMessage} onClose={() => closeModal('bulkMessage')} selectedMemberIds={selectedMemberIds} memberCount={selectedMemberIds.length} initialMessage={bulkMessageInitialText} />
            <MessageModal isOpen={modals.message} onClose={() => closeModal('message')} member={selectedMember && members.find(m => m.id === selectedMember.id) || selectedMember} />
            <ExtensionModal isOpen={modals.extend} onClose={() => closeModal('extend')} member={selectedMember && members.find(m => m.id === selectedMember.id) || selectedMember} onSuccess={refreshData} />

            <TimeTableModal isOpen={modals.time} onClose={() => closeModal('time')} images={images} setOptimisticImages={setOptimisticImages} optimisticImages={optimisticImages} />
            <PriceTableModal isOpen={modals.price} onClose={() => closeModal('price')} images={images} setOptimisticImages={setOptimisticImages} optimisticImages={optimisticImages} />
            <InstallGuideModal isOpen={modals.installGuide} onClose={() => closeModal('installGuide')} />

            {modals.edit && selectedMember && <AdminMemberDetailModal member={members.find(m => m.id === selectedMember.id) || selectedMember} memberLogs={logs.filter(log => log.memberId === selectedMember.id)} onClose={() => closeModal('edit')} pricingConfig={pricingConfig} onUpdateMember={handleMemberModalUpdate} onAddSalesRecord={handleAddSalesRecord} pushTokens={pushTokens} />}
            <div style={{
        height: '300px',
        width: '100%'
      }}></div>
        </div>
        </TrialPaywall>;
};
export default AdminDashboard;