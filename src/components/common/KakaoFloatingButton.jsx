import React from 'react';
import { ChatCircleDots } from '@phosphor-icons/react';

const KakaoFloatingButton = () => {
    return (
        <a 
            href="http://pf.kakao.com/_zDxiMX/chat" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                width: '60px',
                height: '60px',
                borderRadius: '30px',
                backgroundColor: '#FEE500',
                color: '#191919',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px rgba(254, 229, 0, 0.4)',
                zIndex: 9999,
                cursor: 'pointer',
                transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1) translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
            title="카카오톡으로 문의하기"
        >
            <ChatCircleDots size={34} weight="fill" />
            
            {/* Tooltip-style prompt text (visible subtly next to the button, optional but great for UX) */}
            <div style={{
                position: 'absolute',
                right: '75px',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '8px 14px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                opacity: 0.9,
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
            }}>
                궁금한 점이 있으신가요?
            </div>
        </a>
    );
};

export default KakaoFloatingButton;
