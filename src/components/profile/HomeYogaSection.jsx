import { useState, useEffect, useMemo } from 'react';
import { storageService } from '../../services/storage';
import { useLanguage } from '../../hooks/useLanguage';
import { getKSTYear } from '../../utils/dates';

// ─── MBTI별 3분 홈트 데이터 ───
const HOME_TRAINING_DB = {
    // 외향(E) 그룹 — 활동적, 에너지 발산
    E: {
        poses: [
            { name: '파워 전사 시퀀스', emoji: '🔥', duration: '3분', benefit: '에너지 발산 + 하체 강화', instruction: '전사1→전사2→전사3으로 이어지는 파워 플로우. 숨을 크게 마시며 팔을 뻗고, 내쉬며 자세를 깊게.' },
            { name: '점프 스쿼트 요가', emoji: '⚡', duration: '3분', benefit: '심폐 + 하체 폭발력', instruction: '의자 자세에서 점프하며 팔을 높이 뻗습니다. 착지 시 무릎을 부드럽게 굽혀 충격 흡수.' },
        ],
        desc: '사람들과 함께하며 에너지를 충전하는 당신에게 — 활력 넘치는 동작으로 하루를 시작하세요!'
    },
    // 내향(I) 그룹 — 고요, 내면 집중
    I: {
        poses: [
            { name: '달의 호흡 스트레칭', emoji: '🌙', duration: '3분', benefit: '긴장 이완 + 유연성', instruction: '편안하게 앉아 왼쪽 코로 숨을 마시고, 오른쪽으로 내쉽니다. 호흡에 맞춰 상체를 좌우로 천천히 기울이세요.' },
            { name: '나비의 묵상', emoji: '🦋', duration: '3분', benefit: '골반 이완 + 마음 안정', instruction: '발바닥을 맞대고 앉아 무릎을 천천히 벌립니다. 눈을 감고 자신의 호흡 소리에 집중하세요.' },
        ],
        desc: '혼자만의 시간이 소중한 당신에게 — 고요한 움직임으로 내면의 에너지를 채우세요.'
    },
    // 감각(S) 그룹 — 체계적, 정확한 동작
    S: {
        poses: [
            { name: '정밀 밸런스 트레이닝', emoji: '🎯', duration: '3분', benefit: '균형감 + 코어 안정', instruction: '나무 자세에서 10초 유지 → 전사3에서 10초 유지. 발가락으로 바닥을 꾹 누르며 중심을 잡으세요.' },
            { name: '바른 자세 교정', emoji: '🧱', duration: '3분', benefit: '자세 교정 + 척추 정렬', instruction: '산 자세로 서서 발뒤꿈치, 엉덩이, 어깨, 뒤통수를 벽에 밀착. 30초 유지 후 전굴.' },
        ],
        desc: '꼼꼼하고 현실적인 당신에게 — 정확한 동작으로 몸의 균형을 맞추세요.'
    },
    // 직관(N) 그룹 — 창의적 흐름
    N: {
        poses: [
            { name: '자유 흐름 댄스 요가', emoji: '🌊', duration: '3분', benefit: '창의력 + 스트레스 해소', instruction: '몸이 원하는 대로 움직이세요. 정해진 자세 없이 음악에 맞춰 흐르듯 스트레칭합니다.' },
            { name: '상상력 빈야사', emoji: '✨', duration: '3분', benefit: '몸과 마음의 연결', instruction: '눈을 감고 바다 위에 떠있다고 상상하며, 파도처럼 천천히 척추를 구부렸다 폅니다.' },
        ],
        desc: '가능성을 탐구하는 당신에게 — 정해진 틀 없이 자유롭게 몸을 움직여 보세요.'
    },
    // 사고(T) 그룹 — 효율적, 근거 기반
    T: {
        poses: [
            { name: '7분 루틴 (하이팩트)', emoji: '📊', duration: '3분', benefit: '근력 + 시간 효율', instruction: '플랭크 30초 → 런지 30초(좌/우) → 브릿지 30초 → 슈퍼맨 30초. 3분 안에 핵심 근육 자극.' },
            { name: '체계적 태양 경배', emoji: '☀️', duration: '3분', benefit: '전신 순환 + 체계적 플로우', instruction: '태양 경배 A를 정확한 호흡 카운트에 맞춰 2세트. 마시며 4초, 내쉬며 4초.' },
        ],
        desc: '논리적인 당신에게 — 과학적으로 설계된 효율적 루틴입니다.'
    },
    // 감정(F) 그룹 — 감성, 관계 중심
    F: {
        poses: [
            { name: '하트 오프닝 플로우', emoji: '💗', duration: '3분', benefit: '가슴 열기 + 감정 해소', instruction: '코브라→업독→낙타 자세. 가슴을 활짝 열며 따뜻한 에너지가 가슴에서 퍼져나간다고 느끼세요.' },
            { name: '감사의 명상 스트레칭', emoji: '🙏', duration: '3분', benefit: '마음 치유 + 유연성', instruction: '합장하고 앉아 감사한 사람 3명을 떠올리세요. 한 명씩 떠올리며 앞으로 깊게 숙입니다.' },
        ],
        desc: '따뜻한 마음의 당신에게 — 가슴을 열고 감사의 에너지를 나눠 보세요.'
    },
    // 판단(J) 그룹 — 계획적, 루틴
    J: {
        poses: [
            { name: '모닝 루틴 3분', emoji: '📋', duration: '3분', benefit: '하루 시작 루틴', instruction: '1분: 고양이-소 스트레칭 → 1분: 다운독 → 1분: 전사2(좌우). 매일 같은 순서로 몸을 깨우세요.' },
            { name: '슬립 루틴 3분', emoji: '🌜', duration: '3분', benefit: '수면 준비 루틴', instruction: '1분: 다리 벽에 올리기 → 1분: 누운 비틀기 → 1분: 사바사나. 잠들기 전 규칙적으로.' },
        ],
        desc: '계획적인 당신에게 — 매일 같은 시간, 같은 루틴으로 몸의 리듬을 만드세요.'
    },
    // 인식(P) 그룹 — 유연, 자유
    P: {
        poses: [
            { name: '기분 따라 3분', emoji: '🎲', duration: '3분', benefit: '즉흥적 에너지 전환', instruction: '3개 자세를 랜덤으로 골라 1분씩. 오늘의 자세는? 행복하면 전사, 피곤하면 아이, 의욕이면 나무!' },
            { name: '어디서든 스트레칭', emoji: '🏖️', duration: '3분', benefit: '장소 무관 전신 이완', instruction: '의자에서: 목 돌리기 → 어깨 풀기 → 앉은 비틀기 → 발목 돌리기. 어디서든 할 수 있어요!' },
        ],
        desc: '자유로운 당신에게 — 장소와 순서에 구애받지 말고 몸이 원하는 대로 움직이세요.'
    }
};

const getTrainingForMBTI = (mbti) => {
    if (!mbti || mbti.length < 4) return null;
    // MBTI 4글자 → 각 성격 특성에서 가장 강한 특성 1~2개 기반으로 추천
    // 오늘 날짜 기반으로 1개 포즈를 순환 선택
    const dayOfYear = Math.floor((Date.now() - new Date(getKSTYear(), 0, 0)) / 86400000);
    const traits = mbti.split('');
    
    // 1차 특성 (에너지 방향) + 2차 특성 (인식) 조합
    const primary = traits[0]; // E or I
    const secondary = traits[1]; // S or N
    const primaryData = HOME_TRAINING_DB[primary] || HOME_TRAINING_DB['I'];
    const secondaryData = HOME_TRAINING_DB[secondary] || HOME_TRAINING_DB['S'];
    
    // 날짜에 따라 1차/2차 중 선택, 포즈도 순환
    const useSecondary = dayOfYear % 3 === 2; // 3일에 1번 2차 특성 사용
    const data = useSecondary ? secondaryData : primaryData;
    const pose = data.poses[dayOfYear % data.poses.length];
    
    return { ...pose, desc: data.desc, trait: useSecondary ? secondary : primary };
};

const HomeYogaCards = ({ language, onDataLoad, mbti }) => {
    const { t } = useLanguage();
    const [poses, setPoses] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPoses = async () => {
            setLoading(true);
            try {
                const data = await storageService.getDailyYoga(language, mbti || null);
                setPoses(data);
                if (onDataLoad) onDataLoad(data);
            } catch (e) {
                console.warn(e);
            } finally {
                setLoading(false);
            }
        };
        loadPoses();
    }, [language, onDataLoad, mbti]);

    if (loading) return <div style={{ color: 'gray', fontSize: '0.8rem', padding: '10px' }}>{t('aiRecommendLoading')}</div>;
    if (!poses || !Array.isArray(poses)) {
        if (poses && poses.message) {
            return <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', padding: '10px' }}>{poses.message}</div>;
        }
        return null;
    }

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

const HomeYogaSection = ({ language, t, mbti }) => {
    const [poses, setPoses] = useState(null);
    const training = useMemo(() => getTrainingForMBTI(mbti), [mbti]);

    return (
        <div style={{ marginBottom: '25px' }}>
            {/* 🏋️ MBTI 맞춤 3분 홈트 */}
            {training && (
                <div style={{
                    marginBottom: '16px', padding: '20px',
                    background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), rgba(139, 92, 246, 0.08))',
                    borderRadius: '16px',
                    border: '1px solid rgba(var(--primary-rgb), 0.2)',
                    position: 'relative', overflow: 'hidden'
                }}>
                    {/* 배경 장식 */}
                    <div style={{
                        position: 'absolute', top: '-20px', right: '-20px',
                        width: '100px', height: '100px', borderRadius: '50%',
                        background: 'rgba(var(--primary-rgb), 0.08)', filter: 'blur(20px)'
                    }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '1.4rem' }}>{training.emoji}</span>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--primary-gold)', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                오늘의 3분 홈트
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>
                                {training.name}
                            </div>
                        </div>
                        <div style={{
                            marginLeft: 'auto',
                            padding: '4px 10px', borderRadius: '20px',
                            background: 'rgba(var(--primary-rgb), 0.2)',
                            color: 'var(--primary-gold)',
                            fontSize: '0.75rem', fontWeight: '700'
                        }}>
                            {mbti} 맞춤
                        </div>
                    </div>

                    <div style={{
                        fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)',
                        lineHeight: '1.6', wordBreak: 'keep-all', marginBottom: '12px'
                    }}>
                        {training.instruction}
                    </div>

                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)'
                    }}>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                            {training.desc}
                        </span>
                        <span style={{
                            padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem',
                            background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', fontWeight: '700'
                        }}>
                            {training.benefit}
                        </span>
                    </div>
                </div>
            )}

            {/* 🧘 AI 추천 요가 자세 */}
            <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--primary-gold)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🧘 {(poses && (!Array.isArray(poses) || poses.isFallback)) ? t('homeYogaDefault') : t('homeYogaTitle')}
                    {mbti && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--primary-gold)' }}>{mbti}</span>}
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginLeft: '8px', fontWeight: 'normal' }}>
                        {(poses && (!Array.isArray(poses) || poses.isFallback)) ? t('homeYogaFallback') : t('homeYogaSub')}
                    </span>
                </h3>

                <div className="home-yoga-scroll" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '5px', scrollSnapType: 'x mandatory' }}>
                    <HomeYogaCards language={language} onDataLoad={setPoses} mbti={mbti} />
                </div>
            </div>
        </div>
    );
};

export default HomeYogaSection;
