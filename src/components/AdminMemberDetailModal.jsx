import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc, collection, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '../firebase';
import { X, User, Calendar, CreditCard, ClockCounterClockwise, Chats, CheckSquare, Square, BellRinging, Trash, PencilSimple } from '@phosphor-icons/react';
import RegistrationTab from './admin/member-detail/RegistrationTab';
import AttendanceTab from './admin/member-detail/AttendanceTab';
import MessagesTab from './admin/member-detail/MessagesTab';
import { storageService } from '../services/storage';
import { getBranchName, getBranchColor } from '../studioConfig';
import CustomDatePicker from './common/CustomDatePicker';

const AdminMemberDetailModal = ({ member: initialMember, memberLogs: propMemberLogs, onClose, pricingConfig, onUpdateMember, onAddSalesRecord, pushTokens = [] }) => {
    // [FIX] Use local state for immediate UI updates
    const [localMember, setLocalMember] = useState(initialMember);
    const member = localMember || initialMember;

    // Sync prop changes to local state
    useEffect(() => {
        setLocalMember(initialMember);
    }, [initialMember]);

    // [FIX] Sync editData with localMember when credits/dates change externally
    // This ensures the info tab's editable fields stay in sync with real-time Firestore data
    useEffect(() => {
        if (!localMember) return;
        setEditData(prev => ({
            ...prev,
            credits: localMember.credits,
            startDate: localMember.startDate,
            endDate: localMember.endDate,
            attendanceCount: localMember.attendanceCount,
            price: localMember.price !== undefined ? localMember.price : prev.price
        }));
    }, [localMember?.credits, localMember?.startDate, localMember?.endDate, localMember?.attendanceCount, localMember?.price]);

    const [activeTab, setActiveTab] = useState('info');

    const [editData, setEditData] = useState({ ...member });
    const [memberLogs, setMemberLogs] = useState(propMemberLogs || []);
    const [logLimit, setLogLimit] = useState(50);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    // [REAL-TIME] Dedicated listener for the viewed member to ensure header/stats are always fresh
    useEffect(() => {
        if (!member?.id) return;

        console.log(`[AdminMemberDetailModal] Setting up real-time listener for member: ${member.id}`);
        const unsub = onSnapshot(doc(db, 'members', member.id), (snap) => {
            if (snap.exists()) {
                const updatedData = { id: snap.id, ...snap.data() };
                console.log(`[AdminMemberDetailModal] Real-time data received for ${updatedData.name}`);
                setLocalMember(updatedData);
            }
        }, (err) => {
            console.error("[AdminMemberDetailModal] Member listener error:", err);
        });

        return () => {
            // console.log(`[AdminMemberDetailModal] Cleaning up listener for ${member.id}`);
            unsub();
        };
    }, [member?.id]);

    // [REAL-TIME] Dedicated listener for attendance logs to ensure list is always fresh
    useEffect(() => {
        if (!member?.id) return;

        console.log(`[AdminMemberDetailModal] Setting up logs listener for: ${member.id}`);
        const q = query(
            collection(db, 'attendance'),
            where('memberId', '==', member.id),
            orderBy('timestamp', 'desc'),
            firestoreLimit(logLimit)
        );

        const unsubAt = onSnapshot(q, (snap) => {
            const history = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // console.log(`[AdminMemberDetailModal] Real-time logs updated: ${history.length} records`);
            setMemberLogs(history);

            // [FIX] Auto-calculate dates if member is still 'TBD' but has attendance logs
            if (member.endDate === 'TBD' && history.length > 0) {
                console.log('[AdminMemberDetailModal] Auto-fixing TBD dates based on real-time logs');
                const sortedLogs = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                const earliestLog = sortedLogs[0];
                const attendanceDate = new Date(earliestLog.timestamp);
                const startDateStr = attendanceDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

                const durationMonths = member.duration || 3;
                const endDate = new Date(attendanceDate);
                endDate.setMonth(endDate.getMonth() + durationMonths);
                const endDateStr = endDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

                storageService.updateMember(member.id, {
                    startDate: startDateStr,
                    endDate: endDateStr
                }).catch(e => console.error("TBD Fix failed:", e));
                // Local state will update via the other member listener
            }
        }, (err) => {
            console.error("[AdminMemberDetailModal] Logs listener error:", err);
        });

        return () => unsubAt();
    }, [member?.id, member.endDate, member.duration, logLimit]);

    // [NEW] Fetch the latest sales amount to autofill price if missing for existing members
    useEffect(() => {
        if (!member?.id) return;
        if (member.price !== undefined) return; // If already exists in DB

        let isMounted = true;
        const fetchLatestPrice = async () => {
            try {
                const sales = await storageService.getSalesHistory(member.id);
                if (sales && sales.length > 0 && isMounted) {
                    // Try to find the exact sales record that matches the current membership period
                    let matchedSale = sales.find(s => s.startDate === member.startDate && s.endDate === member.endDate && s.type === 'register');
                    
                    if (matchedSale && matchedSale.amount !== undefined) {
                        setLocalMember(prev => ({ ...prev, price: matchedSale.amount }));
                        setEditData(prev => ({ ...prev, price: matchedSale.amount }));
                    }
                }
            } catch (e) {
                console.error("Failed to fetch sales history for price autofill:", e);
            }
        };
        fetchLatestPrice();
        
        return () => { isMounted = false; };
    }, [member?.id, member?.price]);

    // Selective Save State
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [pendingChanges, setPendingChanges] = useState([]);
    const [selectedChangeKeys, setSelectedChangeKeys] = useState(new Set());

    const FIELD_LABELS = {
        name: '이름',
        phone: '전화번호',
        membershipType: '회원권 구분',
        subject: '세부 이용권',
        regDate: '등록일',
        startDate: '수강 시작일',
        endDate: '종료일',
        credits: '잔여 횟수',
        price: '결제 금액',
        notes: '메모'
    };



    const tabs = [
        { id: 'info', label: '회원정보', icon: <User size={20} /> },
        { id: 'attendance', label: '출석부', icon: <Calendar size={20} /> },
        { id: 'registration', label: '재등록', icon: <CreditCard size={20} /> },
        { id: 'messages', label: '메시지', icon: <Chats size={20} /> }
    ];

    const getChangedFields = () => {
        const changes = [];
        Object.keys(FIELD_LABELS).forEach(key => {
            // loose comparison for dates/numbers if needed, but strict is usually fine for strings
            // Special handling for null/undefined to empty string if needed
            const original = member[key] ?? '';
            const current = editData[key] ?? '';
            
            // special check for price since it might be numeric vs string
            if (key === 'price') {
                if (Number(original) !== Number(current)) {
                     changes.push({
                        key,
                        label: FIELD_LABELS[key],
                        oldValue: original,
                        newValue: current
                    });
                }
            } else if (original != current) { // != to handle loose type (e.g. number vs string) if needed, otherwise !==
                changes.push({
                    key,
                    label: FIELD_LABELS[key],
                    oldValue: original,
                    newValue: current
                });
            }
        });
        return changes;
    };

    const handlePreSave = () => {
        const changes = getChangedFields();

        if (changes.length === 0) {
            alert('변경 사항이 없습니다.');
            return;
        }

        // [FIX] 시작일/종료일/횟수 변경 시 매출 보호 안내
        const revenueRelatedKeys = ['startDate', 'endDate', 'credits'];
        const hasRevenueRelated = changes.some(c => revenueRelatedKeys.includes(c.key));

        if (changes.length === 1) {
            const change = changes[0];
            const extraNote = hasRevenueRelated ? '\n\n※ 매출 기록은 별도로 관리되므로 영향받지 않습니다.' : '';
            if (confirm(`${change.label}을(를) "${change.oldValue}"에서 "${change.newValue}"(으)로 변경하시겠습니까?${extraNote}`)) {
                // Save single change
                handleFinalSave({ [change.key]: editData[change.key] });
            }
        } else {
            // Multiple changes
            setPendingChanges(changes);
            setSelectedChangeKeys(new Set(changes.map(c => c.key))); // Default all selected
            setShowChangeModal(true);
        }
    };

    const handleFinalSave = async (dataToUpdate) => {
        // If credits changed, we might still want the specific credit confirmation? 
        // Or we assume the user reviewed it in the list.
        // The original requirement had a special confirmation for credits.
        // We can integrate that into the flow or trust the new UI.
        // For now, removing the double-confirmation for credits since the new UI shows the change explicitly.

        const success = await onUpdateMember(member.id, dataToUpdate);
        if (success) {
            alert('저장되었습니다.');
            setShowChangeModal(false);
            if (Object.keys(dataToUpdate).length === getChangedFields().length) {
                // If we saved everything (or we were in single save mode), close modal
                // Actually, if we are in the selective save modal, we might want to stay if not everything was saved?
                // But typically "Save" means we are done with this session.
                onClose();
            } else {
                // Partial save - update "member" prop is tricky since it comes from parent.
                // We rely on parent to update "member" prop which triggers re-render?
                // If parent updates member, "editData" might not sync automatically unless we use useEffect.
                // Ideally, we close the main modal on success.
                onClose();
            }
        }
    };

    const handleManualAttendance = async (dateStr, timeStr, branchId) => {
        if (isSubmitting || isSubmittingRef.current) return; // Prevent double submission
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        try {
            // Combine date and time to ISO string
            const timestamp = new Date(`${dateStr}T${timeStr || '12:00'}`).toISOString();
            const result = await storageService.addManualAttendance(member.id, timestamp, branchId);

            if (result.success) {
                // If this is the first attendance for a TBD member, calculate dates
                if (member.startDate === 'TBD') {
                    const attendanceDate = new Date(timestamp);
                    const startDateStr = attendanceDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

                    const durationMonths = member.duration || 3;
                    const endDate = new Date(attendanceDate);
                    endDate.setMonth(endDate.getMonth() + durationMonths);
                    const endDateStr = endDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

                    const updateData = {
                        startDate: startDateStr,
                        endDate: endDateStr
                    };

                    await storageService.updateMember(member.id, updateData);

                    // [FIX] Update local member state immediately to reflect changes in UI
                    setLocalMember(prev => ({
                        ...prev,
                        ...updateData
                    }));

                    // Notify parent to refresh list with correct arguments
                    if (onUpdateMember) {
                        onUpdateMember(member.id, updateData);
                    }
                }

                // [FIX] Do NOT manually update localMember credits here.
                // The onSnapshot real-time listener on the member document (line 36)
                // will automatically detect the Firestore increment and update localMember.
                // Manually updating here causes a DOUBLE increment (+2 instead of +1).

                alert('수동 출석처리가 완료되었습니다.');
            } else {
                alert('출석 처리에 실패했습니다: ' + (result.message || '알 수 없는 오류'));
            }
        } catch (e) {
            console.error(e);
            alert('출석 처리에 실패했습니다.');
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };


    const handleDeleteAttendance = async (logId) => {
        console.log('[AdminMemberDetailModal] handleDeleteAttendance v2026.02.22.v8');
        // [FIX] Prevent double-click / rapid consecutive calls
        if (isSubmitting || isSubmittingRef.current) return;
        
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const restoreCredit = confirm('해당 회원의 수강권을 복구하시겠습니까? (취소 시 기록만 삭제)');
        
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        try {
            const result = await storageService.deleteAttendance(logId, restoreCredit);
            
            if (result.success) {
                // [FIX] Do NOT use alert() here — it blocks the thread while onSnapshot
                // fires in the background, causing stale re-renders and visual glitches.
                // The onSnapshot listener will auto-update both member data and attendance logs.
                console.log('[AdminMemberDetailModal] Attendance deleted successfully, waiting for onSnapshot sync...');
            } else {
                throw new Error(result.message || '삭제 실패');
            }
        } catch (e) {
            console.error(e);
            alert(`삭제에 실패했습니다: ${e.message}`);
        } finally {
            // [FIX] Delay resetting isSubmitting to prevent rapid re-clicks
            // while Firestore onSnapshot is processing the deletion
            setTimeout(() => {
                isSubmittingRef.current = false;
                setIsSubmitting(false);
            }, 1500);
        }
    };



    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 1100,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            {/* [BUILD-FIX] Unminifiable version string inside DOM to defeat all dead-code elimination (v2026.02.22.v8) */}
            <div style={{ display: 'none' }} data-version="2026.02.22.v8">v2026.02.22.v8</div>
            <div style={{
                width: '100%', height: '100%', maxWidth: '600px',
                background: '#18181b', display: 'flex', flexDirection: 'column',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#27272a'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {member.name}
                            <span style={{ fontSize: '0.9rem', color: '#a1a1aa', fontWeight: 'normal' }}>{member.phone}</span>
                            
                            {/* [NEW] Branch Badge */}
                            <div style={{
                                fontSize: '0.7rem',
                                background: getBranchColor(member.homeBranch || member.branchId),
                                color: (member.homeBranch || member.branchId) === 'mapo' ? 'white' : 'black',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                opacity: 0.9
                            }}>
                                {getBranchName(member.homeBranch || member.branchId)}
                            </div>

                            {member.pushEnabled !== false && pushTokens.some(t => t.memberId === member.id) && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    background: 'rgba(16, 185, 129, 0.15)', color: '#10B981',
                                    padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem',
                                    fontWeight: 'bold', border: '1px solid rgba(16, 185, 129, 0.3)'
                                }}>
                                    <BellRinging size={12} weight="fill" /> 푸시 ON
                                </div>
                            )}
                        </h2>
                        <div style={{ fontSize: '0.8rem', color: determineStatusColor(member), display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span>{getMembershipTypeLabel(member.membershipType)} | </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                                <span style={{ fontWeight: 'bold' }}>{member.credits}회 남음</span>
                            </div>
                            <span> | {
                                member.endDate === 'TBD'
                                    ? '첫 출석 시 기간 확정'
                                    : member.endDate
                                        ? `~ ${member.endDate}`
                                        : '만료일 미설정'
                            }</span>
                            {(() => {
                                const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                                if (member.startDate && member.startDate > todayStr) {
                                    return (
                                        <span style={{ 
                                            fontSize: '0.7rem', 
                                            background: 'rgba(56, 189, 248, 0.15)', 
                                            color: '#38bdf8', 
                                            border: '1px solid rgba(56, 189, 248, 0.3)', 
                                            padding: '2px 6px', 
                                            borderRadius: '4px', 
                                            fontWeight: 'bold' 
                                        }}>
                                            대기 중 (선등록)
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', padding: '10px' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', overflowX: 'auto' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1, padding: '15px 5px', background: 'none', border: 'none',
                                color: activeTab === tab.id ? 'var(--primary-gold)' : '#71717a',
                                borderBottom: activeTab === tab.id ? '2px solid var(--primary-gold)' : '2px solid transparent',
                                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                                minWidth: '70px', fontSize: '0.8rem', whiteSpace: 'nowrap'
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#121212' }}>
                    {activeTab === 'info' && (
                        <div className="fade-in">
                            <MemberInfoTab
                                editData={editData}
                                setEditData={setEditData}
                                onSave={handlePreSave}
                                pricingConfig={pricingConfig}
                                originalData={member}
                            />
                        </div>
                    )}
                    {activeTab === 'attendance' && (
                        <div className="fade-in">
                            <AttendanceTab
                                logs={memberLogs}
                                member={member}
                                onAdd={handleManualAttendance}
                                onDelete={handleDeleteAttendance}
                                isSubmitting={isSubmitting}
                                logLimit={logLimit}
                                setLogLimit={setLogLimit}
                            />
                        </div>
                    )}
                    {activeTab === 'registration' && (
                        <div className="fade-in">
                            <RegistrationTab
                                pricingConfig={pricingConfig}
                                member={member}
                                onAddSalesRecord={onAddSalesRecord}
                                onUpdateMember={onUpdateMember}
                            />
                        </div>
                    )}
                    {activeTab === 'messages' && (
                        <div className="fade-in">
                            <MessagesTab memberId={member.id} />
                        </div>
                    )}
                </div>
            </div>

            {/* Selective Save Modal */}
            {showChangeModal && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', zIndex: 1200,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        width: '90%', maxWidth: '400px', background: '#27272a',
                        borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }}>
                        <h3 style={{ color: 'white', margin: '0 0 15px 0' }}>변경 사항 확인</h3>
                        <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '15px' }}>
                            저장할 항목을 선택해주세요.
                        </p>
                        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                            {pendingChanges.map(change => (
                                <div
                                    key={change.key}
                                    onClick={() => {
                                        const next = new Set(selectedChangeKeys);
                                        if (next.has(change.key)) next.delete(change.key);
                                        else next.add(change.key);
                                        setSelectedChangeKeys(next);
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '10px', borderRadius: '8px',
                                        background: selectedChangeKeys.has(change.key) ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.05)',
                                        border: selectedChangeKeys.has(change.key) ? '1px solid var(--primary-gold)' : '1px solid transparent',
                                        cursor: 'pointer'
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            const next = new Set(selectedChangeKeys);
                                            if (next.has(change.key)) next.delete(change.key);
                                            else next.add(change.key);
                                            setSelectedChangeKeys(next);
                                        }
                                    }}
                                >
                                    <div style={{ color: selectedChangeKeys.has(change.key) ? 'var(--primary-gold)' : '#52525b' }}>
                                        {selectedChangeKeys.has(change.key)
                                            ? <CheckSquare size={24} weight="fill" />
                                            : <Square size={24} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>{change.label}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                                            <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{change.oldValue}</span>
                                            {' -> '}
                                            <span style={{ color: 'var(--primary-gold)' }}>{change.newValue}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setShowChangeModal(false)}
                                style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #52525b', color: '#a1a1aa', borderRadius: '8px' }}
                            >
                                취소
                            </button>
                            <button
                                onClick={() => {
                                    const dataToSave = {};
                                    selectedChangeKeys.forEach(key => {
                                        dataToSave[key] = editData[key];
                                    });
                                    if (Object.keys(dataToSave).length === 0) return;
                                    handleFinalSave(dataToSave);
                                }}
                                disabled={selectedChangeKeys.size === 0}
                                style={{
                                    flex: 2, padding: '12px', borderRadius: '8px', border: 'none',
                                    background: selectedChangeKeys.size > 0 ? 'var(--primary-gold)' : '#3f3f46',
                                    color: selectedChangeKeys.size > 0 ? 'black' : '#a1a1aa', fontWeight: 'bold'
                                }}
                            >
                                {selectedChangeKeys.size}개 변경 저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Unified MemberInfoTab including history editing
const MemberInfoTab = ({ editData, setEditData, onSave, pricingConfig, originalData }) => {
    const [history, setHistory] = useState([]);
    const [editingSale, setEditingSale] = useState(null);
    const [saleEditData, setSaleEditData] = useState(null);
    const [isSavingSale, setIsSavingSale] = useState(false);

    useEffect(() => {
        if (!originalData?.id) return;
        let isMounted = true;
        const fetchHistory = async () => {
            try {
                const data = await storageService.getSalesHistory(originalData.id);
                if (!isMounted) return;
                const sorted = [...data].sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());
                setHistory(sorted);
            } catch (e) {
                console.error("Fetch sales history failed:", e);
            }
        };
        fetchHistory();
        return () => { isMounted = false; };
    }, [originalData?.id, isSavingSale]);

    const getTypeLabel = (key) => {
        const map = {
            'general': '일반', 'intensive': '심화', 'kids': '키즈',
            'pregnancy': '임신부', 'sat_hatha': '토요하타', 'ttc': 'TTC'
        };
        return map[key] || key;
    };

    const handleSaleSave = async () => {
        try {
            setIsSavingSale(true);
            const updates = {};
            if (saleEditData.startDate !== editingSale.startDate) updates.startDate = saleEditData.startDate;
            if (saleEditData.endDate !== editingSale.endDate) updates.endDate = saleEditData.endDate;
            if (saleEditData.amount !== editingSale.amount) updates.amount = saleEditData.amount;
            if (saleEditData.item !== editingSale.item) updates.item = saleEditData.item;
            if (saleEditData.method !== editingSale.method) updates.method = saleEditData.method;
            if (saleEditData.credits !== editingSale.credits) updates.credits = saleEditData.credits;
            
            if (Object.keys(updates).length > 0) {
                await storageService.updateSalesRecord(editingSale.id, updates);
                
                // [SYNC] If the edited sales record perfectly matches the CURRENT member's root dates, automatically sync the changes to the member profile!
                if (originalData.startDate === editingSale.startDate && originalData.endDate === editingSale.endDate) {
                    const memberUpdates = {};
                    if (updates.startDate) memberUpdates.startDate = updates.startDate;
                    if (updates.endDate) memberUpdates.endDate = updates.endDate;
                    if (updates.amount !== undefined) memberUpdates.price = updates.amount;
                    if (updates.credits !== undefined) memberUpdates.credits = updates.credits;
                    if (Object.keys(memberUpdates).length > 0) {
                        try {
                           await storageService.updateMember(originalData.id, memberUpdates);
                           alert("결제 내역 수정사항이 현재 이용권 정보에도 함께 연동되었습니다.\n(주의: 필요시 수동으로 출석부에서 소급 출석을 진행해주세요.)");
                        } catch(memberErr) {
                           console.error("Auto sync to member failed:", memberErr);
                        }
                    }
                } else if (updates.startDate || updates.endDate) {
                    alert("수정이 완료되었습니다.\n\n이 결제건이 [현재 진행 중]이거나 [선결제 대기 중]인 수강권이라면, 반드시 위의 '메인 프로필 정보'에서도 날짜를 동일하게 수정해 주셔야 강사 앱이나 시스템에 즉시 반영됩니다.");
                }
            }
            setEditingSale(null);
            setSaleEditData(null);
        } catch (e) {
            alert("결제 내역 저장에 실패했습니다.");
        } finally {
            setIsSavingSale(false);
        }
    };

    const handleDeleteSale = async (salesId, itemName) => {
        if (!confirm(`"${itemName}" 결제 내역을 삭제하시겠습니까?\n\n⚠️ 삭제된 내역은 복구할 수 없습니다.`)) return;
        try {
            await storageService.deleteSalesRecord(salesId);
            setHistory(prev => prev.filter(h => h.id !== salesId));
        } catch (e) {
            alert('삭제 중 오류가 발생했습니다: ' + e.message);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* --- TOP: EDIT FORM --- */}
            {editingSale ? (
                <div style={{ background: 'rgba(212, 175, 55, 0.05)', border: '1px solid var(--primary-gold)', borderRadius: '12px', padding: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ color: 'var(--primary-gold)', margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PencilSimple size={20} /> 과거/선결제 내역 수정 모드
                        </h3>
                        <button onClick={() => { setEditingSale(null); setSaleEditData(null); }} style={{ background: 'none', border: '1px solid #52525b', color: '#a1a1aa', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                            취소 (현재 회원정보로 돌아가기)
                        </button>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <InputGroup label="수강권 항목 이름" value={saleEditData.item || ''} onChange={v => setSaleEditData({ ...saleEditData, item: v })} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <InputGroup label="결제수단" value={saleEditData.method || ''} onChange={v => setSaleEditData({ ...saleEditData, method: v })} type="select" options={[
                                {label: '현금', value: 'cash'}, {label: '이체', value: 'transfer'}, {label: '카드', value: 'card'}
                            ]} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <InputGroup label="시작일" value={saleEditData.startDate || ''} onChange={v => setSaleEditData({ ...saleEditData, startDate: v })} type="date" />
                            <InputGroup label="종료일" value={saleEditData.endDate || ''} onChange={v => setSaleEditData({ ...saleEditData, endDate: v })} type="date" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>잔여 횟수</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={() => setSaleEditData({ ...saleEditData, credits: Math.max(0, (saleEditData.credits || 0) - 1) })}
                                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white' }}
                                >-</button>
                                <span style={{ fontWeight: 'bold', color: 'white', minWidth: '30px', textAlign: 'center' }}>{saleEditData.credits}</span>
                                <button
                                    onClick={() => setSaleEditData({ ...saleEditData, credits: (saleEditData.credits || 0) + 1 })}
                                    style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white' }}
                                >+</button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>결제 금액</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input
                                    type="text"
                                    value={(saleEditData.amount || 0).toLocaleString()}
                                    onChange={(e) => {
                                        const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                                        setSaleEditData({ ...saleEditData, amount: val });
                                    }}
                                    style={{
                                        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--primary-gold)',
                                        fontSize: '1rem', fontWeight: 'bold', textAlign: 'right', width: '120px', padding: '5px', borderRadius: '6px'
                                    }}
                                />
                                <span style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>원</span>
                            </div>
                        </div>

                        {(() => {
                            const hasChanges = saleEditData.startDate !== editingSale.startDate ||
                                saleEditData.endDate !== editingSale.endDate ||
                                saleEditData.amount !== editingSale.amount ||
                                saleEditData.item !== editingSale.item ||
                                saleEditData.method !== editingSale.method ||
                                saleEditData.credits !== editingSale.credits;
                            if (!hasChanges) return null;
                            
                            return (
                                <button
                                    onClick={handleSaleSave}
                                    disabled={isSavingSale}
                                    style={{
                                        padding: '15px', borderRadius: '10px', border: 'none',
                                        background: 'var(--primary-gold)', color: 'black',
                                        fontWeight: 'bold', fontSize: '1.1rem', marginTop: '10px'
                                    }}
                                >
                                    {isSavingSale ? '저장 중...' : '결제 내역 수정 저장'}
                                </button>
                            );
                        })()}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>진행 중인 회원정보</h3>
                    </div>
                    
                    <InputGroup label="이름" value={editData.name} onChange={v => setEditData({ ...editData, name: v })} lang="ko" autoComplete="off" />
                    <InputGroup label="전화번호" value={editData.phone} onChange={v => setEditData({ ...editData, phone: v })} type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="off" />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <InputGroup
                            label="회원권 구분"
                            value={editData.membershipType}
                            onChange={v => setEditData({ ...editData, membershipType: v })}
                            type="select"
                            options={Object.keys(pricingConfig || {}).map(k => ({ value: k, label: getTypeLabel(k) }))}
                        />
                        <InputGroup label="세부 이용권" value={editData.subject || ''} onChange={v => setEditData({ ...editData, subject: v })} />
                    </div>

                    <InputGroup label="등록일" value={editData.regDate || ''} onChange={v => setEditData({ ...editData, regDate: v })} type="date" />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{ color: 'var(--primary-gold)', margin: 0, fontSize: '0.9rem' }}>• 수강권 기간 관리</h4>
                        {(() => {
                            const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                            if (editData.startDate && editData.startDate > todayStr) {
                                return (
                                    <span style={{ fontSize: '0.65rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                                        대기 중 (선등록)
                                    </span>
                                );
                            }
                            return null;
                        })()}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <InputGroup
                            label="시작일"
                            value={editData.startDate || ''}
                            onChange={v => {
                                const updates = { startDate: v };
                                if (v && v !== 'TBD' && editData.duration) {
                                    const start = new Date(v);
                                    const end = new Date(start);
                                    end.setMonth(end.getMonth() + (Number(editData.duration) || 1));
                                    end.setDate(end.getDate() - 1);
                                    const newEndDate = end.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                                    if (confirm(`시작일 변경에 따라 종료일을 ${newEndDate}로 자동 조정하시겠습니까?`)) {
                                        updates.endDate = newEndDate;
                                    }
                                }
                                setEditData({ ...editData, ...updates });
                            }}
                            type="date"
                        />
                        <InputGroup label="종료일" value={editData.endDate || ''} onChange={v => setEditData({ ...editData, endDate: v })} type="date" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>잔여 횟수</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button onClick={() => setEditData({ ...editData, credits: Math.max(0, (editData.credits || 0) - 1) })} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white' }}>-</button>
                                <span style={{ fontWeight: 'bold', color: 'white', minWidth: '30px', textAlign: 'center' }}>{editData.credits}</span>
                                <button onClick={() => setEditData({ ...editData, credits: (editData.credits || 0) + 1 })} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white' }}>+</button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                            <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>결제 금액</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <input
                                    type="text"
                                    value={(editData.price || 0).toLocaleString()}
                                    onChange={(e) => {
                                        const val = Number(e.target.value.replace(/[^0-9]/g, ''));
                                        setEditData({ ...editData, price: val });
                                    }}
                                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--primary-gold)', fontSize: '1rem', fontWeight: 'bold', textAlign: 'right', width: '120px', padding: '5px', borderRadius: '6px' }}
                                />
                                <span style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>원</span>
                            </div>
                        </div>
                    </div>

                    {(() => {
                        const editableKeys = ['name', 'phone', 'membershipType', 'subject', 'regDate', 'startDate', 'endDate', 'credits', 'price', 'notes'];
                        const hasChanges = editableKeys.some(key => {
                            const orig = originalData[key] ?? '';
                            const curr = editData[key] ?? '';
                            if (key === 'price') return Number(orig) !== Number(curr);
                            return orig != curr;
                        });
                        
                        if (!hasChanges) return null;

                        return (
                            <button
                                onClick={onSave}
                                style={{ padding: '15px', borderRadius: '10px', border: 'none', background: 'var(--primary-gold)', color: 'black', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '10px' }}
                            >
                                현재 회원정보 저장하기
                            </button>
                        );
                    })()}
                </div>
            )}

            {/* --- BOTTOM: HISTORY LIST --- */}
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '15px 0' }} />
            <div>
                <h3 style={{ color: 'white', fontSize: '1rem', marginBottom: '15px' }}>상세 결제 내역 (역대 이력)</h3>
                {!history || history.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '20px', fontSize: '0.9rem' }}>
                        결제 내역이 없습니다.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {history.map((record) => {
                            const isSelected = editingSale?.id === record.id;
                            const dDate = record.timestamp ? new Date(record.timestamp) : new Date(record.date || Date.now());
                            const isAdvance = record.startDate && record.startDate > new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

                            return (
                                <div 
                                    key={record.id} 
                                    onClick={() => {
                                        setEditingSale(record);
                                        setSaleEditData({
                                            startDate: record.startDate || '',
                                            endDate: record.endDate || '',
                                            amount: record.amount !== undefined ? record.amount : 0,
                                            item: record.item || '',
                                            method: record.method || '',
                                            credits: record.credits || 0
                                        });
                                        // Scroll to top
                                        document.querySelector('.fade-in').scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    style={{
                                        background: isSelected ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255,255,255,0.05)',
                                        border: isSelected ? '1px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px', padding: '15px', cursor: 'pointer',
                                        transition: 'all 0.2s ease', position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: 'white', fontWeight: 'bold' }}>{record.item || '알 수 없음'}</span>
                                                {isAdvance && (
                                                    <span style={{ fontSize: '0.65rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 5px', borderRadius: '4px' }}>
                                                        대기 중 (선등록)
                                                    </span>
                                                )}
                                            </div>
                                            {record.startDate && record.endDate && (
                                                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '4px' }}>
                                                    📅 {record.startDate} ~ {record.endDate}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ color: 'var(--primary-gold)', fontWeight: 'bold' }}>
                                            {(record.amount || 0).toLocaleString()}원
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#71717a' }}>
                                            {record.method === 'transfer' ? '이체' : record.method === 'cash' ? '현금' : record.method === 'card' ? '카드' : record.method}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#71717a' }}>
                                                {dDate.toLocaleDateString('ko-KR')}
                                            </span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSale(record.id, record.item);
                                                }}
                                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                                            >
                                                <Trash size={14} /> 삭제
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// Updated InputGroup
const InputGroup = ({ label, value, onChange, type = 'text', options = [], ...props }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{label}</label>
        {(type === 'text' || type === 'tel') && (
            <input
                type={type} value={value} onChange={e => onChange(e.target.value)}
                style={inputStyle}
                {...props}
            />
        )}
        {type === 'date' && (
            <CustomDatePicker value={value} onChange={onChange} />
        )}
        {type === 'select' && (
            <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
                {options.map(o => <option key={o.value} value={o.value} style={{ background: '#333', color: 'white' }}>{o.label}</option>)}
            </select>
        )}
        {type === 'textarea' && (
            <textarea
                value={value} onChange={e => onChange(e.target.value)}
                style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
            />
        )}
    </div>
);

const inputStyle = {
    padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem',
    fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
};

const determineStatusColor = (member) => {
    if (member.endDate === 'TBD') return 'var(--primary-gold)';
    if (!member.endDate) return '#ef4444';
    const credits = Number(member.credits || 0);
    const end = new Date(member.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (end < today || credits <= 0) return '#ef4444';
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    if (diff <= 7 || credits <= 2) return '#f59e0b';
    return '#10b981';
};

const getMembershipTypeLabel = (type) => {
    const labels = {
        'general': '일반',
        'intensive': '심화',
        'kids': '키즈',
        'pregnancy': '임산부',
        'sat_hatha': '토요하타',
        'ttc': 'TTC'
    };
    return labels[type] || type;
};

// [BUILD-FIX] Attach unminifiable property to component object to defeat tree-shaking
// This guarantees Rollup will generate a new chunk hash, forcing Workbox to update!
AdminMemberDetailModal.__buildVersion = '2026.02.22.v5';

export default AdminMemberDetailModal;
