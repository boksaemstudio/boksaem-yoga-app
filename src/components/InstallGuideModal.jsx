import React, { useState } from 'react';
import { X, Share, DotsThreeVertical, PlusSquare, ArrowDown } from '@phosphor-icons/react';

const InstallGuideModal = ({ isOpen, onClose }) => {
    const [tab, setTab] = useState(() => {
        const ua = window.navigator.userAgent.toLowerCase();
        return (/iphone|ipad|ipod|macintosh/.test(ua) && 'ontouchend' in document) ? 'ios' : 'android';
    });

    if (!isOpen) return null;

    // Detect if we're on a small screen (mobile)
    const isMobile = window.innerWidth <= 768;

    return (
        <div
            onClick={(e) => { e.stopPropagation(); }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 3000,
                background: 'rgba(0,0,0,0.92)',
                display: 'flex',
                alignItems: isMobile ? 'flex-end' : 'center',
                justifyContent: 'center',
                touchAction: 'none',
                animation: 'fadeIn 0.3s ease-out'
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
                style={{
                    width: isMobile ? '100%' : '90%',
                    maxWidth: isMobile ? '100%' : '500px',
                    maxHeight: isMobile ? '92dvh' : '85vh',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRadius: isMobile ? '20px 20px 0 0' : '20px',
                    border: '1px solid rgba(255, 215, 0, 0.2)',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                    background: 'linear-gradient(180deg, #1a1a1f 0%, #0d0d10 100%)',
                    animation: isMobile ? 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'fadeIn 0.3s ease-out'
                }}
            >
                {/* Drag Handle (Mobile) */}
                {isMobile && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
                        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)' }} />
                    </div>
                )}

                {/* Header */}
                <div style={{
                    padding: isMobile ? '16px 20px 12px' : '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                    <div>
                        <h2 style={{
                            fontSize: isMobile ? '1.25rem' : '1.4rem',
                            margin: 0,
                            color: 'var(--primary-gold)',
                            fontWeight: 800,
                            letterSpacing: '-0.3px'
                        }}>
                            📲 앱 설치 안내
                        </h2>
                        <p style={{
                            margin: '4px 0 0',
                            fontSize: isMobile ? '0.85rem' : '0.9rem',
                            color: 'rgba(255,255,255,0.5)',
                            lineHeight: 1.4
                        }}>
                            홈 화면에 추가하면 앱처럼 바로 실행돼요!
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px',
                            color: 'rgba(255,255,255,0.4)',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                    >
                        <X size={20} weight="bold" />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)' }}>
                    <TabBtn
                        active={tab === 'android'}
                        label="안드로이드"
                        emoji="🤖"
                        color="#a4c639"
                        onClick={() => setTab('android')}
                    />
                    <TabBtn
                        active={tab === 'ios'}
                        label="아이폰 / iPad"
                        emoji="🍎"
                        color="#007aff"
                        onClick={() => setTab('ios')}
                    />
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    padding: isMobile ? '20px 20px 24px' : '24px',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    {tab === 'android' ? <AndroidGuide /> : <IOSGuide />}
                </div>

                {/* Close Button */}
                <div style={{ padding: '0 20px 20px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'var(--primary-gold)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        확인했어요
                    </button>
                </div>
            </div>
        </div>
    );
};

// Tab Button
const TabBtn = ({ active, label, emoji, color, onClick }) => (
    <button
        onClick={onClick}
        style={{
            flex: 1,
            padding: '12px 8px',
            fontSize: '0.9rem',
            fontWeight: 700,
            background: active ? `${color}15` : 'transparent',
            color: active ? color : 'rgba(255,255,255,0.35)',
            borderBottom: active ? `3px solid ${color}` : '3px solid transparent',
            border: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
        }}
    >
        <span style={{ fontSize: '1.1rem' }}>{emoji}</span> {label}
    </button>
);

// Step Item (Vertical Layout for Mobile)
const MobileStep = ({ number, icon, title, desc, color, isLast }) => (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        {/* Step Number + Line */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: color || 'var(--primary-gold)',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.95rem',
                fontWeight: 800
            }}>
                {number}
            </div>
            {!isLast && (
                <div style={{
                    width: '2px',
                    height: '40px',
                    background: `linear-gradient(to bottom, ${color || 'var(--primary-gold)'}40, transparent)`,
                    marginTop: '4px'
                }} />
            )}
        </div>

        {/* Content */}
        <div style={{ paddingTop: '4px', paddingBottom: isLast ? 0 : '20px', flex: 1 }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '6px'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color || 'var(--primary-gold)',
                    flexShrink: 0
                }}>
                    {icon}
                </div>
                <h4 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#fff',
                    lineHeight: 1.3
                }}>
                    {title}
                </h4>
            </div>
            <p style={{
                margin: '0 0 0 50px',
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.5,
                wordBreak: 'keep-all'
            }}>
                {desc}
            </p>
        </div>
    </div>
);

const AndroidGuide = () => (
    <div>
        {/* Tip Banner */}
        <div style={{
            padding: '12px 14px',
            background: 'rgba(164, 198, 57, 0.08)',
            border: '1px solid rgba(164, 198, 57, 0.15)',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        }}>
            <span style={{ fontSize: '1.2rem' }}>💡</span>
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, wordBreak: 'keep-all' }}>
                Chrome 브라우저에서 진행하면 가장 쉽게 설치할 수 있어요!
            </span>
        </div>

        <MobileStep
            number="1"
            icon={<DotsThreeVertical size={22} weight="bold" />}
            title="메뉴(⋮) 버튼 터치"
            desc="화면 우측 상단의 점 3개(⋮) 메뉴를 눌러주세요."
            color="#a4c639"
        />
        <MobileStep
            number="2"
            icon={<PlusSquare size={22} weight="bold" />}
            title="'홈 화면에 추가' 선택"
            desc="메뉴 목록에서 '홈 화면에 추가' 또는 '앱 설치'를 찾아 눌러주세요."
            color="#a4c639"
        />
        <MobileStep
            number="3"
            icon={<span style={{ fontSize: '0.85rem', fontWeight: 800 }}>설치</span>}
            title="설치 완료!"
            desc="'설치' 또는 '추가' 버튼을 누르면 홈 화면에 앱 아이콘이 생겨요. 🎉"
            color="#a4c639"
            isLast
        />
    </div>
);

const IOSGuide = () => (
    <div>
        {/* Tip Banner */}
        <div style={{
            padding: '12px 14px',
            background: 'rgba(0, 122, 255, 0.08)',
            border: '1px solid rgba(0, 122, 255, 0.15)',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        }}>
            <span style={{ fontSize: '1.2rem' }}>💡</span>
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, wordBreak: 'keep-all' }}>
                반드시 <b style={{ color: '#007aff' }}>Safari</b> 브라우저에서 진행해 주세요! (Chrome에서는 불가)
            </span>
        </div>

        <MobileStep
            number="1"
            icon={<Share size={22} weight="bold" />}
            title="공유(↑) 버튼 터치"
            desc="화면 하단 중앙의 공유 버튼(네모에서 화살표 나온 모양)을 눌러주세요."
            color="#007aff"
        />
        <MobileStep
            number="2"
            icon={<PlusSquare size={22} weight="bold" />}
            title="'홈 화면에 추가' 선택"
            desc="공유 메뉴를 위로 스크롤하면 '홈 화면에 추가' 항목이 있어요."
            color="#007aff"
        />
        <MobileStep
            number="3"
            icon={<span style={{ fontSize: '0.85rem', fontWeight: 800 }}>추가</span>}
            title="설치 완료!"
            desc="우측 상단의 '추가'를 누르면 홈 화면에 앱 아이콘이 생겨요. 🎉"
            color="#007aff"
            isLast
        />
    </div>
);

export default InstallGuideModal;
