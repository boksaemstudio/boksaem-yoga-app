import { Icons } from '../CommonIcons';

const AISection = ({ aiExperience, weatherData, greetingVisible, t, getTraditionalYogaMessage }) => {
    // [FIX] Clean up AI messages that sound like system errors or negative states
    const getCleanMessage = () => {
        const raw = aiExperience?.message || getTraditionalYogaMessage();

        // Block list for system-like or depressing messages
        const blockList = [
            "수련 기록이 일시 중단되었습니다",
            "기록이 없습니다",
            "데이터가 부족합니다",
            "분석 중입니다",
            "시스템 점검"
        ];

        if (blockList.some(term => raw.includes(term))) {
            return getTraditionalYogaMessage();
        }
        return raw;
    };

    const isMultiSession = aiExperience?.isMultiSession || false;
    const sessionCount = aiExperience?.sessionCount || 1;


    return (
        <div style={{ marginBottom: '20px', position: 'relative' }}>
            <div
                style={{
                    position: 'absolute',
                    inset: '-10px',
                    background: aiExperience?.colorTone || 'rgba(212, 175, 55, 0.1)',
                    opacity: 1, // Increased for better look
                    borderRadius: '15px',
                    filter: 'blur(30px)',
                    zIndex: -1
                }}
            />
            {/* Weather and Greeting Area */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.CloudSun size={18} weight="duotone" color="var(--primary-gold)" />
                    <span style={{ letterSpacing: '0.02em', fontWeight: 500 }}>{weatherData ? `${t('weather_' + weatherData.key)} (${weatherData.temp}°C)` : (aiExperience?.weather || '')}</span>
                </div>

                <div className={`welcome-container ${greetingVisible ? 'fade-in' : 'fade-out'}`} style={{ minHeight: '3.6rem' }}>
                    <h1 style={{
                        fontSize: '1.4rem',
                        fontWeight: '800',
                        lineHeight: '1.45',
                        margin: '0 auto', // Center align block
                        color: 'white',
                        wordBreak: 'keep-all',
                        letterSpacing: '-0.02em',
                        textAlign: 'center' // [FIX] Center text as requested
                    }}>
                        {getCleanMessage()}
                    </h1>

                    {/* [DESIGN REBIRTH] AI Context Log -> Yoga Insight Card */}
                    {aiExperience?.contextLog &&
                        !["공백 발생", "공백발생", "데이터 부족", "No data", "기록 없음", "휴식으로 기록됨", "휴식 상태", "휴식 발생"].some(term => aiExperience.contextLog.includes(term)) && (
                            <div style={{
                                marginTop: '16px',
                                padding: '16px',
                                background: 'rgba(255,255,255,0.07)',
                                backdropFilter: 'blur(15px)',
                                border: '1px solid rgba(212, 175, 55, 0.2)',
                                borderLeft: '4px solid var(--primary-gold)',
                                borderRadius: '8px 16px 16px 8px',
                                fontSize: '0.88rem',
                                color: 'rgba(255,255,255,0.85)',
                                textAlign: 'left',
                                lineHeight: '1.7',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                animation: 'slideUp 0.5s ease-out'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--primary-gold)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        ✨ 오늘의 지혜
                                    </div>
                                    {isMultiSession && (
                                        <div style={{ background: 'var(--primary-gold)', color: 'black', padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: '800' }}>
                                            {sessionCount}회차 수련 완료!
                                        </div>
                                    )}
                                </div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                    {aiExperience.contextLog}
                                </div>
                            </div>
                        )}

                </div>
            </div>
        </div>
    );
};

export default AISection;
