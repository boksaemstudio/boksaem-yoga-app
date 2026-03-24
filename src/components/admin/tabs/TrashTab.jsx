import React, { useState, useEffect, useCallback } from 'react';
import { storageService } from '../../../services/storage';
import { Trash, ArrowCounterClockwise, ClockCounterClockwise, CurrencyKrw, Spinner } from '@phosphor-icons/react';

const TrashTab = () => {
    const [deletedSales, setDeletedSales] = useState([]);
    const [deletedAttendance, setDeletedAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoringId, setRestoringId] = useState(null);
    const [activeSection, setActiveSection] = useState('all'); // 'all', 'attendance', 'sales'

    const loadDeletedItems = useCallback(async () => {
        setLoading(true);
        try {
            const [sales, attendance] = await Promise.all([
                storageService.getDeletedSales(),
                storageService.getDeletedAttendance()
            ]);
            setDeletedSales(sales || []);
            setDeletedAttendance(attendance || []);
        } catch (e) {
            console.error('[TrashTab] Load failed:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadDeletedItems(); }, [loadDeletedItems]);

    const handleRestoreSales = async (id) => {
        if (!confirm('이 매출 기록을 복원하시겠습니까?')) return;
        setRestoringId(id);
        try {
            await storageService.restoreSalesRecord(id);
            setDeletedSales(prev => prev.filter(s => s.id !== id));
        } catch (e) {
            alert('복원 실패: ' + e.message);
        } finally {
            setRestoringId(null);
        }
    };

    const handleRestoreAttendance = async (id) => {
        if (!confirm('이 출석 기록을 복원하시겠습니까?\n(크레딧이 다시 차감됩니다)')) return;
        setRestoringId(id);
        try {
            await storageService.restoreAttendance(id);
            setDeletedAttendance(prev => prev.filter(a => a.id !== id));
        } catch (e) {
            alert('복원 실패: ' + e.message);
        } finally {
            setRestoringId(null);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const formatAmount = (amount) => {
        if (!amount) return '-';
        return Number(amount).toLocaleString() + '원';
    };

    const totalCount = deletedSales.length + deletedAttendance.length;
    const filteredSales = activeSection === 'attendance' ? [] : deletedSales;
    const filteredAttendance = activeSection === 'sales' ? [] : deletedAttendance;

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
                <Spinner size={24} className="spin" style={{ marginRight: '8px' }} />
                삭제된 항목 불러오는 중...
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Trash size={24} weight="fill" style={{ color: 'var(--text-secondary)' }} />
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                        휴지통
                        {totalCount > 0 && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '8px', fontWeight: 400 }}>{totalCount}건</span>}
                    </h2>
                </div>
                <button onClick={loadDeletedItems} className="action-btn sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: 'none', fontSize: '0.75rem' }}>
                    <ArrowCounterClockwise size={14} style={{ marginRight: '4px' }} />
                    새로고침
                </button>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px' }}>
                {[
                    { key: 'all', label: '전체', count: totalCount },
                    { key: 'attendance', label: '출석', count: deletedAttendance.length, icon: <ClockCounterClockwise size={14} /> },
                    { key: 'sales', label: '매출', count: deletedSales.length, icon: <CurrencyKrw size={14} /> }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveSection(tab.key)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: activeSection === tab.key ? '1px solid var(--primary-gold)' : '1px solid var(--border-color)',
                            background: activeSection === tab.key ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                            color: activeSection === tab.key ? 'var(--primary-gold)' : 'var(--text-secondary)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab.icon} {tab.label} {tab.count > 0 && <span style={{ opacity: 0.7 }}>({tab.count})</span>}
                    </button>
                ))}
            </div>

            {/* Empty State */}
            {totalCount === 0 && (
                <div className="dashboard-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Trash size={48} style={{ color: 'var(--border-color)', marginBottom: '16px' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>삭제된 항목이 없습니다</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '8px' }}>출석 또는 매출을 삭제하면 이곳에 보관됩니다</p>
                </div>
            )}

            {/* Deleted Attendance */}
            {filteredAttendance.length > 0 && (
                <div className="dashboard-card">
                    <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <ClockCounterClockwise size={18} weight="fill" style={{ color: '#60a5fa' }} />
                        삭제된 출석 ({deletedAttendance.length}건)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredAttendance.map(log => (
                            <div key={log.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 16px', borderRadius: '10px',
                                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                                transition: 'background 0.15s'
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {log.memberName || '회원'}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(96,165,250,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                            {log.className || '일반'}
                                        </span>
                                        {log.branchId && (
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.branchId}</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        출석일: {log.date || '-'} · 삭제: {formatDate(log.deletedAt)}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRestoreAttendance(log.id)}
                                    disabled={restoringId === log.id}
                                    style={{
                                        padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(96,165,250,0.3)',
                                        background: 'rgba(96,165,250,0.08)', color: '#60a5fa',
                                        fontSize: '0.75rem', cursor: restoringId === log.id ? 'wait' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        opacity: restoringId === log.id ? 0.5 : 1,
                                        transition: 'all 0.2s', whiteSpace: 'nowrap'
                                    }}
                                >
                                    {restoringId === log.id ? <Spinner size={12} className="spin" /> : <ArrowCounterClockwise size={12} />}
                                    복원
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Deleted Sales */}
            {filteredSales.length > 0 && (
                <div className="dashboard-card">
                    <h3 className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <CurrencyKrw size={18} weight="fill" style={{ color: 'var(--primary-gold)' }} />
                        삭제된 매출 ({deletedSales.length}건)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredSales.map(sale => (
                            <div key={sale.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 16px', borderRadius: '10px',
                                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
                                transition: 'background 0.15s'
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-gold)' }}>
                                            {formatAmount(sale.amount)}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(var(--primary-rgb),0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                                            {sale.type || '재등록'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {sale.memberName || '회원'} · 결제일: {sale.date || formatDate(sale.timestamp)} · 삭제: {formatDate(sale.deletedAt)}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRestoreSales(sale.id)}
                                    disabled={restoringId === sale.id}
                                    style={{
                                        padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(var(--primary-rgb),0.3)',
                                        background: 'rgba(var(--primary-rgb),0.08)', color: 'var(--primary-gold)',
                                        fontSize: '0.75rem', cursor: restoringId === sale.id ? 'wait' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        opacity: restoringId === sale.id ? 0.5 : 1,
                                        transition: 'all 0.2s', whiteSpace: 'nowrap'
                                    }}
                                >
                                    {restoringId === sale.id ? <Spinner size={12} className="spin" /> : <ArrowCounterClockwise size={12} />}
                                    복원
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info */}
            {totalCount > 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                    복원 시 원래 위치로 되돌아가며, 출석 복원 시 크레딧이 다시 차감됩니다.
                </p>
            )}
        </div>
    );
};

export default TrashTab;
