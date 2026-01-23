import React, { useState } from 'react';
import { X, User, Calendar, CreditCard, ClockCounterClockwise, Chats, CheckSquare, Square } from '@phosphor-icons/react';
import RegistrationTab from './admin/member-detail/RegistrationTab';
import AttendanceTab from './admin/member-detail/AttendanceTab';
import SalesHistoryTab from './admin/member-detail/SalesHistoryTab';
import MessagesTab from './admin/member-detail/MessagesTab';
import { storageService } from '../services/storage';
import CustomDatePicker from './common/CustomDatePicker';

const AdminMemberDetailModal = ({ member, onClose, pricingConfig, onUpdateMember, onAddSalesRecord }) => {
    const [activeTab, setActiveTab] = useState('info');

    const [editData, setEditData] = useState({ ...member });

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
        notes: '메모'
    };



    const tabs = [
        { id: 'info', label: '회원정보', icon: <User size={18} /> },
        { id: 'attendance', label: '출석부', icon: <Calendar size={18} /> },
        { id: 'registration', label: '등록/연장', icon: <CreditCard size={18} /> },
        { id: 'history', label: '판매이력', icon: <ClockCounterClockwise size={18} /> },
        { id: 'messages', label: '메시지', icon: <Chats size={18} /> },
    ];

    const getChangedFields = () => {
        const changes = [];
        Object.keys(FIELD_LABELS).forEach(key => {
            // loose comparison for dates/numbers if needed, but strict is usually fine for strings
            // Special handling for null/undefined to empty string if needed
            const original = member[key] ?? '';
            const current = editData[key] ?? '';
            if (original != current) { // != to handle loose type (e.g. number vs string) if needed, otherwise !==
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

        if (changes.length === 1) {
            const change = changes[0];
            if (confirm(`${change.label}을(를) "${change.oldValue}"에서 "${change.newValue}"(으)로 변경하시겠습니까?`)) {
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
        try {
            // Combine date and time to ISO string
            const timestamp = new Date(`${dateStr}T${timeStr || '12:00'}`).toISOString();
            await storageService.addManualAttendance(member.id, timestamp, branchId);
            alert('수동 출석처리가 완료되었습니다.');
            // Refresh logs if needed (handled by listener usually, but modal might need explicit refresh if using local state)
        } catch (e) {
            console.error(e);
            alert('출석 처리에 실패했습니다.');
        }
    };

    const handleDeleteAttendance = async (logId) => {
        if (!confirm('정말 삭제하시겠습니까? 횟수가 반환됩니다.')) return;
        try {
            await storageService.deleteAttendance(logId);
            alert('출석 기록이 삭제되었습니다.');
        } catch (e) {
            console.error(e);
            alert('삭제에 실패했습니다.');
        }
    };



    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 1100,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(5px)'
        }}>
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
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
                            {member.name} <span style={{ fontSize: '0.9rem', color: '#a1a1aa', fontWeight: 'normal' }}>{member.phone}</span>
                        </h2>
                        <div style={{ fontSize: '0.8rem', color: determineStatusColor(member), display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span>{member.membershipType} | </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                                <span style={{ fontWeight: 'bold' }}>{member.credits}회 남음</span>
                            </div>
                            <span> | ~{member.endDate}</span>
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
                            />
                        </div>
                    )}
                    {activeTab === 'attendance' && (
                        <div className="fade-in">
                            <AttendanceTab
                                logs={[]}
                                member={member}
                                onAdd={handleManualAttendance}
                                onDelete={handleDeleteAttendance}
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
                    {activeTab === 'history' && (
                        <div className="fade-in">
                            <SalesHistoryTab memberId={member.id} member={member} />
                        </div>
                    )}
                    {activeTab === 'messages' && (
                        <div className="fade-in">
                            <MessagesTab />
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

// MemberInfoTab remains in this file as it's simpler
const MemberInfoTab = ({ editData, setEditData, onSave, pricingConfig }) => {
    // Helper to get Korean label for membership type
    const getTypeLabel = (key) => {
        const map = {
            'general': '일반',
            'intensive': '심화',
            'kids': '키즈',
            'pregnancy': '임신부',
            'sat_hatha': '토요하타',
            'ttc': 'TTC'
        };
        return map[key] || key;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <InputGroup label="이름" value={editData.name} onChange={v => setEditData({ ...editData, name: v })} />
            <InputGroup label="전화번호" value={editData.phone} onChange={v => setEditData({ ...editData, phone: v })} />

            {/* Membership Type & Subject */}
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

            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '5px 0' }} />
            <h4 style={{ color: 'var(--primary-gold)', margin: 0, fontSize: '0.9rem' }}>• 수강권 기간 관리 (관리자 수정용)</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <InputGroup label="시작일" value={editData.startDate || ''} onChange={v => setEditData({ ...editData, startDate: v })} type="date" />
                <InputGroup label="종료일" value={editData.endDate || ''} onChange={v => setEditData({ ...editData, endDate: v })} type="date" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>잔여 횟수</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => setEditData({ ...editData, credits: Math.max(0, (editData.credits || 0) - 1) })}
                            style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white' }}
                        >-</button>
                        <span style={{ fontWeight: 'bold', color: 'white', minWidth: '30px', textAlign: 'center' }}>{editData.credits}</span>
                        <button
                            onClick={() => setEditData({ ...editData, credits: (editData.credits || 0) + 1 })}
                            style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white' }}
                        >+</button>
                    </div>
                </div>
            </div>

            <button
                onClick={onSave}
                style={{
                    padding: '15px', borderRadius: '10px', border: 'none',
                    background: 'var(--primary-gold)', color: 'black',
                    fontWeight: 'bold', fontSize: '1.1rem', marginTop: '10px'
                }}
            >
                저장하기
            </button>
        </div>
    );
};

// Updated InputGroup
const InputGroup = ({ label, value, onChange, type = 'text', options = [] }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{label}</label>
        {type === 'text' && (
            <input
                type="text" value={value} onChange={e => onChange(e.target.value)}
                style={inputStyle}
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
    if (!member.endDate) return '#ef4444';
    const end = new Date(member.endDate);
    const today = new Date();
    if (end < today) return '#ef4444';
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    if (diff <= 7) return '#f59e0b';
    return '#10b981';
};

export default AdminMemberDetailModal;
