import React, { useState, useMemo } from 'react';
import { BellRinging, Check, Info, Plus, NotePencil, PaperPlaneTilt } from '@phosphor-icons/react';
import { getBranchName, getBranchColor, getBranchThemeColor } from '../../../studioConfig';



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
    setActiveTab,
    setShowBulkMessageModal,
    getDormantSegments,
    setBulkMessageInitialText,
    onNoteClick
}) => {
    const [localSort, setLocalSort] = useState('default'); // 'default', 'credits_asc', 'credits_desc', 'enddate_asc', 'enddate_desc'

    const todayKstStr = useMemo(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }), []);
    const todayStartMs = useMemo(() => {
        const d = new Date();
        d.setHours(0,0,0,0);
        return d.getTime();
    }, []);

    const finalFiltered = useMemo(() => {
        let result = filteredMembers;
        if (filterType === 'dormant' && getDormantSegments) {
            const segments = getDormantSegments(filteredMembers);
            result = segments['all'] || [];
        }

        // Apply local sorting
        if (localSort === 'credits_asc') {
            result = [...result].sort((a, b) => (a.credits || 0) - (b.credits || 0));
        } else if (localSort === 'credits_desc') {
            result = [...result].sort((a, b) => (b.credits || 0) - (a.credits || 0));
        } else if (localSort === 'enddate_asc') {
            result = [...result].sort((a, b) => {
                if (!a.endDate || a.endDate === 'unlimited' || a.endDate === 'TBD') return 1;
                if (!b.endDate || b.endDate === 'unlimited' || b.endDate === 'TBD') return -1;
                return new Date(a.endDate) - new Date(b.endDate);
            });
        } else if (localSort === 'enddate_desc') {
            result = [...result].sort((a, b) => {
                if (!a.endDate || a.endDate === 'unlimited' || a.endDate === 'TBD') return -1;
                if (!b.endDate || b.endDate === 'unlimited' || b.endDate === 'TBD') return 1;
                return new Date(b.endDate) - new Date(a.endDate);
            });
        }
        return result;
    }, [filteredMembers, filterType, getDormantSegments, localSort]);

    if (!summary || !filteredMembers) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>데이터 로딩 중...</div>;
    return (
        <div className="members-tab-container">

            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => setShowAddModal(true)} className="action-btn primary" style={{ flex: 'none', width: 'auto', minWidth: '350px', height: '54px', fontSize: '1.2rem', borderRadius: '12px', boxShadow: '0 8px 24px var(--primary-gold-glow)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Plus size={24} weight="bold" /> 신규 회원 등록하기
                </button>
            </div>



            {/* Summary Grid */}
            <div className="stats-grid">
                <div className={`dashboard-card interactive ${filterType === 'all' ? 'highlight' : ''}`}
                    onClick={() => handleToggleFilter('all')}>
                    <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        전체 회원
                        <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                            <Info size={14} style={{ opacity: 0.7 }} />
                            <span className="tooltip-text">현재 지점에 등록된<br />모든 회원 (삭제/탈퇴 제외)</span>
                        </div>
                    </div>
                    <div className="card-value">{summary.totalMembers}명</div>
                </div>
                <div className={`dashboard-card interactive ${filterType === 'active' ? 'highlight' : ''}`}
                    onClick={() => handleToggleFilter('active')}>
                    <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        활성 회원
                        <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                            <Info size={14} style={{ opacity: 0.7 }} />
                            <span className="tooltip-text">잔여 횟수 1회 이상이며(0회 제외)<br />만료일이 오늘 또는 이후인 회원</span>
                        </div>
                    </div>
                    <div className="card-value gold">{summary.activeMembers}명</div>
                </div>
                <div className={`dashboard-card interactive ${filterType === 'attendance' ? 'highlight' : ''}`}
                    onClick={() => handleToggleFilter('attendance')}>
                    <div className="card-label">오늘 출석</div>
                    <div className="card-value">{summary.todayAttendance}명 / <span style={{ fontSize: '1rem', opacity: 0.8 }}>{summary.totalAttendanceToday}회</span></div>
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
                    <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        오늘 전체 등록
                        <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                            <Info size={14} style={{ opacity: 0.7 }} />
                            <span className="tooltip-text">오늘 등록된 모든 수강권 합계<br />(신규 가입 + 기존 회원 재등록)</span>
                        </div>
                    </div>
                    <div className="card-value success" style={{ fontSize: '1.8rem' }}>
                        {summary.todayRegistration}명
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#86efac', display: 'flex', gap: '8px', marginTop: '4px', fontWeight: 'bold' }}>
                        <span>신규 {summary.todayNewCount || 0}</span>
                        <span style={{ opacity: 0.4 }}>|</span>
                        <span>재등록 {summary.todayReRegCount || 0}</span>
                    </div>
                </div>
                <div className={`dashboard-card interactive ${filterType === 'expiring' ? 'highlight' : ''}`}
                    onClick={selectExpiringMembers}
                    style={{ transition: 'all 0.3s ease' }}>
                    <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        만료/횟수 임박
                        <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                            <Info size={14} style={{ opacity: 0.7 }} />
                            <span className="tooltip-text" style={{ width: '220px', left: '-100px' }}>
                                잔여 2회 이하 또는<br />만료 7일 전 ~ 만료 후 30일 이내
                            </span>
                        </div>
                    </div>
                    <div className="card-value error">{summary.expiringMembersCount}명</div>
                </div>
                {/* [NEW] Dormant Members Card */}
                <div className={`dashboard-card interactive ${filterType === 'dormant' ? 'highlight' : ''}`}
                    onClick={() => handleToggleFilter('dormant')}
                    style={{ transition: 'all 0.3s ease' }}>
                    <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        잠든 회원
                        <div className="tooltip-container" onClick={e => e.stopPropagation()}>
                            <Info size={14} style={{ opacity: 0.7 }} />
                            <span className="tooltip-text" style={{ width: '220px', left: '-100px' }}>
                                활성 회원 중<br />최근 출석일 14일 이상 경과
                            </span>
                        </div>
                    </div>
                    <div className="card-value error">{summary.dormantMembersCount || 0}명</div>
                </div>
                {/* [NEW] App Usage & Push Stats (Redesigned) */}
                <div className={`dashboard-card interactive ${filterType === 'installed' ? 'highlight' : ''}`}
                    onClick={() => handleToggleFilter('installed')}>
                    <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BellRinging size={16} weight="fill" /> 알림 수신 가능
                        <div className="tooltip-container">
                            <Info size={14} style={{ opacity: 0.7 }} />
                            <span className="tooltip-text" style={{ width: '240px', left: '-120px' }}>
                                푸시 알림을 받을 수 있는 회원 및 선생님 수<br/>(앱 설치 + 알림 권한 허용)
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '0.9rem', color: '#A7F3D0', fontWeight: 'bold' }}>회원</span>
                            <div className="card-value success" style={{ fontSize: '1.4rem' }}>
                                {summary.pushEnabledCount}명
                            </div>
                            <span style={{ fontSize: '0.85rem', color: '#6EE7B7', fontWeight: 'bold' }}>
                                ({summary.reachableRatio}%)
                            </span>
                            <span style={{ margin: '0 6px', opacity: 0.3, color: 'white' }}>|</span>
                            <span style={{ fontSize: '0.9rem', color: '#FDE047', fontWeight: 'bold' }}>선생님</span>
                            <div className="card-value gold" style={{ fontSize: '1.4rem' }}>
                                {summary.instructorPushCount || 0}명
                            </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', paddingTop: '6px', borderTop: `1px solid rgba(255,255,255,0.1)` }}>
                            <span style={{ color: '#93C5FD' }}>앱 설치 회원 {summary.installedCount}명 ({summary.installRatio}%)</span>
                            <span style={{ margin: '0 4px', opacity: 0.3 }}>|</span>
                             오늘 +{summary.todayInstalledCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* Revenue Card (Visual Bar Chart Simulated) */}
            <div className="dashboard-card interactive" style={{ marginBottom: '24px', cursor: 'pointer' }} onClick={() => setActiveTab('revenue')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                    <div>
                        <span className="card-label outfit-font" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.7rem' }}>월간 총 매출</span>
                        <div className="outfit-font" style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary-gold)', textShadow: '0 0 20px var(--primary-gold-glow)' }}>
                            {summary.monthlyRevenue.toLocaleString()}원
                        </div>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        오늘: {summary.totalRevenueToday.toLocaleString()}원
                    </div>
                </div>
                <div style={{ display: 'flex', height: '10px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: '100%', background: 'linear-gradient(90deg, var(--primary-gold-dim), var(--primary-gold))' }}></div>
                </div>
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

            {/* List Criteria Display & Local Sorting */}
            <div style={{ padding: '0 4px', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    현재 <strong style={{ color: 'var(--primary-gold)' }}>
                        {filterType === 'all' && '전체 회원'}
                        {filterType === 'active' && '활성 회원'}
                        {filterType === 'attendance' && '오늘 출석 회원'}
                        {filterType === 'registration' && '오늘 등록 회원'}
                        {filterType === 'expiring' && '만료/횟수 임박 회원'}
                        {filterType === 'dormant' && '잠든 회원'}
                        {filterType === 'installed' && '앱 설치 회원'}
                    </strong> 목록을{' '}
                    <strong style={{ color: 'var(--text-secondary)' }}>
                        {localSort === 'default' ? (filterType === 'attendance' ? '최신 출석 순' : (filterType === 'installed' ? '최신 설치 순' : (filterType === 'registration' ? '최신 등록순' : '이름을 가나다순'))) : 
                         localSort === 'credits_asc' ? '잔여 횟수 적은 순' :
                         localSort === 'credits_desc' ? '잔여 횟수 많은 순' :
                         localSort === 'enddate_asc' ? '마감일 임박 순' : '마감일 여유 순'}
                    </strong>으로 보고 계십니다.
                </div>

                {/* Legend removed per user request */}

                <select 
                    value={localSort} 
                    onChange={e => { setLocalSort(e.target.value); setCurrentPage(1); }}
                    style={{
                        padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem', cursor: 'pointer'
                    }}
                >
                    <option value="default" style={{ color: 'white', background: '#333' }}>기본 정렬</option>
                    <option value="credits_asc" style={{ color: 'white', background: '#333' }}>잔여 횟수 적은 순</option>
                    <option value="credits_desc" style={{ color: 'white', background: '#333' }}>잔여 횟수 많은 순</option>
                    <option value="enddate_asc" style={{ color: 'white', background: '#333' }}>마감일 임박 순</option>
                    <option value="enddate_desc" style={{ color: 'white', background: '#333' }}>마감일 여유 순</option>
                </select>
            </div>

            {/* Member List */}
            <div className="card-list">
                {(() => {
                    const totalPages = Math.ceil(finalFiltered.length / itemsPerPage);
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginated = finalFiltered.slice(startIndex, startIndex + itemsPerPage);

                    return (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px 8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <div onClick={() => selectFilteredMembers(finalFiltered)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{
                                        width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--border-color)',
                                        background: finalFiltered.length > 0 && finalFiltered.every(m => selectedMemberIds.includes(m.id)) ? 'var(--primary-gold)' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {finalFiltered.length > 0 && finalFiltered.every(m => selectedMemberIds.includes(m.id)) && <Check size={10} color="#000" weight="bold" />}
                                    </div>
                                    전체 선택 ({finalFiltered.length}명)
                                </div>
                                
                                {/* [NEW] Bulk Action Button */}
                                {selectedMemberIds.length > 0 && (
                                    <button 
                                        onClick={() => setShowBulkMessageModal(true)}
                                        style={{
                                            background: 'var(--primary-gold)', color: 'black', border: 'none',
                                            borderRadius: '6px', padding: '4px 12px', fontSize: '0.8rem',
                                            fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                        }}
                                    >
                                        <PaperPlaneTilt weight="fill" />
                                        메시지 보내기 ({selectedMemberIds.length})
                                    </button>
                                )}

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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                    <strong style={{ fontSize: '1.1rem', fontWeight: 800 }}>{member.name}</strong>
                                                    {filterType === 'installed' && (
                                                        <span className="badge" style={{
                                                            fontSize: '0.7rem',
                                                            background: member.role === 'instructor' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                            color: member.role === 'instructor' ? '#FBBF24' : '#34D399',
                                                            border: member.role === 'instructor' ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                                                            padding: '2px 6px'
                                                        }}>
                                                            {member.role === 'instructor' ? '선생님' : '회원'}
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{member.phone}</span>
                                                    {member.role !== 'instructor' && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onNoteClick && onNoteClick(member); }}
                                                        style={{ background: 'none', border: 'none', color: member.notes ? 'var(--primary-gold)' : '#52525b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', marginLeft: 'auto' }}
                                                        title="메모 작성/수정"
                                                    >
                                                        <NotePencil size={18} weight={member.notes ? "fill" : "regular"} />
                                                    </button>
                                                    )}
                                                </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                {/* [NEW] Explicit Membership Status Badge */}
                                                {(() => {
                                                    if (!member.endDate || member.endDate === 'TBD' || member.endDate === 'unlimited') {
                                                        if (member.credits > 0 || member.credits === 9999) {
                                                            return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>활동중</span>;
                                                        }
                                                        return null;
                                                    }
                                                    const endMs = new Date(member.endDate).getTime();
                                                    const diff = (endMs - todayStartMs) / (1000 * 60 * 60 * 24);
                                                    
                                                    if (diff < 0 || member.credits === 0) {
                                                        return <span className="badge" style={{ background: 'rgba(255, 59, 48, 0.15)', color: '#FF3B30', border: '1px solid rgba(255, 59, 48, 0.3)' }}>만료/소진</span>;
                                                    } else if (diff <= 7 || member.credits <= 2) {
                                                        return <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>만료/임박</span>;
                                                    } else {
                                                        return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>활동중</span>;
                                                    }
                                                })()}

                                                {/* [NEW] Advance Registration Badge */}
                                                {member.upcomingMembership && (
                                                    <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#C084FC', border: '1px solid rgba(168, 85, 247, 0.4)', fontWeight: 'bold' }}>
                                                        선등록 대기중
                                                    </span>
                                                )}
                                                
                                                {/* [NEW] Today Registration Badges */}
                                                {member.regDate === todayKstStr && (
                                                    <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                                        신규
                                                    </span>
                                                )}
                                                {/* Note: In MembersTab, we might not have todayReRegMemberIds prop yet. 
                                                    Let's use summary or pass it down. 
                                                    Ideally, we should rely on props. Assuming 'todayReRegMemberIds' is passed or available via context?
                                                    Actually, I should check if I can access it. 
                                                    Since I cannot easily add a prop to the component signature without changing AdminDashboard first (which I did not do fully),
                                                    I will assume AdminDashboard will pass it. 
                                                    Wait, I haven't added `todayReRegMemberIds` to MembersTab props in AdminDashboard yet.
                                                    I will do that in the NEXT step. For now, I'll use optional chaining if possible or safe access.
                                                 */}
                                                 {summary.todayReRegMemberIds && summary.todayReRegMemberIds.includes(member.id) && (
                                            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.25)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.5)', fontWeight: 'bold' }}>
                                                재등록
                                            </span>
                                        )}
                                        {summary.multiAttendedMemberIds && summary.multiAttendedMemberIds.includes(member.id) && (
                                            <span className="badge" style={{
                                                background: 'rgba(245, 158, 11, 0.25)', color: '#FBBF24',
                                                border: '1px solid rgba(245, 158, 11, 0.5)', fontWeight: 'bold'
                                            }}>
                                                오늘 {summary?.attendanceCountMap?.[member.id] || 2}회 출석 🔥
                                            </span>
                                        )}
                                                {/* Status Context Badges */}
                                                {filterType === 'dormant' && (() => {
                                                    let lastDateMs = member.lastAttendance ? new Date(member.lastAttendance).getTime() : (member.regDate ? new Date(member.regDate).getTime() : null);

                                                    if (!lastDateMs) return <span className="badge" style={{ background: 'var(--gray-700)', color: '#bbb' }}>기록 없음</span>;

                                                    const diffTime = Math.abs(Date.now() - lastDateMs);
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
                                                {/* [NEW] Install Date Badge (Show only when filtered by installed) */}
                                                {filterType === 'installed' && member.installedAt && (() => {
                                                    const installDateStr = new Date(member.installedAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
                                                    const isToday = installDateStr === todayKstStr;
                                                    
                                                    return (
                                                        <span className="badge" style={{ 
                                                            background: isToday ? 'rgba(76, 217, 100, 0.2)' : 'rgba(96, 165, 250, 0.15)', 
                                                            color: isToday ? '#4CD964' : '#60A5FA', 
                                                            border: isToday ? '1px solid rgba(76, 217, 100, 0.4)' : '1px solid rgba(96, 165, 250, 0.3)'
                                                        }}>
                                                            {isToday ? '오늘 설치' : `${installDateStr.slice(2)} 설치`}
                                                        </span>
                                                    );
                                                })()}

                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{member.phone}</span>
                                                <span className="badge" style={{ 
                                                    fontSize: '0.7rem',
                                                    // [UI] Neutralize branch color in member list as requested
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    color: 'var(--text-secondary)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    fontWeight: 'normal'
                                                }}>
                                                    {getBranchName(member.homeBranch)}
                                                </span>
                                                {member.pushEnabled !== false && pushTokens.some(t => t.memberId === member.id) ? (
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', gap: '4px',
                                                        background: 'rgba(52, 211, 153, 0.1)', color: '#34D399',
                                                        padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem',
                                                        fontWeight: 'bold', border: '1px solid rgba(52, 211, 153, 0.2)'
                                                    }}>
                                                        <BellRinging size={12} weight="fill" /> 푸시 ON
                                                    </div>
                                                ) : (
                                                    filterType === 'installed' && (
                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', gap: '4px',
                                                            background: 'rgba(156, 163, 175, 0.1)', color: '#9CA3AF',
                                                            padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem',
                                                            border: '1px solid rgba(156, 163, 175, 0.2)'
                                                        }}>
                                                            <BellRinging size={12} weight="regular" /> 알림 꺼짐
                                                        </div>
                                                    )
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
                                                            {member.originalLog?.branchId && `[${getBranchName(member.originalLog.branchId)}] `}
                                                            {member.attendanceClass} ({member.attendanceTime})
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                                <span>{member.subject || '일반'}</span>
                                                <span style={{ opacity: 0.3 }}>|</span>
                                                <span style={{ color: member.credits <= 0 ? 'var(--accent-error)' : (member.credits <= 2 ? '#f59e0b' : 'var(--text-primary)'), fontWeight: 'bold' }}>잔여 {member.credits}회</span>
                                                <span style={{ opacity: 0.3 }}>|</span>
                                                <span style={{
                                                    color: (() => {
                                                        if (!member.endDate || member.endDate === 'TBD' || member.endDate === 'unlimited') return 'var(--text-tertiary)';
                                                        const endMs = new Date(member.endDate).getTime();
                                                        const diff = (endMs - todayStartMs) / (1000 * 60 * 60 * 24);
                                                        
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
                                                <div 
                                                    onClick={(e) => { e.stopPropagation(); onNoteClick && onNoteClick(member); }}
                                                    style={{ marginTop: '8px', padding: '8px', background: 'rgba(212,175,55,0.1)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--primary-gold)', cursor: 'pointer', border: '1px dashed rgba(212,175,55,0.3)' }}
                                                >
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
        </div>
    );
};

export default MembersTab;
