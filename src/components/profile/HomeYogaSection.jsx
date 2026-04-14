import { useLanguageStore } from '../../stores/useLanguageStore';
import { useState, useEffect, useMemo } from 'react';
import { storageService } from '../../services/storage';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * HomeYogaSection — "오늘의 3분 홈트"
 * 
 * [개선사항]
 * 1. 카드 2개 → 1개로 통합 (중복 제거)
 * 2. MBTI + 날씨/온도 + 회원 수련이력 기반 매일 다른 콘텐츠
 * 3. 날짜+MBTI+날씨 조합으로 캐시 키 생성 → 같은 조건이면 캐시, 다르면 새로 생성
 */

const HomeYogaCard = ({
  pose
}) => {
  const t = useLanguageStore(s => s.t);
  if (!pose) return null;
  return <div style={{
    background: 'rgba(255,255,255,0.04)',
    padding: '16px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.06)'
  }}>
            <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '10px'
    }}>
                <div style={{
        fontSize: '1.8rem',
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(var(--primary-rgb), 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(var(--primary-rgb), 0.2)'
      }}>
                    {pose.emoji}
                </div>
                <div>
                    <div style={{
          fontWeight: 'bold',
          fontSize: '0.95rem',
          color: 'white'
        }}>{pose.name}</div>
                    <div style={{
          fontSize: '0.78rem',
          color: 'var(--primary-gold)'
        }}>{pose.benefit}</div>
                </div>
            </div>
            <div style={{
      fontSize: '0.85rem',
      color: 'rgba(255,255,255,0.7)',
      lineHeight: '1.6',
      wordBreak: 'keep-all',
      whiteSpace: 'pre-line'
    }}>
                {pose.instruction}
            </div>
        </div>;
};
const HomeYogaSection = ({
  language,
  t,
  mbti,
  weatherData,
  logs
}) => {
  const [pose, setPose] = useState(null);
  const [loading, setLoading] = useState(true);
  const {
    t: localT
  } = useLanguage();

  // 회원의 주요 수련 종목 분석
  const primaryClass = useMemo(() => {
    if (!logs || logs.length === 0) return null;
    const classCounts = {};
    logs.forEach(log => {
      const cls = log.className || log.classTitle || log.subject;
      if (cls) classCounts[cls] = (classCounts[cls] || 0) + 1;
    });
    const sorted = Object.entries(classCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
  }, [logs]);

  // 날씨/온도 정보 추출
  const weatherInfo = useMemo(() => {
    if (!weatherData) return {
      weather: null,
      temp: null
    };
    return {
      weather: weatherData.description || weatherData.main || null,
      temp: weatherData.temp || weatherData.temperature || null
    };
  }, [weatherData]);
  useEffect(() => {
    const loadPose = async () => {
      setLoading(true);
      try {
        // 날씨, 온도, 주요 수련 종목, MBTI 모두 전달
        const data = await storageService.getDailyYoga(language, mbti || null, {
          weather: weatherInfo.weather,
          temperature: weatherInfo.temp,
          primaryClass: primaryClass
        });
        // 1개만 표시
        if (Array.isArray(data) && data.length > 0) {
          setPose(data[0]);
        } else if (data && data.message) {
          setPose(null); // fallback message
        }
      } catch (e) {
        console.warn('[HomeYogaSection]', e);
      } finally {
        setLoading(false);
      }
    };
    loadPose();
  }, [language, mbti, weatherInfo.weather, weatherInfo.temp, primaryClass]);
  if (loading) {
    return <div style={{
      marginBottom: '25px'
    }}>
                <div style={{
        padding: '15px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
                    <div style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '0.8rem',
          padding: '10px',
          textAlign: 'center'
        }}>
                        🧘 {localT('aiRecommendLoading') || t("g_f33ee1") || t("g_f33ee1") || t("g_f33ee1") || "AI \uCD94\uCC9C \uB85C\uB529 \uC911..."}
                    </div>
                </div>
            </div>;
  }
  if (!pose) return null;

  // 컨텍스트 뱃지 (날씨, MBTI, 수련종목)
  const contextBadges = [];
  if (mbti) contextBadges.push({
    label: mbti,
    icon: '🧬'
  });
  if (weatherInfo.weather) {
    const weatherEmoji = weatherInfo.weather.includes(t("g_f228b5") || t("g_f228b5") || t("g_f228b5") || "\uD750\uB9BC") || weatherInfo.weather.includes('cloud') ? '☁️' : weatherInfo.weather.includes(t("g_7120b7") || t("g_7120b7") || t("g_7120b7") || "\uBE44") || weatherInfo.weather.includes('rain') ? '🌧️' : weatherInfo.weather.includes(t("g_0726db") || t("g_0726db") || t("g_0726db") || "\uB208") || weatherInfo.weather.includes('snow') ? '❄️' : '☀️';
    const tempStr = weatherInfo.temp ? `${Math.round(weatherInfo.temp)}°` : '';
    contextBadges.push({
      label: `${weatherEmoji} ${tempStr}`,
      icon: null
    });
  }
  if (primaryClass) contextBadges.push({
    label: primaryClass,
    icon: '🏷️'
  });
  return <div style={{
    marginBottom: '25px'
  }}>
            <div style={{
      padding: '15px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
                {/* Header */}
                <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
                    <h3 style={{
          fontSize: '1rem',
          fontWeight: 'bold',
          color: 'var(--primary-gold)',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
                        🧘 {t('homeYogaTitle') || t("g_507b55") || t("g_507b55") || t("g_507b55") || "\uC624\uB298\uC758 3\uBD84 \uD648\uD2B8"}
                    </h3>
                    {/* Context badges */}
                    <div style={{
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap'
        }}>
                        {contextBadges.map((badge, i) => <span key={i} style={{
            fontSize: '0.68rem',
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'rgba(var(--primary-rgb), 0.1)',
            color: 'var(--primary-gold)',
            border: '1px solid rgba(var(--primary-rgb), 0.15)',
            whiteSpace: 'nowrap'
          }}>
                                {badge.icon && `${badge.icon} `}{badge.label}
                            </span>)}
                        <span style={{
            fontSize: '0.68rem',
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'rgba(var(--primary-rgb), 0.15)',
            color: 'var(--primary-gold)',
            fontWeight: 600
          }}>
                            AI
                        </span>
                    </div>
                </div>

                {/* Single Yoga Card */}
                <HomeYogaCard pose={pose} />
            </div>
        </div>;
};
export default HomeYogaSection;