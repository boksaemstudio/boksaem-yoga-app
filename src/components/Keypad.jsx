import { memo, useRef, useCallback } from 'react';
import './Keypad.css';


const Keypad = memo(({ onKeyPress, onClear, disabled }) => {

    return (
        <div className="keypad-grid">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                <KeyButton
                    key={key}
                    value={key}
                    onPress={onKeyPress}
                    disabled={disabled}
                >
                    {key}
                </KeyButton>
            ))}

            <KeyButton
                value="0"
                onPress={onKeyPress}
                disabled={disabled}
                style={{ gridColumn: 'span 2' }}
            >
                0
            </KeyButton>

            <KeyButton
                onPress={onClear}
                disabled={disabled}
                className="clear-btn"
            >
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>지움</div>
            </KeyButton>
        </div>
    );
});
Keypad.displayName = 'Keypad';

// Extracted Button Component with memo for performance
// [FIX] 롱프레스 시에도 입력되도록 touchstart에서 즉시 처리 + contextmenu 차단 + Zero-Lag 렌더링
const KeyButton = memo(({ value, onPress, disabled, children, special, className, style }) => {
    const touchHandledRef = useRef(false);

    const handleAction = useCallback((e) => {
        if (disabled) return;
        if (navigator.vibrate) navigator.vibrate(10);
        if (value !== undefined) onPress(value);
        else onPress();
    }, [disabled, onPress, value]);

    // [PERF 4] React State 리렌더링 완벽 제거
    // 터치 시마다 useState(isActive)가 발동하여 9개 전체 버튼을 리렌더링하는 것을 방지
    // DOM 클래스를 직접 조작하여 CSS :active 애니메이션만 즉시 구동시킴 (Zero-Lag)
    const addActiveStyle = (e) => {
        if (disabled || !e.currentTarget) return;
        e.currentTarget.classList.add('touch-active');
    };
    
    const removeActiveStyle = (e) => {
        if (!e.currentTarget) return;
        e.currentTarget.classList.remove('touch-active');
    };

    return (
        <button
            className={`keypad-btn ${className || ''} ${special || ''}`}
            // [FIX] 롱프레스 시 브라우저 기본 컨텍스트 메뉴(다운로드/공유/인쇄) 완전 차단
            onContextMenu={(e) => e.preventDefault()}
            // [FIX] 터치 시작 시점에 즉시 입력 처리 → DOM 조작으로 0ms 렌더링
            onTouchStart={(e) => {
                e.preventDefault(); // 기본 스크롤 및 롱프레스 방지
                if (disabled) return;
                
                touchHandledRef.current = true;
                addActiveStyle(e);
                handleAction(e);
            }}
            onTouchEnd={removeActiveStyle}
            onTouchCancel={removeActiveStyle}
            // [FIX] PC 마우스 클릭 시
            onClick={(e) => {
                if (disabled) return;
                if (touchHandledRef.current) {
                    touchHandledRef.current = false;
                    return; // 터치에서 이미 처리됨
                }
                handleAction(e);
            }}
            onMouseDown={addActiveStyle}
            onMouseUp={removeActiveStyle}
            onMouseLeave={removeActiveStyle}
            disabled={disabled}
            style={{
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                ...style
            }}
        >
            {children}
        </button>
    );
});
KeyButton.displayName = 'KeyButton';

export default Keypad;
