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
    return (
        <button
            className={`keypad-btn ${className || ''} ${special || ''}`}
            onClick={(e) => {
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
                ...style
            }}
        >
            {children}
        </button>
    );
});

export default Keypad;
