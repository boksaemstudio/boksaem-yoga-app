import React from 'react';
import { Backspace } from '@phosphor-icons/react';
import './Keypad.css';
import logoCircle from '../assets/logo_circle.png';

const Keypad = ({ onKeyPress, onClear, disabled }) => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

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
            {keys.map((key) => (
                <KeyButton
                    key={key}
                    onPress={(e) => handleInteraction(e, () => onKeyPress(key))}
                    disabled={disabled}
                >
                    {key}
                </KeyButton>
            ))}

            <KeyButton
                onPress={(e) => handleInteraction(e, onClear)}
                disabled={disabled}
                special="clear"
            >
                <Backspace size={48} weight="bold" />
            </KeyButton>

            <KeyButton
                onPress={(e) => handleInteraction(e, () => onKeyPress('0'))}
                disabled={disabled}
            >
                0
            </KeyButton>

            <div className="keypad-logo-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img src={logoCircle} alt="logo" style={{ width: '90px', height: '90px', filter: 'brightness(0) invert(1)' }} />
            </div>
        </div>
    );
};

// Extracted Button Component with memo for performance
const KeyButton = React.memo(({ onPress, disabled, children, special }) => {
    const lastEventTime = React.useRef(0);

    const handleProtectedPress = (e) => {
        const now = Date.now();
        // Increased to 350ms to prevent double input on tablets while maintaining responsiveness
        if (now - lastEventTime.current < 350) {
            if (e.cancelable) e.preventDefault();
            return;
        }
        lastEventTime.current = now;
        onPress(e);
    };

    return (
        <button
            className={`keypad-btn ${special || ''}`}
            onTouchStart={handleProtectedPress}
            onMouseDown={(e) => {
                // Ignore if touch (which happened < 300ms ago) handled it
                if (e.button === 0) handleProtectedPress(e);
            }}
            disabled={disabled}
            style={{
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none'
            }}
        >
            {children}
        </button>
    );
});

export default Keypad;
