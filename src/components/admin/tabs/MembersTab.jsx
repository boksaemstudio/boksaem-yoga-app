
import { Plus, Check, BellRinging, NotePencil, Info } from '@phosphor-icons/react';
import { getBranchName } from '../../../studioConfig';

const MembersTab = ({
    filteredMembers,
    summary,
    searchTerm,
    setSearchTerm,
    filterType,
    handleToggleFilter,
    selectExpiringMembers,
    selectedMemberIds,
    toggleMemberSelection,
    selectFilteredMembers,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    handleOpenEdit,
    setShowAddModal,
    pushTokens,
    getDormantSegments
}) => {
    return (
        <>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => setShowAddModal(true)} className="action-btn primary" style={{ flex: 'none', width: 'auto', minWidth: '350px', height: '54px', fontSize: '1.2rem', borderRadius: '12px', boxShadow: '0 8px 24px var(--primary-gold-glow)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Plus size={24} weight="bold" /> 신규 회원 등록하기
                </button>
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
                            <span className="tooltip-text">잔여 횟수 1회 이상이며(0회 제외)<br />만료일이 오늘 또는 이후인 회원</span>
                        </div>
                    </span>
                    <span className="card-value gold">{summary.activeMembers}명</span>
                </div>
                <div className={`dashboard-card interactive ${filterType === 'attendance' ? 'highlight' : ''}`}
                    onClick={() => handleToggleFilter('attendance')}>
                    <span className="card-label">오늘 출석</span>
                    <span className="card-value">{summary.todayAttendance}명 / <span style={{ fontSize: '1rem', opacity: 0.8 }}>{summary.totalAttendanceToday}회</span></span>
                    {/* [NEW] Denied Stats Display */}
                    {summary.deniedCount > 0 && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem', color: '#ff4d4f', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>⛔ 거부 {summary.deniedCount}명</span>
                            <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 'normal' }}>
                                (기간만료 {summary.deniedExpiredCount || 0}, 횟수소진 {summary.deniedNoCreditsCount || 0})
                            </span>
                        </div>
                    )}
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
                        만료/횟수 임박
                        <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                            <Info size={14} style={{ opacity: 0.7 }} />
                            <span className="tooltip-text" style={{ width: '220px', left: '-100px' }}>
                                잔여 1회 이하 또는<br />만료 7일 전 ~ 만료 후 30일 이내
                            </span>
                        </div>
                    </span>
                    <span className="card-value error">{summary.expiringMembersCount}명</span>
                </div>
                {/* [NEW] Dormant Members Card */}
                <div className={`dashboard-card interactive ${filterType === 'dormant' ? 'highlight' : ''}`}
                    onClick={() => handleToggleFilter('dormant')}
                    style={{ transition: 'all 0.3s ease', background: filterType === 'dormant' ? 'var(--primary-gold)' : 'linear-gradient(135deg, rgba(30, 30, 60, 0.4), rgba(50, 50, 80, 0.6))', border: filterType === 'dormant' ? 'none' : '1px solid rgba(100, 100, 255, 0.2)' }}>
                    <span className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: filterType === 'dormant' ? 'black' : '#A0A0FF' }}>
                        잠든 회원
                        <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                            <Info size={14} style={{ opacity: 0.7 }} />
                            <span className="tooltip-text" style={{ width: '220px', left: '-100px' }}>
                                활성 회원 중<br />최근 출석일 14일 이상 경과
                            </span>
                        </div>
                    </span>
                    <span className="card-value" style={{ color: filterType === 'dormant' ? 'black' : '#E0E0FF' }}>{summary.dormantMembersCount || 0}명</span>
                </div>
                {/* [NEW] App Install Stats */}
                <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, rgba(60, 60, 80, 0.4), rgba(80, 80, 100, 0.2))', border: '1px solid rgba(100, 150, 255, 0.2)' }}>
                    <span className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a0c4ff' }}>
                        앱 설치 현황
                        <div className="tooltip-container">
                            <Info size={14} style={{ opacity: 0.7 }} />
                            <span className="tooltip-text" style={{ width: '220px', left: '-100px' }}>
                                회원 앱 설치(로그인 이력) 및<br/>푸시 알림 수신 동의 현황
                            </span>
                        </div>
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="card-value" style={{ color: '#60a5fa' }}>{summary.installedCount}명</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '-2px' }}>
                            (수신 {summary.pushEnabledCount}명)
                        </span>
                    </div>
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

            {/* Legend */}
            <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', padding: '0 10px 10px', color: 'var(--text-tertiary)', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-error)' }} /> 만료/소진</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> 임박 (7일/3회↓)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-tertiary)' }} /> 일반</div>
            </div>

            {/* Search & Bulk Actions */}
            <div className="search-row" style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
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
            </div>

            {/* List Criteria Display */}
            <div style={{ padding: '0 4px', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                현재 <strong style={{ color: 'var(--primary-gold)' }}>
                    {filterType === 'all' && '전체 회원'}
                    {filterType === 'active' && '활성 회원'}
                    {filterType === 'attendance' && '오늘 출석 회원'}
                    {filterType === 'registration' && '오늘 등록 회원'}
                    {filterType === 'expiring' && '만료/횟수 임박 회원'}
                    {filterType === 'dormant' && '잠든 회원'}
                </strong> 목록을 <strong style={{ color: 'var(--text-secondary)' }}>이름 가나다순</strong>으로 보고 계십니다.
            </div>

            {/* Member List */}
            <div className="card-list">
                {(() => {
                    let filtered = filteredMembers;
                    if (filterType === 'dormant' && getDormantSegments) {
                        const segments = getDormantSegments(filteredMembers);
                        filtered = segments['all'] || [];
                    }

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
                                        key={member.logId || member.id}
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
                                                {filterType === 'dormant' && (() => {
                                                    const today = new Date();
                                                    let lastDate = member.lastAttendance ? new Date(member.lastAttendance) : (member.regDate ? new Date(member.regDate) : null);

                                                    if (!lastDate) return <span className="badge" style={{ background: 'var(--gray-700)', color: '#bbb' }}>기록 없음</span>;

                                                    const diffTime = Math.abs(today - lastDate);
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                    return (
                                                        <span className="badge" style={{
                                                            background: 'rgba(255, 59, 48, 0.15)',
                                                            color: '#FF3B30',
                                                            border: '1px solid rgba(255, 59, 48, 0.3)',
                                                            fontSize: '0.75rem'
                                                        }}>
                                                            {diffDays}일째 미출석
                                                        </span>
                                                    );
                                                })()}
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{member.phone}</span>
                                                <span className="badge" style={{ fontSize: '0.7rem' }}>{getBranchName(member.homeBranch)}</span>
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
                                                {member.attendanceTime && (
                                                    member.attendanceStatus === 'denied' ? (
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: '#ff4d4f',
                                                            background: 'rgba(255, 77, 79, 0.15)',
                                                            border: '1px solid rgba(255, 77, 79, 0.3)',
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            fontWeight: '700',
                                                            display: 'flex', alignItems: 'center', gap: '4px'
                                                        }}>
                                                            ⛔ 출석거부 ({member.denialReason === 'expired' ? '기간' : '횟수'})
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: 'rgba(0,0,0,0.85)',
                                                            background: 'var(--primary-gold)',
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            fontWeight: '700'
                                                        }}>
                                                            {member.attendanceClass} ({member.attendanceTime})
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                                <span>{member.subject || '일반'}</span>
                                                <span style={{ opacity: 0.3 }}>|</span>
                                                <span style={{ color: member.credits <= 0 ? 'var(--accent-error)' : (member.credits <= 3 ? '#f59e0b' : 'var(--text-primary)'), fontWeight: 'bold' }}>잔여 {member.credits}회</span>
                                                <span style={{ opacity: 0.3 }}>|</span>
                                                <span style={{
                                                    color: (() => {
                                                        if (!member.endDate || member.endDate === 'TBD' || member.endDate === 'unlimited') return 'var(--text-tertiary)';
                                                        const end = new Date(member.endDate);
                                                        const today = new Date();
                                                        today.setHours(0,0,0,0);
                                                        const diff = (end - today) / (1000 * 60 * 60 * 24);
                                                        
                                                        if (diff < 0) return 'var(--accent-error)';
                                                        if (diff <= 7) return '#f59e0b';
                                                        return 'var(--text-tertiary)';
                                                    })(),
                                                    fontSize: '0.85rem'
                                                }}>
                                                    종료일: {member.endDate === 'TBD' ? '첫 출석 시 확정' : (member.endDate || '무제한')}
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
    );
};

export default MembersTab;
