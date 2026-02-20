import { useState, useCallback } from 'react';
import { WEATHER_OPTIONS } from '../constants/meditationConstants';

export const useWeatherAwareness = () => {
    const [weatherContext, setWeatherContext] = useState(null);

    const detectWeather = useCallback(async () => {
        try {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        try {
                            const response = await fetch(
                                `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=bd5e378503939ddaee76f12ad7a97608&units=metric`
                            );
                            const data = await response.json();
                            const weatherMain = data.weather?.[0]?.main?.toLowerCase() || '';
                            const weatherDesc = data.weather?.[0]?.description || '';
                            
                            let detected = WEATHER_OPTIONS[0]; // Default: sunny
                            if (weatherMain.includes('rain') || weatherMain.includes('drizzle')) {
                                detected = WEATHER_OPTIONS.find(w => w.id === 'rain');
                            } else if (weatherMain.includes('snow')) {
                                detected = WEATHER_OPTIONS.find(w => w.id === 'snow');
                            } else if (weatherMain.includes('cloud') || weatherMain.includes('mist') || weatherMain.includes('fog')) {
                                detected = WEATHER_OPTIONS.find(w => w.id === 'cloud');
                            }
                            
                            // 🌡️ FULL ENVIRONMENTAL DATA for AI
                            const fullWeatherData = {
                                ...detected,
                                temp: Math.round(data.main?.temp) || 20,
                                humidity: data.main?.humidity || 50,
                                windSpeed: Math.round((data.wind?.speed || 0) * 3.6),
                                description: weatherDesc,
                                feelsLike: Math.round(data.main?.feels_like) || 20,
                                city: data.name || '서울' // 기본값 서울
                            };
                            
                            setWeatherContext(fullWeatherData);
                            console.log('🌤️ Full Weather:', fullWeatherData);
                        } catch (e) {
                            console.error('Weather API failed:', e);
                            setWeatherContext({ ...WEATHER_OPTIONS[0], temp: 20, humidity: 50, windSpeed: 5 });
                        }
                    },
                    () => {
                        // Geolocation denied
                        setWeatherContext({ ...WEATHER_OPTIONS[0], temp: 20, humidity: 50, windSpeed: 5 });
                    },
                    { timeout: 5000 }
                );
            } else {
                setWeatherContext({ ...WEATHER_OPTIONS[0], temp: 20, humidity: 50, windSpeed: 5 });
            }
        } catch (e) {
            console.error('Weather detection failed:', e);
            setWeatherContext({ ...WEATHER_OPTIONS[0], temp: 20, humidity: 50, windSpeed: 5 });
        }
    }, []);

    return {
        weatherContext,
        setWeatherContext,
        detectWeather
    };
};
