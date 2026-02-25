import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to create a typewriter effect for text
 * @param {string} text The full text to display
 * @param {number} speed The typing speed in ms per character (default: 40)
 * @returns {string} The progressively revealed text
 */
export const useTypewriter = (text, speed = 40) => {
    const [displayedText, setDisplayedText] = useState("");
    const indexRef = useRef(0);

    useEffect(() => {
        // Reset state when text explicitly changes
        setDisplayedText("");
        indexRef.current = 0;

        if (!text) return;

        const interval = setInterval(() => {
            setDisplayedText((prev) => {
                const newText = prev + text.charAt(indexRef.current);
                indexRef.current += 1;
                
                if (indexRef.current >= text.length) {
                    clearInterval(interval);
                }
                return newText;
            });
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed]);

    return displayedText;
};
