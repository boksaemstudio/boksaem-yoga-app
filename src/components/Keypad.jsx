import { memo, useRef } from 'react';
import './Keypad.css';


const Keypad = ({ onKeyPress, onClear, disabled }) => {

    return (
        <div className="keypad-grid">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                <KeyButton
                    key={key}
                    onPress={() => onKeyPress(key)}
                    disabled={disabled}
                >
                    {key}
                </KeyButton>
            ))}

            <KeyButton
                onPress={() => onKeyPress('0')}
                disabled={disabled}
                style={{ gridColumn: 'span 2' }}
            >
                0
            </KeyButton>

            <KeyButton
                onPress={() => onClear()}
                disabled={disabled}
                className="clear-btn"
            >
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>지움</div>
            </KeyButton>
        </div>
    );
};

// Extracted Button Component with memo for performance
// [FIX] 롱프레스 시에도 입력되도록 touchstart에서 즉시 처리 + contextmenu 차단
const KeyButton = memo(({ onPress, disabled, children, special, className, style }) => {
    const touchHandledRef = useRef(false);

    return (
        <button
            className={`keypad-btn ${className || ''} ${special || ''}`}
            // [FIX] 롱프레스 시 브라우저 기본 컨텍스트 메뉴(다운로드/공유/인쇄) 완전 차단
            onContextMenu={(e) => e.preventDefault()}
            // [FIX] 터치 시작 시점에 즉시 입력 처리 → 롱프레스와 무관하게 동작
            onTouchStart={(e) => {
                e.preventDefault(); // 브라우저 기본 동작(스크롤, 롱프레스 메뉴 등) 차단
                if (disabled) return; // [FIX] touchStart 무시
                touchHandledRef.current = true;
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
                onPress(e);
            }}
            // [FIX] PC 마우스 클릭은 정상 유지, 터치 후 중복 click은 무시
            onClick={(e) => {
                if (disabled) return; // [FIX] 혹시 모를 안전장치
                if (touchHandledRef.current) {
                    touchHandledRef.current = false;
                    return; // 터치에서 이미 처리됨, 중복 방지
                }
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
                onPress(e);
            }}
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
