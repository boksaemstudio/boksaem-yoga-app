import React, { useState } from 'react';
import { X, Share, DotsThreeVertical, PlusSquare, ArrowRight, Monitor, Devices } from '@phosphor-icons/react';

const InstallGuideModal = ({ onClose }) => {
    const [tab, setTab] = useState('android'); // 'android' or 'ios'

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
            <div
                className="modal-content glass-panel"
                onClick={e => e.stopPropagation()}
                style={{
                    width: '90%',
                    maxWidth: '1200px',
                    height: 'auto',
                    minHeight: '70vh',
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRadius: '40px',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    boxShadow: '0 50px 100px rgba(0,0,0,0.8)'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '40px 50px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(to right, rgba(0,0,0,0.3), transparent)'
                }}>
                    <div>
                        <h2 style={{ fontSize: '3.2rem', margin: 0, color: 'var(--primary-gold)', fontWeight: 900, letterSpacing: '-1px' }}>
                            앱 설치 안내
                        </h2>
                        <p style={{ margin: '10px 0 0', fontSize: '1.4rem', color: 'rgba(255,255,255,0.6)' }}>
                            홈 화면에 추가하여 더 빠르고 편리하게 이용하세요.
                        </p>
                    </div>
                    <button onClick={onClose} style={{ padding: '15px', color: 'rgba(255,255,255,0.5)', transition: '0.2s' }} className="hover-bright">
                        <X size={48} weight="bold" />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)' }}>
                    <button
                        onClick={() => setTab('android')}
                        style={{
                            flex: 1,
                            padding: '30px',
                            fontSize: '1.8rem',
                            fontWeight: 800,
                            background: tab === 'android' ? 'rgba(164, 198, 57, 0.1)' : 'transparent',
                            color: tab === 'android' ? '#a4c639' : 'rgba(255,255,255,0.4)',
                            borderBottom: tab === 'android' ? '6px solid #a4c639' : 'none',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '15px'
                        }}
                    >
                        <Devices size={32} /> 삼성 갤럭시 / 안드로이드
                    </button>
                    <button
                        onClick={() => setTab('ios')}
                        style={{
                            flex: 1,
                            padding: '30px',
                            fontSize: '1.8rem',
                            fontWeight: 800,
                            background: tab === 'ios' ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
                            color: tab === 'ios' ? '#007aff' : 'rgba(255,255,255,0.4)',
                            borderBottom: tab === 'ios' ? '6px solid #007aff' : 'none',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '15px'
                        }}
                    >
                        <Monitor size={32} /> 아이폰 / iPad (iOS)
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '60px 50px' }}>
                    {tab === 'android' ? <AndroidGuide /> : <IOSGuide />}
                </div>

                {/* Footer */}
                <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--primary-gold)',
                            color: 'black',
                            padding: '20px 80px',
                            fontSize: '1.8rem',
                            fontWeight: 900,
                            borderRadius: '100px',
                            boxShadow: '0 15px 30px rgba(212, 175, 55, 0.3)',
                            cursor: 'pointer'
                        }}
                        className="hover-bright"
                    >
                        알겠습니다
                    </button>
                </div>
            </div>
        </div>
    );
};

const StepItem = ({ number, icon, text, subtext, isLast }) => (
    <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative'
    }}>
        <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '35px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '30px',
            color: 'var(--primary-gold)',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
            <div style={{
                position: 'absolute',
                top: '-15px',
                left: '-15px',
                width: '40px',
                height: '40px',
                background: 'var(--primary-gold)',
                color: 'black',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '1.6rem',
                fontWeight: 900,
                boxShadow: '0 5px 15px rgba(0,0,0,0.5)'
            }}>
                {number}
            </div>
            {icon}
        </div>

        <div style={{ padding: '0 10px' }}>
            <h4 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', marginBottom: '15px', wordBreak: 'keep-all', lineHeight: 1.3 }}>
                {text}
            </h4>
            <p style={{ fontSize: '1.4rem', color: 'rgba(255,255,255,0.5)', margin: 0, wordBreak: 'keep-all', lineHeight: 1.5 }}>
                {subtext}
            </p>
        </div>

        {!isLast && (
            <div style={{
                position: 'absolute',
                right: '-15%',
                top: '50px',
                color: 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center'
            }}>
                <ArrowRight size={40} weight="bold" />
            </div>
        )}
    </div>
);

const AndroidGuide = () => (
    <div className="guide-ani-fade">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px', width: '100%' }}>
            <StepItem
                number="1"
                icon={<DotsThreeVertical size={50} weight="bold" />}
                text="메뉴 버튼 터치"
                subtext="인터넷 주소창 옆의 '점 3개' 또는 '삼선' 메뉴를 누르세요."
            />
            <StepItem
                number="2"
                icon={<PlusSquare size={50} weight="bold" />}
                text="앱 설치 선택"
                subtext="'홈 화면에 추가' 또는 '앱 설치' 버튼을 찾아서 누르세요."
            />
            <StepItem
                number="3"
                icon={<span style={{ fontSize: '2.4rem', fontWeight: 900 }}>추가</span>}
                text="설치 확인"
                subtext="팝업창에서 '추가'를 누르면 배경화면에 앱이 생성됩니다."
                isLast={true}
            />
        </div>
    </div>
);

const IOSGuide = () => (
    <div className="guide-ani-fade">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px', width: '100%' }}>
            <StepItem
                number="1"
                icon={<Share size={50} weight="bold" />}
                text="공유 버튼 터치"
                subtext="화면 하단 중앙의 '공유' (화살표 모양) 버튼을 누르세요."
            />
            <StepItem
                number="2"
                icon={<PlusSquare size={50} weight="bold" />}
                text="홈 화면 추가"
                subtext="메뉴 리스트를 올려서 '홈 화면에 추가'를 누르세요."
            />
            <StepItem
                number="3"
                icon={<span style={{ fontSize: '2.4rem', fontWeight: 900 }}>추가</span>}
                text="완료 버튼"
                subtext="우측 상단의 '추가'를 누르면 설치가 완료됩니다."
                isLast={true}
            />
        </div>
    </div>
);

export default InstallGuideModal;
