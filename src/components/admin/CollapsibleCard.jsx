import { useState, useEffect, useRef } from 'react';
import { CaretDown, CaretUp } from '@phosphor-icons/react';

/**
 * CollapsibleCard — 접기/펼치기 가능한 대시보드 카드 래퍼
 * 
 * 각 카드의 접힌/펼침 상태는 localStorage에 저장되어 유지됩니다.
 * viewMode(간편/전체)가 바뀌면 기본값을 재설정하되, 사용자가 개별 조정한 것은 유지합니다.
 * 
 * @param {string} id - 고유 식별자 (localStorage 키 접두사)
 * @param {string} title - 접힌 상태에서 보여줄 제목
 * @param {React.ReactNode} titleExtra - 제목 옆 보조 정보 (예: 숫자)
 * @param {boolean} defaultOpen - 기본 펼침 여부
 * @param {React.ReactNode} children - 카드 컨텐츠
 * @param {string} className - 추가 CSS 클래스
 * @param {object} style - 추가 인라인 스타일  
 * @param {function} onClick - 카드 클릭 핸들러 (필터 토글 등)
 */
const STORAGE_KEY = 'cardCollapseState';

const getStoredState = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { return {}; }
};

const CollapsibleCard = ({ 
    id, 
    title, 
    titleExtra,
    defaultOpen = true, 
    children, 
    className = '', 
    style = {},
    onClick
}) => {
    // [DEMO] 데모 사이트에서는 모든 카드를 펼침 상태로 기본 설정
    const isDemoSite = typeof window !== 'undefined' && window.location.hostname.includes('demo');
    const effectiveDefaultOpen = isDemoSite ? true : defaultOpen;

    const stored = getStoredState();
    const initialOpen = stored[id] !== undefined ? stored[id] : effectiveDefaultOpen;
    const [isOpen, setIsOpen] = useState(initialOpen);
    const contentRef = useRef(null);

    // defaultOpen이 변경되면(간편↔전체 전환) 사용자가 명시 설정 안 한 것은 따라감
    useEffect(() => {
        const s = getStoredState();
        if (s[id] === undefined) {
            setIsOpen(effectiveDefaultOpen);
        }
    }, [effectiveDefaultOpen, id]);

    const handleToggle = (e) => {
        e.stopPropagation();
        const next = !isOpen;
        setIsOpen(next);
        const s = getStoredState();
        s[id] = next;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    };

    return (
        <div 
            className={`dashboard-card ${className}`} 
            style={{ ...style, overflow: 'hidden', transition: 'all 0.3s ease' }}
            onClick={onClick}
        >
            {/* 헤더 (항상 보임) */}
            <div 
                style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    minHeight: '28px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <span className="card-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {title}
                    </span>
                    {/* 접힌 상태에서 핵심 값 요약 표시 */}
                    {!isOpen && titleExtra && (
                        <span style={{ 
                            fontSize: '1rem', fontWeight: '700', 
                            color: 'var(--primary-gold)',
                            marginLeft: '4px'
                        }}>
                            {titleExtra}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleToggle}
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        flexShrink: 0
                    }}
                    title={isOpen ? '접기' : '펼치기'}
                >
                    {isOpen ? (
                        <><CaretUp size={12} weight="bold" /> 접기</>
                    ) : (
                        <><CaretDown size={12} weight="bold" /> 펼치기</>
                    )}
                </button>
            </div>

            {/* 내용 (접기/펼치기 애니메이션) */}
            <div 
                ref={contentRef}
                style={{
                    maxHeight: isOpen ? '2000px' : '0px',
                    opacity: isOpen ? 1 : 0,
                    overflow: 'hidden',
                    transition: isOpen 
                        ? 'max-height 0.4s ease-in, opacity 0.3s ease-in 0.1s' 
                        : 'max-height 0.3s ease-out, opacity 0.15s ease-out',
                    marginTop: isOpen ? '12px' : '0px'
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default CollapsibleCard;

/**
 * 간편/전체 전환 시 모든 카드 접기 상태 초기화 유틸
 */
export const resetAllCardStates = () => {
    localStorage.removeItem(STORAGE_KEY);
};
