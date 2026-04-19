import { memo } from 'react';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { UserFocus, Trash } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

/**
 * LogListItem — 출석 로그 개별 항목 (LogsTab에서 추출)
 * 
 * 약 130줄의 반복 렌더링을 재사용 가능한 memo 컴포넌트로 분리
 */
const LogListItem = memo(({
  log,
  index,
  isToday,
  members,
  onMemberClick,
  onImageClick,
  getBranchName,
  getBranchColor,
  getBranchThemeColor,
  summary,
  sessionRank,
  totalSessions,
  isMultiAttMember
}) => {
  const t = useLanguageStore(s => s.t);
  const handleClick = () => {
    if (log.memberId && onMemberClick) {
      const member = members.find(m => m.id === log.memberId);
      if (member) onMemberClick(member);
    }
  };
  const handleDelete = async e => {
    e.stopPropagation();
    if (confirm(t("g_eb8a11") || "\uC774 \uCD9C\uC11D \uAE30\uB85D\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) {
      const result = await storageService.deleteAttendance(log.id, true);
      if (result.success) {
        setTimeout(() => {
          storageService.notifyListeners('logs');
          storageService.notifyListeners('members');
        }, 500);
      } else {
        alert(`Delete failed: ${result.message}`);
      }
    }
  };
  const displayName = log.memberName || log.name || '';
  const nameInitial = displayName.charAt(0) || '?';
  const avatarHue = (displayName.charCodeAt(0) * 37) % 360;

  return <div key={log.id || index} onClick={handleClick} className="log-item" style={{
    cursor: log.memberId ? 'pointer' : 'default',
    borderLeft: `3px solid ${log.status === 'denied' ? '#ff4d4f' : log.type === 'extend' ? '#3B82F6' : log.type === 'register' ? 'var(--primary-gold)' : 'var(--accent-success)'}`
  }}>
            <div className="log-item__time">
                {new Date(log.timestamp).toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })}
            </div>

            {log.photoUrl ? <div className="log-item__avatar" onClick={e => {
      e.stopPropagation();
      onImageClick(log.photoUrl);
    }}>
                    <img src={log.photoUrl} alt="" />
                </div> : <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `hsl(${avatarHue}, 40%, 32%)`,
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '0.85rem',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      flexShrink: 0
    }}>
                    {nameInitial}
                </div>}

            <div style={{
      flex: 1,
      paddingLeft: '12px'
    }}>
                <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
                    <span style={{
          fontWeight: 'bold'
        }}>{displayName || t("g_80601c") || "\uC54C \uC218 \uC5C6\uC74C"}</span>
                    <span style={{
          fontSize: '0.7rem',
          color: 'var(--primary-gold)',
          background: 'rgba(var(--primary-rgb), 0.1)',
          padding: '1px 6px',
          borderRadius: '4px'
        }}>
                        {log.className === 'Self Practice' ? (t('selfPractice') || t('g_dd529d') || '\uC790\uC728\uC218\uB828') : (log.className || t("g_8209e5") || "\uC77C\uBC18")}
                    </span>
                    <span className="badge" style={{
          fontSize: '0.65rem',
          padding: '2px 6px',
          background: `${getBranchColor(log.branchId)}20`,
          color: getBranchThemeColor(log.branchId),
          border: `1px solid ${getBranchColor(log.branchId)}33`,
          fontWeight: 'bold'
        }}>
                        {getBranchName(log.branchId)}
                    </span>

                    {log.status === 'denied' && <span className="status-badge status-badge--denied">{t("g_b6fead") || "\u26D4 \uCD9C\uC11D\uAC70\uBD80 ("}{log.denialReason === 'expired' ? t("g_94dcd3") || "\uAE30\uAC04\uB9CC\uB8CC" : t("g_7174c2") || "\uD69F\uC218\uC18C\uC9C4"})
                        </span>}
                    {isMultiAttMember && sessionRank && <span style={{
          fontSize: '0.6rem',
          padding: '1px 5px',
          borderRadius: '3px',
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          fontWeight: '600',
          letterSpacing: '0.5px'
        }}>
                            {sessionRank}{t("g_8a602f") || "\uD68C"}</span>}
                    {log.facialMatched && <span className="status-badge status-badge--facial-match" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px'
        }}>
                            <UserFocus size={10} weight="fill" />
                            {t("g_654b4e")}
                        </span>}
                </div>
                <div style={{
        fontSize: '0.85rem',
        opacity: 0.8,
        marginTop: '2px',
        color: log.status === 'denied' ? '#ff4d4f' : 'inherit'
      }}>
                    {log.status === 'denied' ? `${t('deniedAttemptMessage') || "\uCD9C\uC11D \uC2DC\uB3C4\uAC00 \uAC70\uBD80\uB418\uC5C8\uC2B5\uB2C8\uB2E4"} (${log.denialReason === 'expired' ? t("g_94dcd3") || "\uAE30\uAC04\uB9CC\uB8CC" : t("g_7174c2") || "\uD69F\uC218\uC18C\uC9C4"})` : (!log.action || log.action?.includes(t("g_b31acb") || "\uCD9C\uC11D")) ? `${log.className === 'Self Practice' ? (t('selfPractice') || t('g_dd529d') || '\uC790\uC728\uC218\uB828') : (log.className || t("g_8209e5") || "\uC77C\uBC18")} ${t('classParticipation') || "\uC218\uC5C5 \uCC38\uC5EC"} (${log.instructor === 'Member' ? (t('g_dae3ed') || '\uD68C\uC6D0') : (log.instructor || t("g_0cb522") || "\uAD00\uB9AC\uC790")} ${t("g_9564f6") || "\uC2B9\uC778"})` : log.action}
                </div>
            </div>

            {log.status !== 'denied' && log.type !== 'extend' && isToday && <button onClick={handleDelete} style={{
      background: 'none',
      border: 'none',
      color: 'rgba(244, 63, 94, 0.5)',
      cursor: 'pointer',
      padding: '8px'
    }} onMouseOver={e => e.currentTarget.style.color = '#F43F5E'} onMouseOut={e => e.currentTarget.style.color = 'rgba(244, 63, 94, 0.5)'}>
                    <Trash size={16} />
                </button>}
        </div>;
});
LogListItem.displayName = 'LogListItem';
export default LogListItem;