import React, { useState, useEffect, useMemo, cloneElement, useRef } from 'react';
import { storageService } from '../services/storage';
import { STUDIO_CONFIG, getBranchName } from '../studioConfig';
import { useNavigate } from 'react-router-dom';
import { Users, ClockCounterClockwise, Plus, PlusCircle, Image as ImageIcon, Calendar, Megaphone, BellRinging, X, Check, Funnel, Trash, NotePencil, FloppyDisk, ChatCircleText, PencilLine, CalendarPlus, Ticket, Tag, House, SignOut, ChartBar, Export } from '@phosphor-icons/react';
import AdminScheduleManager from '../components/AdminScheduleManager';
import AdminRevenue from '../components/AdminRevenue';
import AdminPriceManager from '../components/AdminPriceManager';
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

const AdminDashboard = () => {

    const [activeTab, setActiveTab] = useState('members');
    const [members, setMembers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [notices, setNotices] = useState([]);
    const [stats, setStats] = useState({ byTime: [], bySubject: [] });
    const [aiInsight, setAiInsight] = useState(null);
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [currentBranch, setCurrentBranch] = useState(() => storageService.getCurrentBranch());
    const [images, setImages] = useState({});
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
    // Auth Logout
    const navigate = useNavigate();
    const handleLogout = async () => {
        if (confirm('관리자 모드를 종료하시겠습니까?')) {
            await storageService.logoutAdmin();
            navigate('/login');
        }
    };

    // 필터링된 멤버 목록을 메모이제이션하여 성능 최적화
    const filteredMembers = useMemo(() => {
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const todayObj = new Date(todayStr);

        return members.filter(m => {
            if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return false;

            const matchesSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.phone || '').includes(searchTerm);
            if (!matchesSearch) return false;

            if (filterType === 'active') {
                const isExpired = m.endDate && new Date(m.endDate) < todayObj;
                if (isExpired || m.credits <= 0) return false;
            } else if (filterType === 'registration') {
                if (m.regDate !== todayStr) return false;
            } else if (filterType === 'attendance') {
                const attendedToday = logs.some(l => {
                    if (!l.timestamp) return false;
                    const logKST = new Date(l.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                    return l.memberId === m.id && logKST === todayStr && (currentBranch === 'all' || l.branchId === currentBranch);
                });
                if (!attendedToday) return false;
            } else if (filterType === 'expiring') {
                const endDateObj = m.endDate ? new Date(m.endDate) : null;
                const twoMonthsAgo = new Date();
                twoMonthsAgo.setMonth(twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2));

                if (endDateObj && endDateObj < twoMonthsAgo) return false;

                const nextWeek = new Date(todayObj);
                nextWeek.setDate(nextWeek.getDate() + 7);

                const isExpiringSoon = endDateObj && endDateObj >= todayObj && endDateObj <= nextWeek;
                const isExpired = endDateObj && endDateObj < todayObj;
                const noCredits = m.credits <= 0;

                return isExpiringSoon || isExpired || noCredits;
            }
            return true;
        });
    }, [members, searchTerm, filterType, currentBranch, logs]);

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

    // Calculate Price and End Date whenever form changes
    useEffect(() => {
        if (!showAddModal) return;

        const { membershipType, selectedOption, duration, paymentMethod, startDate } = newMember;

        let price = 0;
        let credits = 0;
        let label = '';
        let monthsToAdd = duration;

        const category = pricingConfig[membershipType];

        if (category) {
            const option = category.options.find(opt => opt.id === selectedOption);
            if (option) {
                label = option.label;

                if (option.type === 'ticket') {
                    // Fixed term tickets (e.g. 10 sessions / 3 months)
                    price = option.basePrice;
                    credits = option.credits;
                    monthsToAdd = option.months || 3;
                } else {
                    // Monthly Subscriptions (e.g. Month 8 / 1 month renewable)
                    // If 'unlimited', credits is high
                    credits = option.credits === 9999 ? 9999 : option.credits * duration;

                    if (duration === 1) {
                        price = option.basePrice;
                    } else if (duration === 3) {
                        price = option.discount3 || (option.basePrice * 3);
                    } else if (duration === 6) {
                        price = option.discount6 || (option.basePrice * 6);
                    } else {
                        price = option.basePrice * duration; // Fallback
                    }
                }

                if (paymentMethod === 'cash' && duration >= 3 && price > 0) {
                    price = Math.round(price * 0.95);
                }
            }
        }

        const end = new Date(startDate);
        end.setMonth(end.getMonth() + monthsToAdd);
        end.setDate(end.getDate() - 1);

        setNewMember(prev => ({
            ...prev,
            amount: price,
            credits: credits,
            endDate: end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
            subject: label
        }));

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [newMember.membershipType, newMember.selectedOption, newMember.duration, newMember.paymentMethod, newMember.startDate, showAddModal]);

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
            await storageService.addMember({
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


    const refreshData = async () => {
        const currentMembers = await storageService.loadAllMembers();
        const currentLogs = storageService.getAttendance();
        const currentNotices = storageService.getNotices();
        const currentImages = storageService.getImages();
        try {
            const tokens = await storageService.getAllPushTokens();
            setPushTokens(tokens);
        } catch (err) {
            console.error('Failed to fetch push tokens:', err);
        }

        setMembers(currentMembers);
        setLogs(currentLogs);
        setNotices(currentNotices);
        setImages(currentImages);

        const branchLogs = currentBranch === 'all'
            ? currentLogs
            : currentLogs.filter(l => l.branchId === currentBranch);
        calculateStats(branchLogs, currentMembers);

        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const currentMonth = today.substring(0, 7);

        const isMemberInBranch = (m) => currentBranch === 'all' || m.homeBranch === currentBranch;

        const activeMembers = currentMembers.filter(m => {
            if (!isMemberInBranch(m)) return false;
            if (!m.endDate) return m.credits > 0;
            return new Date(m.endDate) >= new Date(today) && m.credits >= 0;
        }).length;

        const attendedMemberIds = new Set(currentLogs
            .filter(l => {
                if (!l.timestamp) return false;
                const logDate = new Date(l.timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                return logDate === today && (currentBranch === 'all' || l.branchId === currentBranch);
            })
            .map(l => l.memberId)
        );
        const todayAttendance = currentMembers.filter(m => isMemberInBranch(m) && attendedMemberIds.has(m.id)).length;

        const todayRegistration = currentMembers.filter(m =>
            m.regDate === today && (currentBranch === 'all' || m.homeBranch === currentBranch)
        ).length;

        const todayRevenue = currentMembers
            .filter(m => m.regDate === today && (currentBranch === 'all' || m.homeBranch === currentBranch))
            .reduce((sum, m) => sum + (m.amount || 0), 0);

        const monthlyRevenue = currentMembers
            .filter(m => m.regDate && m.regDate.startsWith(currentMonth) && (currentBranch === 'all' || m.homeBranch === currentBranch))
            .reduce((sum, m) => sum + (m.amount || 0), 0);

        const expiringMembersCount = currentMembers.filter(m => {
            if (currentBranch !== 'all' && m.homeBranch !== currentBranch) return false;

            const todayObj = new Date();
            const endDateObj = m.endDate ? new Date(m.endDate) : null;

            if (endDateObj) {
                const twoMonthsAgo = new Date();
                twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
                if (endDateObj < twoMonthsAgo) return false;
            }

            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const isExpiringSoon = endDateObj && endDateObj >= todayObj && endDateObj <= nextWeek;
            const isExpired = endDateObj && endDateObj < todayObj;
            const noCredits = m.credits <= 0;

            return isExpiringSoon || isExpired || noCredits;
        }).length;

        setSummary({
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
            img.onload = () => {
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
                    storageService.updateImage(target, compressedBase64);
                    setImages(prev => ({ ...prev, [target]: compressedBase64 }));
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

    const handleOpenMessage = (member) => {
        setSelectedMember(member);
        setShowMessageModal(true);
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

    const handleUpdateMember = async () => {
        if (!selectedMember || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await storageService.updateMember(selectedMember.id, {
                name: newMember.name,
                phone: newMember.phone,
                homeBranch: newMember.branch,
                credits: parseInt(newMember.credits),
                endDate: newMember.endDate,
                subject: newMember.subject,
                notes: newMember.notes
            });
            setShowEditModal(false);
            refreshData();
            alert('회원 정보가 수정되었습니다.');
        } catch (err) {
            console.error('Error updating member:', err);
            alert('수정 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
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

    const selectExpiringMembers = () => {
        setFilterType(filterType === 'expiring' ? 'all' : 'expiring');
        setCurrentPage(1);
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
                    <AdminRevenue members={members} currentBranch={currentBranch} />
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
                            <div className={`dashboard-card interactive ${filterType === 'active' ? 'highlight' : ''}`}
                                onClick={() => setFilterType(filterType === 'active' ? 'all' : 'active')}>
                                <span className="card-label">활성 회원</span>
                                <span className="card-value gold">{summary.activeMembers}명</span>
                            </div>
                            <div className={`dashboard-card interactive ${filterType === 'attendance' ? 'highlight' : ''}`}
                                onClick={() => setFilterType(filterType === 'attendance' ? 'all' : 'attendance')}>
                                <span className="card-label">오늘 출석</span>
                                <span className="card-value">{summary.todayAttendance}명</span>
                            </div>
                            <div className={`dashboard-card interactive ${filterType === 'registration' ? 'highlight' : ''}`}
                                onClick={() => setFilterType(filterType === 'registration' ? 'all' : 'registration')}>
                                <span className="card-label">오늘 등록</span>
                                <span className="card-value success">{summary.todayRegistration}명</span>
                            </div>
                            <div className={`dashboard-card interactive ${filterType === 'expiring' ? 'highlight' : ''}`}
                                onClick={selectExpiringMembers}
                                style={{ transition: 'all 0.3s ease' }}>
                                <span className="card-label">만료/미수강</span>
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
                                                <div key={member.id} className="member-list-item">
                                                    <div style={{ padding: '0 10px' }}>
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
                                                    <div className="member-actions" style={{ display: 'flex', gap: '8px' }}>
                                                        <button onClick={() => handleOpenEdit(member)} className="action-btn sm" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <PencilLine size={18} /> <span style={{ fontSize: '0.8rem' }}>수정</span>
                                                        </button>
                                                        <button onClick={() => handleOpenMessage(member)} className="action-btn sm" title="메시지"><ChatCircleText size={18} /></button>
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
                                {STUDIO_CONFIG.BRANCHES.map(branch => (
                                    <div key={branch.id} className="dashboard-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                                            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: 'var(--primary-gold)', letterSpacing: '-0.05em' }}>{branch.name}</h3>
                                        </div>
                                        <AdminScheduleManager branchId={branch.id} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="dashboard-card">
                                <h3 className="card-label" style={{ marginBottom: '20px' }}>주간 시간표 (이미지)</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                    {STUDIO_CONFIG.BRANCHES.map(branch => (
                                        <div key={branch.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                            <div style={{ marginBottom: '15px' }}>
                                                <h3 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0 }}>{branch.name}</h3>
                                            </div>
                                            <img src={images[`timetable_${branch.id}`] || (branch.id === 'gwangheungchang' ? timeTable1 : timeTable2)} alt={`${branch.name} 시간표`} style={{ width: '100%', borderRadius: '12px', marginBottom: '10px' }} />
                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, `timetable_${branch.id}`)} style={{ display: 'none' }} id={`up-time-${branch.id}`} />
                                                <label htmlFor={`up-time-${branch.id}`} className="action-btn sm" style={{ padding: '4px 10px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: 'none' }}>시간표 이미지 변경</label>
                                            </div>
                                        </div>
                                    ))}
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
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">회원 정보 수정</h2>
                            <button onClick={() => setShowEditModal(false)}><X size={24} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">이름</label>
                            <input className="form-input" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} lang="ko" inputMode="text" autoComplete="name" spellCheck="false" autoCorrect="off" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">전화번호</label>
                            <input className="form-input" value={newMember.phone} onChange={e => setNewMember({ ...newMember, phone: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">지점</label>
                            <select className="form-select" value={newMember.branch} onChange={e => setNewMember({ ...newMember, branch: e.target.value })}>
                                {STUDIO_CONFIG.BRANCHES.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div className="form-group">
                                <label className="form-label">잔여 횟수</label>
                                <input type="number" className="form-input" value={newMember.credits} onChange={e => setNewMember({ ...newMember, credits: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">종료일</label>
                                <input type="date" className="form-input" value={newMember.endDate} onChange={e => setNewMember({ ...newMember, endDate: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">메모 (수련 시 참고사항)</label>
                            <textarea
                                className="form-input"
                                style={{ height: '80px', resize: 'none' }}
                                value={newMember.notes}
                                onChange={e => setNewMember({ ...newMember, notes: e.target.value })}
                                placeholder="특이사항이나 메모를 입력하세요."
                            />
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowEditModal(false)} style={{ padding: '10px 20px', color: 'var(--text-secondary)' }}>취소</button>
                            <button onClick={handleUpdateMember} className="action-btn primary" disabled={isSubmitting}>
                                {isSubmitting ? '수정 중...' : '수정완료'}
                            </button>
                        </div>
                    </div>
                </div>
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
