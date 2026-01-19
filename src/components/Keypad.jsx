import React from 'react';
import { Backspace } from '@phosphor-icons/react';
import './Keypad.css';
import logoCircle from '../assets/logo_circle.png';

const Keypad = ({ onKeyPress, onClear, disabled }) => {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

    const handleInteraction = (action) => {
        action(); // Execute immediately for faster response
        if (navigator.vibrate) {
            setTimeout(() => navigator.vibrate(15), 0); // Async haptic feedback
        }
    };

    return (
        <div className="keypad-grid">
            {keys.map((key) => (
                <KeyButton
                    key={key}
                    onClick={() => handleInteraction(() => onKeyPress(key))}
                    disabled={disabled}
                >
                    {key}
                </KeyButton>
            ))}

            <KeyButton
                onClick={() => handleInteraction(onClear)}
                disabled={disabled}
                special="clear"
            >
                <Backspace size={48} weight="bold" />
            </KeyButton>

            <KeyButton
                onClick={() => handleInteraction(() => onKeyPress('0'))}
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
const KeyButton = React.memo(({ onClick, disabled, children, special }) => {
    const lastTap = React.useRef(0);

    const handleClick = (e) => {
        const now = Date.now();
        if (now - lastTap.current < 50) { // 50ms - only prevent physical double-tap
            e.preventDefault();
            return;
        }
        lastTap.current = now;
        onClick(e);
    };

    return (
        <button
            className={`keypad-btn ${special || ''}`}
            onClick={handleClick}
            disabled={disabled}
            style={{ touchAction: 'manipulation' }}
        >
            {children}
        </button>
    );
});

export default Keypad;
