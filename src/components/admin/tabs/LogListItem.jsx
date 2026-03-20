import React, { memo } from 'react';
import { Sparkle, UserFocus, Trash } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

/**
 * LogListItem — 출석 로그 개별 항목 (LogsTab에서 추출)
 * 
 * 약 130줄의 반복 렌더링을 재사용 가능한 memo 컴포넌트로 분리
 */
const LogListItem = memo(({
    log, index, isToday, members, onMemberClick,
    onImageClick, getBranchName, getBranchColor, getBranchThemeColor,
    summary
}) => {
    const handleClick = () => {
        if (log.memberId && onMemberClick) {
            const member = members.find(m => m.id === log.memberId);
            if (member) onMemberClick(member);
        }
    };

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (confirm('이 출석 기록을 삭제하시겠습니까?')) {
            const result = await storageService.deleteAttendance(log.id, true);
            if (result.success) {
                setTimeout(() => {
                    storageService.notifyListeners('logs');
                    storageService.notifyListeners('members');
                }, 500);
            } else {
                alert(`삭제 실패: ${result.message}`);
            }
        }
    };

    return (
        <div
            key={log.id || index}
            onClick={handleClick}
            className="log-item"
            style={{
                cursor: log.memberId ? 'pointer' : 'default',
                borderLeft: `3px solid ${
                    log.status === 'denied' ? '#ff4d4f' :
                    log.type === 'checkin' ? 'var(--accent-success)' :
                    log.type === 'register' ? 'var(--primary-gold)' :
                    log.type === 'extend' ? '#3B82F6' :
                    'var(--text-secondary)'
                }`
            }}
        >
            <div className="log-item__time">
                {new Date(log.timestamp).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>

            {log.photoUrl && (
                <div className="log-item__avatar" onClick={(e) => { e.stopPropagation(); onImageClick(log.photoUrl); }}>
                    <img src={log.photoUrl} alt="" />
                </div>
            )}

            <div style={{ flex: 1, paddingLeft: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 'bold' }}>{log.memberName || log.name || '알 수 없음'}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--primary-gold)', background: 'rgba(var(--primary-rgb), 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                        {log.className || '일반'}
                    </span>
                    <span className="badge" style={{
                        fontSize: '0.65rem', padding: '2px 6px',
                        background: `${getBranchColor(log.branchId)}20`,
                        color: getBranchThemeColor(log.branchId),
                        border: `1px solid ${getBranchColor(log.branchId)}33`,
                        fontWeight: 'bold'
                    }}>
                        {getBranchName(log.branchId)}
                    </span>

                    {log.status === 'denied' && (
                        <span className="status-badge status-badge--denied">
                            ⛔ 출석거부 ({log.denialReason === 'expired' ? '기간만료' : '횟수소진'})
                        </span>
                    )}
                    {(log.sessionCount > 1 || log.isMultiSession) && (
                        <span className="status-badge status-badge--multi" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Sparkle size={10} weight="fill" />
                            {log.sessionCount || '2'}회차 Passion
                        </span>
                    )}
                    {log.facialMatched && (
                        <span className="status-badge status-badge--facial-match" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <UserFocus size={10} weight="fill" />
                            안면 일치
                        </span>
                    )}
                    {isToday && summary?.multiAttendedMemberIds?.includes(log.memberId) && (
                        <span className="badge" style={{
                            fontSize: '0.65rem', padding: '2px 6px',
                            background: 'rgba(245, 158, 11, 0.25)', color: '#FBBF24',
                            border: '1px solid rgba(245, 158, 11, 0.5)', fontWeight: 'bold',
                            height: 'max-content'
                        }}>
                            오늘 {summary?.attendanceCountMap?.[log.memberId] || 2}회 출석 🔥
                        </span>
                    )}
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '2px', color: log.status === 'denied' ? '#ff4d4f' : 'inherit' }}>
                    {log.status === 'denied'
                        ? `출석 시도가 거부되었습니다 (${log.denialReason === 'expired' ? '기간만료' : '횟수소진'})`
                        : (log.action?.includes('출석') ? `${log.className || '일반'} 수업 참여 (${log.instructor || '관리자'} 선생님)` : log.action)
                    }
                </div>
            </div>

            {(log.type === 'checkin' || log.type === 'register') && isToday && (
                <button
                    onClick={handleDelete}
                    style={{ background: 'none', border: 'none', color: 'rgba(244, 63, 94, 0.5)', cursor: 'pointer', padding: '8px' }}
                    onMouseOver={(e) => e.currentTarget.style.color = '#F43F5E'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'rgba(244, 63, 94, 0.5)'}
                >
                    <Trash size={16} />
                </button>
            )}
        </div>
    );
});

LogListItem.displayName = 'LogListItem';

export default LogListItem;
