import { useCallback } from 'react';

// [AUDIO] High-quality TTS assets
import audioWelcome from '../assets/audio/welcome.mp3';
import audioSuccess from '../assets/audio/success.mp3';
import audioDuplicateSuccess from '../assets/audio/duplicate_success.mp3';
import audioDenied from '../assets/audio/denied.mp3';
import audioError from '../assets/audio/error.mp3';

export const useTTS = () => {
    // [TTS] Voice Feedback Helper
    const speak = useCallback((type) => {
        const audioMap = {
            'welcome': audioWelcome,
            'success': audioSuccess,
            'duplicate': audioDuplicateSuccess,
            'denied': audioDenied,
            'error': audioError
        };

        const source = audioMap[type];
        if (!source) {
            console.warn(`[TTS] No audio mapping for type: ${type}`);
            return;
        }

        try {
            const audio = new Audio(source);
            audio.play().catch(e => console.warn('[TTS] Playback failed', e));
        } catch (e) {
            console.error('[TTS] Audio creation failed', e);
        }
    }, []);

    return { speak };
};
