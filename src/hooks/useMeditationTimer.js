/**
 * useMeditationTimer - 명상 타이머/세션 관리 훅
 * 
 * [Refactor] MeditationPage.jsx에서 추출됨
 * 타이머, 세션 시작/완료, 일시정지/재생 로직을 캡슐화합니다.
 * 
 * @module useMeditationTimer
 */

import { useState, useRef, useCallback } from 'react';

/**
 * @param {Object} options
 * @param {Function} options.onComplete - 세션 완료 시 콜백
 * @param {Function} options.onMessageTick - 메시지 루프 틱 콜백 (AI 세션 메시지)
 * @param {Function} options.logDebug - 디버그 로깅 함수
 */
export const useMeditationTimer = ({ onComplete, onMessageTick, logDebug }) => {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const timerRef = useRef(null);
    const messageIntervalRef = useRef(null);

    // --- Format Time ---
    const formatTime = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }, []);

    // --- Start Timer ---
    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    clearInterval(messageIntervalRef.current);
                    onComplete?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [onComplete]);

    // --- Start Message Loop ---
    const startMessageLoop = useCallback(() => {
        if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
        
        onMessageTick?.();
        
        messageIntervalRef.current = setInterval(() => {
            onMessageTick?.();
        }, 20000);
    }, [onMessageTick]);

    // --- Start Session ---
    const startSession = useCallback((duration) => {
        logDebug?.("Timer:StartSession", { duration });
        setTimeLeft(duration);
        setIsPlaying(true);
        startTimer();
        
        // Delay the first AI session message to let pre-intro breathe
        setTimeout(() => {
            startMessageLoop();
        }, 8000);
    }, [startTimer, startMessageLoop, logDebug]);

    // --- Toggle Play ---
    const togglePlay = useCallback((audioCtxRef, videoRef, interactionType, drawVisualizerFn) => {
        if (isPlaying) {
            clearInterval(timerRef.current);
            clearInterval(messageIntervalRef.current);
            if (audioCtxRef?.current) audioCtxRef.current.suspend();
            if (videoRef?.current) videoRef.current.pause();
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
            startTimer();
            startMessageLoop();
            if (audioCtxRef?.current) audioCtxRef.current.resume();
            if (interactionType === 'v2') drawVisualizerFn?.();
            if (videoRef?.current) videoRef.current.play();
        }
    }, [isPlaying, startTimer, startMessageLoop]);

    // --- Stop Timer ---
    const stopTimer = useCallback(() => {
        clearInterval(timerRef.current);
        clearInterval(messageIntervalRef.current);
        setIsPlaying(false);
    }, []);

    // --- Cleanup ---
    const cleanupTimer = useCallback(() => {
        clearInterval(timerRef.current);
        clearInterval(messageIntervalRef.current);
        timerRef.current = null;
        messageIntervalRef.current = null;
    }, []);

    return {
        // State
        timeLeft,
        setTimeLeft,
        isPlaying,
        setIsPlaying,
        
        // Refs
        timerRef,
        messageIntervalRef,
        
        // Methods
        formatTime,
        startTimer,
        startMessageLoop,
        startSession,
        togglePlay,
        stopTimer,
        cleanupTimer,
    };
};
