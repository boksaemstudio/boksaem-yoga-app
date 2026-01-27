import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/storage';
import { useAdminData } from '../hooks/useAdminData'; // [Refactor]
import { STUDIO_CONFIG } from '../studioConfig';
import { useNavigate } from 'react-router-dom';
import {
    Users, ClockCounterClockwise, Plus, PlusCircle, Image as ImageIcon,
    Calendar, Megaphone, BellRinging, X, Check, Funnel, Trash,
    NotePencil, FloppyDisk, ChatCircleText, PencilLine, CalendarPlus,
    Ticket, Tag, House, SignOut, ChartBar, Export, Gear, FileCsv,
    Info, Warning
} from '@phosphor-icons/react';
import AdminScheduleManager from '../components/AdminScheduleManager';
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
import timeTable1 from '../assets/timetable_gwangheungchang.png';
import timeTable2 from '../assets/timetable_mapo.png';
import priceTable1 from '../assets/price_table_1.png';
import priceTable2 from '../assets/price_table_2.png';

import logo from '../assets/logo.png';
import MembersTab from '../components/admin/tabs/MembersTab';
import StatsTab from '../components/admin/tabs/StatsTab';
import NoticesTab from '../components/admin/tabs/NoticesTab';
import LogsTab from '../components/admin/tabs/LogsTab';
import ErrorLogsTab from '../components/admin/tabs/ErrorLogsTab';

const ColorLegend = ({ branchId }) => {
    const items = [
        { label: '일반', color: '#FFFFFF', border: '#DDDDDD', branches: [STUDIO_CONFIG.BRANCH_IDS.GWANGHEUNGCHANG, STUDIO_CONFIG.BRANCH_IDS.MAPO] },
        {
            label: branchId === STUDIO_CONFIG.BRANCH_IDS.GWANGHEUNGCHANG ? '심화/마이솔' : '심화/마이솔/플라잉',
            color: '#FFCC99',
            border: '#FFB366',
            branches: [STUDIO_CONFIG.BRANCH_IDS.GWANGHEUNGCHANG, STUDIO_CONFIG.BRANCH_IDS.MAPO]
        },
        { label: '키즈', color: '#FFEAA7', border: '#FFD700', branches: [STUDIO_CONFIG.BRANCH_IDS.MAPO] },
        { label: '임산부', color: '#C4FCEF', border: '#81ECEC', branches: [STUDIO_CONFIG.BRANCH_IDS.MAPO] },
        { label: '토요하타', color: '#E056FD', border: '#BE2EDD', branches: [STUDIO_CONFIG.BRANCH_IDS.MAPO] },
    ];

    const filteredItems = branchId
        ? items.filter(item => item.branches.includes(branchId))
        : items;

    return (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {filteredItems.map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color, border: `1px solid ${item.border}` }}></div>
                    <span style={{ fontWeight: '500' }}>{item.label}</span>
                </div>
            ))}
        </div>
    );
};

// [Helper] Robust Date Parsing (Unused locally now, but maybe useful? Linter says delete)
// const parseDate = (dateStr) => { ... }

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
        lastAttDate = new Date(m.lastAttendance);
    } else if (m.attendanceCount > 0) {
        // Fallback: If no lastAttendance field but has count, try to find in loaded logs
        // Note: 'logs' passed here might be limited. 
        // If not found in recent logs, assume it was long ago -> Dormant.
        const lastLog = logs.find(l => l.memberId === m.id);
        if (lastLog) {
            lastAttDate = new Date(lastLog.timestamp || lastLog.date);
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

    const [activeTab, setActiveTab] = useState('members');
    // [Refactor] Use Custom Hook for Data & Logic
    const {
        currentBranch, setCurrentBranch,
        members, sales, logs, notices, stats,
        // aiInsight, loadingInsight,  // Unused
        images, optimisticImages, setOptimisticImages,
        todayClasses, pushTokens, aiUsage,
        pendingApprovals, summary,
        handleApprovePush, handleRejectPush,
        refreshData, isMemberActive, isMemberExpiring,
        // New exports
        revenueTrend, memberStatusDist, getDormantSegments
    } = useAdminData(activeTab, storageService.getCurrentBranch());

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

    // Dynamic Pricing State
    const [pricingConfig, setPricingConfig] = useState(STUDIO_CONFIG.PRICING); // Default fallback

    useEffect(() => {
        const loadPricing = async () => {
            if (activeTab === 'pricing') {
                const data = await storageService.getPricing();
                if (data) setPricingConfig(data);
            }
        };
        loadPricing();
    }, [activeTab]);

    // Editing State
    const [selectedMember, setSelectedMember] = useState(null);
    // const [isSubmitting, setIsSubmitting] = useState(false);  // Unused


    const [scheduleSubTab, setScheduleSubTab] = useState('monthly');
    const [showScheduleSettings, setShowScheduleSettings] = useState(false);




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
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallGuide, setShowInstallGuide] = useState(false);



    // Auth Logout
    const navigate = useNavigate();
    const handleLogout = async () => {
        if (confirm('관리자 모드를 종료하시겠습니까?')) {
            await storageService.logoutAdmin();
            navigate('/login');
        }
    };

    // [OPTIMIZATION] Pre-calculate today's attendees O(M)
    // const todayAttendedMemberIds = useMemo(...) // Unused now

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
                const logDate = new Date(l.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

                if (logDate === todayStr && (currentBranch === 'all' || l.branchId === currentBranch)) {
                    const member = members.find(m => m.id === l.memberId);
                    // Even if member is deleted, show the log if possible (or skip)
                    if (member) {
                        attendanceList.push({
                            ...member,
                            logId: l.id, // Use log ID for unique key if possible
                            // Override member data with specific log data
                            attendanceTime: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            attendanceClass: l.className,
                            instructorName: l.instructor, // Add instructor info
                            originalLog: l
                        });
                    }
                }
            });

            // Sort by attendance time desc
            return attendanceList.sort((a, b) => b.attendanceTime.localeCompare(a.attendanceTime));
        }

        return members.filter(m => {
            if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return false;

            const matchesSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.phone || '').includes(searchTerm);
            if (!matchesSearch) return false;

            if (filterType === 'active') return checkIsActive(m);
            if (filterType === 'registration') return m.regDate === todayStr;
            // if (filterType === 'attendance') handled above
            if (filterType === 'expiring') return checkIsExpiring(m);
            if (filterType === 'dormant') return isMemberDormant(m, logs, isMemberActive);

            return true; // 'all'
        }).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }, [members, logs, searchTerm, filterType, currentBranch, isMemberActive, isMemberExpiring]);

    const dormantCount = useMemo(() => {
        return members.filter(m => {
            if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return false;
            return isMemberDormant(m, logs, isMemberActive);
        }).length;
    }, [members, logs, currentBranch, isMemberActive]);

    const extendedSummary = { ...summary, dormantMembersCount: dormantCount };

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('Admin accepted the install prompt');
                }
                setDeferredPrompt(null);
            });
        } else {
            setShowInstallGuide(true);
        }
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
                    // TODO: setNewNotice is not defined - needs to be added to state
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

    const handleAddSalesRecord = async (salesData) => {
        try {
            await storageService.addSalesRecord(salesData);
            // Refresh sales data
            // const updatedSales = await storageService.getSales();
            // TODO: setSales is not defined - handled by useAdminData hook
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
                    <img src={logo} alt="로고" style={{ height: '20px', filter: 'invert(1) brightness(1.5) drop-shadow(0 0 8px rgba(212,175,55,0.4))' }} />
                    <span style={{ whiteSpace: 'nowrap', fontWeight: '800' }}>관리</span>

                    <button onClick={handleInstallClick} style={{ marginLeft: '6px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--primary-gold)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }} title="홈 화면에 추가">
                        <PlusCircle size={18} weight="bold" />
                        <span className="hide-mobile">홈추가</span>
                    </button>
                    <button onClick={handleLogout} style={{ marginLeft: '4px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }} title="로그아웃">
                        <SignOut size={18} />
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {/* [RESTORED] AI Status Indicator */}
                    <div style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(212, 175, 55, 0.1)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        color: 'var(--primary-gold)',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <span>✨ AI 분석</span>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4CD964', boxShadow: '0 0 5px #4CD964' }}></span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.8, marginLeft: '4px', paddingLeft: '4px', borderLeft: '1px solid rgba(212,175,55,0.3)' }}>
                            {aiUsage.count}/{aiUsage.limit}
                        </span>
                    </div>

                    <button
                        onClick={handleSubscribePush}
                        className={`action-btn sm ${pushEnabled ? 'primary' : ''}`}
                        style={{
                            padding: '6px 8px',
                            minWidth: '60px',
                            background: pushEnabled ? 'var(--primary-gold)' : 'rgba(255,255,255,0.05)',
                            color: pushEnabled ? 'black' : 'var(--text-secondary)',
                            fontWeight: 'bold',
                            fontSize: '0.7rem',
                            border: 'none',
                            borderRadius: '6px'
                        }}
                    >
                        {pushEnabled ? '알림ON' : '알림OFF'}
                    </button>
                    <select
                        className="styled-select"
                        value={currentBranch}
                        onChange={handleBranchChange}
                        style={{ padding: '6px 8px', fontSize: '0.75rem', borderRadius: '6px', width: 'auto', minWidth: '70px', height: '32px' }}
                    >
                        <option value="all">전체</option>
                        {STUDIO_CONFIG.BRANCHES.map(b => (
                            <option key={b.id} value={b.id}>{b.name.replace('점', '')}</option>
                        ))}
                    </select>
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
                <button onClick={() => setActiveTab('error_logs')} className={`nav-tab-item ${activeTab === 'error_logs' ? 'active' : ''}`}>
                    <Warning size={22} weight={activeTab === 'error_logs' ? "fill" : "regular"} color="#F43F5E" />
                    <span>에러로그</span>
                </button>
            </nav>

            {/* Main Content Area */}
            <div>
                {activeTab === 'push_history' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* [NEW] AI Approval Pending Section */}
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

                        <div className="dashboard-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                    <ClockCounterClockwise size={20} /> 알림 발송 기록
                                </h3>
                                <button className="action-btn sm" style={{ flex: 'none', width: 'auto' }} onClick={() => refreshData()}>새로고침</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {storageService.getPushHistory().length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                        발송 기록이 없습니다.
                                    </div>
                                ) : (
                                    storageService.getPushHistory().map((item, idx) => {
                                        const member = item.memberId ? members.find(m => m.id === item.memberId) : null;
                                        const status = item.pushStatus || {};
                                        return (
                                            <div key={idx} style={{
                                                padding: '16px',
                                                borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.65rem',
                                                            background: item.type === 'notice' ? 'rgba(0,122,255,0.2)' : 'rgba(212,175,55,0.2)',
                                                            color: item.type === 'notice' ? '#007AFF' : 'var(--primary-gold)',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {item.type === 'notice' ? '공지사항' : '개별메시지'}
                                                        </span>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                            {item.type === 'notice' ? item.title : (member ? `${member.name}님께` : '회원 알림')}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                        {item.timestamp ? new Date(item.timestamp).toLocaleString('ko-KR') : item.date}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '4px 0' }}>
                                                    {item.content || item.body}
                                                </p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem' }}>
                                                        {status.sent ? (
                                                            <>
                                                                <span style={{ color: '#4CD964' }}>✅ 발송완료</span>
                                                                <span style={{ color: 'var(--text-secondary)' }}>성공: {status.successCount || 0}</span>
                                                                {status.failureCount > 0 && (
                                                                    <span style={{ color: '#FF3B30' }}>실패: {status.failureCount}</span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-tertiary)' }}>⏳ 발송 대기 중...</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
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
                                    <img src={images.price_table_1 || priceTable1} alt="가격표 1" style={{ width: '100%', borderRadius: '12px', marginBottom: '15px' }} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'price_table_1')} style={{ display: 'none' }} id="up-price-1" />
                                        <label htmlFor="up-price-1" className="action-btn sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.7rem', border: 'none' }}>가격표 변경</label>
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '15px' }}>일반</h3>
                                    <img src={images.price_table_2 || priceTable2} alt="가격표 2" style={{ width: '100%', borderRadius: '12px', marginBottom: '15px' }} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'price_table_2')} style={{ display: 'none' }} id="up-price-2" />
                                        <label htmlFor="up-price-2" className="action-btn sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.7rem', border: 'none' }}>가격표 변경</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'members' && (
                    <MembersTab
                        members={members}
                        filteredMembers={filteredMembers}
                        summary={extendedSummary}
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
                        getDormantSegments={getDormantSegments} // [New]
                    />
                )}

                {activeTab === 'schedule' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Settings Button - Only visible in Monthly view where the Schedule Manager is active */}
                        {scheduleSubTab === 'monthly' && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowScheduleSettings(!showScheduleSettings)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Gear size={18} /> 설정
                                </button>
                            </div>
                        )}

                        {/* Sub-tabs for Schedule */}
                        <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '12px' }}>
                            <button
                                onClick={() => setScheduleSubTab('monthly')}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: scheduleSubTab === 'monthly' ? 'var(--primary-gold)' : 'transparent', color: scheduleSubTab === 'monthly' ? 'black' : 'white', fontWeight: 'bold' }}
                            >월간 시간표</button>
                            <button
                                onClick={() => setScheduleSubTab('weekly')}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: scheduleSubTab === 'weekly' ? 'var(--primary-gold)' : 'transparent', color: scheduleSubTab === 'weekly' ? 'black' : 'white', fontWeight: 'bold' }}
                            >주간 시간표</button>
                        </div>

                        {scheduleSubTab === 'monthly' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                {STUDIO_CONFIG.BRANCHES.map((branch, index) => (
                                    <div key={branch.id} className="dashboard-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: 'var(--primary-gold)', letterSpacing: '-0.05em' }}>{branch.name}</h3>
                                        </div>
                                        <AdminScheduleManager
                                            branchId={branch.id}
                                            showSettings={index === 0 && showScheduleSettings}
                                            onShowSettings={() => setShowScheduleSettings(false)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="dashboard-card">
                                <h3 className="card-label" style={{ marginBottom: '20px' }}>주간 시간표 (이미지)</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                    {STUDIO_CONFIG.BRANCHES.map(branch => {
                                        const now = new Date();
                                        const curYear = now.getFullYear();
                                        const curMonth = (now.getMonth() + 1).toString().padStart(2, '0');
                                        const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                                        const nextYear = nextDate.getFullYear();
                                        const nextMonth = (nextDate.getMonth() + 1).toString().padStart(2, '0');

                                        const curKey = `timetable_${branch.id}_${curYear}-${curMonth}`;
                                        const nextKey = `timetable_${branch.id}_${nextYear}-${nextMonth}`;
                                        // Legacy fallback
                                        // If specific month image not set, try generic fallback? No, let's keep it specific or use legacy as fallback for current only.
                                        const curImage = images[curKey] || images[`timetable_${branch.id}`] || (branch.id === 'gwangheungchang' ? timeTable1 : timeTable2);
                                        const nextImage = images[nextKey];

                                        return (
                                            <div key={branch.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                <h3 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0 0 20px 0' }}>{branch.name}</h3>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                    {/* Current Month */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        <h4 style={{ margin: 0, color: 'var(--primary-gold)' }}>{curMonth}월 (현재)</h4>
                                                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                            {(optimisticImages[curKey] || curImage) ? (
                                                                <img src={optimisticImages[curKey] || curImage} alt="Current" style={{ width: '100%', display: 'block' }} />
                                                            ) : (
                                                                <span style={{ color: 'var(--text-secondary)' }}>이미지 없음</span>
                                                            )}
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, curKey)} style={{ display: 'none' }} id={`up-cur-${branch.id}`} />
                                                            <label htmlFor={`up-cur-${branch.id}`} className="action-btn sm" style={{ display: 'inline-block', padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', cursor: 'pointer' }}>이미지 변경</label>
                                                        </div>
                                                    </div>

                                                    {/* Next Month */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        <h4 style={{ margin: 0, color: '#a1a1aa' }}>{nextMonth}월 (다음달)</h4>
                                                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                            {(optimisticImages[nextKey] || nextImage) ? (
                                                                <img src={optimisticImages[nextKey] || nextImage} alt="Next" style={{ width: '100%', display: 'block' }} />
                                                            ) : (
                                                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                                    <p>등록된 이미지가 없습니다.</p>
                                                                    <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>미등록 시 현재 월 이미지가<br />계속 표시될 수 있습니다.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, nextKey)} style={{ display: 'none' }} id={`up-next-${branch.id}`} />
                                                            <label htmlFor={`up-next-${branch.id}`} className="action-btn sm" style={{ display: 'inline-block', padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', cursor: 'pointer' }}>이미지 등록/변경</label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}



                {activeTab === 'stats' && (
                    <StatsTab stats={stats} revenueTrend={revenueTrend} memberStatusDist={memberStatusDist} />
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
                    />
                )}
                {activeTab === 'error_logs' && (
                    <ErrorLogsTab />
                )}
                {/* Legacy Logs Content (Hidden) */}
                {/* Legacy Logs Content Removed */}
            </div>


            {/* --- MODALS --- */}
            <MemberAddModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={refreshData} />
            <MemberNoteModal
                isOpen={showNoteModal}
                onClose={() => setShowNoteModal(false)}
                key={selectedMember?.id || 'note-modal-empty'}
                member={selectedMember && members.find(m => m.id === selectedMember.id) || selectedMember}
                onSuccess={refreshData}
            />
            <NoticeModal isOpen={showNoticeModal} onClose={() => setShowNoticeModal(false)} onSuccess={refreshData} />
            <BulkMessageModal isOpen={showBulkMessageModal} onClose={() => setShowBulkMessageModal(false)} selectedMemberIds={selectedMemberIds} />
            <MessageModal isOpen={showMessageModal} onClose={() => setShowMessageModal(false)} member={selectedMember && members.find(m => m.id === selectedMember.id) || selectedMember} />
            <ExtensionModal isOpen={showExtendModal} onClose={() => setShowExtendModal(false)} member={selectedMember && members.find(m => m.id === selectedMember.id) || selectedMember} onSuccess={refreshData} />

            <TimeTableModal isOpen={showTimeModal} onClose={() => setShowTimeModal(false)} images={images} setOptimisticImages={setOptimisticImages} optimisticImages={optimisticImages} />
            <PriceTableModal isOpen={showPriceModal} onClose={() => setShowPriceModal(false)} images={images} setOptimisticImages={setOptimisticImages} optimisticImages={optimisticImages} />
            <InstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />

            {showEditModal && selectedMember && (
                <AdminMemberDetailModal
                    member={members.find(m => m.id === selectedMember.id) || selectedMember}
                    memberLogs={logs.filter(log => log.memberId === selectedMember.id)}
                    onClose={() => setShowEditModal(false)}
                    pricingConfig={pricingConfig}
                    onUpdateMember={handleMemberModalUpdate}
                    onAddSalesRecord={handleAddSalesRecord}
                    pushTokens={pushTokens}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
