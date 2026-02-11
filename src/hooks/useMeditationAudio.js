/**
 * useMeditationAudio - 명상 오디오/TTS/앰비언트/바이노랄 관리 훅
 * 
 * [Refactor] MeditationPage.jsx에서 추출됨
 * 오디오 관련 로직을 캡슐화하여 MeditationPage의 복잡도를 줄입니다.
 * 
 * @module useMeditationAudio
 */

import { useState, useRef, useCallback } from 'react';

/**
 * @param {Object} options
 * @param {boolean} options.ttcEnabled - TTS 음성 안내 활성화 여부
 * @param {Object} options.audioVolumes - { voice, ambient, binaural } 음량 객체
 * @param {boolean} options.soundEnabled - 전체 사운드 활성화 여부
 * @param {Function} options.logDebug - 디버그 로깅 함수
 */
export const useMeditationAudio = ({ ttcEnabled, audioVolumes, soundEnabled, logDebug }) => {
    // TTS 상태
    const [ttsState, setTtsState] = useState({ isSpeaking: false, engine: 'None', volume: 0 });
    const [micVolume, setMicVolume] = useState(0);

    // Audio Refs
    const audioContextRef = useRef(null);
    const currentAudioRef = useRef(null);
    const ambientAudioRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const sourceRef = useRef(null);
    const animationFrameRef = useRef(null);
    const oscLeftRef = useRef(null);
    const oscRightRef = useRef(null);
    const gainNodeRef = useRef(null);

    // --- AudioContext ---
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    // --- Stop Voice Only (preserves ambient & binaural) ---
    const stopVoiceOnly = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
        if (currentAudioRef.current) {
            try { currentAudioRef.current.pause(); currentAudioRef.current.currentTime = 0; } catch { /* ignore */ }
            currentAudioRef.current = null;
        }
    }, []);

    // --- Stop All Audio ---
    const stopAllAudio = useCallback((stopAmbient = false) => {
        stopVoiceOnly();
        
        if (stopAmbient && ambientAudioRef.current) {
            try { ambientAudioRef.current.pause(); } catch { /* ignore */ }
        }
        
        if (oscLeftRef.current) {
            try { oscLeftRef.current.stop(); } catch { /* ignore */ }
            oscLeftRef.current = null;
        }
        if (oscRightRef.current) {
            try { oscRightRef.current.stop(); } catch { /* ignore */ }
            oscRightRef.current = null;
        }
        
        logDebug?.("StopAllAudio", { stopAmbient });
    }, [stopVoiceOnly, logDebug]);

    // --- Cloud TTS Audio Player ---
    const playAudio = useCallback((base64String, onEndedCallback) => {
        if (!ttcEnabled || !base64String) return null;
        
        try {
            stopVoiceOnly();
            
            const audio = new Audio(`data:audio/mp3;base64,${base64String}`);
            audio.volume = audioVolumes.voice;
            currentAudioRef.current = audio;

            setTtsState({ isSpeaking: true, engine: 'Cloud TTS', volume: audio.volume });
            logDebug?.("PlayAudio:Start", { vol: audioVolumes.voice });

            audio.onended = () => {
                logDebug?.("PlayAudio:Ended");
                setTtsState(prev => ({ ...prev, isSpeaking: false }));
                if (currentAudioRef.current === audio) currentAudioRef.current = null;
                if (onEndedCallback) onEndedCallback();
            };
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error("🔊 Audio Playback Failed:", e);
                    setTtsState(prev => ({ ...prev, isSpeaking: false }));
                });
            }
            return audio;
        } catch (e) {
            console.error("🔊 Audio Error:", e);
            setTtsState(prev => ({ ...prev, isSpeaking: false }));
            return null;
        }
    }, [ttcEnabled, audioVolumes.voice, stopVoiceOnly, logDebug]);

    // --- Local TTS Speak ---
    const speak = useCallback((text) => {
        logDebug?.("Speak:Start", text);
        if (!text || typeof window === 'undefined' || !ttcEnabled || !window.speechSynthesis) return;
        
        stopVoiceOnly();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        utterance.onstart = () => setTtsState({ isSpeaking: true, engine: 'Local TTS', volume: 0.8 });
        utterance.onend = () => setTtsState(prev => ({ ...prev, isSpeaking: false }));
        utterance.onerror = () => setTtsState(prev => ({ ...prev, isSpeaking: false }));
        
        setTimeout(() => {
            if (window.speechSynthesis && ttcEnabled) {
                window.speechSynthesis.speak(utterance);
            }
        }, 100);
    }, [ttcEnabled, stopVoiceOnly, logDebug]);

    // --- Fallback Local TTS ---
    const speakFallback = useCallback((text) => {
        if (!text || typeof window === 'undefined' || !ttcEnabled || !window.speechSynthesis) return;
        
        logDebug?.("SpeakFallback", text);
        stopVoiceOnly();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        setTimeout(() => {
            if (window.speechSynthesis && ttcEnabled) window.speechSynthesis.speak(utterance);
        }, 100);
    }, [ttcEnabled, stopVoiceOnly, logDebug]);

    const drawAudioVisualizer = useCallback(function draw() {
        if (!analyserRef.current) return;
        animationFrameRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        let sum = 0;
        for (let i = 0; i < 15; i++) { sum += dataArrayRef.current[i]; }
        const average = sum / 15;
        setMicVolume(Math.min((average * 6) / 100, 2.5));
    }, []);

    // --- Audio Analysis (Microphone) ---
    const setupAudioAnalysis = useCallback((stream, audioCtx) => {
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        sourceRef.current = source;
        drawAudioVisualizer();
    }, [drawAudioVisualizer]);

    // --- Binaural Beats Setup ---
    const startBinauralBeats = useCallback((mode) => {
        const audioCtx = getAudioContext();
        const carrierFreq = 200;
        const beatFreq = mode.freq;

        const oscL = audioCtx.createOscillator();
        const oscR = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscL.type = 'sine'; oscR.type = 'sine';
        oscL.frequency.value = carrierFreq;
        oscR.frequency.value = carrierFreq + beatFreq;

        const pannerL = audioCtx.createStereoPanner();
        const pannerR = audioCtx.createStereoPanner();
        pannerL.pan.value = -1; pannerR.pan.value = 1;

        oscL.connect(pannerL); pannerL.connect(gainNode);
        oscR.connect(pannerR); pannerR.connect(gainNode);

        gainNode.connect(audioCtx.destination);
        const initialVolume = soundEnabled ? audioVolumes.binaural : 0;
        gainNode.gain.value = initialVolume;

        oscL.start(); oscR.start();

        oscLeftRef.current = oscL;
        oscRightRef.current = oscR;
        gainNodeRef.current = gainNode;

        return { audioCtx, gainNode };
    }, [getAudioContext, soundEnabled, audioVolumes.binaural]);

    // --- Cleanup ---
    const cleanupAudio = useCallback(() => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
            currentAudioRef.current = null;
        }
        if (ambientAudioRef.current) {
            ambientAudioRef.current.pause();
            ambientAudioRef.current.currentTime = 0;
            ambientAudioRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            if (sourceRef.current.mediaStream) sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
            sourceRef.current = null;
        }
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }, []);

    return {
        // State
        ttsState,
        micVolume,
        
        // Refs (exposed for external components that need direct access)
        audioContextRef,
        currentAudioRef,
        ambientAudioRef,
        analyserRef,
        sourceRef,
        animationFrameRef,
        oscLeftRef,
        oscRightRef,
        gainNodeRef,
        
        // Methods
        getAudioContext,
        stopVoiceOnly,
        stopAllAudio,
        playAudio,
        speak,
        speakFallback,
        setupAudioAnalysis,
        drawAudioVisualizer,
        startBinauralBeats,
        cleanupAudio,
        
        // State setters
        setMicVolume,
        setTtsState,
    };
};
