import { useState, useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';

/**
 * ImageLightbox - 이미지 터치 시 전체 화면으로 확대하여 보여주는 모달 컴포넌트
 * 
 * @param {string} src - 표시할 이미지 URL
 * @param {function} onClose - 모달 닫기 핸들러
 */
const ImageLightbox = ({ src, onClose }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [initialDistance, setInitialDistance] = useState(null);
    const containerRef = useRef(null);

    // ESC 키로 닫기
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // 배경 스크롤 방지
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // 두 손가락 사이 거리 계산
    const getDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            // 핀치 줌 시작
            setInitialDistance(getDistance(e.touches));
        } else if (e.touches.length === 1 && scale > 1) {
            // 드래그 시작 (확대된 상태에서만)
            setIsDragging(true);
            setStartPos({
                x: e.touches[0].clientX - position.x,
                y: e.touches[0].clientY - position.y
            });
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && initialDistance) {
            // 핀치 줌
            const currentDistance = getDistance(e.touches);
            const newScale = Math.min(Math.max(scale * (currentDistance / initialDistance), 1), 4);
            setScale(newScale);
            setInitialDistance(currentDistance);
            
            // 줌이 1로 돌아가면 위치 초기화
            if (newScale <= 1) {
                setPosition({ x: 0, y: 0 });
            }
        } else if (e.touches.length === 1 && isDragging && scale > 1) {
            // 드래그
            const newX = e.touches[0].clientX - startPos.x;
            const newY = e.touches[0].clientY - startPos.y;
            setPosition({ x: newX, y: newY });
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setInitialDistance(null);
    };

    // 더블 탭으로 줌 토글
    const lastTap = useRef(0);
    const handleDoubleTap = (e) => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
            e.preventDefault();
            if (scale > 1) {
                setScale(1);
                setPosition({ x: 0, y: 0 });
            } else {
                setScale(2);
            }
        }
        lastTap.current = now;
    };

    // 배경 클릭으로 닫기 (이미지 외부 영역)
    const handleBackdropClick = (e) => {
        if (e.target === containerRef.current) {
            onClose();
        }
    };

    return (
        <div
            ref={containerRef}
            onClick={handleBackdropClick}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            {/* 닫기 버튼 */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10001
                }}
            >
                <X size={24} color="white" weight="bold" />
            </button>

            {/* 줌 힌트 */}
            <div style={{
                position: 'absolute',
                bottom: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.8rem',
                textAlign: 'center',
                pointerEvents: 'none'
            }}>
                {scale > 1 ? '드래그하여 이동' : '두 손가락으로 확대 • 더블 탭으로 줌'}
            </div>

            {/* 이미지 */}
            <img
                src={src}
                alt="확대 보기"
                onClick={handleDoubleTap}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    maxWidth: '95vw',
                    maxHeight: '90vh',
                    objectFit: 'contain',
                    transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                    touchAction: 'none',
                    userSelect: 'none'
                }}
                draggable={false}
            />
        </div>
    );
};

export default ImageLightbox;
