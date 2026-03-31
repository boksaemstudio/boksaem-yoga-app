import { useState, useEffect, useMemo } from 'react';
import { BellRinging, User, Users, Clock, CheckCircle, WarningCircle, CaretLeft, CaretRight, FunnelSimple } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';
import { useStudioConfig } from '../../../contexts/StudioContext';

const PAGE_SIZE = 20;

const PushHistoryTab = ({ onSelectMember, setActiveTab, pendingApprovals = [], onApprove, onReject }) => {
    const { config } = useStudioConfig();
    const primaryColor = config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)';
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'sent' | 'failed'
    const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD
    const [searchText, setSearchText] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const unsub = storageService.subscribeToPushHistory((data) => {
            setHistory(data);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    // Reset page when filters change
    useEffect(() => { setCurrentPage(1); }, [statusFilter, dateFilter, searchText]);

    // Filtered data
    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            // Status filter
            if (statusFilter !== 'all' && item.status !== statusFilter) return false;

            // Date filter
            if (dateFilter) {
                const itemDate = item.displayDate || item.createdAt;
                if (!itemDate) return false;
                const d = typeof itemDate === 'string' ? itemDate : (itemDate.toDate ? itemDate.toDate().toISOString() : '');
                if (!d.startsWith(dateFilter)) return false;
            }

            // Search text (member name or body)
            if (searchText) {
                const q = searchText.toLowerCase();
                const name = (item.memberName || item.targetMemberName || '').toLowerCase();
                const body = (item.body || item.content || '').toLowerCase();
                if (!name.includes(q) && !body.includes(q)) return false;
            }

            return true;
        });
    }, [history, statusFilter, dateFilter, searchText]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
    const pagedHistory = filteredHistory.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.5 }}>로딩 중...</div>;
    }

    return (
        <div className="dashboard-card shadow-lg" style={{ background: 'rgba(25,25,25,0.7)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                    <h3 className="outfit-font" style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>알림 발송 기록</h3>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.5, fontSize: '0.85rem' }}>단체 및 개별 푸시 알림 발송 이력입니다.</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: primaryColor }}>{filteredHistory.length}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{statusFilter === 'all' ? '전체' : statusFilter === 'sent' ? '성공' : '실패'} 건수</div>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div style={{
                display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px',
                padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)', alignItems: 'center'
            }}>
                <FunnelSimple size={18} style={{ opacity: 0.5, flexShrink: 0 }} />

                {/* Status Filter */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                        { id: 'all', label: '전체', color: '#a1a1aa' },
                        { id: 'sent', label: '성공', color: '#28A745' },
                        { id: 'failed', label: '실패', color: '#EF4444' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setStatusFilter(f.id)}
                            style={{
                                padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                                border: statusFilter === f.id ? `1px solid ${f.color}` : '1px solid rgba(255,255,255,0.08)',
                                background: statusFilter === f.id ? `${f.color}20` : 'transparent',
                                color: statusFilter === f.id ? f.color : '#a1a1aa',
                                cursor: 'pointer', transition: 'all 0.15s'
                            }}
                        >{f.label}</button>
                    ))}
                </div>

                {/* Date Filter */}
                <input
                    type="date"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    onClick={e => { try { e.target.showPicker?.(); } catch(err) {} }}
                    style={{
                        padding: '5px 10px', borderRadius: '8px', fontSize: '0.8rem',
                        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                        color: dateFilter ? '#fff' : '#71717a', cursor: 'pointer', fontFamily: 'var(--font-main)'
                    }}
                />
                {dateFilter && (
                    <button onClick={() => setDateFilter('')} style={{
                        padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem',
                        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(239,68,68,0.1)',
                        color: '#EF4444', cursor: 'pointer'
                    }}>날짜 초기화</button>
                )}

                {/* Search */}
                <input
                    type="text"
                    placeholder="회원명/내용 검색..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    style={{
                        flex: 1, minWidth: '120px', padding: '5px 12px', borderRadius: '8px',
                        fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none'
                    }}
                />
            </div>

            <div className="card-list">
                {/* Pending Approvals Section */}
                {pendingApprovals.length > 0 && (
                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ color: '#FFC107', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <WarningCircle weight="fill" /> 승인 대기 메시지 ({pendingApprovals.length})
                        </h4>
                        {pendingApprovals.map(item => (
                            <div key={item.id} className="glass-panel" style={{
                                padding: '20px', marginBottom: '15px',
                                border: '1px solid rgba(255, 193, 7, 0.3)',
                                background: 'rgba(255, 193, 7, 0.05)', borderRadius: '12px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <div>
                                        <span style={{ 
                                            background: '#FFC107', color: 'var(--text-on-primary)', 
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', marginRight: '8px' 
                                        }}>
                                            {item.type === 'low_credits' ? '크레딧 알림' : (item.type === 'notice' ? '공지 발송' : '기타 알림')}
                                        </span>
                                        <span style={{ fontSize: '0.9rem', color: '#FFF' }}>{item.title}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                        {new Date(item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                                    </div>
                                </div>
                                <div style={{ 
                                    background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', 
                                    marginBottom: '15px', whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.5 
                                }}>
                                    {item.body}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                                        발송 대상: {item.targetMemberIds?.length || 0}명
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button 
                                            onClick={() => onReject(item.id)}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)',
                                                background: 'transparent', color: '#FFF', cursor: 'pointer'
                                            }}
                                        >삭제</button>
                                        <button 
                                            onClick={() => onApprove(item.id, item.title)}
                                            style={{
                                                padding: '8px 20px', borderRadius: '8px', border: 'none',
                                                background: '#FFC107', color: 'var(--text-on-primary)', fontWeight: 'bold', cursor: 'pointer'
                                            }}
                                        >승인 및 발송</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <h4 style={{ margin: '0 0 15px 0', opacity: 0.7 }}>발송 이력</h4>
                {pagedHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.5 }}>
                        <BellRinging size={48} style={{ marginBottom: '15px' }} />
                        <p>{history.length > 0 ? '조건에 맞는 기록이 없습니다.' : '발송 기록이 없습니다.'}</p>
                    </div>
                ) : (
                    pagedHistory.map(item => {
                        const isNotice = item.type === 'campaign' || item.type === 'notice';
                        const isClickable = (item.type === 'individual' && item.targetMemberId) || isNotice;
                        
                        let label = '알 수 없음';
                        if (item.type === 'campaign') label = '앱 푸시 (단체)';
                        else if (item.type === 'notice') label = '공지 알림';
                        else if (item.type === 'individual') label = `앱 푸시 (${item.memberName || item.targetMemberName || '알 수 없음'})`;
                        else if (item.type === 'sms_msg' || item.method === '문자') label = '문자 발송';
                        
                        const isSms = item.type === 'sms_msg' || item.method === '문자';
                        
                        return (
                            <div 
                                key={item.id} 
                                className="glass-panel" 
                                onClick={() => {
                                    if (item.type === 'individual' && item.targetMemberId && onSelectMember) {
                                        onSelectMember(item.targetMemberId);
                                    } else if (isNotice && setActiveTab) {
                                        setActiveTab('notices');
                                    }
                                }}
                                style={{
                                    marginBottom: '15px', padding: '20px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '12px', position: 'relative',
                                    transition: 'all 0.2s ease',
                                    cursor: isClickable ? 'pointer' : 'default'
                                }}
                                onMouseEnter={(e) => { if (isClickable) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                onMouseLeave={(e) => { if (isClickable) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            background: isSms ? 'rgba(74, 222, 128, 0.15)' : (isNotice ? `${primaryColor}20` : 'rgba(59, 130, 246, 0.15)'),
                                            color: isSms ? '#4ADE80' : (isNotice ? primaryColor : '#3B82F6'),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {isSms ? <span style={{ fontSize: '1.2rem' }}>💬</span> : (isNotice ? <Users size={20} weight="fill" /> : <User size={20} weight="fill" />)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', color: isSms ? '#4ADE80' : (isNotice ? primaryColor : '#3B82F6') }}>
                                                {label}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} /> {new Date(item.displayDate).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {isNotice && (
                                            <span style={{
                                                fontSize: '0.65rem', padding: '2px 8px', borderRadius: '20px',
                                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)'
                                            }}>
                                                {item.totalTargets > 0 ? `${item.totalTargets}명` : (item.target === 'all' ? '전체' : '단체')}
                                            </span>
                                        )}
                                        <span style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            fontSize: '0.65rem', padding: '2px 8px', borderRadius: '20px',
                                            background: item.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : (item.status === 'pending' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(40, 167, 69, 0.1)'),
                                            color: item.status === 'failed' ? '#EF4444' : (item.status === 'pending' ? '#FFC107' : '#28A745'),
                                            border: `1px solid ${item.status === 'failed' ? 'rgba(239, 68, 68, 0.2)' : (item.status === 'pending' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(40, 167, 69, 0.2)')}`
                                        }}>
                                            {item.status === 'failed' ? <WarningCircle size={10} /> : (item.status === 'pending' ? <WarningCircle size={10} /> : <CheckCircle size={10} />)}
                                            {item.status === 'failed' ? '발송 실패' : (item.status === 'pending' ? '전송 중' : '발송 완료')}
                                        </span>
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '0.9rem', opacity: 0.9, lineHeight: 1.6,
                                    background: item.status === 'failed' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0,0,0,0.2)',
                                    border: item.status === 'failed' ? '1px dashed rgba(239, 68, 68, 0.2)' : 'none',
                                    padding: '12px 15px', borderRadius: '8px',
                                    color: item.status === 'failed' ? '#FCA5A5' : 'rgba(255,255,255,0.85)',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {item.body || item.content}
                                    {item.status === 'failed' && (
                                        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#EF4444', fontWeight: 'bold' }}>
                                            원인: {item.error || '뿌리오 연동 설정 등'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div style={{
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px',
                        marginTop: '20px', padding: '15px 0', borderTop: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: currentPage === 1 ? 'transparent' : 'rgba(255,255,255,0.05)',
                                color: currentPage === 1 ? '#52525b' : '#fff',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                            }}
                        ><CaretLeft size={14} /> 이전</button>

                        <span style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>
                            <span style={{ color: primaryColor, fontWeight: 700 }}>{currentPage}</span> / {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: currentPage === totalPages ? 'transparent' : 'rgba(255,255,255,0.05)',
                                color: currentPage === totalPages ? '#52525b' : '#fff',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                            }}
                        >다음 <CaretRight size={14} /></button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PushHistoryTab;
