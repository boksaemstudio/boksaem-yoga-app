import { useRef, useCallback, useEffect } from 'react';

export const useMeditationAudio = (ttcEnabled, isPlayingRef, step, logDebug, setTtsState, audioVolumes, soundEnabled) => {
    const audioContextRef = useRef(null);
    const oscLeftRef = useRef(null);
    const oscRightRef = useRef(null);
    const gainNodeRef = useRef(null);
    const currentAudioRef = useRef(null);
    const ambientAudioRef = useRef(null);

    // Audio Context Getter
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    // ---------------------------------------------------------
    // 1. Binaural Beats Engine
    // ---------------------------------------------------------
    const playBinauralBeats = useCallback((carrierFreq = 200, beatFreq = 4, volume = 0.25) => {
        const audioCtx = getAudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();

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
        gainNode.gain.value = volume;

        oscL.start(); oscR.start();

        oscLeftRef.current = oscL;
        oscRightRef.current = oscR;
        gainNodeRef.current = gainNode;
        
        logDebug && logDebug("BinauralBeats:Start", { carrierFreq, beatFreq, volume });
    }, [getAudioContext, logDebug]);

    const stopBinauralBeats = useCallback(() => {
        if (oscLeftRef.current) { try { oscLeftRef.current.stop(); } catch { /* ignore */ } oscLeftRef.current = null; }
        if (oscRightRef.current) { try { oscRightRef.current.stop(); } catch { /* ignore */ } oscRightRef.current = null; }
        if (gainNodeRef.current) gainNodeRef.current = null;
    }, []);

    const updateBinauralVolume = useCallback((volume) => {
        if (gainNodeRef.current && audioContextRef.current) {
            const currentTime = audioContextRef.current.currentTime;
            gainNodeRef.current.gain.setTargetAtTime(volume, currentTime, 0.5);
        }
    }, []);

    // ---------------------------------------------------------
    // 2. Ambient Environments Engine
    // ---------------------------------------------------------
    const updateAmbientVolume = useCallback((volume) => {
        if (ambientAudioRef.current) {
            ambientAudioRef.current.volume = volume;
        }
    }, []);

    const playAmbientMusic = useCallback((ambientDef, volume) => {
        if (!ambientDef || ambientDef.id === 'none') {
            if (ambientAudioRef.current) {
                ambientAudioRef.current.pause();
                ambientAudioRef.current = null;
            }
            return;
        }

        if (!ambientAudioRef.current || !ambientAudioRef.current.src.includes(ambientDef.file)) {
            if (ambientAudioRef.current) ambientAudioRef.current.pause();
            const audio = new Audio(ambientDef.file);
            audio.loop = true;
            audio.volume = volume;
            ambientAudioRef.current = audio;
        }

        ambientAudioRef.current.play().catch(e => {
            console.warn("Ambient play failed:", e);
            logDebug && logDebug("Ambient:Error", e);
        });
    }, [logDebug]);

    const stopAmbientMusic = useCallback(() => {
        if (ambientAudioRef.current) {
            ambientAudioRef.current.pause();
        }
    }, []);

    const stopAmbientMusicAndReset = useCallback(() => {
        if (ambientAudioRef.current) {
            ambientAudioRef.current.pause();
            ambientAudioRef.current.currentTime = 0;
            ambientAudioRef.current = null;
        }
    }, []);

    // ---------------------------------------------------------
    // 3. TTS Engines (Cloud & Local)
    // ---------------------------------------------------------
    const stopVoiceOnly = useCallback(() => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (currentAudioRef.current) {
            try { currentAudioRef.current.pause(); currentAudioRef.current.currentTime = 0; } catch { /* ignore */ }
            currentAudioRef.current = null;
        }
    }, []);

    const playAudio = useCallback((base64String, volume, onEndedCallback) => {
        if (!ttcEnabled || !base64String) return null;
        
        try {
            stopVoiceOnly();
            
            const audio = new Audio(`data:audio/mp3;base64,${base64String}`);
            audio.volume = volume;
            currentAudioRef.current = audio;

            setTtsState && setTtsState({ isSpeaking: true, engine: 'Cloud TTS', volume: audio.volume });
            logDebug && logDebug("PlayAudio:Start", { vol: volume });

            audio.onended = () => { 
                logDebug && logDebug("PlayAudio:Ended");
                setTtsState && setTtsState(prev => ({ ...prev, isSpeaking: false }));
                if (currentAudioRef.current === audio) currentAudioRef.current = null;
                if (onEndedCallback) onEndedCallback();
            };
            
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error("🔊 Audio Playback Failed:", e);
                    logDebug && logDebug("PlayAudio:Error", e);
                    setTtsState && setTtsState(prev => ({ ...prev, isSpeaking: false }));
                });
            }
            
            // Race condition check
            if (!isPlayingRef.current && step === 'session') {
                audio.pause();
                currentAudioRef.current = null;
            }
            
            return audio;
        } catch (e) {
            console.error("🔊 Audio Error:", e);
            logDebug && logDebug("PlayAudio:Catch", e);
            setTtsState && setTtsState(prev => ({ ...prev, isSpeaking: false }));
            return null;
        }
    }, [ttcEnabled, stopVoiceOnly, setTtsState, logDebug, isPlayingRef, step]);

    const speak = useCallback((text) => {
        logDebug && logDebug("Speak:Start", text);
        console.log("🗣️ [TTS Check] Speaking:", text);
        if (!text || typeof window === 'undefined' || !ttcEnabled || !window.speechSynthesis) return;
        
        stopVoiceOnly(); 
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        utterance.onstart = () => setTtsState && setTtsState({ isSpeaking: true, engine: 'Local TTS', volume: 0.8 });
        utterance.onend = () => setTtsState && setTtsState(prev => ({ ...prev, isSpeaking: false }));
        utterance.onerror = () => setTtsState && setTtsState(prev => ({ ...prev, isSpeaking: false }));
        
        setTimeout(() => {
            if (window.speechSynthesis && ttcEnabled && (step !== 'session' || isPlayingRef.current)) {
                window.speechSynthesis.speak(utterance);
            }
        }, 100);
    }, [ttcEnabled, step, stopVoiceOnly, logDebug, setTtsState, isPlayingRef]);

    const speakFallback = useCallback((text) => {
        if (!text || typeof window === 'undefined' || !ttcEnabled || !window.speechSynthesis) return;
        
        logDebug && logDebug("SpeakFallback", text);
        stopVoiceOnly();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.9;
        utterance.pitch = 1.0; 
        utterance.volume = 0.8; 
        
        setTimeout(() => {
            if (window.speechSynthesis && ttcEnabled) {
                window.speechSynthesis.speak(utterance);
            }
        }, 100);
    }, [ttcEnabled, stopVoiceOnly, logDebug]);

    // ---------------------------------------------------------
    // 4. Global Cleanup
    // ---------------------------------------------------------
    const stopAllAudio = useCallback((stopAmbient = false) => {
        stopVoiceOnly();
        
        if (stopAmbient) stopAmbientMusic();
        
        stopBinauralBeats();
        
        logDebug && logDebug("StopAllAudio", { stopAmbient });
    }, [stopVoiceOnly, stopAmbientMusic, stopBinauralBeats, logDebug]);

    // Cleanup AudioContext on unmount
    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(e => console.error(e));
                audioContextRef.current = null;
            }
        };
    }, []);

    // Provide raw refs to caller if needed
    return {
        audioContextRef,
        ambientAudioRef,
        currentAudioRef,
        
        getAudioContext,
        playBinauralBeats,
        stopBinauralBeats,
        updateBinauralVolume,
        playAmbientMusic,
        stopAmbientMusic,
        stopAmbientMusicAndReset,
        updateAmbientVolume,
        playAudio,
        speak,
        speakFallback,
        stopVoiceOnly,
        stopAllAudio
    };
};
