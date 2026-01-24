import React, { useState, useEffect, useMemo } from 'react';
import { storageService } from '../services/storage';
import { STUDIO_CONFIG, getBranchName } from '../studioConfig';
import { useNavigate } from 'react-router-dom';
import { Users, ClockCounterClockwise, Plus, PlusCircle, Image as ImageIcon, Calendar, Megaphone, BellRinging, X, Check, Funnel, Trash, NotePencil, FloppyDisk, ChatCircleText, PencilLine, CalendarPlus, Ticket, Tag, House, SignOut, ChartBar, Export, Gear, FileCsv, Info } from '@phosphor-icons/react';
import AdminScheduleManager from '../components/AdminScheduleManager';
import AdminRevenue from '../components/AdminRevenue';
import AdminPriceManager from '../components/AdminPriceManager';
import AdminMemberDetailModal from '../components/AdminMemberDetailModal';
import timeTable1 from '../assets/timetable_gwangheungchang.png';
import timeTable2 from '../assets/timetable_mapo.png';
import priceTable1 from '../assets/price_table_1.png';
import priceTable2 from '../assets/price_table_2.png';
import logo from '../assets/logo.png';

const ColorLegend = ({ branchId }) => {
    const items = [
        { label: '일반', color: '#FFFFFF', border: '#DDDDDD', branches: ['gwangheungchang', 'mapo'] },
        {
            label: branchId === 'gwangheungchang' ? '심화/마이솔' : '심화/마이솔/플라잉',
            color: '#FFCC99',
            border: '#FFB366',
            branches: ['gwangheungchang', 'mapo']
        },
        { label: '키즈', color: '#FFEAA7', border: '#FFD700', branches: ['mapo'] },
        { label: '임산부', color: '#C4FCEF', border: '#81ECEC', branches: ['mapo'] },
        { label: '토요하타', color: '#E056FD', border: '#BE2EDD', branches: ['mapo'] },
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

// [Helper] Robust Date Parsing
const parseDate = (dateStr) => {
    if (!dateStr) return null;
    // Handle "yyyy.mm.dd", "yyyy-mm-dd", "yyyy/mm/dd"
    const standardStr = dateStr.replace(/\./g, '-').replace(/\//g, '-');
    const date = new Date(standardStr);
    return isNaN(date.getTime()) ? null : date;
};

// [Helper] Standardized Filter Logic (External to ensure consistent behavior)
const isMemberActive = (m) => {
    // Treat 0 or "0" as 0. Treat empty/null as invalid.
    const credits = Number(m.credits || 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Comparison at start of day

    // Case 1: Unlimited Date (No End Date) - Usually implies subscription
    if (!m.endDate) {
        return credits > 0;
    }

    // Case 2: Has End Date
    const endDate = parseDate(m.endDate);

    // If date is invalid, logic:
    // User complaint "Active 0" implies valid members are being dropped.
    // If parseDate fails, it returns null.
    if (!endDate) return false;

    endDate.setHours(0, 0, 0, 0);

    // Check if future/today AND credits >= 0
    return endDate >= today && credits >= 0;
};

const isMemberExpiring = (m) => {
    const endDateObj = parseDate(m.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /* [USER FEEDBACK] Remove 'Too Old' filter so all inactive members show up in Expiring box
    if (endDateObj) {
        const twoMonthsAgo = new Date(today);
        twoMonthsAgo.setMonth(today.getMonth() - 2);
        if (endDateObj < twoMonthsAgo) return false;
    }
    */

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const isExpiringSoon = endDateObj && endDateObj >= today && endDateObj <= nextWeek;
    const isExpired = endDateObj && endDateObj < today;
    const noCredits = Number(m.credits || 0) <= 0;

    return isExpiringSoon || isExpired || noCredits;
};

const AdminDashboard = () => {

    const [activeTab, setActiveTab] = useState('members');
    const [members, setMembers] = useState([]);
    const [sales, setSales] = useState([]);
    const [logs, setLogs] = useState([]);
    const [notices, setNotices] = useState([]);
    const [stats, setStats] = useState({ byTime: [], bySubject: [] });
    const [aiInsight, setAiInsight] = useState(null);
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [currentBranch, setCurrentBranch] = useState(() => storageService.getCurrentBranch());
    const [images, setImages] = useState({});
    const [optimisticImages, setOptimisticImages] = useState({}); // [FIX] Local override for immediate UI updates
    const [todayClasses, setTodayClasses] = useState([]);

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
            const data = await storageService.getPricing();
            if (data) setPricingConfig(data);
        };
        loadPricing();
    }, [activeTab]); // Reload when tab changes (especially returning from pricing tab)

    // Editing State
    const [selectedMember, setSelectedMember] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [messageText, setMessageText] = useState('');
    const [newNotice, setNewNotice] = useState({ title: '', content: '', image: null });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scheduleSubTab, setScheduleSubTab] = useState('monthly');
    const [showScheduleSettings, setShowScheduleSettings] = useState(false);


    // New Member State
    const [newMember, setNewMember] = useState({
        name: '', phone: '010', branch: STUDIO_CONFIG.BRANCHES[0].id,
        membershipType: 'general',
        selectedOption: '',
        duration: 1,
        paymentMethod: 'card',
        credits: 0,
        amount: 0,
        regDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
        startDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
        endDate: '',
        subject: ''
    });

    // Extension State
    const [extendDuration, setExtendDuration] = useState(1);
    const [extendPayment, setExtendPayment] = useState('card');

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [summary, setSummary] = useState({
        totalMembers: 0,
        activeMembers: 0,
        todayAttendance: 0,
        todayRegistration: 0,
        totalRevenueToday: 0,
        monthlyRevenue: 0,
        expiringMembersCount: 0
    });
    const [filterType, setFilterType] = useState('all');
    const [selectedMemberIds, setSelectedMemberIds] = useState([]);
    const [bulkMessageText, setBulkMessageText] = useState('');
    const [pushEnabled, setPushEnabled] = useState(() => {
        const saved = localStorage.getItem('admin_push_enabled');
        return saved === 'true' && Notification.permission === 'granted';
    });
    const [currentLogPage, setCurrentLogPage] = useState(1);
    const [pushTokens, setPushTokens] = useState([]);
    const [sendPush] = useState(true);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallGuide, setShowInstallGuide] = useState(false);

    // [NEW] AI Push Approval State
    const [pendingApprovals, setPendingApprovals] = useState([]);

    useEffect(() => {
        const unsubscribe = storageService.getPendingApprovals((items) => {
            setPendingApprovals(items);
        });
        return () => unsubscribe && unsubscribe();
    }, []);

    const handleApprovePush = async (id, title) => {
        if (confirm(`'${title}' 메시지 발송을 승인하시겠습니까?`)) {
            try {
                await storageService.approvePush(id);
                // No need to alert, list update handles visual feedback
            } catch (e) {
                alert("승인 처리 중 오류 발생: " + e.message);
            }
        }
    };

    const handleRejectPush = async (id) => {
        if (confirm("이 발송 건을 삭제(거절)하시겠습니까?")) {
            try {
                await storageService.rejectPush(id);
            } catch (e) {
                alert("삭제 처리 중 오류 발생: " + e.message);
            }
        }
    };

    // Auth Logout
    const navigate = useNavigate();
    const handleLogout = async () => {
        if (confirm('관리자 모드를 종료하시겠습니까?')) {
            await storageService.logoutAdmin();
            navigate('/login');
        }
    };

    // [OPTIMIZATION] Pre-calculate today's attendees O(M)
    const todayAttendedMemberIds = useMemo(() => {
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const ids = new Set();
        logs.forEach(l => {
            if (!l.timestamp) return;
            const logDate = new Date(l.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            if (logDate === todayStr && (currentBranch === 'all' || l.branchId === currentBranch)) {
                ids.add(l.memberId);
            }
        });
        return ids;
    }, [logs, currentBranch]);

    // 필터링된 멤버 목록을 메모이제이션하여 성능 최적화
    const filteredMembers = useMemo(() => {
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const todayObj = new Date(todayStr);

        // Helper logic duplicated from refreshData for consistency
        // [FIX] Use shared logic to ensure consistency with stats
        const checkIsActive = (m) => isMemberActive(m);
        const checkIsExpiring = (m) => isMemberExpiring(m);

        return members.filter(m => {
            if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return false;

            const matchesSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.phone || '').includes(searchTerm);
            if (!matchesSearch) return false;

            if (filterType === 'active') return checkIsActive(m);
            if (filterType === 'registration') return m.regDate === todayStr;
            if (filterType === 'attendance') return todayAttendedMemberIds.has(m.id);
            if (filterType === 'expiring') return checkIsExpiring(m);

            return true; // 'all'
        }).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }, [members, searchTerm, filterType, currentBranch, todayAttendedMemberIds]);

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

    // [Smart Calculation Logic for New Member]
    const { calculatedPrice, calculatedCredits, calculatedEndDate, calculatedProductName } = useMemo(() => {
        if (!showAddModal) return { calculatedPrice: 0, calculatedCredits: 0, calculatedEndDate: '', calculatedProductName: '' };

        const { membershipType, selectedOption, duration, paymentMethod, startDate } = newMember;
        const category = pricingConfig[membershipType];

        if (!category) return { calculatedPrice: 0, calculatedCredits: 0, calculatedEndDate: '', calculatedProductName: '' };

        const option = category.options.find(opt => opt.id === selectedOption);
        if (!option) return { calculatedPrice: 0, calculatedCredits: 0, calculatedEndDate: '', calculatedProductName: '' };

        let p = 0;
        let c = 0;
        let months = duration;
        let label = option.label;

        // Price Calculation with Cash Price support
        if (paymentMethod === 'cash' && option.cashPrice) {
            p = option.cashPrice;
        } else {
            if (option.type === 'ticket') {
                p = option.basePrice;
                c = option.credits;
                months = option.months || 3;
            } else {
                c = option.credits === 9999 ? 9999 : option.credits * duration;
                if (duration === 1) p = option.basePrice;
                else if (duration === 3) p = option.discount3 || (option.basePrice * 3);
                else if (duration === 6) p = option.discount6 || (option.basePrice * 6);
                else p = option.basePrice * duration;
            }

            if (paymentMethod === 'cash' && duration >= 3 && p > 0 && !option.cashPrice) {
                p = Math.round(p * 0.95);
            }
        }

        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + months);
        end.setDate(end.getDate() - 1);

        return {
            calculatedPrice: p,
            calculatedCredits: c,
            calculatedEndDate: end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
            calculatedProductName: `${label} ${duration > 1 && option.type !== 'ticket' ? `(${duration}개월)` : ''}`
        };
    }, [newMember, pricingConfig, showAddModal]);

    // Sync newMember state with calculated values
    useEffect(() => {
        if (!showAddModal) return;
        setNewMember(prev => ({
            ...prev,
            amount: calculatedPrice,
            credits: calculatedCredits,
            endDate: calculatedEndDate,
            subject: calculatedProductName
        }));
    }, [calculatedPrice, calculatedCredits, calculatedEndDate, calculatedProductName, showAddModal]);

    // Reset membership type when branch changes in Add Modal
    useEffect(() => {
        const availableTypes = Object.keys(pricingConfig).filter(key => {
            const config = pricingConfig[key];
            return !config.branches || config.branches.includes(newMember.branch);
        });

        if (!availableTypes.includes(newMember.membershipType)) {
            // Find first valid option or default
            const firstValid = availableTypes[0] || 'general';
            const firstOption = pricingConfig[firstValid]?.options[0]?.id || '';

            setNewMember(prev => ({
                ...prev,
                membershipType: firstValid,
                selectedOption: firstOption
            }));
        }
    }, [newMember.branch, newMember.membershipType, showAddModal, pricingConfig]);

    const handleAddMember = async () => {
        if (!newMember.name || !newMember.phone) {
            alert('이름과 전화번호는 필수입니다.');
            return;
        }
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await storageService.addMember({
                name: newMember.name,
                phone: newMember.phone,
                credits: newMember.credits,
                homeBranch: newMember.branch,
                subject: newMember.subject,
                amount: newMember.amount,
                membershipType: newMember.membershipType,
                regDate: newMember.regDate,
                startDate: newMember.startDate,
                endDate: newMember.endDate,
                notes: '' // Initialize notes
            });

            // [FIX] Create Sales Record for New Registration
            if (newMember.amount > 0) {
                await storageService.addSalesRecord({
                    memberId: res.id, // Use the returned ID
                    memberName: newMember.name,
                    type: 'register',
                    item: newMember.subject,
                    amount: newMember.amount,
                    paymentMethod: newMember.paymentMethod,
                    date: new Date().toISOString(),
                    branchId: newMember.branch
                });
            }

            setShowAddModal(false);
            refreshData();
            setNewMember({
                name: '', phone: '', branch: STUDIO_CONFIG.BRANCHES[0].id,
                membershipType: 'general',
                selectedOption: pricingConfig['general']?.options[0]?.id || '',
                duration: 1,
                paymentMethod: 'card',
                credits: 0, amount: 0, regDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
                startDate: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }), endDate: '', subject: ''
            });
        } catch (err) {
            console.error('Error adding member:', err);
            alert('회원 등록 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        refreshData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, currentBranch]);

    useEffect(() => {
        const unsubscribe = storageService.subscribe(() => {
            refreshData();
        });
        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // AI Usage State
    const [aiUsage, setAiUsage] = useState({ count: 0, limit: 2000 });

    const refreshData = async () => {
        // [OPTIMIZATION] Members are now sync via real-time listener (with fallback)
        const currentMembers = await storageService.loadAllMembers();


        const currentLogs = storageService.getAttendance();
        const currentNotices = storageService.getNotices();
        const currentImages = await storageService.getImages();
        try {
            const tokens = await storageService.getAllPushTokens();
            setPushTokens(tokens);
        } catch (err) {
            console.error('Failed to fetch push tokens:', err);
        }

        // Fetch AI Usage
        try {
            const usage = await storageService.getAiUsage();
            setAiUsage(usage);
        } catch (e) {
            console.warn("Failed to fetch AI usage", e);
        }

        const currentSales = await storageService.getSales();

        setMembers(currentMembers);
        setLogs(currentLogs);
        setNotices(currentNotices);
        setImages(currentImages);
        setSales(currentSales);

        const branchLogs = currentBranch === 'all'
            ? currentLogs
            : currentLogs.filter(l => l.branchId === currentBranch);
        calculateStats(branchLogs, currentMembers);

        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const today = new Date(todayStr); // Keep Date object for other comparisons
        const currentMonth = todayStr.substring(0, 7);

        const isMemberInBranch = (m) => currentBranch === 'all' || m.homeBranch === currentBranch;

        // [FIX] Build attended member IDs for today
        const attendedMemberIds = new Set();
        branchLogs.forEach(l => {
            if (!l.timestamp) return;
            const logDate = new Date(l.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            if (logDate === todayStr) {
                attendedMemberIds.add(l.memberId);
            }
        });

        // Defined helpers for consistent filtering
        const checkIsAttended = (m) => {
            return attendedMemberIds.has(m.id);
        };

        const checkIsRegistered = (m) => {
            return m.regDate === todayStr;
        };

        // Standardized Count Logic
        const totalMembers = currentMembers.filter(m => isMemberInBranch(m)).length;
        const activeMembers = currentMembers.filter(m => isMemberInBranch(m) && isMemberActive(m)).length;
        const todayAttendance = currentMembers.filter(m => isMemberInBranch(m) && checkIsAttended(m)).length;
        const todayRegistration = currentMembers.filter(m => isMemberInBranch(m) && checkIsRegistered(m)).length;
        const expiringMembersCount = currentMembers.filter(m => isMemberInBranch(m) && isMemberExpiring(m)).length;


        // [FIX] Use robust date parsing for Revenue
        const todayRevenue = currentSales
            .filter(s => {
                if (!s.timestamp) return false;
                const sDate = parseDate(s.timestamp); // Use helper
                if (!sDate) return false;

                // Compare YYYY-MM-DD
                const sDateStr = sDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                return sDateStr === todayStr && (currentBranch === 'all' || s.branchId === currentBranch);
            })
            .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        const monthlyRevenue = currentSales
            .filter(s => {
                if (!s.timestamp) return false;
                const sDate = parseDate(s.timestamp); // Use helper
                if (!sDate) return false;

                const sDateStr = sDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                return sDateStr.startsWith(currentMonth) && (currentBranch === 'all' || s.branchId === currentBranch);
            })
            .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);



        setSummary({
            totalMembers,
            activeMembers,
            todayAttendance,
            todayRegistration,
            totalRevenueToday: todayRevenue,
            monthlyRevenue,
            expiringMembersCount
        });

        // Calculate Today's Classes Summary
        const todayLogs = currentLogs.filter(l => {
            if (!l.timestamp) return false;
            const logDate = new Date(l.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
            return logDate === today && (currentBranch === 'all' || l.branchId === currentBranch);
        });

        const classGroups = {};
        todayLogs.forEach(log => {
            const key = `${log.className || '일반'}-${log.instructor || '선생님'}-${log.branchId}`;
            if (!classGroups[key]) {
                classGroups[key] = {
                    className: log.className || '일반',
                    instructor: log.instructor || '선생님',
                    branchId: log.branchId,
                    count: 0
                };
            }
            classGroups[key].count++;
        });
        setTodayClasses(Object.values(classGroups).sort((a, b) => {
            if (a.branchId !== b.branchId) {
                return a.branchId.localeCompare(b.branchId);
            }
            return b.count - a.count;
        }));

        // AI Insight Load (Admin Context - Factual)
        if (activeTab === 'members') {
            loadAIInsight(currentMembers, branchLogs);
        }
    };

    const loadAIInsight = async (members, logs) => {
        if (loadingInsight) return;
        setLoadingInsight(true);
        try {
            const statsData = {
                activeCount: summary.activeMembers,
                attendanceToday: summary.todayAttendance,
                expiringCount: summary.expiringMembersCount,
                topClasses: todayClasses.slice(0, 3)
            };
            // [GENIUS OPTIMIZATION] Add timeout to AI call to prevent infinite loading
            const aiPromise = storageService.getAIAnalysis(
                "Administrator",
                logs.length,
                logs,
                new Date().getHours(),
                'ko',
                'admin',
                statsData,
                'admin'
            );

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("AI Analysis Timeout")), 8000)
            );

            const insight = await Promise.race([aiPromise, timeoutPromise]);
            if (insight) setAiInsight(insight);
        } catch (err) {
            console.warn("[AI] Admin Insight failed or timed out. Using fallback summary.", err);
            // Fallback: Generate a factual summary immediately if AI fails
            const fallbackMsg = `현재 ${summary.activeMembers}명의 회원이 활동 중이며, 오늘 ${summary.todayAttendance}명이 출석했습니다. ${summary.expiringMembersCount > 0 ? `${summary.expiringMembersCount}명의 회원이 만료 예정입니다. ` : ''}안정적인 센터 운영이 이어지고 있습니다.`;
            setAiInsight({ message: fallbackMsg, isFallback: true });
        } finally {
            setLoadingInsight(false);
        }
    };

    const calculateStats = (logs) => {
        const timeCount = {};
        logs.forEach(log => {
            const hour = new Date(log.timestamp).getHours();
            const key = `${hour}:00`;
            timeCount[key] = (timeCount[key] || 0) + 1;
        });

        const sortedTime = Object.entries(timeCount).sort((a, b) => b[1] - a[1]);

        const subjectCount = {};
        logs.forEach(log => {
            if (log.subject) {
                subjectCount[log.subject] = (subjectCount[log.subject] || 0) + 1;
            }
        });
        const sortedSubject = Object.entries(subjectCount).sort((a, b) => b[1] - a[1]);

        setStats({ byTime: sortedTime, bySubject: sortedSubject });
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

                // Compress to JPEG with 0.5 quality (Reduced from 0.7 to be safer for Firestore 1MB limit)
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);

                if (target === 'notice') {
                    setNewNotice({ ...newNotice, image: compressedBase64 });
                } else {
                    try {
                        console.log(`[Admin] Uploading image for ${target}...`);
                        // [FIX] Set optimistic state IMMEDIATELY and persist it in this component
                        setOptimisticImages(prev => ({ ...prev, [target]: compressedBase64 }));

                        await storageService.updateImage(target, compressedBase64);
                        console.log(`[Admin] Upload success for ${target}`);
                        // Redundant but safe: update main images state too
                        setImages(prev => ({ ...prev, [target]: compressedBase64 }));
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

    const handleCreateNotice = async () => {
        if (!newNotice.title || !newNotice.content) return;
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await storageService.addNotice(newNotice.title, newNotice.content, newNotice.image);
            setNewNotice({ title: '', content: '', image: null });
            setShowNoticeModal(false);
            refreshData();
            alert('공지사항이 등록되었습니다.');
        } catch (err) {
            console.error('Error creating notice:', err);
            alert('공지사항 등록 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };



    const handleSaveNote = async () => {
        if (!selectedMember) return;
        await storageService.updateMember(selectedMember.id, { notes: noteText });
        refreshData();
        setShowNoteModal(false);
    };

    const handleSendMessage = async () => {
        if (!messageText) return;
        await storageService.addMessage(selectedMember.id, messageText);
        alert(`${selectedMember.name}님에게 메시지를 전송했습니다.`);
        setMessageText('');
        setShowMessageModal(false);
    };

    const handleOpenEdit = (member) => {
        setSelectedMember(member);
        setNewMember({
            ...member,
            branch: member.homeBranch,
            notes: member.notes || ''
        });
        setShowEditModal(true);
    };

    const handleAddSalesRecord = async (salesData) => {
        try {
            await storageService.addSalesRecord(salesData);
            // Refresh sales data
            const updatedSales = await storageService.getSales();
            setSales(updatedSales);
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

    const handleExtendMember = async () => {
        if (!selectedMember || isSubmitting) return;
        setIsSubmitting(true);
        try {
            // Days = duration * 30
            await storageService.extendMember(selectedMember.id, extendDuration * 30, extendPayment);
            setShowExtendModal(false);
            refreshData();
            alert('수강권이 연장되었습니다.');
        } catch (err) {
            console.error('Error extending member:', err);
            alert('연장 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
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

    const handleSendBulkMessage = async () => {
        if (!bulkMessageText.trim()) return alert('내용을 입력하세요.');
        if (selectedMemberIds.length === 0) return alert('대상자를 선택하세요.');

        if (confirm(`${selectedMemberIds.length}명의 회원에게 메시지를 전송할까요?`)) {
            let count = 0;
            for (const id of selectedMemberIds) {
                await storageService.addMessage(id, bulkMessageText);
                count++;
            }

            if (sendPush) {
                await storageService.sendBulkPushCampaign(selectedMemberIds, STUDIO_CONFIG.NAME + " 알림", bulkMessageText);
            }

            let msg = `${count}건의 메시지가 전송되었습니다.`;
            alert(msg);
            setBulkMessageText('');
            setShowBulkMessageModal(false);
            setSelectedMemberIds([]);
        }
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
                <button onClick={() => setActiveTab('push_history')} className={`nav-tab-item ${activeTab === 'push_history' ? 'active' : ''}`}>
                    <BellRinging size={22} weight={activeTab === 'push_history' ? "fill" : "regular"} />
                    <span>알림기록</span>
                </button>
            </nav>

            {/* Main Content Area */}
            <div>
                {activeTab === 'push_history' && (
                    <div className="dashboard-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BellRinging size={20} /> 알림 발송 기록
                            </h3>
                            <button className="action-btn sm" onClick={() => refreshData()}>새로고침</button>
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
                    <>
                        <div style={{ marginBottom: '20px' }}>
                            <button onClick={() => setShowAddModal(true)} className="action-btn primary" style={{ width: '100%', height: '54px', fontSize: '1.2rem', borderRadius: '12px', boxShadow: '0 8px 24px var(--primary-gold-glow)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Plus size={24} weight="bold" /> 신규 회원 등록하기
                            </button>
                        </div>

                        {/* 마이그레이션 파일 업로드 섹션 */}
                        <div style={{ marginBottom: '20px' }}>
                            <input
                                type="file"
                                id="migration-csv-upload"
                                accept=".csv"
                                style={{ display: 'none' }}
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;

                                    if (!window.confirm(`⚠️ 경고: [${file.name}] 파일로 마이그레이션을 진행합니다.\n\n기존 회원 데이터가 모두 삭제되고 선택한 파일의 데이터로 대체됩니다.\n\n계속하시겠습니까?`)) {
                                        e.target.value = '';
                                        return;
                                    }

                                    const progressDiv = document.createElement('div');
                                    progressDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.95); color: white; padding: 30px; border-radius: 16px; z-index: 10000; min-width: 300px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.5);';
                                    progressDiv.innerHTML = '<div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 10px;">마이그레이션 데이터 읽는 중...</div><div id="progress-text" style="color: #D4AF37; margin-top: 10px;">잠시만 기다려주세요...</div>';
                                    document.body.appendChild(progressDiv);

                                    try {
                                        const text = await new Promise((resolve, reject) => {
                                            const reader = new FileReader();
                                            reader.onload = (event) => resolve(event.target.result);
                                            reader.onerror = (error) => reject(error);
                                            reader.readAsText(file);
                                        });

                                        const { runMigration } = await import('../utils/migrator.js');

                                        progressDiv.querySelector('div:first-child').textContent = '마이그레이션 진행 중...';

                                        const result = await runMigration(text, (msg) => {
                                            const progressText = document.getElementById('progress-text');
                                            if (progressText) progressText.textContent = msg;
                                        });

                                        document.body.removeChild(progressDiv);
                                        e.target.value = '';

                                        if (result.success) {
                                            alert(`✅ 마이그레이션 성공!\n\n총 ${result.count}명의 회원이 등록되었습니다.\n페이지를 새로고침합니다.`);
                                            window.location.reload();
                                        } else {
                                            alert(`❌ 마이그레이션 실패:\n${result.error?.message || JSON.stringify(result.error)}`);
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        if (document.body.contains(progressDiv)) document.body.removeChild(progressDiv);
                                        e.target.value = '';
                                        alert('파일 처리 중 오류가 발생했습니다.');
                                    }
                                }}
                            />
                            <label
                                htmlFor="migration-csv-upload"
                                className="action-btn"
                                style={{
                                    width: '100%',
                                    height: '54px',
                                    fontSize: '1.2rem',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    background: '#8E44AD',
                                    color: 'white',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 24px rgba(142, 68, 173, 0.4)',
                                    marginBottom: '0'
                                }}
                            >
                                <FileCsv size={24} weight="bold" /> CSV 파일 선택하여 마이그레이션 실행
                            </label>
                        </div>

                        {/* 구 임시 마이그레이션 버튼 (삭제 대상) */}
                        <div style={{ marginBottom: '20px' }}>
                            <button
                                onClick={async () => {
                                    if (!window.confirm('⚠️ 경고: 기존 회원 데이터가 모두 삭제되고 새로운 CSV 데이터로 대체됩니다.\n\n계속하시겠습니까?')) {
                                        return;
                                    }

                                    const startTime = Date.now();
                                    const progressDiv = document.createElement('div');
                                    progressDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.95); color: white; padding: 30px; border-radius: 16px; z-index: 10000; min-width: 300px; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.5);';
                                    progressDiv.innerHTML = '<div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 10px;">마이그레이션 진행 중...</div><div id="progress-text" style="color: #D4AF37; margin-top: 10px;">시작 중...</div>';
                                    document.body.appendChild(progressDiv);

                                    try {
                                        const { runMigration } = await import('../utils/migrator.js');
                                        const result = await runMigration((msg) => {
                                            const progressText = document.getElementById('progress-text');
                                            if (progressText) progressText.textContent = msg;
                                        });

                                        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

                                        if (result.success) {
                                            progressDiv.innerHTML = `
                                                <div style="font-size: 1.3rem; font-weight: bold; color: #4CAF50; margin-bottom: 15px;">✅ 마이그레이션 완료!</div>
                                                <div style="color: #D4AF37; margin-bottom: 10px;">총 ${result.count}명의 회원이 등록되었습니다.</div>
                                                <div style="color: #888; font-size: 0.9rem;">소요 시간: ${elapsed}초</div>
                                                <button onclick="this.parentElement.remove(); window.location.reload();" style="margin-top: 20px; padding: 12px 24px; background: #D4AF37; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">확인 및 새로고침</button>
                                            `;
                                        } else {
                                            progressDiv.innerHTML = `
                                                <div style="font-size: 1.3rem; font-weight: bold; color: #f44336; margin-bottom: 15px;">❌ 오류 발생</div>
                                                <div style="color: #fff; margin-bottom: 10px;">${result.error?.message || '알 수 없는 오류'}</div>
                                                <button onclick="this.parentElement.remove();" style="margin-top: 20px; padding: 12px 24px; background: #f44336; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">닫기</button>
                                            `;
                                        }
                                    } catch (error) {
                                        progressDiv.innerHTML = `
                                            <div style="font-size: 1.3rem; font-weight: bold; color: #f44336; margin-bottom: 15px;">❌ 오류 발생</div>
                                            <div style="color: #fff; margin-bottom: 10px;">${error.message}</div>
                                            <button onclick="this.parentElement.remove();" style="margin-top: 20px; padding: 12px 24px; background: #f44336; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">닫기</button>
                                        `;
                                    }
                                }}
                                className="action-btn"
                                style={{
                                    display: 'none',
                                    width: '100%',
                                    height: '54px',
                                    fontSize: '1.2rem',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                                }}
                            >
                                🔄 CSV 데이터 마이그레이션 실행
                            </button>
                        </div>


                        {/* AI Automation & Approvals Section */}
                        <div className="dashboard-card" style={{
                            marginBottom: '24px',
                            background: 'rgba(20, 20, 20, 0.6)',
                            border: '1px solid rgba(76, 217, 100, 0.3)',
                            padding: '0'
                        }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ background: '#4CD964', width: '6px', height: '18px', borderRadius: '3px' }}></div>
                                    <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#4CD964', letterSpacing: '0.05em', margin: 0 }}>AI 자동화 승인 센터</h3>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                                    안전장치 작동중 🔒
                                </div>
                            </div>

                            <div style={{ padding: '16px 20px' }}>
                                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                                    AI가 매일 13시에 만료 예정 및 미수강 회원을 자동으로 체크하여 메시지를 작성합니다.<br />
                                    작성된 메시지는 이곳에 보관되며, <strong>원장님이 확인 후 [승인] 버튼을 눌러야만 회원에게 발송</strong>됩니다.
                                </p>

                                {pendingApprovals.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                                        현재 승인 대기 중인 메시지가 없습니다. ✅
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {pendingApprovals.map(item => (
                                            <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '0.8rem', color: '#4CD964', fontWeight: 'bold', background: 'rgba(76, 217, 100, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                        {item.type === 'expiration' ? '만료 예정' : item.type === 'low_credits' ? '수강권 소진' : item.type}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                                        대상: {item.targetMemberIds?.length || 0}명
                                                    </span>
                                                </div>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'white' }}>{item.title}</h4>
                                                <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>{item.body}</p>

                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => handleRejectPush(item.id)} style={{ padding: '6px 12px', background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', border: '1px solid rgba(255, 59, 48, 0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                                        거절(삭제)
                                                    </button>
                                                    <button onClick={() => handleApprovePush(item.id, item.title)} style={{ padding: '6px 12px', background: 'rgba(76, 217, 100, 0.2)', color: '#4CD964', border: '1px solid rgba(76, 217, 100, 0.4)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                        승인(발송)
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Insight Card (Factual - Admin Context) */}
                        <div className="dashboard-card ai-glow" style={{
                            marginBottom: '24px',
                            background: 'rgba(212,175,55,0.05)',
                            border: '1px solid rgba(212,175,55,0.2)',
                            padding: '16px 20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ background: 'var(--primary-gold)', width: '6px', height: '18px', borderRadius: '3px' }}></div>
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary-gold)', letterSpacing: '0.05em' }}>AI 실시간 분석 리포트 (Factual)</h3>
                            </div>
                            {loadingInsight && !aiInsight ? (
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', padding: '10px 0' }}>데이터 분석 중...</div>
                            ) : aiInsight ? (
                                <div style={{
                                    fontSize: '1rem',
                                    lineHeight: '1.6',
                                    color: '#FFFFFF',
                                    fontWeight: '500',
                                    padding: '5px 0'
                                }}>
                                    {aiInsight.message}
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>지점 데이터를 불러오는 중입니다.</div>
                            )}
                        </div>
                        {/* Summary Grid */}
                        <div className="stats-grid">
                            <div className={`dashboard-card interactive ${filterType === 'all' ? 'highlight' : ''}`}
                                onClick={() => handleToggleFilter('all')}>
                                <span className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    전체 회원
                                    <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                                        <Info size={14} style={{ opacity: 0.7 }} />
                                        <span className="tooltip-text">현재 지점에 등록된<br />모든 회원 (삭제/탈퇴 제외)</span>
                                    </div>
                                </span>
                                <span className="card-value">{summary.totalMembers}명</span>
                            </div>
                            <div className={`dashboard-card interactive ${filterType === 'active' ? 'highlight' : ''}`}
                                onClick={() => handleToggleFilter('active')}>
                                <span className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    활성 회원
                                    <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                                        <Info size={14} style={{ opacity: 0.7 }} />
                                        <span className="tooltip-text">잔여 횟수 1회 이상이며<br />만료일이 지나지 않은 회원</span>
                                    </div>
                                </span>
                                <span className="card-value gold">{summary.activeMembers}명</span>
                            </div>
                            <div className={`dashboard-card interactive ${filterType === 'attendance' ? 'highlight' : ''}`}
                                onClick={() => handleToggleFilter('attendance')}>
                                <span className="card-label">오늘 출석</span>
                                <span className="card-value">{summary.todayAttendance}명</span>
                            </div>
                            <div className={`dashboard-card interactive ${filterType === 'registration' ? 'highlight' : ''}`}
                                onClick={() => handleToggleFilter('registration')}>
                                <span className="card-label">오늘 등록</span>
                                <span className="card-value success">{summary.todayRegistration}명</span>
                            </div>
                            <div className={`dashboard-card interactive ${filterType === 'expiring' ? 'highlight' : ''}`}
                                onClick={selectExpiringMembers}
                                style={{ transition: 'all 0.3s ease' }}>
                                <span className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    만료/미수강
                                    <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                                        <Info size={14} style={{ opacity: 0.7 }} />
                                        <span className="tooltip-text" style={{ width: '220px', left: '-100px' }}>
                                            잔여 횟수 0회 또는 만료일 경과<br />
                                            (만료 임박 7일 이내 포함)
                                        </span>
                                    </div>
                                </span>
                                <span className="card-value error">{summary.expiringMembersCount}명</span>
                            </div>
                        </div>

                        {/* Revenue Card (Visual Bar Chart Simulated) */}
                        <div className="dashboard-card" style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                                <div>
                                    <span className="card-label outfit-font" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.7rem' }}>월간 총 매출</span>
                                    <span className="outfit-font" style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary-gold)', textShadow: '0 0 20px var(--primary-gold-glow)' }}>
                                        {summary.monthlyRevenue.toLocaleString()}원
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    오늘: {summary.totalRevenueToday.toLocaleString()}원
                                </div>
                            </div>
                            <div style={{ display: 'flex', height: '10px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ width: '100%', background: 'linear-gradient(90deg, var(--primary-gold-dim), var(--primary-gold))' }}></div>
                            </div>
                        </div>

                        {/* Today's Classes Attendance Summary */}
                        {todayClasses.length > 0 && (
                            <div className="dashboard-card" style={{ marginBottom: '24px', border: '1px solid rgba(212,175,55,0.2)' }}>
                                <h3 className="card-label" style={{ marginBottom: '15px', color: 'var(--primary-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Users size={18} /> 오늘 수업별 출석 현황
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {todayClasses.map((cls, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 'bold' }}>{cls.className}</span>
                                                <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{cls.instructor} 강사님 | {getBranchName(cls.branchId)}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary-gold)' }}>{cls.count}</span>
                                                <span style={{ fontSize: '0.9rem', opacity: 0.5 }}>명</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}



                        {/* Search & Bulk Actions */}
                        <div className="search-row" style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input
                                    className="search-input"
                                    placeholder="🔍 이름 또는 전화번호 검색..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    style={{ margin: 0 }}
                                    lang="ko"
                                    inputMode="search"
                                    spellCheck="false"
                                    autoCorrect="off"
                                />
                            </div>
                            {selectedMemberIds.length > 0 && (
                                <button
                                    onClick={() => setShowBulkMessageModal(true)}
                                    className="action-btn primary"
                                    style={{
                                        width: 'auto',
                                        padding: '0 16px',
                                        height: '42px',
                                        borderRadius: '8px',
                                        animation: 'pulse 2s infinite',
                                        boxShadow: '0 0 15px var(--primary-gold-glow)',
                                        border: '1px solid var(--primary-gold)'
                                    }}
                                >
                                    <ChatCircleText size={20} weight="bold" />
                                    <span style={{ marginLeft: '6px', fontSize: '0.9rem' }}>{selectedMemberIds.length}명 푸시 전송</span>
                                </button>
                            )}
                        </div>


                        {/* List Criteria Display */}
                        <div style={{ padding: '0 4px', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                            현재 <strong style={{ color: 'var(--primary-gold)' }}>
                                {filterType === 'all' && '전체 회원'}
                                {filterType === 'active' && '활성 회원'}
                                {filterType === 'attendance' && '오늘 출석 회원'}
                                {filterType === 'registration' && '오늘 등록 회원'}
                                {filterType === 'expiring' && '만료/미수강 회원'}
                            </strong> 목록을 <strong style={{ color: 'var(--text-secondary)' }}>이름 가나다순</strong>으로 보고 계십니다.
                        </div>

                        {/* Member List */}
                        <div className="card-list">
                            {(() => {
                                const filtered = filteredMembers;

                                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                                const startIndex = (currentPage - 1) * itemsPerPage;
                                const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

                                return (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px 8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            <div onClick={() => selectFilteredMembers(filtered)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{
                                                    width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--border-color)',
                                                    background: filtered.length > 0 && filtered.every(m => selectedMemberIds.includes(m.id)) ? 'var(--primary-gold)' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {filtered.length > 0 && filtered.every(m => selectedMemberIds.includes(m.id)) && <Check size={10} color="#000" weight="bold" />}
                                                </div>
                                                전체 선택 ({filtered.length}명)
                                            </div>
                                            <div>페이지 {currentPage} / {totalPages || 1}</div>
                                        </div>

                                        {paginated.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
                                                검색 결과가 없거나 회원을 등록해주세요.
                                            </div>
                                        ) : (
                                            paginated.map(member => (
                                                <div
                                                    key={member.id}
                                                    className="member-list-item"
                                                    onClick={() => handleOpenEdit(member)}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <div style={{ padding: '0 10px' }} onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedMemberIds.includes(member.id)}
                                                            onChange={() => toggleMemberSelection(member.id)}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1, marginLeft: '10px', width: '100%' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                            <strong style={{ fontWeight: 800, fontSize: '1.1rem' }}>{member.name}</strong>
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{member.phone}</span>
                                                            <span className="badge" style={{ fontSize: '0.7rem' }}>{getBranchName(member.homeBranch)}</span>
                                                            {pushTokens.some(t => t.memberId === member.id) && (
                                                                <BellRinging size={16} weight="fill" color="var(--accent-success)" title="푸시 알림 수신 중" />
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                                            <span>{member.subject || '일반'}</span>
                                                            <span style={{ opacity: 0.3 }}>|</span>
                                                            <span style={{ color: member.credits <= 3 ? 'var(--accent-error)' : 'var(--text-primary)', fontWeight: 'bold' }}>잔여 {member.credits}회</span>
                                                            <span style={{ opacity: 0.3 }}>|</span>
                                                            <span style={{
                                                                background: member.endDate && new Date(member.endDate) < new Date(new Date().setDate(new Date().getDate() + 7)) ? 'rgba(244, 63, 94, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                                                                color: member.endDate && new Date(member.endDate) < new Date(new Date().setDate(new Date().getDate() + 7)) ? 'var(--accent-error)' : 'var(--primary-gold)',
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                fontWeight: 'bold',
                                                                fontSize: '0.85rem'
                                                            }}>
                                                                종료일: {member.endDate || '무제한'}
                                                            </span>
                                                        </div>
                                                        {member.notes && (
                                                            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(212,175,55,0.1)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--primary-gold)' }}>
                                                                <NotePencil size={12} style={{ marginRight: '4px' }} /> {member.notes}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '20px' }}>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                style={{
                                                    width: '32px', height: '32px', borderRadius: '8px',
                                                    background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                                                    color: 'white', opacity: currentPage === 1 ? 0.3 : 1
                                                }}
                                            >
                                                &lt;
                                            </button>

                                            {(() => {
                                                const MAX_VISIBLE_PAGES = 5;
                                                let startPage = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
                                                let endPage = Math.min(totalPages, startPage + MAX_VISIBLE_PAGES - 1);

                                                if (endPage - startPage + 1 < MAX_VISIBLE_PAGES) {
                                                    startPage = Math.max(1, endPage - MAX_VISIBLE_PAGES + 1);
                                                }

                                                const pages = [];
                                                if (startPage > 1) {
                                                    pages.push(1);
                                                    if (startPage > 2) pages.push('...');
                                                }

                                                for (let i = startPage; i <= endPage; i++) {
                                                    pages.push(i);
                                                }

                                                if (endPage < totalPages) {
                                                    if (endPage < totalPages - 1) pages.push('...');
                                                    pages.push(totalPages);
                                                }

                                                return pages.map((page, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => typeof page === 'number' && setCurrentPage(page)}
                                                        disabled={page === '...'}
                                                        style={{
                                                            width: '32px', height: '32px', borderRadius: '8px',
                                                            background: currentPage === page ? 'var(--primary-gold)' : 'var(--bg-surface)',
                                                            color: currentPage === page ? '#000' : 'var(--text-secondary)',
                                                            fontWeight: 'bold', border: '1px solid var(--border-color)',
                                                            cursor: page === '...' ? 'default' : 'pointer',
                                                            opacity: page === '...' ? 0.5 : 1
                                                        }}
                                                    >
                                                        {page}
                                                    </button>
                                                ));
                                            })()}

                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                                style={{
                                                    width: '32px', height: '32px', borderRadius: '8px',
                                                    background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                                                    color: 'white', opacity: currentPage === totalPages ? 0.3 : 1
                                                }}
                                            >
                                                &gt;
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </>
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
                    <>
                        <div className="dashboard-card">
                            <h3 className="card-label">시간대별 이용 현황</h3>
                            <div style={{ marginTop: '10px' }}>
                                {stats.byTime.map(([time, count]) => (
                                    <div key={time} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ width: '60px', color: 'var(--text-secondary)' }}>{time}</span>
                                        <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${(count / Math.max(1, stats.byTime[0]?.[1])) * 100}%`, height: '100%', background: 'var(--primary-gold)' }} />
                                        </div>
                                        <span style={{ width: '40px', textAlign: 'right', fontWeight: 'bold' }}>{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="dashboard-card">
                            <h3 className="card-label">수업별 인기 현황</h3>
                            <div style={{ marginTop: '10px' }}>
                                {stats.bySubject.map(([subject, count]) => (
                                    <div key={subject} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ width: '100px', color: 'var(--text-secondary)' }}>{subject}</span>
                                        <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${(count / Math.max(1, stats.bySubject[0]?.[1])) * 100}%`, height: '100%', background: 'var(--accent-success)' }} />
                                        </div>
                                        <span style={{ width: '40px', textAlign: 'right', fontWeight: 'bold' }}>{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'notices' && (
                    <div className="dashboard-card shadow-lg" style={{ background: 'rgba(25,25,25,0.7)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                                <h3 className="outfit-font" style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>소식 및 공지 관리</h3>
                                <p style={{ margin: '5px 0 0 0', opacity: 0.5, fontSize: '0.85rem' }}>회원용 앱의 메인 화면에 표시되는 공지사항입니다.</p>
                            </div>
                            <button onClick={() => setShowNoticeModal(true)} className="action-btn primary" style={{ width: 'auto', padding: '12px 24px' }}>
                                <Plus size={20} weight="bold" style={{ marginRight: '8px' }} /> 공지 작성하기
                            </button>
                        </div>
                        <div className="card-list">
                            {notices.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
                                    <Megaphone size={48} style={{ marginBottom: '15px' }} />
                                    <p>등록된 공지사항이 없습니다.</p>
                                </div>
                            ) : (
                                notices.map(notice => (
                                    <div key={notice.id} className="glass-panel" style={{
                                        marginBottom: '20px',
                                        padding: '24px',
                                        border: '1px solid rgba(212,175,55,0.2)',
                                        background: 'linear-gradient(145deg, rgba(35,35,35,0.7), rgba(25,25,25,0.8))',
                                        position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-gold)', marginBottom: '4px' }}>
                                                    {notice.title}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                                                    {notice.date || (notice.timestamp ? new Date(notice.timestamp).toLocaleDateString() : '날짜 정보 없음')} 등록
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => { if (confirm('이 공지사항을 삭제하시겠습니까?')) { await storageService.deleteNotice(notice.id); refreshData(); } }}
                                                className="action-btn"
                                                style={{ minWidth: 'auto', padding: '8px', color: 'rgba(255,107,107,0.7)', backgroundColor: 'transparent' }}
                                                title="공지 삭제"
                                            >
                                                <Trash size={20} />
                                            </button>
                                        </div>
                                        <div style={{
                                            fontSize: '1rem',
                                            opacity: 0.9,
                                            lineHeight: 1.7,
                                            whiteSpace: 'pre-wrap',
                                            color: 'var(--text-primary)',
                                            padding: '15px',
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: '8px'
                                        }}>
                                            {notice.image && (
                                                <img src={notice.image} alt="공지 이미지" style={{ width: '100%', borderRadius: '8px', marginBottom: '15px' }} />
                                            )}
                                            {notice.content}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Summary of Today's Classes */}
                        {todayClasses.length > 0 && (
                            <div className="dashboard-card" style={{ border: '1px solid rgba(212,175,55,0.2)' }}>
                                <h3 className="card-label" style={{ marginBottom: '15px', color: 'var(--primary-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ClockCounterClockwise size={18} /> 오늘 수업별 출석 요약
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                    {todayClasses.map((cls, idx) => (
                                        <div key={idx} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{cls.className}</div>
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    background: cls.branchId === 'gwangheungchang' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                                    color: cls.branchId === 'gwangheungchang' ? 'var(--primary-gold)' : 'var(--text-secondary)',
                                                    fontWeight: 'bold',
                                                    border: `1px solid ${cls.branchId === 'gwangheungchang' ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`
                                                }}>
                                                    {getBranchName(cls.branchId)}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '8px' }}>{cls.instructor} 강사님</div>
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                                                <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-gold)', lineHeight: 1 }}>{cls.count}</span>
                                                <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>명 참여</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(() => {
                            const filteredLogs = logs.filter(l => currentBranch === 'all' || l.branchId === currentBranch);
                            const itemsPerLogPage = 20;
                            const totalLogPages = Math.ceil(filteredLogs.length / itemsPerLogPage);
                            const startLogIndex = (currentLogPage - 1) * itemsPerLogPage;
                            const currentLogs = filteredLogs.slice(startLogIndex, startLogIndex + itemsPerLogPage);
                            const todayStr = new Date().toDateString();

                            return (
                                <div className="dashboard-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                        <h3 className="card-label">전체 출석 이력</h3>
                                        <span style={{ color: 'var(--text-secondary)' }}>총 {filteredLogs.length}건</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {currentLogs.length === 0 ? (
                                            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>출석 기록이 없습니다.</div>
                                        ) : (
                                            currentLogs.map(log => {
                                                const member = members.find(m => m.id === log.memberId);
                                                const isToday = new Date(log.timestamp).toDateString() === todayStr;

                                                return (
                                                    <div key={log.id} style={{
                                                        padding: '12px 16px',
                                                        borderBottom: '1px solid var(--border-color)',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        background: isToday ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                                        borderLeft: isToday ? '4px solid var(--primary-gold)' : '4px solid transparent',
                                                        borderRadius: '4px'
                                                    }}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1rem' }}>
                                                                    {log.memberName || (member ? member.name : '알 수 없음')}
                                                                </span>
                                                                {isToday && <span style={{ fontSize: '0.7rem', background: 'var(--primary-gold)', color: 'black', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>TODAY</span>}
                                                            </div>
                                                            <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span>{getBranchName(log.branchId)}</span>
                                                                <span style={{ opacity: 0.3 }}>|</span>
                                                                <span style={{ color: 'var(--primary-gold)' }}>{log.className || (member?.subject) || '일반'}</span>
                                                                {log.instructor && (
                                                                    <>
                                                                        <span style={{ opacity: 0.3 }}>|</span>
                                                                        <span style={{ color: 'var(--accent-success)' }}>{log.instructor} 강사님</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                                                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                {new Date(log.timestamp).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Pagination for Logs */}
                                    {totalLogPages > 1 && (
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '20px' }}>
                                            <button
                                                onClick={() => setCurrentLogPage(p => Math.max(1, p - 1))}
                                                disabled={currentLogPage === 1}
                                                style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'white', opacity: currentLogPage === 1 ? 0.3 : 1 }}
                                            >
                                                &lt;
                                            </button>

                                            {/* Simple Pagination Logic: Show range around current page */}
                                            {(() => {
                                                let start = Math.max(1, currentLogPage - 2);
                                                let end = Math.min(totalLogPages, start + 4);
                                                if (end - start < 4) start = Math.max(1, end - 4);

                                                return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(page => (
                                                    <button key={page} onClick={() => setCurrentLogPage(page)}
                                                        style={{
                                                            width: '32px', height: '32px', borderRadius: '8px',
                                                            background: currentLogPage === page ? 'var(--primary-gold)' : 'var(--bg-surface)',
                                                            color: currentLogPage === page ? '#000' : 'var(--text-secondary)',
                                                            fontWeight: 'bold', border: '1px solid var(--border-color)'
                                                        }}>
                                                        {page}
                                                    </button>
                                                ));
                                            })()}

                                            <button
                                                onClick={() => setCurrentLogPage(p => Math.min(totalLogPages, p + 1))}
                                                disabled={currentLogPage === totalLogPages}
                                                style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'white', opacity: currentLogPage === totalLogPages ? 0.3 : 1 }}
                                            >
                                                &gt;
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* --- MODALS --- */}

            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">회원 등록</h2>
                            <button onClick={() => setShowAddModal(false)}><X size={24} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">이름</label>
                            <input className="form-input" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} lang="ko" inputMode="text" autoComplete="name" spellCheck="false" autoCorrect="off" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">전화번호</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--text-secondary)' }}>010</span>
                                <input
                                    className="form-input"
                                    style={{ flex: 1 }}
                                    placeholder=" 나머지 8자리 숫자만 입력"
                                    maxLength={8}
                                    value={newMember.phone.replace('010', '')}
                                    onChange={(e) => {
                                        const clean = e.target.value.replace(/[^0-9]/g, '');
                                        setNewMember({ ...newMember, phone: '010' + clean });
                                    }}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">지점</label>
                            <select
                                className="form-select"
                                value={newMember.branch}
                                onChange={(e) => {
                                    const nextBranch = e.target.value;
                                    const availableTypes = Object.entries(STUDIO_CONFIG.PRICING).filter(([, v]) =>
                                        !v.branches || v.branches.includes(nextBranch)
                                    );
                                    const nextType = availableTypes[0][0];
                                    const nextOptionId = STUDIO_CONFIG.PRICING[nextType].options[0].id;
                                    setNewMember({
                                        ...newMember,
                                        branch: nextBranch,
                                        membershipType: nextType,
                                        selectedOption: nextOptionId
                                    });
                                }}
                            >
                                {STUDIO_CONFIG.BRANCHES.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">회원권 종류</label>
                            <select
                                className="form-select"
                                value={newMember.membershipType}
                                onChange={e => {
                                    const newType = e.target.value;
                                    const firstOptionId = STUDIO_CONFIG.PRICING[newType].options[0].id;
                                    setNewMember({ ...newMember, membershipType: newType, selectedOption: firstOptionId, duration: 1 });
                                }}
                            >
                                {Object.entries(STUDIO_CONFIG.PRICING)
                                    .filter(([, value]) => !value.branches || value.branches.includes(newMember.branch))
                                    .map(([key, value]) => (
                                        <option key={key} value={key}>{value.label}</option>
                                    ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">세부 옵션</label>
                            <select
                                className="form-select"
                                value={newMember.selectedOption}
                                onChange={e => setNewMember({ ...newMember, selectedOption: e.target.value })}
                            >
                                {STUDIO_CONFIG.PRICING[newMember.membershipType].options.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Show duration selector only for subscriptions (not fixed tickets) if needed, 
                            but based on previous logic, we allow selecting 1/3/6 months for subscriptions. 
                            We check the currently selected option's type. 
                        */}
                        {(() => {
                            const currentOption = STUDIO_CONFIG.PRICING[newMember.membershipType].options.find(o => o.id === newMember.selectedOption);
                            if (currentOption && currentOption.type === 'subscription') {
                                return (
                                    <div className="form-group">
                                        <label className="form-label">등록 기간</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            {[1, 3, 6].map(m => (
                                                <button
                                                    key={m}
                                                    className={`action-btn ${newMember.duration === m ? 'primary' : ''}`}
                                                    style={{ flex: 1, opacity: newMember.duration === m ? 1 : 0.5 }}
                                                    onClick={() => setNewMember({ ...newMember, duration: m })}
                                                >
                                                    {m}개월
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )
                            }
                            return null;
                        })()}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className="form-group">
                                <label className="form-label">등록일</label>
                                <input type="date" className="form-input" value={newMember.regDate} onChange={e => setNewMember({ ...newMember, regDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">수련 시작일</label>
                                <input type="date" className="form-input" value={newMember.startDate} onChange={e => setNewMember({ ...newMember, startDate: e.target.value })} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">결제 방식</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {[
                                    { id: 'card', label: '카드' },
                                    { id: 'cash', label: '현금' }
                                ].map(p => {
                                    // [GENIUS UI] Only show cash button if discount (duration >= 3) applies, 
                                    // or if the member already had cash selected (to avoid breaking UI state)
                                    const pricingInfo = (pricingConfig || STUDIO_CONFIG.PRICING)[newMember.membershipType];
                                    const selectedOpt = pricingInfo?.options?.find(o => o.id === newMember.selectedOption);
                                    const isSubscription = selectedOpt?.type === 'subscription';
                                    const showCash = p.id === 'card' || (isSubscription && newMember.duration >= 3) || !isSubscription;

                                    if (!showCash) return null;

                                    return (
                                        <button
                                            key={p.id}
                                            className={`action-btn ${newMember.paymentMethod === p.id ? 'primary' : ''}`}
                                            style={{ flex: 1, opacity: newMember.paymentMethod === p.id ? 1 : 0.5 }}
                                            onClick={() => setNewMember({ ...newMember, paymentMethod: p.id })}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="form-group" style={{ background: 'rgba(212,175,55,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary-gold)' }}>
                                    {newMember.amount.toLocaleString()}원
                                </div>
                            </div>
                            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '10px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                                <span>{newMember.credits > 200 ? '무제한 수련' : `총 ${newMember.credits}회`}</span>
                                <span style={{ color: 'var(--primary-gold)', fontWeight: 'bold' }}>마감일: {newMember.endDate}</span>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button onClick={() => setShowAddModal(false)} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                            <button onClick={handleAddMember} className="action-btn primary">등록하기</button>
                        </div>
                    </div>
                </div>
            )}

            {showNoteModal && selectedMember && (
                <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{selectedMember.name}님 메모</h2>
                        <textarea
                            className="form-input"
                            style={{ height: '200px', resize: 'none', marginBottom: '20px' }}
                            placeholder="회원에 대한 메모를 입력하세요 (예: 허리 디스크, 오전반 선호 등)"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                        />
                        <div className="modal-actions">
                            <button onClick={() => setShowNoteModal(false)} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                            <button onClick={handleSaveNote} className="action-btn primary">
                                <FloppyDisk size={18} style={{ marginRight: '6px' }} /> 저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showNoticeModal && (
                <div className="modal-overlay" onClick={() => setShowNoticeModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">공지사항 작성</h2>
                            <button onClick={() => setShowNoticeModal(false)}><X size={24} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">제목</label>
                            <input
                                className="form-input"
                                placeholder="예: [안내] 동절기 수업 시간 변경"
                                value={newNotice.title}
                                onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                                lang="ko"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">내용</label>
                            <textarea
                                className="form-input"
                                style={{ height: '200px', resize: 'none' }}
                                placeholder="공지할 내용을 상세히 입력해주세요."
                                value={newNotice.content}
                                onChange={e => setNewNotice({ ...newNotice, content: e.target.value })}
                                lang="ko"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">이미지 첨부 (선택)</label>
                            <input type="file" accept="image/*" className="form-input" onChange={e => handleImageUpload(e, 'notice')} />
                            {newNotice.image && (
                                <div style={{ marginTop: '10px', position: 'relative' }}>
                                    <img src={newNotice.image} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                                    <button onClick={() => setNewNotice({ ...newNotice, image: null })} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', color: 'white', border: 'none', padding: '5px' }}>
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowNoticeModal(false)} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                            <button onClick={handleCreateNotice} className="action-btn primary" disabled={isSubmitting}>
                                {isSubmitting ? '저장 중...' : '등록하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBulkMessageModal && (
                <div className="modal-overlay" onClick={() => setShowBulkMessageModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">단체 메시지 전송</h2>
                        <textarea className="form-input" style={{ height: '120px', resize: 'none', marginBottom: '20px' }}
                            value={bulkMessageText} onChange={e => setBulkMessageText(e.target.value)} />
                        <div className="modal-actions">
                            <button onClick={() => setShowBulkMessageModal(false)} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                            <button onClick={handleSendBulkMessage} className="action-btn primary">전송하기</button>
                        </div>
                    </div>
                </div>
            )}

            {showMessageModal && selectedMember && (
                <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">{selectedMember.name}님에게 메시지 전송</h2>
                        <p style={{ marginBottom: '15px', fontSize: '0.9rem', opacity: 0.7 }}>
                            메시지를 전송하면 해당 회원의 앱으로 푸시 알림이 발송됩니다.
                        </p>
                        <textarea
                            className="form-input"
                            style={{ height: '150px', resize: 'none', marginBottom: '20px' }}
                            placeholder="전송할 내용을 입력하세요..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                        />
                        <div className="modal-actions">
                            <button onClick={() => setShowMessageModal(false)} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                            <button onClick={handleSendMessage} className="action-btn primary">
                                <ChatCircleText size={18} style={{ marginRight: '6px' }} /> 메시지 보내기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showExtendModal && selectedMember && (
                <div className="modal-overlay" onClick={() => setShowExtendModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">수강권 연장</h2>
                            <button onClick={() => setShowExtendModal(false)}><X size={24} /></button>
                        </div>
                        <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>{selectedMember.name} 회원님</div>
                            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                                현재 종료일: {selectedMember.endDate || '정보없음'}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">연장 기간</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                {[1, 3, 6].map(m => (
                                    <button
                                        key={m}
                                        className={`action-btn ${extendDuration === m ? 'primary' : ''}`}
                                        style={{ opacity: extendDuration === m ? 1 : 0.5 }}
                                        onClick={() => setExtendDuration(m)}
                                    >
                                        {m}개월
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">결제 방식</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {['card', 'cash', 'transfer'].map(p => (
                                    <button
                                        key={p}
                                        className={`action-btn ${extendPayment === p ? 'primary' : ''}`}
                                        style={{ flex: 1, opacity: extendPayment === p ? 1 : 0.5 }}
                                        onClick={() => setExtendPayment(p)}
                                    >
                                        {p === 'card' ? '카드' : p === 'cash' ? '현금' : '이체'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button onClick={() => setShowExtendModal(false)} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                            <button onClick={handleExtendMember} className="action-btn primary" disabled={isSubmitting}>
                                {isSubmitting ? '처리 중...' : '연장하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restored Modals for Time and Price View/Management */}
            {showTimeModal && (
                <div className="modal-overlay" onClick={() => setShowTimeModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">시간표 확인 및 관리</h2>
                            <button onClick={() => setShowTimeModal(false)}><X size={24} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h3 style={{ margin: 0 }}>광흥창점 시간표</h3>
                                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'timetable_gwangheungchang')} style={{ display: 'none' }} id="up-time-1" />
                                    <label htmlFor="up-time-1" className="action-btn sm"><Plus size={16} /> 변경</label>
                                </div>
                                <img src={images.timetable_gwangheungchang || timeTable1} alt="광흥창 시간표" style={{ width: '100%', borderRadius: '12px' }} />
                            </div>
                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h3 style={{ margin: 0 }}>마포점 시간표</h3>
                                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'timetable_mapo')} style={{ display: 'none' }} id="up-time-2" />
                                    <label htmlFor="up-time-2" className="action-btn sm"><Plus size={16} /> 변경</label>
                                </div>
                                <img src={images.timetable_mapo || timeTable2} alt="마포 시간표" style={{ width: '100%', borderRadius: '12px' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showPriceModal && (
                <div className="modal-overlay" onClick={() => setShowPriceModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">가격표 확인 및 관리</h2>
                            <button onClick={() => setShowPriceModal(false)}><X size={24} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h3 style={{ margin: 0 }}>가격표 1</h3>
                                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'price_table_1')} style={{ display: 'none' }} id="up-price-1" />
                                    <label htmlFor="up-price-1" className="action-btn sm"><Plus size={16} /> 변경</label>
                                </div>
                                <img src={images.price_table_1 || priceTable1} alt="가격표 1" style={{ width: '100%', borderRadius: '12px' }} />
                            </div>
                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h3 style={{ margin: 0 }}>가격표 2</h3>
                                    <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'price_table_2')} style={{ display: 'none' }} id="up-price-2" />
                                    <label htmlFor="up-price-2" className="action-btn sm"><Plus size={16} /> 변경</label>
                                </div>
                                <img src={images.price_table_2 || priceTable2} alt="가격표 2" style={{ width: '100%', borderRadius: '12px' }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showEditModal && selectedMember && (
                <AdminMemberDetailModal
                    member={selectedMember}
                    onClose={() => setShowEditModal(false)}
                    pricingConfig={pricingConfig}
                    onUpdateMember={handleMemberModalUpdate}
                    onAddSalesRecord={handleAddSalesRecord}
                />
            )}

            {/* Install Guide Modal */}
            {showInstallGuide && (
                <div className="modal-overlay" onClick={() => setShowInstallGuide(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '320px', textAlign: 'center', padding: '30px' }}>
                        <h3 style={{ marginBottom: '15px', color: 'var(--primary-gold)' }}>홈 화면에 추가하기</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
                            브라우저 메뉴에서 <br />
                            <strong>'홈 화면에 추가'</strong> 또는 <br />
                            <strong>'앱 설치'</strong>를 선택해 주세요. <br /><br />
                            아이폰(iOS)은 하단 <strong>'공유'</strong> 버튼 클릭 후 <br />
                            <strong>'홈 화면에 추가'</strong>를 누르시면 됩니다.
                        </p>
                        <button className="action-btn primary" onClick={() => setShowInstallGuide(false)} style={{ width: '100%' }}>확인</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
