import { useState } from 'react';
import { X, Share, DotsThreeVertical, PlusSquare } from '@phosphor-icons/react';
import { useStudioConfig } from '../../contexts/StudioContext';

const KioskInstallGuideModal = ({ isOpen, onClose }) => {
    const { config } = useStudioConfig();
    const [tab, setTab] = useState(() => {
        const ua = window.navigator.userAgent.toLowerCase();
        return (/iphone|ipad|ipod|macintosh/.test(ua) && 'ontouchend' in document) ? 'ios' : 'android';
    });

    if (!isOpen) return null;

    // CheckInPage Native Style (Low Spec, Solid Colors, No Blur)
    const bgColor = '#18181b'; // Dark gray, matches typical CheckIn app bg
    const goldColor = config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)';

    return (
        <div
            onClick={(e) => { e.stopPropagation(); }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 4000,
                background: 'rgba(0,0,0,0.85)', // Simple solid dimming, no backdrop-filter
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '90%',
                    maxWidth: '850px',
                    height: '85vh',
                    maxHeight: '620px',
                    background: bgColor,
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'row',
                    overflow: 'hidden',
                    border: `2px solid ${goldColor}`,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}
            >
                {/* Left Column: Tabs & Header (30%) */}
                <div style={{
                    width: '320px',
                    background: '#202024',
                    borderRight: '1px solid #333',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '30px',
                }}>
                    <h2 style={{
                        fontSize: '1.6rem',
                        color: goldColor,
                        margin: '0 0 10px 0',
                        fontWeight: 'bold'
                    }}>
                        📲 앱 설치 안내
                    </h2>
                    <p style={{
                        color: '#aaa',
                        fontSize: '1rem',
                        lineHeight: 1.5,
                        margin: '0 0 40px 0',
                        wordBreak: 'keep-all'
                    }}>
                        홈 화면에 앱을 추가해두고 언제든 바로 실행하세요.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <DeviceTabBtn
                            active={tab === 'android'}
                            label="Android / Galaxy"
                            icon="🤖"
                            activeColor="#a4c639"
                            onClick={() => setTab('android')}
                        />
                        <DeviceTabBtn
                            active={tab === 'ios'}
                            label="iPhone / iPad / iOS"
                            icon="🍎"
                            activeColor="#007aff"
                            onClick={() => setTab('ios')}
                        />
                    </div>
                </div>

                {/* Right Column: Content (70%) */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}>
                    {/* Close Btn Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        padding: '20px',
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                background: '#333',
                                border: 'none',
                                color: '#fff',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={24} weight="bold" />
                        </button>
                    </div>

                    {/* Scrollable Guide Content */}
                    <div style={{
                        flex: 1,
                        padding: '0 40px 40px 40px',
                        overflowY: 'auto',
                        color: config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'
                    }}>
                        {tab === 'android' ? <TabletAndroidGuide /> : <TabletIOSGuide />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DeviceTabBtn = ({ active, label, icon, activeColor, onClick }) => (
    <button
        onClick={onClick}
        style={{
            padding: '20px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            background: active ? '#2a2a30' : 'transparent',
            color: active ? activeColor : '#666',
            border: `2px solid ${active ? activeColor : '#444'}`,
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'left',
            transition: 'background 0.2s'
        }}
    >
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        {label}
    </button>
);

const TabletStep = ({ number, icon, title, desc, color }) => (
    <div style={{
        display: 'flex',
        gap: '24px',
        alignItems: 'flex-start',
        marginBottom: '35px'
    }}>
        <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: '#2a2a30',
            border: `2px solid ${color}`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            flexShrink: 0
        }}>
            {number}
        </div>
        <div style={{ paddingTop: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ color: color }}>{icon}</span>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#fff' }}>{title}</h3>
            </div>
            <p style={{ margin: 0, fontSize: '1.1rem', color: '#bbb', lineHeight: 1.5, wordBreak: 'keep-all' }}>
                {desc}
            </p>
        </div>
    </div>
);

const TabletAndroidGuide = () => (
    <div>
        <div style={{
            background: '#2a3a1f',
            color: '#c5e884',
            padding: '14px 20px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        }}>
            💡 <b>Chrome(크롬) 브라우저</b>에서 진행을 권장합니다.
        </div>

        <TabletStep
            number="1"
            icon={<DotsThreeVertical size={32} weight="bold" />}
            title="메뉴 버튼 터치"
            desc="Chrome 브라우저 우측 상단의 점 3개(⋮) 메뉴를 누르세요."
            color="#a4c639"
        />
        <TabletStep
            number="2"
            icon={<PlusSquare size={32} weight="bold" />}
            title="'홈 화면에 추가' 선택"
            desc="목록에서 '홈 화면에 추가' 또는 '앱 설치'를 찾아 선택하세요."
            color="#a4c639"
        />
        <TabletStep
            number="3"
            icon={<span style={{ fontSize: '1.2rem', fontWeight: 800 }}>설치</span>}
            title="바탕화면 확인"
            desc="화면에 나오는 설치 버튼을 누르면, 홈 화면에 앱 아이콘이 생성됩니다."
            color="#a4c639"
        />
    </div>
);

const TabletIOSGuide = () => (
    <div>
        <div style={{
            background: '#1c3454',
            color: '#8cb9f2',
            padding: '14px 20px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        }}>
            💡 <b>Safari(사파리) 브라우저</b>에서만 가능합니다.
        </div>

        <TabletStep
            number="1"
            icon={<Share size={32} weight="bold" />}
            title="공유 버튼 터치"
            desc="Safari 상단(또는 우측 상단)의 공유 아이콘(↑ 네모)을 누르세요."
            color="#007aff"
        />
        <TabletStep
            number="2"
            icon={<PlusSquare size={32} weight="bold" />}
            title="'홈 화면에 추가' 선택"
            desc="메뉴를 위로 끌어올려 '홈 화면에 추가' 항목을 선택하세요."
            color="#007aff"
        />
        <TabletStep
            number="3"
            icon={<span style={{ fontSize: '1.2rem', fontWeight: 800 }}>추가</span>}
            title="바탕화면 확인"
            desc="우측 상단의 '추가'를 누르면, 홈 화면에 앱 아이콘이 생성됩니다."
            color="#007aff"
        />
    </div>
);

export default KioskInstallGuideModal;
