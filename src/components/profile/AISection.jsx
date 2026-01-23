import React from 'react';
import { Icons } from '../CommonIcons';

const AISection = ({ aiExperience, weatherData, greetingVisible, t, getTraditionalYogaMessage }) => {
    return (
        <div style={{ marginBottom: '20px', position: 'relative' }}>
            <div
                style={{
                    position: 'absolute',
                    inset: '-10px',
                    background: aiExperience?.colorTone || 'rgba(212, 175, 55, 0.1)',
                    opacity: 0.1,
                    borderRadius: '15px',
                    filter: 'blur(10px)'
                }}
            />
            {/* Weather and Greeting Area */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icons.CloudSun size={18} weight="duotone" />
                    <span>{weatherData ? `${t('weather_' + weatherData.key)} (${weatherData.temp}°C)` : (aiExperience?.weather || '')}</span>
                </div>

                <div className={`welcome-container ${greetingVisible ? 'fade-in' : 'fade-out'}`} style={{ minHeight: '3.6rem' }}>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', lineHeight: '1.4', margin: 0, color: 'white', wordBreak: 'keep-all' }}>
                        {aiExperience?.message || getTraditionalYogaMessage()}
                    </h1>
                    {/* Context Log Display */}
                    {aiExperience?.contextLog && (
                        <div style={{
                            marginTop: '12px',
                            padding: '8px 12px',
                            background: 'rgba(0,0,0,0.3)',
                            borderLeft: '2px solid rgba(255,255,255,0.2)',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            color: 'rgba(255,255,255,0.6)',
                            textAlign: 'left'
                        }}>
                            {`> ${aiExperience.contextLog}`}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AISection;
