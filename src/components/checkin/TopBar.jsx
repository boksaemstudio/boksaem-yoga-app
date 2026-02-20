import { memo } from 'react';
import { MapPin, Sun, Cloud, CloudRain, Snowflake, Lightning, Moon, CornersOut, CornersIn, Chalkboard } from '@phosphor-icons/react';
import { getKSTHour } from '../../utils/dates';
import DigitalClock from './DigitalClock';

const getWeatherIcon = (code, isNight) => {
    if (code === 0) return isNight ? <Moon size={24} weight="fill" /> : <Sun size={24} weight="fill" />;
    if (code >= 1 && code <= 3) return <Cloud size={24} weight="fill" />;
    if (code >= 45 && code <= 48) return <Cloud size={24} weight="fill" />; // Fog
    if (code >= 51 && code <= 67) return <CloudRain size={24} weight="fill" />;
    if (code >= 71 && code <= 77) return <Snowflake size={24} weight="fill" />;
    if (code >= 80 && code <= 82) return <CloudRain size={24} weight="fill" />;
    if (code >= 95) return <Lightning size={24} weight="fill" />;
    return <Cloud size={24} weight="fill" />;
};

const TopBar = memo(({ weather, currentBranch, branches, handleBranchChange, toggleFullscreen, isFullscreen, language, onInstructorClick }) => {
    const locale = language === 'ko' ? 'ko-KR' : (language === 'en' ? 'en-US' : (language === 'ru' ? 'ru-RU' : (language === 'zh' ? 'zh-CN' : 'ja-JP')));
    const now = new Date();

    return (
        <div className="checkin-top-bar" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 30px',
            zIndex: 10,
            position: 'relative'
        }}>
            {/* Left: Branch Selector */}
            <div className="branch-selector" style={{ flex: 1, display: 'flex', gap: '10px' }}>
                {branches.map(branch => (
                    <button
                        key={branch.id}
                        className={`branch-btn ${currentBranch === branch.id ? 'active' : ''}`}
                        onClick={() => handleBranchChange(branch.id)}
                    >
                        <MapPin size={18} weight={currentBranch === branch.id ? 'fill' : 'regular'} /> {branch.name}
                    </button>
                ))}
            </div>

            {/* Center: Clock & Weather (Absolute Centered) */}
            <div className="top-info-center glass-panel-sm" style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '8px 20px',
                borderRadius: '50px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap',
                width: 'fit-content',
                flexShrink: 0
            }}>
                <DigitalClock locale={locale} />

                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

                {weather && (
                    <>
                        <div className="top-weather" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {getWeatherIcon(weather.weathercode, getKSTHour() >= 18 || getKSTHour() < 6)}
                            <span className="weather-temp" style={{ fontSize: '1.4rem', fontWeight: 600, color: 'rgba(255,255,255,0.95)', lineHeight: 1 }}>
                                {weather.temperature}°C
                            </span>
                        </div>

                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

                        <span className="weather-date" style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, letterSpacing: '0.5px', lineHeight: 1 }}>
                            {now.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                        </span>
                    </>
                )}
            </div>

            {/* Right: Action Buttons Grouped */}
            <div className="top-actions-right" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '20px', alignItems: 'center' }}>
                <button
                    className="instructor-btn"
                    onClick={onInstructorClick}
                    aria-label="선생님 전용"
                    style={{
                        background: 'rgba(212, 175, 55, 0.15)',
                        border: '1px solid rgba(212, 175, 55, 0.4)',
                        borderRadius: '22px',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        color: 'var(--primary-gold)',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        transition: 'none'
                    }}
                >
                    <Chalkboard size={20} weight="duotone" />
                    선생님
                </button>


                <button
                    className="fullscreen-btn"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? "전체화면 종료" : "전체화면 시작"}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white',
                        transition: 'none'
                    }}
                >
                    {isFullscreen ? <CornersIn size={24} /> : <CornersOut size={24} />}
                </button>
            </div>
        </div>
    );
});
TopBar.displayName = 'TopBar';

export default TopBar;
