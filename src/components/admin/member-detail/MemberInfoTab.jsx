import React, { useState, useEffect } from 'react';
import { Trash, PencilSimple, UserFocus, CaretDown, CaretUp } from '@phosphor-icons/react';
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
            <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} {...props} />
        )}
        {type === 'date' && (<CustomDatePicker value={value} onChange={onChange} />)}
        {type === 'select' && (
            <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
                {options.map(o => <option key={o.value} value={o.value} style={{ background: '#333', color: 'white' }}>{o.label}</option>)}
            </select>
        )}
        {type === 'textarea' && (
            <textarea value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} />
        )}
    </div>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 블록 1: 기본 정보 (이름/전화/등록일/메모/얼굴인식)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BasicInfoBlock = ({ editData, setEditData, originalData }) => {
    const [isDeletingFace, setIsDeletingFace] = useState(false);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>기본 정보</h3>
            <InputGroup label="이름" value={editData.name} onChange={v => setEditData({ ...editData, name: v })} lang="ko" autoComplete="off" />
            <InputGroup label="전화번호" value={editData.phone} onChange={v => setEditData({ ...editData, phone: v })} type="tel" inputMode="numeric" pattern="[0-9]*" autoComplete="off" />
            <InputGroup label="등록일" value={editData.regDate || ''} onChange={v => setEditData({ ...editData, regDate: v })} type="date" />
            <InputGroup label="원장 메모 / 기타 특이사항" value={editData.notes || ''} onChange={v => setEditData({ ...editData, notes: v })} type="textarea" />

            {/* 얼굴인식 관리 */}
            {originalData?.role !== 'instructor' && (
                <div style={{
                    background: originalData?.hasFaceDescriptor ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    border: originalData?.hasFaceDescriptor ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px', padding: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '10px',
                                background: originalData?.hasFaceDescriptor ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: originalData?.hasFaceDescriptor ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                <UserFocus size={20} weight={originalData?.hasFaceDescriptor ? 'fill' : 'regular'} color={originalData?.hasFaceDescriptor ? '#818CF8' : '#52525b'} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: originalData?.hasFaceDescriptor ? '#818CF8' : '#71717a' }}>
                                    {originalData?.hasFaceDescriptor ? '📸 안면 인식 등록 완료' : '안면 데이터 미등록'}
                                </div>
                                {originalData?.hasFaceDescriptor && originalData?.faceUpdatedAt && (
                                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '2px' }}>
                                        학습일: {new Date(originalData.faceUpdatedAt).toLocaleDateString('ko-KR')}
                                    </div>
                                )}
                                {!originalData?.hasFaceDescriptor && (
                                    <div style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '2px' }}>키오스크 체크인에서 등록 가능</div>
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
                                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444', padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem',
                                    fontWeight: 'bold', cursor: isDeletingFace ? 'not-allowed' : 'pointer',
                                    opacity: isDeletingFace ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '5px'
                                }}
                            >
                                <Trash size={14} /> {isDeletingFace ? '삭제 중...' : '삭제 후 재등록'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 블록 2: 회원권 현황 (읽기전용 카드 + 수동 조정)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MembershipBlock = ({ editData, setEditData, originalData, pricingConfig, getTypeLabel }) => {
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const upcoming = originalData?.upcomingMembership;

    // 현재 회원권 상태 판정
    const credits = Number(originalData?.credits || 0);
    const endDate = originalData?.endDate;
    const isTBD = endDate === 'TBD';
    let statusLabel = '만료됨';
    let statusColor = '#ef4444';
    if (isTBD) { statusLabel = '첫 출석 대기'; statusColor = 'var(--primary-gold)'; }
    else if (endDate && endDate >= todayStr && credits > 0) { statusLabel = '이용 중'; statusColor = '#10b981'; }
    else if (endDate && endDate >= todayStr && credits <= 0) { statusLabel = '횟수 소진'; statusColor = '#f59e0b'; }
    else if (endDate && endDate < todayStr) { statusLabel = '기간 만료'; statusColor = '#ef4444'; }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>회원권 현황</h3>

            {/* ── 현재 활성 회원권 카드 ── */}
            <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            fontSize: '0.75rem', background: `${statusColor}20`, color: statusColor,
                            padding: '3px 10px', borderRadius: '6px', fontWeight: 'bold', border: `1px solid ${statusColor}40`
                        }}>
                            {statusLabel}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: '600' }}>
                            {getTypeLabel(originalData?.membershipType)}
                        </span>
                    </div>
                    {originalData?.price > 0 && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--primary-gold)', fontWeight: 'bold' }}>
                            {originalData.price.toLocaleString()}원
                        </span>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#71717a', marginBottom: '4px' }}>시작일</div>
                        <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: '600' }}>
                            {isTBD ? '첫 출석 시' : originalData?.startDate || '-'}
                        </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#71717a', marginBottom: '4px' }}>종료일</div>
                        <div style={{ fontSize: '0.85rem', color: statusColor, fontWeight: '600' }}>
                            {isTBD ? '첫 출석 시 확정' : endDate || '-'}
                        </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#71717a', marginBottom: '4px' }}>잔여</div>
                        <div style={{ fontSize: '0.85rem', color: credits <= 2 ? '#f59e0b' : 'white', fontWeight: '600' }}>
                            {credits >= 999 ? '무제한' : `${credits}회`}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 다가올 수강권 (선등록) ── */}
            {upcoming && (
                <div style={{
                    background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)',
                    borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', background: 'var(--primary-gold)', color: '#000', padding: '3px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
                            다가올 수강권 (선등록)
                        </span>
                        {upcoming.membershipType && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary-gold)', fontWeight: '600' }}>
                                {getTypeLabel(upcoming.membershipType)}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#a1a1aa', marginBottom: '4px' }}>시작일</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--primary-gold)', fontWeight: 'bold' }}>
                                {upcoming.startDate === 'TBD' ? '첫 출석 시' : upcoming.startDate}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#a1a1aa', marginBottom: '4px' }}>종료일</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--primary-gold)', fontWeight: 'bold' }}>
                                {upcoming.endDate === 'TBD' ? '첫 출석 시 확정' : upcoming.endDate}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#a1a1aa', marginBottom: '4px' }}>횟수</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--primary-gold)', fontWeight: 'bold' }}>
                                {(upcoming.credits >= 999) ? '무제한' : `${upcoming.credits}회`}
                            </div>
                        </div>
                    </div>
                    {upcoming.price > 0 && (
                        <div style={{ fontSize: '0.8rem', color: '#a1a1aa', textAlign: 'right' }}>
                            결제 금액: <span style={{ color: 'var(--primary-gold)', fontWeight: 'bold' }}>{upcoming.price.toLocaleString()}원</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── 관리자 수동 조정 ── */}
            {originalData?.role !== 'instructor' && (
                <div style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PencilSimple size={16} color="#a1a1aa" />
                        <span style={{ fontSize: '0.8rem', color: '#a1a1aa', fontWeight: '600' }}>관리자 수동 조정</span>
                    </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>잔여 횟수</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => setEditData({ ...editData, credits: Math.max(0, (editData.credits || 0) - 1) })} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white', border: 'none', cursor: 'pointer' }}>-</button>
                            <span style={{ fontWeight: 'bold', color: 'white', minWidth: '30px', textAlign: 'center' }}>{editData.credits}</span>
                            <button onClick={() => setEditData({ ...editData, credits: (editData.credits || 0) + 1 })} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white', border: 'none', cursor: 'pointer' }}>+</button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
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
            )}
        </div>
    );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 블록 3: 결제 이력 (접이식) -> 수강권 타임라인
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PaymentHistoryBlock = ({ originalData, getTypeLabel }) => {
    const [isOpen, setIsOpen] = useState(false);
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
            } catch (e) { console.error("Fetch sales history failed:", e); }
        };
        fetchHistory();
        return () => { isMounted = false; };
    }, [originalData?.id, isSavingSale]);

    const handleSaleSave = async () => {
        try {
            setIsSavingSale(true);
            const updates = {};
            if (saleEditData.startDate !== editingSale.startDate) updates.startDate = saleEditData.startDate;
            if (saleEditData.endDate !== editingSale.endDate) updates.endDate = saleEditData.endDate;
            if (saleEditData.amount !== editingSale.amount) updates.amount = saleEditData.amount;
            if (saleEditData.item !== editingSale.item) updates.item = saleEditData.item;
            if (saleEditData.method !== editingSale.method) updates.method = saleEditData.method;
            
            if (Object.keys(updates).length > 0) {
                const hasDateChange = updates.startDate !== undefined || updates.endDate !== undefined;
                let syncTarget = null; // 'current' | 'upcoming' | null
                
                if (hasDateChange) {
                    // 확인: 이 영수증이 현재 회원권인지, 다가올 회원권인지 추정
                    if (originalData.startDate === editingSale.startDate && originalData.endDate === editingSale.endDate) syncTarget = 'current';
                    else if (originalData.upcomingMembership?.startDate === editingSale.startDate && originalData.upcomingMembership?.endDate === editingSale.endDate) syncTarget = 'upcoming';

                    if (syncTarget) {
                        const targetName = syncTarget === 'current' ? '현재 이용 중인 수강권' : '다가올 수강권(선등록)';
                        if (confirm(`영수증의 날짜가 변경되었습니다.\n연결된 [${targetName}]의 기간도 이 영수증과 똑같이 맞출까요?`)) {
                            const memberUpdates = {};
                            if (syncTarget === 'current') {
                                if (updates.startDate !== undefined) memberUpdates.startDate = updates.startDate;
                                if (updates.endDate !== undefined) memberUpdates.endDate = updates.endDate;
                            } else {
                                memberUpdates.upcomingMembership = { ...originalData.upcomingMembership };
                                if (updates.startDate !== undefined) memberUpdates.upcomingMembership.startDate = updates.startDate;
                                if (updates.endDate !== undefined) memberUpdates.upcomingMembership.endDate = updates.endDate;
                            }
                            await memberService.updateMember(originalData.id, memberUpdates);
                            alert(`[${targetName}] 기간도 성공적으로 동기화되었습니다.`);
                            // 상태 리로드를 위해 이벤트를 좀 트리거해주는게 좋지만, 일단 storageService 리스너가 처리해줌
                            storageService.notifyListeners('members');
                        }
                    } else {
                        alert('영수증 내역만 변경되었습니다.\n(참고: 회원의 실제 출석 기간 변경이 필요하면 상단의 "수동 조정"을 이용하세요.)');
                    }
                }

                await storageService.updateSalesRecord(editingSale.id, updates);
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

    const getSaleBadge = (record) => {
        const up = originalData?.upcomingMembership;
        if (up && record.startDate === up.startDate && record.endDate === up.endDate && record.amount === up.price) {
            return { label: '이용 대기', bg: 'rgba(250, 204, 21, 0.15)', color: '#facc15', border: '1px solid rgba(250, 204, 21, 0.3)' };
        }
        if (originalData?.startDate === record.startDate && originalData?.endDate === record.endDate) {
            return { label: '현재 이용', bg: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)' };
        }
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        if (record.endDate && record.endDate !== 'TBD' && record.endDate < todayStr) {
            return { label: '기간 만료', bg: 'rgba(255,255,255,0.05)', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.1)' };
        }
        return null; // 뱃지 없음
    };

    return (
        <div>
            {/* 접이식 헤더 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', cursor: 'pointer', color: 'white'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>수강권 및 결제 (타임라인)</h3>
                    <span style={{ fontSize: '0.75rem', color: '#71717a', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '10px' }}>
                        {history.length}건
                    </span>
                </div>
                {isOpen ? <CaretUp size={18} color="#a1a1aa" /> : <CaretDown size={18} color="#a1a1aa" />}
            </button>

            {/* 접이식 내용 */}
            {isOpen && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* 결제건 수정 폼 */}
                    {editingSale && saleEditData && (
                        <div style={{ background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid var(--primary-gold)', borderRadius: '12px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ color: 'var(--primary-gold)', margin: 0, fontSize: '0.9rem' }}>
                                    <PencilSimple size={16} style={{ marginRight: '6px' }} />결제 내역 수정
                                </h4>
                                <button onClick={() => { setEditingSale(null); setSaleEditData(null); }} style={{ background: 'none', border: '1px solid #52525b', color: '#a1a1aa', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>취소</button>
                            </div>
                            <InputGroup label="수강권 항목 이름" value={saleEditData.item || ''} onChange={v => setSaleEditData({ ...saleEditData, item: v })} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <InputGroup label="시작일" value={saleEditData.startDate || ''} onChange={v => setSaleEditData({ ...saleEditData, startDate: v })} type="date" />
                                <InputGroup label="종료일" value={saleEditData.endDate || ''} onChange={v => setSaleEditData({ ...saleEditData, endDate: v })} type="date" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <InputGroup label="결제수단" value={saleEditData.method || ''} onChange={v => setSaleEditData({ ...saleEditData, method: v })} type="select" options={[
                                    {label: '현금', value: 'cash'}, {label: '이체', value: 'transfer'}, {label: '카드', value: 'card'}
                                ]} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>결제 금액</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input
                                            type="text"
                                            value={(saleEditData.amount || 0).toLocaleString()}
                                            onChange={(e) => setSaleEditData({ ...saleEditData, amount: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                                            style={{ ...inputStyle, flex: 1, textAlign: 'right', color: 'var(--primary-gold)', fontWeight: 'bold' }}
                                        />
                                        <span style={{ color: '#a1a1aa' }}>원</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleSaleSave}
                                disabled={isSavingSale}
                                style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'var(--primary-gold)', color: 'var(--text-on-primary)', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}
                            >
                                {isSavingSale ? '저장 중...' : '결제 내역 저장'}
                            </button>
                        </div>
                    )}

                    {/* 결제 기록 리스트 */}
                    {history.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#71717a', padding: '20px', fontSize: '0.9rem' }}>
                            결제 내역이 없습니다.
                        </div>
                    ) : (
                        history.map(record => {
                            const dDate = record.timestamp ? new Date(record.timestamp) : new Date(record.date || Date.now());
                            const isEditing = editingSale?.id === record.id;
                            const badge = getSaleBadge(record);

                            return (
                                <div key={record.id} style={{
                                    background: isEditing ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255,255,255,0.03)',
                                    border: isEditing ? '1px solid var(--primary-gold)' : '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '10px', padding: '14px', transition: 'all 0.2s',
                                    borderLeft: badge ? `3px solid ${badge.color}` : '1px solid rgba(255,255,255,0.06)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                {badge && (
                                                    <span style={{
                                                        background: badge.bg, border: badge.border, color: badge.color,
                                                        padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold'
                                                    }}>
                                                        {badge.label}
                                                    </span>
                                                )}
                                                <span style={{ color: 'white', fontWeight: '600', fontSize: '0.9rem' }}>{record.item || '알 수 없음'}</span>
                                            </div>
                                            {record.startDate && record.endDate && (
                                                <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '3px' }}>
                                                    📅 {record.startDate === 'TBD' ? '시작일 미정' : record.startDate} ~ {record.endDate === 'TBD' ? '첫 출석 시 확정' : record.endDate}
                                                </div>
                                            )}
                                        </div>
                                        <span style={{ color: 'var(--primary-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                            {(record.amount || 0).toLocaleString()}원
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '0.78rem', color: '#52525b' }}>
                                            {record.method === 'transfer' ? '이체' : record.method === 'cash' ? '현금' : record.method === 'card' ? '카드' : record.method || ''} · {dDate.toLocaleDateString('ko-KR')}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingSale(record);
                                                    setSaleEditData({
                                                        startDate: record.startDate || '',
                                                        endDate: record.endDate || '',
                                                        amount: record.amount !== undefined ? record.amount : 0,
                                                        item: record.item || '',
                                                        method: record.method || ''
                                                    });
                                                }}
                                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', cursor: 'pointer' }}
                                            >
                                                <PencilSimple size={12} /> 수정
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteSale(record.id, record.item); }}
                                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', cursor: 'pointer' }}
                                            >
                                                <Trash size={12} /> 삭제
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const MemberInfoTab = ({ editData, setEditData, onSave, pricingConfig, originalData, isDirtyByUser }) => {
    const { config } = useStudioConfig();
    const getTypeLabel = (key) => getMembershipLabel(key, config);

    return (
        <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* ━━━ 블록 1: 기본 정보 ━━━ */}
            <BasicInfoBlock editData={editData} setEditData={setEditData} originalData={originalData} />

            {/* ━━━ 구분선 ━━━ */}
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0' }} />

            {/* ━━━ 블록 2: 회원권 현황 ━━━ */}
            {originalData?.role !== 'instructor' && (
                <MembershipBlock editData={editData} setEditData={setEditData} originalData={originalData} pricingConfig={pricingConfig} getTypeLabel={getTypeLabel} />
            )}

            {/* ━━━ 저장 버튼 ━━━ */}
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
                        style={{ padding: '15px', borderRadius: '10px', border: 'none', background: 'var(--primary-gold)', color: 'var(--text-on-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}
                    >
                        회원정보 저장하기
                    </button>
                );
            })()}

            {/* ━━━ 구분선 ━━━ */}
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0' }} />

            {/* ━━━ 블록 3: 수강권 타임라인 ━━━ */}
            <PaymentHistoryBlock originalData={originalData} getTypeLabel={getTypeLabel} />

            {/* ━━━ 회원 삭제 ━━━ */}
            {(() => {
                const credits = Number(originalData.credits || 0);
                const endDate = originalData.endDate;
                const isTBD = endDate === 'TBD';
                let isActive = false;
                if (isTBD) { isActive = true; }
                else if (endDate) {
                    const end = new Date(endDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    isActive = end >= today && credits > 0;
                }

                if (isActive) {
                    return (
                        <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#71717a' }}>
                                {isTBD
                                    ? '🔒 선등록 회원은 삭제할 수 없습니다. 수강 만료 후 삭제가 가능합니다.'
                                    : `🔒 활성 회원은 삭제할 수 없습니다. (잔여 ${credits}회 / 만료 ${endDate})`
                                }
                            </p>
                        </div>
                    );
                }

                return (
                    <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px' }}>
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
        </div>
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
