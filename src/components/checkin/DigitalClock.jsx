import { useState, useEffect, memo } from 'react';

// [OPTIMIZED] Self-contained Clock to prevent full-page re-renders
const DigitalClock = memo(() => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Optimized formatting for older CPUs
    const h = time.getHours().toString().padStart(2, '0');
    const m = time.getMinutes().toString().padStart(2, '0');
    const s = time.getSeconds().toString().padStart(2, '0');

    return (
        <div className="top-clock outfit-font" style={{
            fontSize: '2.2rem',
            fontWeight: 700,
            color: 'var(--primary-gold)',
            letterSpacing: '2px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1
        }}>
            {h}:{m}:{s}
        </div>
    );
});
DigitalClock.displayName = 'DigitalClock';

export default DigitalClock;
