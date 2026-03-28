import React, { useState, useEffect } from 'react';
import { Trash, PencilSimple, CheckSquare, Square, UserFocus } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
import { memberService } from '../../../services/memberService';
import { getMembershipLabel } from '../../../utils/membershipLabels';
import { useStudioConfig } from '../../../contexts/StudioContext';
import CustomDatePicker from '../../common/CustomDatePicker';

const inputStyle = {
    padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem',
    fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif'
};

export const InputGroup = ({ label, value, onChange, type = 'text', options = [], ...props }) => (
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

export const isCurrentRecord = (record, originalData) => {
    if (!originalData) return false;
    // Exact match by startDate + endDate
    if (record.startDate && record.endDate && originalData.startDate === record.startDate && originalData.endDate === record.endDate) {
        return true;
    }
    // For TBD members: match by regDate comparison
    if ((originalData.startDate === 'TBD' || originalData.endDate === 'TBD') && record.date) {
        const recordDate = typeof record.date === 'string' && record.date.includes('T')
            ? record.date.split('T')[0]
            : record.date;
        if (recordDate === originalData.regDate) return true;
    }
    // For members with item matching their subject
    if (record.item && originalData.subject && record.item === originalData.subject) {
        const recordDate = record.date || record.timestamp;
        if (recordDate) {
            const rDateStr = typeof recordDate === 'string' && recordDate.includes('T')
                ? recordDate.split('T')[0]
                : typeof recordDate === 'string' ? recordDate : '';
            if (rDateStr === originalData.regDate) return true;
        }
    }
    return false;
};

const MemberInfoTab = ({ editData, setEditData, onSave, pricingConfig, originalData, isDirtyByUser }) => {
    const { config } = useStudioConfig();
    const [history, setHistory] = useState([]);
    const [editingSale, setEditingSale] = useState(null);
    const [saleEditData, setSaleEditData] = useState(null);
    const [isSavingSale, setIsSavingSale] = useState(false);
    const [isDeletingFace, setIsDeletingFace] = useState(false);

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

    const getTypeLabel = (key) => getMembershipLabel(key, config);

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
                
                const isCurrentMembership = originalData.startDate === editingSale.startDate && originalData.endDate === editingSale.endDate;
                const isUpcomingMembership = originalData.upcomingMembership && 
                                             originalData.upcomingMembership.startDate === editingSale.startDate && 
                                             originalData.upcomingMembership.endDate === editingSale.endDate;

                if (isCurrentMembership) {
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
                } else if (isUpcomingMembership) {
                    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                    const newStartDate = updates.startDate || editingSale.startDate;
                    
                    if (newStartDate !== 'TBD' && newStartDate <= todayStr) {
                        if (confirm("수정된 시작일이 오늘(또는 과거)입니다. 이 결제건을 현재 '진행 중인 수강권'으로 즉시 갱신/적용하시겠습니까?")) {
                            const memberUpdates = {
                                startDate: newStartDate,
                                endDate: updates.endDate || editingSale.endDate,
                                credits: updates.credits !== undefined ? updates.credits : editingSale.credits,
                                price: updates.amount !== undefined ? updates.amount : editingSale.amount,
                                upcomingMembership: null // Clear upcoming
                            };
                            if (originalData.upcomingMembership.membershipType) {
                                memberUpdates.membershipType = originalData.upcomingMembership.membershipType;
                            }
                            try {
                                await storageService.updateMember(originalData.id, memberUpdates);
                                alert("선결제 수강권이 현재 진행 중인 수강권으로 갱신되었습니다.");
                            } catch(memberErr) {
                                console.error("Auto promote member failed:", memberErr);
                            }
                        }
                    } else {
                        const upcomingUpdates = { ...originalData.upcomingMembership };
                        if (updates.startDate) upcomingUpdates.startDate = updates.startDate;
                        if (updates.endDate) upcomingUpdates.endDate = updates.endDate;
                        if (updates.credits !== undefined) upcomingUpdates.credits = updates.credits;
                        if (updates.amount !== undefined) upcomingUpdates.price = updates.amount;
                        
                        try {
                            await storageService.updateMember(originalData.id, { upcomingMembership: upcomingUpdates });
                            alert("결제 내역 수정사항이 대기 중인(선결제) 수강권 정보에도 연동되었습니다.");
                        } catch(memberErr) {
                            console.error("Auto sync upcoming member failed:", memberErr);
                        }
                    }
                } else if (updates.startDate || updates.endDate || updates.credits !== undefined) {
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
        if (!confirm(`"${itemName}" 결제 내역을 삭제하시겠습니까?\n\n삭제된 내역은 휴지통에서 복원할 수 있습니다.`)) return;
        try {
            await storageService.deleteSalesRecord(salesId);
            setHistory(prev => prev.filter(h => h.id !== salesId));
        } catch (e) {
            alert('삭제 중 오류가 발생했습니다: ' + e.message);
        }
    };

    return (
        <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* --- TOP: EDIT FORM --- */}
            {editingSale ? (
                <div style={{ background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--primary-gold)', borderRadius: '12px', padding: '15px' }}>
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
                                <input
                                    type="number"
                                    value={saleEditData.credits}
                                    onChange={(e) => setSaleEditData({ ...saleEditData, credits: Number(e.target.value) })}
                                    style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 'bold', width: '40px', textAlign: 'center', fontSize: '1rem', outline: 'none' }}
                                    min="0"
                                />
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
                                        background: 'var(--primary-gold)', color: 'var(--text-on-primary)',
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

                    {/* 강사(instructor)가 아닌 일반 회원만 수강권 정보 표시 */}
                    {originalData?.role !== 'instructor' && (<>
                    <InputGroup
                        label="회원권 구분"
                        value={editData.membershipType}
                        onChange={v => setEditData({ ...editData, membershipType: v })}
                        type="select"
                        options={(() => {
                            const pricingKeys = Object.keys(pricingConfig || {}).filter(k => k !== '_meta');
                            const opts = pricingKeys.map(k => ({ value: k, label: getTypeLabel(k) }));
                            const currentType = editData.membershipType;
                            if (currentType && !pricingKeys.includes(currentType)) {
                                opts.unshift({ value: currentType, label: `${getTypeLabel(currentType)} (미등록)` });
                            }
                            return opts;
                        })()}
                    />
                    <InputGroup label="세부 이용권" value={editData.subject || ''} onChange={v => setEditData({ ...editData, subject: v })} />

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
                                    const start = new Date(v + 'T00:00:00+09:00');
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
                    </>)}

                    <InputGroup 
                        label="원장 메모 / 기타 특이사항" 
                        value={editData.notes || ''} 
                        onChange={v => setEditData({ ...editData, notes: v })} 
                        type="textarea" 
                    />

                    {/* 얼굴인식 관리 섹션 — 강사가 아닌 회원만 표시 */}
                    {originalData?.role !== 'instructor' && (
                    <div style={{
                        background: originalData?.hasFaceDescriptor 
                            ? 'rgba(99, 102, 241, 0.08)' 
                            : 'rgba(255, 255, 255, 0.03)',
                        border: originalData?.hasFaceDescriptor 
                            ? '1px solid rgba(99, 102, 241, 0.2)' 
                            : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: originalData?.hasFaceDescriptor 
                                        ? 'rgba(99, 102, 241, 0.15)' 
                                        : 'rgba(255, 255, 255, 0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: originalData?.hasFaceDescriptor 
                                        ? '1px solid rgba(99, 102, 241, 0.3)' 
                                        : '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    <UserFocus 
                                        size={20} 
                                        weight={originalData?.hasFaceDescriptor ? 'fill' : 'regular'} 
                                        color={originalData?.hasFaceDescriptor ? '#818CF8' : '#52525b'} 
                                    />
                                </div>
                                <div>
                                    <div style={{ 
                                        fontSize: '0.9rem', fontWeight: 'bold', 
                                        color: originalData?.hasFaceDescriptor ? '#818CF8' : '#71717a' 
                                    }}>
                                        {originalData?.hasFaceDescriptor ? '📸 안면 인식 등록 완료' : '안면 데이터 미등록'}
                                    </div>
                                    {originalData?.hasFaceDescriptor && originalData?.faceUpdatedAt && (
                                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '2px' }}>
                                            학습일: {new Date(originalData.faceUpdatedAt).toLocaleDateString('ko-KR')}
                                        </div>
                                    )}
                                    {!originalData?.hasFaceDescriptor && (
                                        <div style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '2px' }}>
                                            키오스크 체크인에서 등록 가능
                                        </div>
                                    )}
                                </div>
                            </div>
                            {originalData?.hasFaceDescriptor && (
                                <button
                                    onClick={async () => {
                                        if (!confirm('안면 인식 데이터를 삭제하시겠습니까?\n\n삭제 후 키오스크에서 다시 등록할 수 있습니다.')) return;
                                        setIsDeletingFace(true);
                                        try {
                                            const result = await memberService.deleteFaceDescriptor(originalData.id);
                                            if (result.success) {
                                                alert('안면 인식 데이터가 삭제되었습니다.\n키오스크에서 다시 등록해주세요.');
                                                storageService.notifyListeners('members');
                                            } else {
                                                alert('삭제에 실패했습니다: ' + (result.error || '알 수 없는 오류'));
                                            }
                                        } catch (e) {
                                            console.error('Face delete failed:', e);
                                            alert('삭제 중 오류가 발생했습니다.');
                                        } finally {
                                            setIsDeletingFace(false);
                                        }
                                    }}
                                    disabled={isDeletingFace}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        color: '#ef4444',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        cursor: isDeletingFace ? 'not-allowed' : 'pointer',
                                        opacity: isDeletingFace ? 0.5 : 1,
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Trash size={14} /> {isDeletingFace ? '삭제 중...' : '삭제 후 재등록'}
                                </button>
                            )}
                        </div>
                    </div>
                    )}

                    {(() => {
                        const editableKeys = ['name', 'phone', 'membershipType', 'subject', 'regDate', 'startDate', 'endDate', 'credits', 'price', 'notes'];
                        const hasChanges = editableKeys.some(key => {
                            const orig = originalData[key] ?? '';
                            const curr = editData[key] ?? '';
                            if (key === 'price') return Number(orig) !== Number(curr);
                            return orig != curr;
                        });
                        
                        if (!hasChanges || !isDirtyByUser) return null;

                        return (
                            <button
                                onClick={onSave}
                                style={{ padding: '15px', borderRadius: '10px', border: 'none', background: 'var(--primary-gold)', color: 'var(--text-on-primary)', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '10px' }}
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
                        {[...history].sort((a, b) => {
                            const aIsCurrent = isCurrentRecord(a, originalData);
                            const bIsCurrent = isCurrentRecord(b, originalData);
                            if (aIsCurrent && !bIsCurrent) return -1;
                            if (!aIsCurrent && bIsCurrent) return 1;
                            
                            const aTime = a.timestamp ? new Date(a.timestamp).getTime() : new Date(a.date || 0).getTime();
                            const bTime = b.timestamp ? new Date(b.timestamp).getTime() : new Date(b.date || 0).getTime();
                            return bTime - aTime;
                        }).map((record) => {
                            const isCurrent = isCurrentRecord(record, originalData);
                            const isSelected = editingSale?.id === record.id || (!editingSale && isCurrent);
                            const dDate = record.timestamp ? new Date(record.timestamp) : new Date(record.date || Date.now());
                            const isAdvance = record.startDate && record.startDate !== 'TBD' && record.endDate !== 'TBD' && record.startDate > new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

                            return (
                                <div 
                                    key={record.id} 
                                    onClick={() => {
                                        const isCurrent = isCurrentRecord(record, originalData);
                                        
                                        if (isCurrent) {
                                            const container = document.querySelector('.fade-in');
                                            if (container) {
                                                container.scrollTo({ top: 0, behavior: 'smooth' });
                                                setEditingSale(null);
                                                setSaleEditData(null);
                                            }
                                            return;
                                        }

                                        setEditingSale(record);
                                        const isUpcoming = originalData.upcomingMembership && record.startDate && record.endDate && originalData.upcomingMembership.startDate === record.startDate && originalData.upcomingMembership.endDate === record.endDate;
                                        
                                        let initialCredits = record.credits;
                                        if (initialCredits === undefined || initialCredits === 0) {
                                            if (isCurrent) initialCredits = originalData.credits;
                                            else if (isUpcoming) initialCredits = originalData.upcomingMembership.credits;
                                            else initialCredits = 0;
                                        }

                                        setSaleEditData({
                                            startDate: record.startDate || '',
                                            endDate: record.endDate || '',
                                            amount: record.amount !== undefined ? record.amount : 0,
                                            item: record.item || '',
                                            method: record.method || '',
                                            credits: initialCredits
                                        });
                                        document.querySelector('.fade-in').scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    style={{
                                        background: isSelected ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.05)',
                                        border: isSelected ? '1px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px', padding: '15px', cursor: 'pointer',
                                        transition: 'all 0.2s ease', position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: 'white', fontWeight: 'bold' }}>{record.item || '알 수 없음'}</span>
                                                {record.startDate && record.endDate && originalData.startDate === record.startDate && originalData.endDate === record.endDate && (
                                                    <span style={{ fontSize: '0.65rem', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                                        현재 활동 중
                                                    </span>
                                                )}
                                                {isAdvance && !(record.startDate && record.endDate && originalData.startDate === record.startDate && originalData.endDate === record.endDate) && (
                                                    <span style={{ fontSize: '0.65rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                                                        선등록 대기중
                                                    </span>
                                                )}
                                            </div>
                                            {record.startDate && record.endDate && (
                                                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '4px' }}>
                                                    📅 {record.startDate === 'TBD' ? '시작일 미정' : record.startDate} ~ {record.endDate === 'TBD' ? '첫 출석 시 확정' : record.endDate}
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

        {/* ━━━ 회원 삭제 ━━━ */}
        {(() => {
            const credits = Number(originalData.credits || 0);
            const endDate = originalData.endDate;
            const isTBD = endDate === 'TBD';
            let isActive = false;
            if (isTBD) {
                isActive = true;
            } else if (endDate) {
                const end = new Date(endDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                isActive = end >= today && credits > 0;
            }
            
            if (isActive) {
                // 활성/선등록 회원: 삭제 버튼 없음, 안내만
                return (
                    <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#71717a' }}>
                            {isTBD 
                                ? '🔒 선등록 회원은 삭제할 수 없습니다. 수강 만료 후 삭제가 가능합니다.'
                                : `🔒 활성 회원은 삭제할 수 없습니다. (잔여 ${credits}회 / 만료 ${endDate})`
                            }
                        </p>
                    </div>
                );
            }
            
            // 만료/비활성 회원: 삭제 버튼 표시
            return (
                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px' }}>
                    <button
                        onClick={async () => {
                            if (!confirm(`"${originalData.name}" 회원을 삭제하시겠습니까?\n\n삭제된 회원은 휴지통에서 복원할 수 있습니다.`)) return;
                            try {
                                const result = await storageService.softDeleteMember(originalData.id);
                                if (result.success) {
                                    alert('회원이 삭제되었습니다.\n휴지통 탭에서 복원할 수 있습니다.');
                                    if (typeof window !== 'undefined') window.dispatchEvent(new Event('member-deleted'));
                                } else {
                                    alert('삭제 실패: ' + (result.error || '알 수 없는 오류'));
                                }
                            } catch (e) {
                                alert('삭제 중 오류: ' + e.message);
                            }
                        }}
                        style={{
                            width: '100%', padding: '12px', borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.3)', background: 'transparent',
                            color: '#ef4444', fontSize: '0.85rem', fontWeight: '600',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <Trash size={16} weight="fill" />
                        회원 삭제 (휴지통으로 이동)
                    </button>
                    <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#71717a', textAlign: 'center' }}>
                        삭제된 회원은 회원 목록에서 사라지며, 휴지통 탭에서 언제든 복원할 수 있습니다.
                    </p>
                </div>
            );
        })()}
        </>
    );
};

export default MemberInfoTab;


export const determineStatusColor = (member) => {
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
