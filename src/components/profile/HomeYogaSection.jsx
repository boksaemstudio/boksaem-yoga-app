import { useState, useEffect } from 'react';
import { storageService } from '../../services/storage';

const HomeYogaCards = ({ language, onDataLoad }) => {
    const [poses, setPoses] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPoses = async () => {
            setLoading(true);
            try {
                const data = await storageService.getDailyYoga(language);
                setPoses(data);
                if (onDataLoad) onDataLoad(data);
            } catch (e) {
                console.warn(e);
            } finally {
                setLoading(false);
            }
        };
        loadPoses();
    }, [language, onDataLoad]);

    if (loading) return <div style={{ color: 'gray', fontSize: '0.8rem', padding: '10px' }}>AI 추천 로딩 중...</div>;
    if (!poses) return null;

    return (
        <>
            {poses.slice(0, 2).map((pose, idx) => (
                <div key={idx} style={{
                    minWidth: '200px',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '12px',
                    borderRadius: '10px',
                    scrollSnapAlign: 'start',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{pose.emoji}</div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'white', marginBottom: '4px' }}>{pose.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-gold)', marginBottom: '8px' }}>{pose.benefit}</div>
                    <div style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.7)',
                        lineHeight: '1.5',
                        wordBreak: 'keep-all'
                    }}>
                        {pose.instruction}
                    </div>
                </div>
            ))}
        </>
    );
};

const HomeYogaSection = ({ language, t }) => {
    const [poses, setPoses] = useState(null);

    return (
        <div style={{ marginBottom: '25px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                🧘 {(poses && poses.isFallback) ? (t('homeYogaBasicTitle') || "기본 추천 요가") : (t('homeYogaTitle') || "오늘의 AI 추천 요가")}
                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginLeft: '8px', fontWeight: 'normal' }}>
                    {(poses && poses.isFallback) ? "서비스 연결이 원활하지 않아 기본 코스를 안내합니다." : t('homeYogaSub')}
                </span>
            </h3>

            <div className="home-yoga-scroll" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '5px', scrollSnapType: 'x mandatory' }}>
                <HomeYogaCards language={language} onDataLoad={setPoses} />
            </div>
        </div>
    );
};

export default HomeYogaSection;
