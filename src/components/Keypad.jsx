import React from 'react';
import { Backspace } from '@phosphor-icons/react';
import './Keypad.css';


const Keypad = ({ onKeyPress, onClear, disabled }) => {


    const handleInteraction = (e, action) => {
        // Prevent default only for touch to avoid phantom clicks
        if (e.type === 'touchstart') {
            e.preventDefault();
        }
        action();
        if (navigator.vibrate) {
            navigator.vibrate(10); // Simpler feedback
        }
    };

    return (
        <div className="keypad-grid">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                <KeyButton
                    key={key}
                    onPress={(e) => handleInteraction(e, () => onKeyPress(key))}
                    disabled={disabled}
                >
                    {key}
                </KeyButton>
            ))}

            <KeyButton
                onPress={(e) => handleInteraction(e, () => onKeyPress('0'))}
                disabled={disabled}
                style={{ gridColumn: 'span 2' }}
            >
                0
            </KeyButton>

            <KeyButton
                onPress={(e) => handleInteraction(e, onClear)}
                disabled={disabled}
                className="clear-btn"
            >
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>지움</div>
            </KeyButton>
        </div>
    );
};

// Extracted Button Component with memo for performance
const KeyButton = React.memo(({ onPress, disabled, children, special, className, style }) => {
    const lastEventTime = React.useRef(0);

    const handleProtectedPress = (e) => {
        const now = Date.now();
        // Increased to 280ms per user request to reliably block phantom mouse clicks; adjusted from 350ms
        if (now - lastEventTime.current < 280) {
            if (e.cancelable) e.preventDefault();
            return;
        }
        lastEventTime.current = now;

        // Ensure event isolation
        if (e.stopPropagation) e.stopPropagation();

        onPress(e);
    };

    return (
        <button
            className={`keypad-btn ${className || ''} ${special || ''}`}
            onTouchStart={handleProtectedPress}
            onMouseDown={(e) => {
                // Ignore if it's not the primary button or if it's a simulated event from touch
                if (e.button !== 0) return;

                // If it's a mouse event following a touch event, it will be blocked by the 300ms threshold above.
                handleProtectedPress(e);
            }}
            disabled={disabled}
            style={{
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                ...style
            }}
        >
            {children}
        </button>
    );
});

export default Keypad;
