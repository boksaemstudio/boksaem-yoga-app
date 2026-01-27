import React from 'react';
import { Plus, Check, BellRinging, NotePencil, Info, FileCsv, ChatCircleText } from '@phosphor-icons/react';
import { getBranchName } from '../../../studioConfig';
// import { storageService } from '../../../services/storage';  // Unused

const MembersTab = ({
    // members,  // Unused
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
    setShowBulkMessageModal,
    pushTokens,
    getDormantSegments // [New]
}) => {
    // [New] Dormant Sub-Filter Logic
    const [dormantSubFilter, setDormantSubFilter] = React.useState('all'); // all, 14d, 1m, 3m, 6m

    // Handle Sub-filter change reset
    React.useEffect(() => {
        if (filterType !== 'dormant') setDormantSubFilter('all');
    }, [filterType]);
    return (
        <>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => setShowAddModal(true)} className="action-btn primary" style={{ flex: 'none', width: 'auto', minWidth: '350px', height: '54px', fontSize: '1.2rem', borderRadius: '12px', boxShadow: '0 8px 24px var(--primary-gold-glow)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Plus size={24} weight="bold" /> 신규 회원 등록하기
                </button>
            </div>

            {/* 마이그레이션 파일 업로드 섹션 */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
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

                            const { runMigration } = await import('../../../utils/migrator.js');

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
                        flex: 'none',
                        width: 'auto',
                        minWidth: '350px',
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
                    <span className="card-value">{summary.todayAttendance}명 / <span style={{ fontSize: '1rem', opacity: 0.8 }}>{summary.totalAttendanceToday}회</span></span>
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
                                잔여 1회 이하 또는 만료 전 7일 ~ 만료 후 1개월 이내 회원
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
                                14일 이상 미출석한 활성 회원 (안부 문자 대상)
                            </span>
                        </div>
                    </span>
                    <span className="card-value" style={{ color: filterType === 'dormant' ? 'black' : '#E0E0FF' }}>{summary.dormantMembersCount || 0}명</span>
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

                {/* [NEW] Quick Copy Message for Dormant Members */}
                {filterType === 'dormant' && (
                    <button
                        onClick={() => {
                            const msg = "회원님, 매트 위에서 뵙고 싶어요! 🌿\n\n최근 수련하신 지 시간이 좀 흘렀네요.\n부담 없이 가벼운 마음으로 다시 시작해보시는 건 어떨까요?\n\n따뜻한 차 한 잔과 함께 기다릴게요. 😊\n- 복샘요가";
                            navigator.clipboard.writeText(msg).then(() => alert('안부 메시지가 복사되었습니다!\n원하는 회원에게 발송해주세요.'));
                        }}
                        className="action-btn"
                        style={{
                            width: 'auto',
                            padding: '0 16px',
                            height: '42px',
                            borderRadius: '8px',
                            background: 'rgba(100, 100, 255, 0.1)',
                            color: '#A0A0FF',
                            border: '1px solid rgba(100, 100, 255, 0.3)',
                            fontSize: '0.85rem'
                        }}
                    >
                        <ChatCircleText size={18} weight="bold" />
                        <span style={{ marginLeft: '6px' }}>안부인사 복사</span>
                    </button>
                )}

                {/* [NEW] Send Encouragement Button for Dormant */}
                {filterType === 'dormant' && (
                    <button
                        onClick={() => {
                            // Select valid dormant members (exclude 6m)
                            let toSelect = filteredMembers; // Default
                            if (getDormantSegments) {
                                const segments = getDormantSegments(filteredMembers);
                                // If specific filter active, use that (unless it's 6m, then warn)
                                if (dormantSubFilter !== 'all') {
                                    if (dormantSubFilter === '6m') {
                                        alert('6개월 이상 미출석 회원은 발송 대상에서 제외됩니다.');
                                        return;
                                    }
                                    toSelect = segments[dormantSubFilter] || [];
                                } else {
                                    // All dormant: exclude 6m
                                    const sixMonthIds = new Set(segments['6m'].map(m => m.id));
                                    toSelect = filteredMembers.filter(m => !sixMonthIds.has(m.id));
                                }
                            }
                            selectFilteredMembers(toSelect);
                            setShowBulkMessageModal(true);
                        }}
                        className="action-btn"
                        style={{
                            width: 'auto',
                            padding: '0 16px',
                            height: '42px',
                            borderRadius: '8px',
                            background: 'rgba(212, 175, 55, 0.2)',
                            color: 'var(--primary-gold)',
                            border: '1px solid var(--primary-gold)',
                            fontSize: '0.85rem'
                        }}
                    >
                        <BellRinging size={18} weight="bold" />
                        <span style={{ marginLeft: '6px' }}>안부 보내기</span>
                    </button>
                )}

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

            {/* [New] Dormant Sub-Filters UI */}
            {filterType === 'dormant' && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {['all', '14d', '1m', '3m', '6m'].map(sub => (
                        <button
                            key={sub}
                            onClick={() => { setDormantSubFilter(sub); setCurrentPage(1); }}
                            className={`action-btn sm ${dormantSubFilter === sub ? 'active' : ''}`}
                            style={{
                                background: dormantSubFilter === sub ? 'var(--primary-gold)' : 'rgba(255,255,255,0.05)',
                                color: dormantSubFilter === sub ? 'black' : 'var(--text-secondary)',
                                border: dormantSubFilter === sub ? 'none' : '1px solid var(--border-color)',
                                whiteSpace: 'nowrap',
                                minWidth: 'auto',
                                opacity: sub === '6m' ? 0.7 : 1
                            }}
                        >
                            {sub === 'all' && '전체'}
                            {sub === '14d' && '2주~1개월'}
                            {sub === '1m' && '1개월~3개월'}
                            {sub === '3m' && '3개월~6개월'}
                            {sub === '6m' && '6개월 이상 (제외)'}
                        </button>
                    ))}
                </div>
            )}

            {/* List Criteria Display */}
            <div style={{ padding: '0 4px', marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-tertiary)' }}>
                현재 <strong style={{ color: 'var(--primary-gold)' }}>
                    {filterType === 'all' && '전체 회원'}
                    {filterType === 'active' && '활성 회원'}
                    {filterType === 'attendance' && '오늘 출석 회원'}
                    {filterType === 'registration' && '오늘 등록 회원'}
                    {filterType === 'expiring' && '만료/횟수 임박 회원'}
                </strong> 목록을 <strong style={{ color: 'var(--text-secondary)' }}>이름 가나다순</strong>으로 보고 계십니다.
            </div>

            {/* Member List */}
            <div className="card-list">
                {(() => {
                    let filtered = filteredMembers;
                    if (filterType === 'dormant' && getDormantSegments) {
                        const segments = getDormantSegments(filteredMembers);
                        if (dormantSubFilter !== 'all') {
                            filtered = segments[dormantSubFilter] || [];
                        }
                    }

                    const totalPages = Math.ceil(filtered.length / itemsPerPage);
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

                    return (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px 8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <div onClick={() => {
                                    // [Logic] Exclude 6m members when selecting all in dormant mode
                                    let toSelect = filtered;
                                    if (filterType === 'dormant' && getDormantSegments) {
                                        const segments = getDormantSegments(filteredMembers);
                                        const sixMonthIds = new Set(segments['6m'].map(m => m.id));
                                        toSelect = filtered.filter(m => !sixMonthIds.has(m.id)); // Exclude 6m

                                        if (toSelect.length !== filtered.length) {
                                            alert(`알림: 6개월 이상 장기 미출석 회원(${filtered.length - toSelect.length}명)은 안부 발송 대상에서 자동 제외되었습니다.`);
                                        }
                                    }
                                    selectFilteredMembers(toSelect);
                                }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
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

                                                    // Handle case where lastAttendance might be missing but we want to show *something*
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
                                                {pushTokens.some(t => t.memberId === member.id) && (
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
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                                <span>{member.subject || '일반'}</span>
                                                <span style={{ opacity: 0.3 }}>|</span>
                                                <span style={{ color: member.credits <= 3 ? 'var(--accent-error)' : 'var(--text-primary)', fontWeight: 'bold' }}>잔여 {member.credits}회</span>
                                                <span style={{ opacity: 0.3 }}>|</span>
                                                <span style={{
                                                    color: member.endDate && new Date(member.endDate) < new Date(new Date().setDate(new Date().getDate() + 7)) ? 'var(--accent-error)' : 'var(--text-tertiary)',
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
