/**
 * 🎵 Procedural Ambient Audio Generator
 * Web Audio API를 사용하여 환경음을 실시간 생성합니다.
 * 외부 URL 의존성 없이 항상 동작합니다.
 */

/**
 * 빗소리 생성 (Brown noise + Low-pass filter)
 */
export function createRainSound(audioContext, volume = 0.35) {
    const bufferSize = audioContext.sampleRate * 4;
    const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + 0.02 * white) / 1.02;
            data[i] = lastOut * 3.5;
            // 간헐적 빗방울 효과
            if (Math.random() < 0.0003) {
                data[i] += (Math.random() - 0.5) * 0.15;
            }
        }
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.7;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start();

    return { source, gainNode, type: 'rain' };
}

/**
 * 파도소리 생성 (Modulated brown noise)
 */
export function createOceanSound(audioContext, volume = 0.35) {
    const bufferSize = audioContext.sampleRate * 6;
    const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + 0.02 * white) / 1.02;
            // 천천히 밀려왔다 나가는 파도 효과
            const waveEnv = 0.5 + 0.5 * Math.sin(2 * Math.PI * i / (audioContext.sampleRate * 4));
            data[i] = lastOut * 3.0 * waveEnv;
        }
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 1.0;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start();

    return { source, gainNode, type: 'ocean' };
}

/**
 * 숲속 소리 생성 (Filtered noise + 새소리 효과)
 */
export function createForestSound(audioContext, volume = 0.35) {
    const bufferSize = audioContext.sampleRate * 5;
    const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + 0.01 * white) / 1.01;
            // 바람 소리 기본
            const windEnv = 0.3 + 0.2 * Math.sin(2 * Math.PI * i / (audioContext.sampleRate * 3));
            data[i] = lastOut * 2.0 * windEnv;
            // 새소리 효과 (간헐적 높은 주파수 chirp)
            if (Math.random() < 0.00008) {
                const chirpLen = Math.floor(audioContext.sampleRate * 0.05);
                for (let j = 0; j < chirpLen && (i + j) < bufferSize; j++) {
                    const freq = 2000 + Math.random() * 3000;
                    const chirpEnv = 1 - j / chirpLen;
                    data[i + j] += Math.sin(2 * Math.PI * freq * j / audioContext.sampleRate) * 0.03 * chirpEnv;
                }
            }
        }
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 0.3;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start();

    return { source, gainNode, type: 'forest' };
}

/**
 * 싱잉볼 소리 생성 (Sine harmonics with slow decay)
 */
export function createSingingBowlSound(audioContext, volume = 0.35) {
    const fundamentalFreq = 220; // A3
    const harmonics = [1, 2.76, 4.72, 6.63]; // 싱잉볼 특유의 비정수 배음
    const duration = 8; // 8초 루프
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / audioContext.sampleRate;
            let sample = 0;
            harmonics.forEach((h, idx) => {
                const amplitude = 1 / (idx + 1) * 0.3;
                // 천천히 감쇠했다가 다시 울리는 효과
                const env = 0.3 + 0.7 * Math.pow(Math.sin(Math.PI * t / duration), 0.5);
                // 약간의 진동수 변동 (워블 효과)
                const wobble = 1 + 0.002 * Math.sin(2 * Math.PI * 5 * t);
                sample += Math.sin(2 * Math.PI * fundamentalFreq * h * wobble * t) * amplitude * env;
            });
            data[i] = sample;
        }
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start();

    return { source, gainNode, type: 'singingbowl' };
}

/**
 * 환경음 타입에 따라 생성
 */
export function createAmbientSound(audioContext, type, volume = 0.35) {
    switch (type) {
        case 'rain': return createRainSound(audioContext, volume);
        case 'ocean': return createOceanSound(audioContext, volume);
        case 'forest': return createForestSound(audioContext, volume);
        case 'singingbowl': return createSingingBowlSound(audioContext, volume);
        default: return null;
    }
}

/**
 * 랜덤 환경음 타입 선택
 */
export function getRandomAmbientType() {
    const types = ['rain', 'ocean', 'forest', 'singingbowl'];
    return types[Math.floor(Math.random() * types.length)];
}
