import { useState, useEffect, useMemo, useCallback } from 'react';
import { storageService } from '../services/storage';
// [Refactor] Ensuring initialization order for SaaS engine
import { useStudioConfig } from '../contexts/StudioContext';
import { useAdminData } from '../hooks/useAdminData'; 
import { useNavigate } from 'react-router-dom';
import { safeParseDate, toKSTDateString, toKSTTimeString, getTodayKST } from '../utils/dates';
import {
    Users, ClockCounterClockwise, PlusCircle,
    Calendar, Megaphone, BellRinging,
    Tag, SignOut, ChartBar,
    Warning, Database, Desktop,
    ChartPieSlice,
    ShieldCheck,
    Clock,
    Gear
} from '@phosphor-icons/react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import AdminScheduleManager from '../components/AdminScheduleManager';
import AdminRevenue from '../components/AdminRevenue';
import AdminPriceManager from '../components/AdminPriceManager';
import { db } from '../firebase';
import AdminMemberDetailModal from '../components/AdminMemberDetailModal';
import InstallGuideModal from '../components/admin/modals/InstallGuideModal';
import NoticeModal from '../components/admin/modals/NoticeModal';
import MessageModal from '../components/admin/modals/MessageModal';
import BulkMessageModal from '../components/admin/modals/BulkMessageModal';
import MemberNoteModal from '../components/admin/modals/MemberNoteModal';
import ExtensionModal from '../components/admin/modals/ExtensionModal';
import MemberAddModal from '../components/admin/modals/MemberAddModal';
import { TimeTableModal, PriceTableModal } from '../components/admin/modals/ImageModals';
// Assets loaded via dynamic config
import MembersTab from '../components/admin/tabs/MembersTab';
import StatsTab from '../components/admin/tabs/StatsTab';
import NoticesTab from '../components/admin/tabs/NoticesTab';
import LogsTab from '../components/admin/tabs/LogsTab';

import PushHistoryTab from '../components/admin/tabs/PushHistoryTab';
import DataMigrationTab from '../components/admin/tabs/DataMigrationTab';
import KioskSettingsTab from '../components/admin/tabs/KioskSettingsTab';
import StudioSettingsTab from '../components/admin/tabs/StudioSettingsTab';
import AdminInsights from '../components/AdminInsights';
import { usePWA } from '../hooks/usePWA';
import ScheduleTab from '../components/admin/tabs/ScheduleTab';
import { getContrastText } from '../utils/colors';




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
    const active = isMemberActiveFn ? isMemberActiveFn(m) : (Number(m.credits || 0) > 0);
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
    const { config, loading } = useStudioConfig();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('logs');

    // [Refactor] Use Custom Hook for Data & Logic
    const adminData = useAdminData(activeTab, 'all');

    // [CRITICAL] Guard against early access before config/data is ready
    if (!config || loading) {
        return <div style={{ background: '#08080A', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37' }}>Loading Admin Console...</div>;
    }

    const {
        currentBranch, setCurrentBranch,
        members, sales, logs, notices, stats,
        aiInsight, loadingInsight,
        images, optimisticImages, setOptimisticImages,
        todayClasses, pushTokens, aiUsage,
        pendingApprovals, summary,
        handleApprovePush, handleRejectPush,
        refreshData, isMemberActive, isMemberExpiring,
        revenueTrend, memberStatusDist, getDormantSegments,
        todayReRegMemberIds
    } = adminData;

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [showNoticeModal, setShowNoticeModal] = useState(false);
    const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [bulkMessageInitialText, setBulkMessageInitialText] = useState('');
    const [showInstallGuide, setShowInstallGuide] = useState(false); // [PWA] Install Guide State
    const { installApp } = usePWA();

    // [PWA] Removed auto-show install guide for Admin Dashboard to prevent repeated nagging in in-app browsers

    // Dynamic Pricing State & Real-time Sync
    const [pricingConfig, setPricingConfig] = useState(config.PRICING || {});
    const themeColor = config.THEME?.PRIMARY_COLOR || '#D4AF37';
    const themeContrastText = getContrastText(themeColor);

    useEffect(() => {
        const loadPricing = async () => {
            const data = await storageService.getPricing();
            if (data) setPricingConfig(data);
        };
        
        loadPricing();

        // [ROOT SOLUTION] 가격 정보 실시간 동기화 구독
        const unsubscribe = storageService.subscribe(() => {
            console.log('[AdminDashboard] Pricing updated via settings stream, syncing...');
            loadPricing();
        }, ['settings']);

        return () => unsubscribe();
    }, []);

    // Editing State
    const [selectedMember, setSelectedMember] = useState(null);

    // const [showScheduleSettings, setShowScheduleSettings] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Filter Type
    const [filterType, setFilterType] = useState('all');
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [pushEnabled, setPushEnabled] = useState(() => {
        const saved = localStorage.getItem('admin_push_enabled');
        return saved === 'true' && Notification.permission === 'granted';
    });
    const [currentLogPage, setCurrentLogPage] = useState(1);

    // Auth Logout
    const handleLogout = async () => {
        const isAgentMode = window.__AGENT_ADMIN_MODE__ === true;
        if (isAgentMode || confirm('관리자 모드를 종료하시겠습니까?')) {
            await storageService.logoutAdmin();
            navigate('/login');
        }
    };


    // 필터링된 멤버 목록을 메모이제이션하여 성능 최적화
    const filteredMembers = useMemo(() => {
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        // const todayObj = new Date(todayStr);  // Unused

        // Helper logic duplicated from refreshData for consistency
        // [FIX] Use shared logic to ensure consistency with stats
        const checkIsActive = (m) => isMemberActive(m);
        const checkIsExpiring = (m) => isMemberExpiring(m);

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
                        if (typeof l.timestamp === 'string') timeObj = new Date(l.timestamp);
                        else if (l.timestamp.toDate) timeObj = l.timestamp.toDate();
                        else if (l.timestamp.seconds) timeObj = new Date(l.timestamp.seconds * 1000);
                        else timeObj = new Date(l.timestamp);

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
            return attendanceList.sort((a, b) => b.attendanceTime.localeCompare(a.attendanceTime));
        }

        let baseList = members;
        if (filterType === 'installed' && pushTokens) {
            const instructorTokens = pushTokens.filter(t => t.role === 'instructor');
            const uniqueInstructors = [];
            const seenIds = new Set();
            instructorTokens.forEach(t => {
                const id = t.memberId || t.token;
                if (id && !seenIds.has(id)) {
                    seenIds.add(id);
                    uniqueInstructors.push({
                        id: id,
                        name: t.instructorName || '선생님',
                        phone: '',
                        role: 'instructor',
                        installedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
                        pushEnabled: true,
                        homeBranch: t.branchId || (config.BRANCHES?.[0]?.id)
                    });
                }
            });
            baseList = [...members, ...uniqueInstructors];
        }

        return baseList.filter(m => {
            if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return false;

            const matchesSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.phone || '').includes(searchTerm);
            if (!matchesSearch) return false;

            if (filterType === 'active') return checkIsActive(m);
            // [FIX] Registration Filter: New OR Re-Reg
            if (filterType === 'registration') return m.regDate === todayStr || todayReRegMemberIds.includes(m.id);
            // if (filterType === 'attendance') handled above
            if (filterType === 'expiring') return checkIsExpiring(m);
            if (filterType === 'dormant') return isMemberDormant(m, logs, isMemberActive);
            // [New] Installed Filter
            if (filterType === 'installed') return !!m.installedAt;
            // [NEW] Bio Missing Filter (Active members without face descriptor)
            if (filterType === 'bio_missing') return !m.hasFaceDescriptor && isMemberActive(m);

            return true; // 'all'
        }).sort((a, b) => {
            if (filterType === 'installed') {
                // Sort by installedAt desc
                if (!a.installedAt) return 1;
                if (!b.installedAt) return -1;
                return new Date(b.installedAt) - new Date(a.installedAt);
            }
            if (filterType === 'registration') {
                const dateA = new Date(a.lastPaymentDate || a.regDate || 0);
                const dateB = new Date(b.lastPaymentDate || b.regDate || 0);
                return dateB - dateA; // Descending (latest first)
            }
            return a.name.localeCompare(b.name, 'ko');
        });
    }, [members, logs, searchTerm, filterType, currentBranch, isMemberActive, isMemberExpiring, todayReRegMemberIds, pushTokens]);

    const dormantCount = useMemo(() => {
        return members.filter(m => {
            if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return false;
            return isMemberDormant(m, logs, isMemberActive);
        }).length;
    }, [members, logs, currentBranch, isMemberActive]);

    const extendedSummary = { ...summary, dormantMembersCount: dormantCount };

    const handleInstallClick = async () => {
        const result = await installApp();
        if (!result) {
            setShowInstallGuide(true);
        }
    };

    const handleForceUpdate = async () => {
        if (!window.confirm(`업데이트 및 캐시를 초기화하시겠습니까?\n(로그아웃 될 수 있습니다)`)) return;

        console.log('[App] Forcing update and clearing ALL caches...');
        
        // [CRITICAL] 1. Delete ALL Firestore/Firebase IndexedDB databases
        try {
            const dbs = await indexedDB.databases();
            const targetDbs = dbs.filter(db => 
                db.name && (db.name.includes('firestore') || db.name.includes('firebase'))
            );
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

    const handleBranchChange = (e) => {
        const branch = e.target.value;
        setCurrentBranch(branch);
        storageService.setBranch(branch);
    };






    const handleImageUpload = (e, target) => {
        const file = e.target.files[0];
        if (!file) return;

        // Optional: Check file size before processing
        if (file.size > 5 * 1024 * 1024) {
            alert('파일 용량이 너무 큽니다. (최대 5MB)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
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
                        console.log(`[Admin] Uploading image for ${target}...`);
                        // [FIX] Set optimistic state IMMEDIATELY and persist it in this component
                        setOptimisticImages(prev => ({ ...prev, [target]: compressedBase64 }));

                        await storageService.updateImage(target, compressedBase64);
                        console.log(`[Admin] Upload success for ${target}`);
                        // Removed setImages call as it is handled by subscription in hook
                    } catch (err) {
                        console.error(`[Admin] Upload failed for ${target}:`, err);
                        alert("이미지 업로드에 실패했습니다. (5MB 이하인지 확인해주세요)");
                    }
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };







    const handleOpenEdit = (member) => {
        setSelectedMember(member);
        setShowEditModal(true);
    };

    const handleOpenEditById = useCallback((memberId) => {
        let member = members.find(m => m.id === memberId);
        if (!member) {
            const instructorToken = pushTokens.find(t => t.memberId === memberId && t.role === 'instructor');
            if (instructorToken) {
                member = {
                    id: memberId,
                    name: instructorToken.instructorName || '선생님',
                    phone: '',
                    role: 'instructor'
                };
            }
        }
        if (member) {
            handleOpenEdit(member);
        } else {
            alert("삭제되거나 찾을 수 없는 회원입니다.");
        }
    }, [members, pushTokens]);

    const handleAddSalesRecord = async (salesData) => {
        try {
            await storageService.addSalesRecord(salesData);
            // Refresh sales data
            // const updatedSales = await storageService.getSales();
            // Managed by hook
            // setSales(updatedSales);
            await refreshData();  // Use refreshData instead
            return true;
        } catch (error) {
            console.error('Error adding sales record:', error);
            alert('판매 기록 저장 중 오류가 발생했습니다.');
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



    const handleSubscribePush = async () => {
        if (pushEnabled) {
            setPushEnabled(false);
            localStorage.setItem('admin_push_enabled', 'false');
            alert('이 기기에서의 알림 수신 표시를 껐습니다. (브라우저 권한은 유지됩니다)');
            return;
        }

        const result = await storageService.requestPushPermission();
        if (result === 'granted') {
            setPushEnabled(true);
            localStorage.setItem('admin_push_enabled', 'true');
            alert('원격 푸시 알림 수신 대상으로 등록되었습니다.');
        } else if (result === 'denied') {
            setPushEnabled(false);
            localStorage.setItem('admin_push_enabled', 'false');
            alert('푸시 알림 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
        } else {
            alert('알림 설정 중 문제가 발생했습니다.');
        }
    };

    const selectFilteredMembers = (filteredList) => {
        const allFilteredIds = filteredList.map(m => m.id);
        const allSelected = allFilteredIds.every(id => selectedMemberIds.includes(id));

        if (allSelected) {
            setSelectedMemberIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
        } else {
            setSelectedMemberIds(prev => [...new Set([...prev, ...allFilteredIds])]);
        }
    };

    const toggleMemberSelection = (id) => {
        setSelectedMemberIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };



    const handleToggleFilter = (type) => {
        setFilterType(prev => prev === type ? 'all' : type);
        setCurrentPage(1);
    };

    const selectExpiringMembers = () => {
        handleToggleFilter('expiring');
    };

    // --- RENDER ---
    return (
        <div className="admin-container">
            {/* Header - Extremely compact for S25 mobile use */}
            <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'nowrap', gap: '8px' }}>
                <div className="admin-title" style={{ gap: '6px', fontSize: '0.9rem' }}>
                    <img src={config.ASSETS?.LOGO?.SQUARE} alt="로고" style={{ height: '20px', filter: 'invert(1) brightness(1.5) drop-shadow(0 0 8px rgba(212,175,55,0.4))' }} />
                    <span style={{ whiteSpace: 'nowrap', fontWeight: '800' }}>관리</span>
                    
                    {/* [NEW] Manual Update Button for PWA Cache Busting */}
                    <button 
                        onClick={handleForceUpdate} 
                        style={{ 
                            marginLeft: '8px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            border: '1px solid rgba(255, 255, 255, 0.2)', 
                            color: '#aaa', 
                            cursor: 'pointer', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontSize: '0.65rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                        }} 
                        title="업데이트 및 캐시 초기화"
                    >
                        <ClockCounterClockwise size={12} />
                        최신동기화
                    </button>

                    <button onClick={handleInstallClick} style={{ marginLeft: '6px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--primary-gold)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }} title="홈 화면에 추가">
                        <PlusCircle size={18} weight="bold" />
                        <span className="hide-mobile">홈추가</span>
                    </button>
                    <button onClick={handleLogout} style={{ marginLeft: '4px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }} title="로그아웃">
                        <SignOut size={18} />
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {/* [RESTORED] AI Status && Refresh Button */}
                    <button 
                        onClick={() => {
                            if (confirm('AI 분석을 최신 데이터로 다시 실행하시겠습니까? (약 5~10초 소요)')) {
                                refreshData();
                            }
                        }}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'rgba(212, 175, 55, 0.1)',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            color: 'var(--primary-theme-color)',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)'}
                        title="AI 분석 결과 새로고침 (수동)"
                    >
                        <span>✨ AI 분석</span>
                        {loadingInsight ? (
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid var(--primary-gold)', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                        ) : (
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4CD964', boxShadow: '0 0 5px #4CD964' }}></span>
                        )}
                        <span style={{ fontSize: '0.65rem', opacity: 0.8, marginLeft: '4px', paddingLeft: '4px', borderLeft: '1px solid rgba(212,175,55,0.3)' }}>
                            {aiUsage.count}/{aiUsage.limit}
                        </span>
                    </button>

                    <button
                        onClick={handleSubscribePush}
                        className={`action-btn sm ${pushEnabled ? 'primary' : ''}`}
                        style={{
                            padding: '6px 8px',
                            minWidth: '60px',
                            background: pushEnabled ? 'var(--primary-theme-color)' : 'rgba(255,255,255,0.05)',
                            color: pushEnabled ? themeContrastText : 'var(--text-secondary)',
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            border: 'none',
                            borderRadius: '6px'
                        }}
                    >
                        {pushEnabled ? '알림ON' : '알림OFF'}
                    </button>
                    {/* 지점 선택: 회원, 매출 탭에서만 표시 */}
                    {(activeTab === 'members' || activeTab === 'revenue') && (
                        <select
                            className="styled-select"
                            value={currentBranch}
                            onChange={handleBranchChange}
                            style={{ padding: '6px 8px', fontSize: '0.75rem', borderRadius: '6px', width: 'auto', minWidth: '70px', height: '32px' }}
                        >
                            <option value="all">전체</option>
                            {(config.BRANCHES || []).map(b => (
                                <option key={b.id} value={b.id}>{b.name.replace('점', '')}</option>
                            ))}
                        </select>
                    )}
                </div>
            </header>




            {/* Tab Navigation - Becomes Bottom Nav on Mobile */}
            <nav className="admin-nav-tabs">
                <button onClick={() => setActiveTab('members')} className={`nav-tab-item ${activeTab === 'members' ? 'active' : ''}`}>
                    <Users size={22} weight={activeTab === 'members' ? "fill" : "regular"} />
                    <span>회원</span>
                </button>
                <button onClick={() => setActiveTab('logs')} className={`nav-tab-item ${activeTab === 'logs' ? 'active' : ''}`}>
                    <ClockCounterClockwise size={22} weight={activeTab === 'logs' ? "fill" : "regular"} />
                    <span>출석</span>
                </button>
                <button onClick={() => setActiveTab('schedule')} className={`nav-tab-item ${activeTab === 'schedule' ? 'active' : ''}`}>
                    <Calendar size={22} weight={activeTab === 'schedule' ? "fill" : "regular"} />
                    <span>시간표</span>
                </button>
                <button onClick={() => setActiveTab('pricing')} className={`nav-tab-item ${activeTab === 'pricing' ? 'active' : ''}`}>
                    <Tag size={22} weight={activeTab === 'pricing' ? "fill" : "regular"} />
                    <span>가격표</span>
                </button>
                <button onClick={() => setActiveTab('revenue')} className={`nav-tab-item ${activeTab === 'revenue' ? 'active' : ''}`}>
                    <ChartBar size={22} weight={activeTab === 'revenue' ? "fill" : "regular"} />
                    <span>매출</span>
                </button>
                <button onClick={() => setActiveTab('notices')} className={`nav-tab-item ${activeTab === 'notices' ? 'active' : ''}`}>
                    <Megaphone size={22} weight={activeTab === 'notices' ? "fill" : "regular"} />
                    <span>공지</span>
                </button>
                <button onClick={() => setActiveTab('push_history')} className={`nav-tab-item ${activeTab === 'push_history' ? 'active' : ''}`} style={{ position: 'relative' }}>
                    <BellRinging size={22} weight={activeTab === 'push_history' ? "fill" : "regular"} />
                    <span>알림기록</span>
                    {pendingApprovals.length > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: '#F43F5E',
                            color: 'white',
                            fontSize: '0.6rem',
                            padding: '2px 5px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            border: '1.5px solid #121214',
                            minWidth: '18px',
                            textAlign: 'center'
                        }}>
                            {pendingApprovals.length}
                        </span>
                    )}
                </button>

                {config.FEATURES?.ENABLE_DATA_MIGRATION && (
                    <button onClick={() => setActiveTab('data_migration')} className={`nav-tab-item ${activeTab === 'data_migration' ? 'active' : ''}`}>
                        <Database size={22} weight={activeTab === 'data_migration' ? "fill" : "regular"} color="var(--primary-gold)" />
                        <span>데이터</span>
                    </button>
                )}
                <button onClick={() => setActiveTab('kiosk')} className={`nav-tab-item ${activeTab === 'kiosk' ? 'active' : ''}`}>
                    <Desktop size={22} weight={activeTab === 'kiosk' ? "fill" : "regular"} />
                    <span>키오스크</span>
                </button>
                <button onClick={() => setActiveTab('settings')} className={`nav-tab-item ${activeTab === 'settings' ? 'active' : ''}`}>
                    <Gear size={22} weight={activeTab === 'settings' ? "fill" : "regular"} />
                    <span>설정</span>
                </button>
            </nav>

            {/* Main Content Area */}
            <div style={{ flex: 1, padding: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%', paddingBottom: '100px' }}>
                {activeTab === 'push_history' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* AI Approval Pending Section */}
                        {pendingApprovals.length > 0 && (
                            <div className="dashboard-card" style={{ border: '1px solid var(--primary-gold)', background: 'rgba(212, 175, 55, 0.05)' }}>
                                <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-gold)', marginBottom: '16px' }}>
                                    <BellRinging size={20} weight="fill" /> AI 발송 제안 (승인 대기)
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {pendingApprovals.map((item) => (
                                        <div key={item.id} style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(212,175,55,0.2)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{item.memberName}님께 제안</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-gold)', marginTop: '2px' }}>사유: {item.reason || '관리 필요 회원'}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => handleRejectPush(item.id)}
                                                        className="action-btn sm"
                                                        style={{ width: 'auto', background: 'rgba(244, 63, 94, 0.1)', color: '#F43F5E', border: '1px solid rgba(244, 63, 94, 0.2)' }}
                                                    >삭제</button>
                                                    <button
                                                        onClick={() => handleApprovePush(item.id, item.title || '안부 메시지')}
                                                        className="action-btn sm primary"
                                                        style={{ width: 'auto', boxShadow: '0 4px 12px var(--primary-gold-glow)' }}
                                                    >승인 발송</button>
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <PushHistoryTab 
                            onSelectMember={handleOpenEditById} 
                            setActiveTab={setActiveTab} 
                            pendingApprovals={pendingApprovals}
                            onApprove={handleApprovePush}
                            onReject={handleRejectPush}
                        />
                    </div>
                )}

                {activeTab === 'revenue' && (
                    <AdminRevenue members={members} sales={sales} currentBranch={currentBranch} />
                )}

                {activeTab === 'pricing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <AdminPriceManager />
                        <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '20px 0' }} />
                        <div className="dashboard-card">
                            <h3 className="card-label" style={{ marginBottom: '20px' }}>가격표 개요 (이미지)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '15px' }}>심화</h3>
                                    <img src={images.price_table_1 || ''} alt="가격표 1" style={{ width: '100%', borderRadius: '12px', marginBottom: '15px' }} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'price_table_1')} style={{ display: 'none' }} id="up-price-1" />
                                        <label htmlFor="up-price-1" className="action-btn sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.7rem', border: 'none', cursor: 'pointer' }}>가격표 변경</label>
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '15px' }}>일반</h3>
                                    <img src={images.price_table_2 || ''} alt="가격표 2" style={{ width: '100%', borderRadius: '12px', marginBottom: '15px' }} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'price_table_2')} style={{ display: 'none' }} id="up-price-2" />
                                        <label htmlFor="up-price-2" className="action-btn sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.7rem', border: 'none', cursor: 'pointer' }}>가격표 변경</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'members' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {aiInsight && (
                            <AdminInsights 
                                briefing={aiInsight.message} 
                            />
                        )}
                        <MembersTab
                            members={members}
                            filteredMembers={filteredMembers}
                            summary={summary}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            filterType={filterType}
                            handleToggleFilter={handleToggleFilter}
                            selectExpiringMembers={selectExpiringMembers}
                            selectedMemberIds={selectedMemberIds}
                            toggleMemberSelection={toggleMemberSelection}
                            selectFilteredMembers={selectFilteredMembers}
                            currentPage={currentPage}
                            setCurrentPage={setCurrentPage}
                            itemsPerPage={itemsPerPage}
                            handleOpenEdit={handleOpenEdit}
                            setShowAddModal={setShowAddModal}
                            setShowBulkMessageModal={setShowBulkMessageModal}
                            pushTokens={pushTokens}
                            getDormantSegments={getDormantSegments}
                            setBulkMessageInitialText={setBulkMessageInitialText}
                            setActiveTab={setActiveTab}
                            onNoteClick={(m) => { setSelectedMember(m); setShowNoteModal(true); }}
                            todayReRegMemberIds={todayReRegMemberIds}
                        />
                </div>
            )}

                {activeTab === 'schedule' && (
                    <ScheduleTab 
                        images={images} 
                        optimisticImages={optimisticImages} 
                        handleImageUpload={handleImageUpload} 
                    />
                )}

                {activeTab === 'stats' && (
                    <StatsTab summary={extendedSummary} stats={stats} revenueTrend={revenueTrend} memberStatusDist={memberStatusDist} />
                )}

                {activeTab === 'notices' && (
                    <NoticesTab notices={notices} setShowNoticeModal={setShowNoticeModal} refreshData={refreshData} />
                )}

                {activeTab === 'logs' && (
                    <LogsTab
                        todayClasses={todayClasses}
                        logs={logs}
                        currentLogPage={currentLogPage}
                        setCurrentLogPage={setCurrentLogPage}
                        members={members}
                        onMemberClick={handleOpenEdit}
                        summary={extendedSummary}
                    />
                )}

                {activeTab === 'data_migration' && config.FEATURES?.ENABLE_DATA_MIGRATION && (
                    <DataMigrationTab />
                )}

                {activeTab === 'kiosk' && (
                    <KioskSettingsTab />
                )}

                {activeTab === 'settings' && (
                    <StudioSettingsTab />
                )}
            </div>


            {/* --- MODALS --- */}
            < MemberAddModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={refreshData} />
            <MemberNoteModal
                isOpen={showNoteModal}
                onClose={() => setShowNoteModal(false)}
                key={selectedMember?.id || 'note-modal-empty'}
                member={selectedMember && members.find(m => m.id === selectedMember.id) || selectedMember}
                onSuccess={refreshData}
            />
            <NoticeModal isOpen={showNoticeModal} onClose={() => setShowNoticeModal(false)} onSuccess={refreshData} />
            <BulkMessageModal
                isOpen={showBulkMessageModal}
                onClose={() => { setShowBulkMessageModal(false); setBulkMessageInitialText(''); }}
                selectedMemberIds={selectedMemberIds}
                memberCount={selectedMemberIds.length} // [FIX] Pass memberCount
                initialMessage={bulkMessageInitialText}
            />
            <MessageModal isOpen={showMessageModal} onClose={() => setShowMessageModal(false)} member={selectedMember && members.find(m => m.id === selectedMember.id) || selectedMember} />
            <ExtensionModal isOpen={showExtendModal} onClose={() => setShowExtendModal(false)} member={selectedMember && members.find(m => m.id === selectedMember.id) || selectedMember} onSuccess={refreshData} />

            <TimeTableModal isOpen={showTimeModal} onClose={() => setShowTimeModal(false)} images={images} setOptimisticImages={setOptimisticImages} optimisticImages={optimisticImages} />
            <PriceTableModal isOpen={showPriceModal} onClose={() => setShowPriceModal(false)} images={images} setOptimisticImages={setOptimisticImages} optimisticImages={optimisticImages} />
            <InstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />

            {
                showEditModal && selectedMember && (
                    <AdminMemberDetailModal
                        member={members.find(m => m.id === selectedMember.id) || selectedMember}
                        memberLogs={logs.filter(log => log.memberId === selectedMember.id)}
                        onClose={() => setShowEditModal(false)}
                        pricingConfig={pricingConfig}
                        onUpdateMember={handleMemberModalUpdate}
                        onAddSalesRecord={handleAddSalesRecord}
                        pushTokens={pushTokens}
                    />
                )
            }
        </div >
    );
};

const ErrorLogsView = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'error_logs'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        return onSnapshot(q, (snapshot) => {
            setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
    }, []);

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>;

    return (
        <div style={{ padding: '20px', background: '#1a1a1a', borderRadius: '12px', border: '1px solid #333' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#ff4757" /> 시스템 에러/디버그 로그
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {logs.length === 0 && <div style={{ color: '#888' }}>로그가 없습니다.</div>}
                {logs.map(log => (
                    <div key={log.id} style={{ padding: '12px', background: '#222', borderRadius: '8px', borderLeft: '4px solid #ff4757' }}>
                        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>{log.timestamp}</div>
                        <div style={{ fontWeight: 'bold', color: '#eee' }}>{log.message}</div>
                        {log.context && (
                            <pre style={{ margin: '8px 0 0', padding: '8px', background: '#000', borderRadius: '4px', fontSize: '0.75rem', color: '#4cd137', overflowX: 'auto' }}>
                                {JSON.stringify(log.context, null, 2)}
                            </pre>
                        )}
                        {log.stack && (
                            <details style={{ marginTop: '8px' }}>
                                <summary style={{ fontSize: '0.7rem', color: '#888', cursor: 'pointer' }}>Stack Trace</summary>
                                <pre style={{ marginTop: '4px', fontSize: '0.65rem', color: '#ff6b6b', whiteSpace: 'pre-wrap' }}>{log.stack}</pre>
                            </details>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminDashboard;
