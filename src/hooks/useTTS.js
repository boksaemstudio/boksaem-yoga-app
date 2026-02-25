import { useCallback } from 'react';

// [AUDIO] High-quality TTS assets
import audioWelcome from '../assets/audio/welcome.mp3';
import audioSuccess from '../assets/audio/success.mp3';
import audioDuplicateSuccess from '../assets/audio/duplicate_success.mp3';
import audioDenied from '../assets/audio/denied.mp3';
import audioError from '../assets/audio/error.mp3';
import audioLastSession from '../assets/audio/last_session.mp3';

let currentAudio = null;
let currentTimeout = null;

export const useTTS = () => {
    // [TTS] Voice Feedback Helper
    const speak = useCallback((type) => {
        const audioMap = {
            'welcome': audioWelcome,
            'success': audioSuccess,
            'duplicate': audioDuplicateSuccess,
            'denied': audioDenied,
            'error': audioError,
            'last_session': audioLastSession
        };

        const source = audioMap[type];
        if (!source) {
            console.warn(`[TTS] No audio mapping for type: ${type}`);
            return;
        }

        try {
            // [UX] 하드웨어 스피커(블루투스 등) 슬립 모드 깨우기 (Wake-up)
            // 브라우저의 TTS 엔진을 이용해 아주 짧은 무음을 재생하여 앰프를 켭니다.
            if ('speechSynthesis' in window) {
                const wakeUp = new SpeechSynthesisUtterance('');
                wakeUp.volume = 0.01;
                wakeUp.rate = 2.0;
                window.speechSynthesis.speak(wakeUp);
            }

            // [FIX] 기존 재생 중인 오디오와 대기 중인 타이머 취소 (겹침 방지)
            if (currentTimeout) {
                clearTimeout(currentTimeout);
                currentTimeout = null;
            }
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }

            // 앞부분이 잘리지 않도록 앰프가 켜질 시간(500ms)을 확보한 뒤 재생합니다.
            currentAudio = new Audio(source);
            currentTimeout = setTimeout(() => {
                if (currentAudio) {
                    currentAudio.play().catch(e => console.warn('[TTS] Playback failed', e));
                }
                currentTimeout = null;
            }, 500);
        } catch (e) {
            console.error('[TTS] Audio creation failed', e);
        }
    }, []);

    return { speak };
};
