export const getLocalizedWeather = async (language = 'ko') => {
  // 기본은 서울
  let lat = 37.5665;
  let lon = 126.9780;
  let unit = 'celsius'; // open-meteo defaults to celsius
  let unitSymbol = '°C';

  switch (language) {
    case 'en': // New York
      lat = 40.7128;
      lon = -74.0060;
      unit = 'fahrenheit';
      unitSymbol = '°F';
      break;
    case 'ja': // Tokyo
      lat = 35.6762;
      lon = 139.6503;
      break;
    case 'zh': // Beijing
      lat = 39.9042;
      lon = 116.4074;
      break;
    case 'es': // Madrid
      lat = 40.4168;
      lon = -3.7038;
      break;
    case 'fr': // Paris
      lat = 48.8566;
      lon = 2.3522;
      break;
    case 'de': // Berlin
      lat = 52.5200;
      lon = 13.4050;
      break;
    case 'ru': // Moscow
      lat = 55.7558;
      lon = 37.6173;
      break;
    case 'vi': // Hanoi
      lat = 21.0285;
      lon = 105.8542;
      break;
    case 'th': // Bangkok
      lat = 13.7563;
      lon = 100.5018;
      break;
    case 'id': // Jakarta
      lat = -6.2088;
      lon = 106.8456;
      break;
    default:
      break; // keep Seoul defaults
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=${unit}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data || !data.current_weather) {
      return null;
    }

    const weatherCode = data.current_weather.weathercode;
    let weatherKey = 'clear';

    if (weatherCode >= 1 && weatherCode <= 3) weatherKey = 'partly_cloudy';
    if (weatherCode > 3) weatherKey = 'cloudy';
    if (weatherCode >= 45 && weatherCode <= 48) weatherKey = 'fog';
    if (weatherCode >= 51 && weatherCode <= 67) weatherKey = 'rain';
    if (weatherCode >= 71 && weatherCode <= 77) weatherKey = 'snow';
    if (weatherCode >= 95) weatherKey = 'thunderstorm';

    return {
      key: weatherKey,
      temp: data.current_weather.temperature,
      unit: unitSymbol
    };
  } catch (err) {
    console.error("fetchWeather error:", err);
    return null;
  }
};
