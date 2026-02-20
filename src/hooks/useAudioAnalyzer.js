import { useRef, useCallback, useState } from 'react';

export const useAudioAnalyzer = () => {
    const [micVolume, setMicVolume] = useState(0);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const sourceRef = useRef(null);
    const animationFrameRef = useRef(null);

    const drawAudioVisualizer = useCallback(function draw() {
        if (!analyserRef.current) return;
        animationFrameRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteTimeDomainData(dataArrayRef.current); // Time domain for breath
        let sum = 0;
        const bufferLength = dataArrayRef.current.length;
        for (let i = 0; i < bufferLength; i++) {
            const value = (dataArrayRef.current[i] - 128) / 128; // Normalize to -1..1
            sum += value * value; // RMS calculation
        }
        const rms = Math.sqrt(sum / bufferLength);
        const normalizedLevel = Math.min(rms * 8, 2.5); // Amplified for visual feedback
        setMicVolume(normalizedLevel);
    }, []);

    const setupAudioAnalysis = useCallback((stream, audioCtx) => {
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 1024; // Higher resolution for breath detection
        analyser.smoothingTimeConstant = 0.8; // Smoother transitions
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;
        sourceRef.current = source;
        
        drawAudioVisualizer();
    }, [drawAudioVisualizer]);

    const stopAudioAnalysis = useCallback(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (sourceRef.current) {
            try {
                sourceRef.current.disconnect();
                if (sourceRef.current.mediaStream) {
                    sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
                }
            } catch (e) {
                console.warn("Source disconnect failed", e);
            }
            sourceRef.current = null;
        }
        setMicVolume(0);
    }, []);

    const pauseAudioAnalysis = useCallback(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }, []);

    const resumeAudioAnalysis = useCallback(() => {
        drawAudioVisualizer();
    }, [drawAudioVisualizer]);

    return {
        micVolume,
        setupAudioAnalysis,
        stopAudioAnalysis,
        pauseAudioAnalysis,
        resumeAudioAnalysis
    };
};
