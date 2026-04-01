import React from 'react';
import { 
    ClockCounterClockwise, PlusCircle, SignOut, ToggleLeft, ToggleRight
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
    pushLoading,
    handleSubscribePush,
    themeContrastText,
    activeTab,
    currentBranch,
    handleBranchChange,
    viewMode,
    handleViewModeToggle
}) => {
    return (
        <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div className="admin-title" style={{ gap: '8px', fontSize: '0.95rem', display: 'flex', alignItems: 'center' }}>
                {config.IDENTITY?.NAME?.includes('PassFlow') || config.ASSETS?.LOGO?.WIDE === '/assets/passflow_ai_logo_transparent_final.png' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/assets/passflow_square_logo.png" alt="Icon" style={{ height: '22px', borderRadius: '4px' }} />
                        <img src="/assets/passflow_ai_logo_transparent_final.png" alt="PassFlow Logo" style={{ height: '24px', objectFit: 'contain' }} />
                    </div>
                ) : (
                    <>
                        {(config.ASSETS?.LOGO?.SQUARE && config.ASSETS.LOGO.SQUARE !== '/assets/passflow_logo.png') || config.IDENTITY?.LOGO_URL ? (
                            <img src={config.IDENTITY?.LOGO_URL || config.ASSETS?.LOGO?.SQUARE} alt="로고" style={{ height: '22px', filter: 'invert(1) brightness(1.5) drop-shadow(0 0 8px rgba(var(--primary-rgb), 0.4))' }} />
                        ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '4px', background: 'var(--primary-gold)', color: '#000', fontSize: '14px', fontWeight: '900', boxShadow: '0 0 8px rgba(var(--primary-rgb), 0.4)' }}>
                                {config.IDENTITY?.NAME?.[0] || 'S'}
                            </div>
                        )}
                        <span style={{ whiteSpace: 'nowrap', fontWeight: '800' }}>
                            {config.IDENTITY?.NAME ? `${config.IDENTITY.NAME} 관리` : '관리'}
                        </span>
                    </>
                )}
                
                <button onClick={handleInstallClick} style={{ marginLeft: '8px', background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid rgba(var(--primary-rgb), 0.3)', color: 'var(--primary-gold)', cursor: 'pointer', padding: '0 8px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 'bold' }} title="홈 화면에 추가">
                    <PlusCircle size={16} weight="bold" />
                    <span className="hide-mobile">홈추가</span>
                </button>
                <button onClick={handleLogout} style={{ marginLeft: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title="로그아웃" onMouseEnter={e => e.currentTarget.style.color = '#F43F5E'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                    <SignOut size={16} />
                </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {viewMode !== undefined && (
                    <div className="tooltip-container" style={{ display: 'inline-flex' }}>
                        <button 
                            onClick={handleViewModeToggle}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '6px', 
                                padding: '0 12px', borderRadius: '8px', height: '34px',
                                border: viewMode === 'compact' ? '1px solid rgba(var(--primary-rgb), 0.4)' : '1px solid rgba(255,255,255,0.15)',
                                background: viewMode === 'compact' ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.05)',
                                color: viewMode === 'compact' ? 'var(--primary-gold)' : 'var(--text-secondary)',
                                cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.75rem', fontWeight: 'bold'
                            }}
                        >
                            {viewMode === 'compact' ? <ToggleRight size={18} weight="fill" /> : <ToggleLeft size={18} />}
                            <span className="hide-mobile">{viewMode === 'compact' ? '간편' : '전체'}</span>
                        </button>
                        <div className="tooltip-text" style={{ width: '200px', left: 'auto', right: '50%', transform: 'translateX(50%)', top: '130%', zIndex: 10 }}>
                            <strong>{viewMode === 'compact' ? '간편 보기 사용 중' : '전체 보기 사용 중'}</strong><br/>
                            클릭 시, 복잡한 그래프를 숨기고 꼭 필요한 수치만 깔끔하게 보여줍니다.
                        </div>
                    </div>
                )}

                <div className="tooltip-container" style={{ display: 'inline-flex' }}>
                    <button 
                        onClick={() => { if (confirm('AI 분석을 최신 데이터로 다시 실행하시겠습니까? (약 5~10초 소요)')) { refreshData(); } }}
                        style={{
                            padding: '0 12px', height: '34px',
                            borderRadius: '8px',
                            background: 'rgba(var(--primary-rgb), 0.1)',
                            border: '1px solid rgba(var(--primary-rgb), 0.3)',
                            color: 'var(--primary-theme-color)',
                            fontSize: '0.75rem', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.1)'}
                    >
                        <span>✨ AI분석</span>
                        {loadingInsight ? (
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid var(--primary-gold)', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                        ) : (
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4CD964', boxShadow: '0 0 5px #4CD964' }}></span>
                        )}
                        <span style={{ fontSize: '0.65rem', opacity: 0.8, marginLeft: '2px', paddingLeft: '6px', borderLeft: '1px solid rgba(var(--primary-rgb), 0.3)' }} className="hide-mobile">
                            {aiUsage.count}/{aiUsage.limit}
                        </span>
                    </button>
                    <div className="tooltip-text" style={{ width: '220px', left: 'auto', right: '50%', transform: 'translateX(50%)', top: '130%', zIndex: 10 }}>
                        <strong>AI 분석 다시 요청</strong><br/>
                        클릭 시, 동기화된 시스템 내부망 데이터를 기반으로 AI 브리핑을 새롭게 작성합니다.<br/>
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary-theme-color)' }}>* 오늘 남은 횟수: {aiUsage.limit - aiUsage.count}회</span>
                    </div>
                </div>

                <div className="tooltip-container" style={{ display: 'inline-flex' }}>
                    <button
                        onClick={handleSubscribePush}
                        disabled={pushLoading}
                        style={{
                            padding: '0 12px', height: '34px', minWidth: '80px',
                            background: pushLoading ? 'rgba(var(--primary-rgb), 0.15)' : pushEnabled ? 'rgba(var(--primary-theme-rgb, 16, 185, 129), 0.15)' : 'rgba(255,255,255,0.05)',
                            border: pushEnabled ? '1px solid rgba(var(--primary-theme-rgb, 16, 185, 129), 0.4)' : '1px solid rgba(255,255,255,0.15)',
                            color: pushEnabled ? 'var(--primary-theme-color, #10B981)' : 'var(--text-secondary)',
                            fontWeight: 'bold', fontSize: '0.75rem',
                            borderRadius: '8px',
                            opacity: pushLoading ? 0.7 : 1, cursor: pushLoading ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {pushLoading ? (
                            <>
                                <div style={{ width: '10px', height: '10px', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid currentColor', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                설정중
                            </>
                        ) : (
                            pushEnabled ? '알림 켜짐' : '알림 꺼짐'
                        )}
                    </button>
                    <div className="tooltip-text" style={{ width: '240px', left: 'auto', right: '0', transform: 'translateX(0)', top: '130%', zIndex: 10 }}>
                        <strong>스마트폰/PC 실시간 푸시 알림</strong><br/>
                        새로운 회원이 결제하거나 출석할 때, 내 기기로 바로 팝업 알림을 받을 수 있게 연결합니다.
                    </div>
                </div>

                {(activeTab === 'members' || activeTab === 'revenue') && config.BRANCHES?.length > 1 && (
                    <select
                        className="styled-select"
                        value={currentBranch}
                        onChange={handleBranchChange}
                        style={{ 
                            padding: '0 10px', fontSize: '0.75rem', fontWeight: 'bold',
                            borderRadius: '8px', width: 'auto', minWidth: '70px', height: '34px', 
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', 
                            color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer' 
                        }}
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
