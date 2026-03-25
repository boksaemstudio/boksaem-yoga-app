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
        <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'nowrap', gap: '8px' }}>
            <div className="admin-title" style={{ gap: '6px', fontSize: '0.9rem' }}>
                <img src={config.ASSETS?.LOGO?.SQUARE} alt="로고" style={{ height: '20px', filter: 'invert(1) brightness(1.5) drop-shadow(0 0 8px rgba(var(--primary-rgb), 0.4))' }} />
                <span style={{ whiteSpace: 'nowrap', fontWeight: '800' }}>관리</span>
                
                {/* 최신동기화 수정 (툴팁 포함) */}
                <div className="tooltip-container" style={{ display: 'inline-flex' }}>
                    <button 
                        onClick={handleForceUpdate} 
                        style={{ 
                            marginLeft: '8px', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            border: '1px solid rgba(255, 255, 255, 0.2)', 
                            color: '#e4e4e7', 
                            cursor: 'pointer', 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '600'
                        }} 
                    >
                        <ClockCounterClockwise size={14} />
                        최신동기화
                    </button>
                    <div className="tooltip-text" style={{ width: '220px', left: 0, transform: 'translateX(-20%)', top: '120%' }}>
                        <strong>최신동기화 (캐시 지우기)</strong><br/>앱이 최신 버전으로 갱신되지 않거나, PC와 스마트폰 간 데이터가 다를 때 눌러주세요.
                    </div>
                </div>

                <button onClick={handleInstallClick} style={{ marginLeft: '6px', background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid rgba(var(--primary-rgb), 0.3)', color: 'var(--primary-gold)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }} title="홈 화면에 추가">
                    <PlusCircle size={18} weight="bold" />
                    <span className="hide-mobile">홈추가</span>
                </button>
                <button onClick={handleLogout} style={{ marginLeft: '4px', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }} title="로그아웃">
                    <SignOut size={18} />
                </button>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                {/* 간편 모드 토글 (원장님을 위한 배려) */}
                {/* 간편 모드 토글 */}
                {viewMode !== undefined && (
                    <div className="tooltip-container" style={{ display: 'inline-flex' }}>
                        <button 
                            onClick={handleViewModeToggle}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '4px', 
                                padding: '4px 10px', borderRadius: '20px', 
                                border: `1px solid ${viewMode === 'compact' ? '#10B981' : 'rgba(255,255,255,0.2)'}`,
                                background: viewMode === 'compact' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                                color: viewMode === 'compact' ? '#10B981' : '#e4e4e7',
                                cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.75rem', fontWeight: 'bold'
                            }}
                        >
                            {viewMode === 'compact' ? <ToggleRight size={18} weight="fill" /> : <ToggleLeft size={18} />}
                            {viewMode === 'compact' ? '간편' : '전체'}
                        </button>
                        <div className="tooltip-text" style={{ width: '200px', left: 'auto', right: '50%', transform: 'translateX(50%)', top: '130%', zIndex: 10 }}>
                            <strong>{viewMode === 'compact' ? '간편 보기 사용 중' : '전체 보기 사용 중'}</strong><br/>
                            클릭 시, 복잡한 그래프를 숨기고 꼭 필요한 수치만 깔끔하게 보여줍니다.
                        </div>
                    </div>
                )}

                {/* AI 분석 */}
                <div className="tooltip-container" style={{ display: 'inline-flex' }}>
                    <button 
                        onClick={() => { if (confirm('AI 분석을 최신 데이터로 다시 실행하시겠습니까? (약 5~10초 소요)')) { refreshData(); } }}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'rgba(var(--primary-rgb), 0.1)',
                            border: '1px solid rgba(var(--primary-rgb), 0.3)',
                            color: 'var(--primary-theme-color)',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
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
                        <span style={{ fontSize: '0.65rem', opacity: 0.8, marginLeft: '4px', paddingLeft: '4px', borderLeft: '1px solid rgba(var(--primary-rgb), 0.3)' }}>
                            {aiUsage.count}/{aiUsage.limit}
                        </span>
                    </button>
                    <div className="tooltip-text" style={{ width: '220px', left: 'auto', right: '50%', transform: 'translateX(50%)', top: '130%', zIndex: 10 }}>
                        <strong>AI 분석 다시 요청</strong><br/>
                        클릭 시, 지금까지 입력된 최신 출석/매출 데이터를 기반으로 AI 원장님이 브리핑을 새롭게 작성합니다.<br/>
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary-theme-color)' }}>* 오늘 남은 횟수: {aiUsage.limit - aiUsage.count}회</span>
                    </div>
                </div>

                {/* 알림 설정 */}
                <div className="tooltip-container" style={{ display: 'inline-flex' }}>
                    <button
                        onClick={handleSubscribePush}
                        disabled={pushLoading}
                        className={`action-btn sm ${pushEnabled ? 'primary' : ''}`}
                        style={{
                            padding: '6px 12px',
                            minWidth: '70px',
                            background: pushLoading ? 'rgba(var(--primary-rgb), 0.15)' : pushEnabled ? 'var(--primary-theme-color)' : 'rgba(255,255,255,0.05)',
                            color: pushEnabled ? themeContrastText : 'var(--text-secondary)',
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            border: 'none',
                            borderRadius: '6px',
                            opacity: pushLoading ? 0.7 : 1,
                            cursor: pushLoading ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {pushLoading ? (
                            <>
                                <div style={{ width: '10px', height: '10px', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid currentColor', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                설정 중
                            </>
                        ) : (
                            pushEnabled ? '알림켜짐(ON)' : '알림꺼짐(OFF)'
                        )}
                    </button>
                    <div className="tooltip-text" style={{ width: '240px', left: 'auto', right: '0', transform: 'translateX(0)', top: '130%', zIndex: 10 }}>
                        <strong>스마트폰/PC 알림 수신 설정</strong><br/>
                        새로운 회원이 결제하거나 출석할 때, 내 기기로 바로 팝업 알림을 받을 수 있게 연결합니다.
                    </div>
                </div>
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
