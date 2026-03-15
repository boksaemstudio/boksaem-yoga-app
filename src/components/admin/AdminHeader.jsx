import React from 'react';
import { 
    ClockCounterClockwise, PlusCircle, SignOut 
} from '@phosphor-icons/react';

const AdminHeader = ({
    config,
    handleForceUpdate,
    handleInstallClick,
    handleLogout,
    refreshData,
    loadingInsight,
    aiUsage,
    pushEnabled,
    handleSubscribePush,
    themeContrastText,
    activeTab,
    currentBranch,
    handleBranchChange
}) => {
    return (
        <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'nowrap', gap: '8px' }}>
            <div className="admin-title" style={{ gap: '6px', fontSize: '0.9rem' }}>
                <img src={config.ASSETS?.LOGO?.SQUARE} alt="로고" style={{ height: '20px', filter: 'invert(1) brightness(1.5) drop-shadow(0 0 8px rgba(var(--primary-rgb), 0.4))' }} />
                <span style={{ whiteSpace: 'nowrap', fontWeight: '800' }}>관리</span>
                
                <button 
                    onClick={handleForceUpdate} 
                    style={{ 
                        marginLeft: '8px', 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        border: '1px solid rgba(255, 255, 255, 0.2)', 
                        color: '#aaa', 
                        cursor: 'pointer', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontSize: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                    }} 
                    title="업데이트 및 캐시 초기화"
                >
                    <ClockCounterClockwise size={12} />
                    최신동기화
                </button>

                <button onClick={handleInstallClick} style={{ marginLeft: '6px', background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid rgba(var(--primary-rgb), 0.3)', color: 'var(--primary-gold)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }} title="홈 화면에 추가">
                    <PlusCircle size={18} weight="bold" />
                    <span className="hide-mobile">홈추가</span>
                </button>
                <button onClick={handleLogout} style={{ marginLeft: '4px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }} title="로그아웃">
                    <SignOut size={18} />
                </button>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                <button 
                    onClick={() => { if (confirm('AI 분석을 최신 데이터로 다시 실행하시겠습니까? (약 5~10초 소요)')) { refreshData(); } }}
                    style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(var(--primary-rgb), 0.1)',
                        border: '1px solid rgba(var(--primary-rgb), 0.3)',
                        color: 'var(--primary-theme-color)',
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)'}
                    title="AI 분석 결과 새로고침 (수동)"
                >
                    <span>✨ AI 분석</span>
                    {loadingInsight ? (
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid var(--primary-gold)', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                    ) : (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4CD964', boxShadow: '0 0 5px #4CD964' }}></span>
                    )}
                    <span style={{ fontSize: '0.65rem', opacity: 0.8, marginLeft: '4px', paddingLeft: '4px', borderLeft: '1px solid rgba(var(--primary-rgb), 0.3)' }}>
                        {aiUsage.count}/{aiUsage.limit}
                    </span>
                </button>

                <button
                    onClick={handleSubscribePush}
                    className={`action-btn sm ${pushEnabled ? 'primary' : ''}`}
                    style={{
                        padding: '6px 8px',
                        minWidth: '60px',
                        background: pushEnabled ? 'var(--primary-theme-color)' : 'rgba(255,255,255,0.05)',
                        color: pushEnabled ? themeContrastText : 'var(--text-secondary)',
                        fontWeight: 'bold',
                        fontSize: '0.7rem',
                        border: 'none',
                        borderRadius: '6px'
                    }}
                >
                    {pushEnabled ? '알림ON' : '알림OFF'}
                </button>
                {/* 지점 선택: 회원, 매출 탭에서만 표시 */}
                {(activeTab === 'members' || activeTab === 'revenue') && (
                    <select
                        className="styled-select"
                        value={currentBranch}
                        onChange={handleBranchChange}
                        style={{ padding: '6px 8px', fontSize: '0.75rem', borderRadius: '6px', width: 'auto', minWidth: '70px', height: '32px' }}
                    >
                        <option value="all">전체</option>
                        {(config.BRANCHES || []).map(b => (
                            <option key={b.id} value={b.id}>{b.name.replace('점', '')}</option>
                        ))}
                    </select>
                )}
            </div>
        </header>
    );
};

export default AdminHeader;
