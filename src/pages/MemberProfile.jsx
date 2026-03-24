import { PWAContext } from '../contexts/PWAContextDef';
import { useContext, useState, useEffect, lazy, Suspense } from 'react';
import { useStudioConfig } from '../contexts/StudioContext';
import { useLanguageStore as useLanguage } from '../stores/useLanguageStore';
import InteractiveParticles from '../components/InteractiveParticles';
import { BellRinging, BellSlash, Share, DownloadSimple } from '../components/CommonIcons';

// Specialized Sub-Components
import ProfileHeader from '../components/profile/ProfileHeader';
import AISection from '../components/profile/AISection';
import MembershipInfo from '../components/profile/MembershipInfo';
import MemberSalesHistory from '../components/profile/MemberSalesHistory';
import HomeYogaSection from '../components/profile/HomeYogaSection';
import ScheduleTab from '../components/profile/tabs/ScheduleTab';
import NoticeTab from '../components/profile/tabs/NoticeTab';
import PriceTab from '../components/profile/tabs/PriceTab';
const MeditationPage = lazy(() => import('./MeditationPage'));
import CustomGlassModal from '../components/common/CustomGlassModal';
import InstallGuideModal from '../components/InstallGuideModal';
import InstallBanner from '../components/common/InstallBanner';
import SocialLinks from '../components/profile/SocialLinks';
import AttendanceHistory from '../components/profile/AttendanceHistory';
import RecentAttendance from '../components/profile/RecentAttendance';
import ProfileTabs from '../components/profile/ProfileTabs';
import MyStatsChart from '../components/profile/MyStatsChart';
import MessagesTab from '../components/profile/MessagesTab';
import ImageLightbox from '../components/common/ImageLightbox';

// [REFACTOR] Extracted Components & Hooks
import ProfileSkeleton from '../components/profile/ProfileSkeleton';
import LoginPage from '../components/profile/LoginPage';
import { useMemberProfile } from '../hooks/useMemberProfile';
import { useMemberUI } from '../hooks/useMemberUI';

const MemberProfile = () => {
    const { config } = useStudioConfig();
    const { language, t } = useLanguage();

    // ─── Business Logic Hook (~400줄 → 1줄) ───
    const {
        member, loading, logs, validLogs, notices, images, weatherData,
        aiExperience, aiAnalysis, messages, pushStatus, daysRemaining,
        handleLogin, handleLogout, handleNotificationToggle,
        getTraditionalYogaMessage,
    } = useMemberProfile(language, t);

    // ─── UI State Hook ───
    const {
        activeTab, setActiveTab,
        selectedNoticeId, setSelectedNoticeId,
        scheduleView, setScheduleView,
        scheduleMonth, setScheduleMonth,
        scheduleBranch, setScheduleBranch,
        lightboxImage, setLightboxImage,
        greetingVisible, setGreetingVisible,
        modals, openConfirmModal, closeConfirmModal,
        openInstallGuide, closeInstallGuide,
    } = useMemberUI();

    // ─── Derived Assets (SaaS) ───
    const logo = images.logo || config.ASSETS?.LOGO?.WIDE;
    const memberBg = images.memberBg || config.ASSETS?.MEMBER_BG;
    const timeTable1 = images.timeTable1 || config.ASSETS?.TIMETABLE?.BRANCH1;
    const timeTable2 = images.timeTable2 || config.ASSETS?.TIMETABLE?.BRANCH2;
    const priceTable1 = images.priceTable1 || config.ASSETS?.PRICETABLE?.BRANCH1;
    const priceTable2 = images.priceTable2 || config.ASSETS?.PRICETABLE?.BRANCH2;

    // ─── Language Label Animation ───
    const [langLabelIndex, setLangLabelIndex] = useState(0);
    const langLabels = ["언어", "Language", "Язык", "语言", "言語"];
    useEffect(() => {
        const interval = setInterval(() => setLangLabelIndex(p => (p + 1) % langLabels.length), 3000);
        return () => clearInterval(interval);
    }, [langLabels.length]);

    // ─── Wearable Sync State (Mock) ───
    const [watchSync, setWatchSync] = useState(() => localStorage.getItem('watchSync') === 'true');
    const toggleWatchSync = (e) => {
        const checked = e.target.checked;
        setWatchSync(checked);
        localStorage.setItem('watchSync', checked ? 'true' : 'false');
    };

    // ─── MBTI State ───
    const MBTI_STEPS = [
        { label: '에너지 방향', options: [{ letter: 'E', title: '외향', desc: '사람들과 어울리며 에너지 충전' }, { letter: 'I', title: '내향', desc: '혼자만의 시간으로 에너지 충전' }] },
        { label: '인식 기능', options: [{ letter: 'S', title: '감각', desc: '현실적, 구체적 사실 중시' }, { letter: 'N', title: '직관', desc: '가능성과 아이디어 중시' }] },
        { label: '판단 기능', options: [{ letter: 'T', title: '사고', desc: '논리와 원칙으로 판단' }, { letter: 'F', title: '감정', desc: '사람과 관계를 먼저 고려' }] },
        { label: '생활 양식', options: [{ letter: 'J', title: '판단', desc: '계획적이고 체계적인 생활' }, { letter: 'P', title: '인식', desc: '유연하고 자유로운 생활' }] }
    ];
    const [mbti, setMbti] = useState(() => localStorage.getItem('member_mbti') || member?.mbti || '');
    const [mbtiStep, setMbtiStep] = useState(() => {
        const saved = localStorage.getItem('member_mbti') || member?.mbti || '';
        return saved.length >= 4 ? 4 : 0; // 이미 설정됨 → 완료 상태, 아니면 처음부터
    });
    const [mbtiPicks, setMbtiPicks] = useState(() => {
        const saved = localStorage.getItem('member_mbti') || member?.mbti || '';
        return saved ? saved.split('') : [];
    });
    const handleMbtiPick = (letter, stepIdx) => {
        const newPicks = [...mbtiPicks];
        newPicks[stepIdx] = letter;
        setMbtiPicks(newPicks);
        if (stepIdx < 3) {
            setTimeout(() => setMbtiStep(stepIdx + 1), 300);
        }
        // 4번째는 자동 저장 안 함 — 완료 버튼으로 확정
    };
    const handleMbtiConfirm = () => {
        const result = mbtiPicks.join('');
        setMbti(result);
        localStorage.setItem('member_mbti', result);
        if (member?.id) storageService.updateMember(member.id, { mbti: result });
        setMbtiStep(4);
    };
    const handleMbtiReset = () => {
        setMbtiPicks([]);
        setMbtiStep(0);
        setMbti('');
        localStorage.removeItem('member_mbti');
        if (member?.id) storageService.updateMember(member.id, { mbti: '' });
    };

    // ─── AI Greeting Fade ───
    useEffect(() => {
        if (aiExperience?.message) {
            setGreetingVisible(false);
            const timer = setTimeout(() => setGreetingVisible(true), 150);
            return () => clearTimeout(timer);
        }
    }, [aiExperience?.message, setGreetingVisible]);

    // ─── Deep Link Handler ───
    useEffect(() => {
        const handleLocationChange = () => {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            const noticeId = params.get('noticeId');
            if (noticeId) { setSelectedNoticeId(noticeId); setActiveTab('notices'); }
            else if (tab && ['home', 'history', 'schedule', 'prices', 'notices', 'messages'].includes(tab)) setActiveTab(tab);
            if (tab || noticeId) setTimeout(() => window.history.replaceState({}, '', window.location.pathname), 500);
        };
        handleLocationChange();
        window.addEventListener('popstate', handleLocationChange);
        window.addEventListener('hashchange', handleLocationChange);
        return () => { window.removeEventListener('popstate', handleLocationChange); window.removeEventListener('hashchange', handleLocationChange); };
    }, [setActiveTab, setSelectedNoticeId]);

    // ─── AI Preloader ───
    useEffect(() => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(async () => {
                await new Promise(r => setTimeout(r, 4000));
                try { await Promise.all([import('@mediapipe/pose'), import('@tensorflow/tfjs-core'), import('@tensorflow/tfjs-backend-webgl')]); } catch {}
            }, { timeout: 10000 });
        }
    }, []);

    // ─── PWA ───
    const pwaCtx = useContext(PWAContext) || {};
    const { deferredPrompt, installApp, deviceOS } = pwaCtx;
    const isPwaStandalone = pwaCtx.isStandalone;

    // ─── Push Toggle Wrapper ───
    const [pushLoading, setPushLoading] = useState(false);
    const onNotificationToggle = async (e) => {
        if (e.target.checked) {
            setPushLoading(true);
            try {
                const result = await handleNotificationToggle(true);
                if (result.success) alert(t('pushSetSuccess'));
                else alert(t('pushSetFail') + ': ' + result.message);
            } finally {
                setPushLoading(false);
            }
        } else {
            if (window.confirm(t('pushTurnOffConfirm'))) {
                setPushLoading(true);
                try { await handleNotificationToggle(false); } finally { setPushLoading(false); }
            }
        }
    };

    // ─── Logout Wrapper ───
    const onLogout = () => { if (window.confirm(t('logoutConfirm'))) handleLogout(); };

    // ═══ RENDER ═══

    if (loading) return <ProfileSkeleton />;

    if (!member) return <LoginPage config={config} t={t} onLogin={handleLogin} loading={loading} />;

    // ─── Particle Mode ───
    const getParticleMode = () => {
        if (validLogs.length > 0) {
            const lastLog = validLogs[0];
            const daysSinceLast = (new Date() - new Date(lastLog.timestamp || lastLog.date)) / (1000 * 60 * 60 * 24);
            if (daysSinceLast > 14) return 'stillness';
            const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const recentLogs = validLogs.filter(l => new Date(l.timestamp || l.date) > oneWeekAgo);
            if (recentLogs.length >= 3 || validLogs.length >= 8) return 'burning';
        } else if (member.regDate) {
            if ((new Date() - new Date(member.regDate)) / (1000 * 60 * 60 * 24) > 14) return 'stillness';
        }
        return 'calm';
    };

    return (
        <div className="member-profile-wrapper" style={{ minHeight: '100dvh', position: 'relative', overflowX: 'hidden', overflowY: 'auto', background: '#000000' }}>
            {/* Background Layers */}
            <div className="profile-bg" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url(${memberBg})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 1, opacity: 1 }} />
            <div className="bg-aura" style={{ position: 'fixed', zIndex: 3, pointerEvents: 'none' }} />
            <InteractiveParticles mode={getParticleMode()} />
            <div className="profile-overlay" style={{ background: 'rgba(0,0,0,0.1)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 4 }} />

            {/* Content */}
            <div className="profile-container" style={{ paddingBottom: 'calc(130px + env(safe-area-inset-bottom))', position: 'relative', zIndex: 10 }}>
                <ProfileHeader logo={logo} studioName={config.IDENTITY?.NAME} langLabelIndex={langLabelIndex} langLabels={langLabels} t={t} logout={onLogout} />

                <div className="tabs-content" style={{ padding: '0 10px' }}>
                    {/* HOME TAB */}
                    {activeTab === 'home' && (
                        <div className="fade-in">
                            <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px', background: 'rgba(20, 20, 20, 0.9)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                <MembershipInfo member={member} daysRemaining={daysRemaining} logs={validLogs} t={t} />
                                <MyStatsChart logs={validLogs} />
                                <AISection aiExperience={aiExperience} weatherData={weatherData} greetingVisible={greetingVisible} t={t} getTraditionalYogaMessage={getTraditionalYogaMessage} />
                                <HomeYogaSection language={language} t={t} mbti={mbti} />
                                <RecentAttendance logs={validLogs} language={language} t={t} setActiveTab={setActiveTab} />

                                {/* Push Notification Toggle */}
                                <div className="glass-panel" style={{
                                    padding: '25px 30px', background: 'linear-gradient(145deg, rgba(25, 25, 25, 0.9), rgba(15, 15, 15, 0.95))',
                                    marginBottom: '20px', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.08)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '50%',
                                            background: pushLoading ? 'rgba(var(--primary-rgb), 0.1)' : pushStatus === 'granted' ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: `1px solid ${pushStatus === 'granted' ? 'rgba(var(--primary-rgb), 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {pushLoading ? (
                                                <div style={{ width: '20px', height: '20px', border: '2px solid rgba(var(--primary-rgb), 0.2)', borderTop: '2px solid var(--primary-gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                            ) : pushStatus === 'granted' ? <BellRinging size={22} weight="fill" color="var(--primary-gold)" /> : <BellSlash size={22} color="rgba(255,255,255,0.4)" />}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>{t('pushNotification')}</span>
                                            <span style={{ fontSize: '0.85rem', color: pushLoading ? 'var(--primary-gold)' : pushStatus === 'granted' ? 'var(--primary-gold)' : 'rgba(255,255,255,0.4)', transition: 'color 0.3s' }}>
                                                {pushLoading ? '설정 중...' : pushStatus === 'granted' ? t('pushOnLabel') : t('pushOffLabel')}
                                            </span>
                                        </div>
                                    </div>
                                    <label className="premium-switch" style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px', opacity: pushLoading ? 0.5 : 1, pointerEvents: pushLoading ? 'none' : 'auto' }}>
                                        <input type="checkbox" checked={pushStatus === 'granted'} onChange={onNotificationToggle} disabled={pushLoading} style={{ opacity: 0, width: 0, height: 0 }} />
                                        <span className="premium-slider-track" style={{
                                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                            backgroundColor: pushStatus === 'granted' ? 'rgba(var(--primary-rgb), 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                            transition: '0.4s', borderRadius: '34px',
                                            border: `1px solid ${pushStatus === 'granted' ? 'var(--primary-gold)' : 'rgba(255, 255, 255, 0.2)'}`
                                        }}>
                                            <span style={{
                                                position: 'absolute', height: '22px', width: '22px',
                                                left: pushStatus === 'granted' ? '30px' : '4px', bottom: '3px',
                                                backgroundColor: pushStatus === 'granted' ? 'var(--primary-gold)' : 'rgba(255, 255, 255, 0.4)',
                                                transition: '0.4s cubic-bezier(0.4, 0.0, 0.2, 1)', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }} />
                                        </span>
                                    </label>
                                </div>

                                {/* Smartwatch / Wearable Sync Toggle */}
                                <div className="glass-panel" style={{
                                    padding: '25px 30px', background: 'linear-gradient(145deg, rgba(20, 25, 30, 0.9), rgba(15, 15, 20, 0.95))',
                                    marginBottom: '20px', borderRadius: '24px', border: '1px solid rgba(0, 255, 204, 0.1)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '50%',
                                            background: watchSync ? 'rgba(0, 255, 204, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: `1px solid ${watchSync ? 'rgba(0, 255, 204, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                            transition: 'all 0.3s ease'
                                        }}>
                                            <span style={{ fontSize: '1.2rem', filter: watchSync ? 'none' : 'grayscale(1)' }}>⌚</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>건강 데이터 연동</span>
                                            <span style={{ fontSize: '0.85rem', color: watchSync ? '#00ffcc' : 'rgba(255,255,255,0.4)', transition: 'color 0.3s' }}>
                                                {watchSync ? 'Apple/Samsung Health 연결됨' : '심박수·칼로리 기록 관리'}
                                            </span>
                                        </div>
                                    </div>
                                    <label className="premium-switch" style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px' }}>
                                        <input type="checkbox" checked={watchSync} onChange={toggleWatchSync} style={{ opacity: 0, width: 0, height: 0 }} />
                                        <span className="premium-slider-track" style={{
                                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                            backgroundColor: watchSync ? 'rgba(0, 255, 204, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                            transition: '0.4s', borderRadius: '34px',
                                            border: `1px solid ${watchSync ? '#00ffcc' : 'rgba(255, 255, 255, 0.2)'}`
                                        }}>
                                            <span style={{
                                                position: 'absolute', height: '22px', width: '22px',
                                                left: watchSync ? '30px' : '4px', bottom: '3px',
                                                backgroundColor: watchSync ? '#00ffcc' : 'rgba(255, 255, 255, 0.4)',
                                                transition: '0.4s cubic-bezier(0.4, 0.0, 0.2, 1)', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }} />
                                        </span>
                                    </label>
                                </div>

                                {/* MBTI Selector — 4-Step Flow */}
                                <div className="glass-panel" style={{
                                    padding: '25px 30px', background: 'linear-gradient(145deg, rgba(20, 20, 35, 0.9), rgba(15, 15, 25, 0.95))',
                                    marginBottom: '20px', borderRadius: '24px', border: `1px solid ${mbti ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)', overflow: 'hidden'
                                }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '50%',
                                            background: mbti ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: `1px solid ${mbti ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                            transition: 'all 0.3s ease'
                                        }}>
                                            <span style={{ fontSize: '1.2rem' }}>🧬</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>나의 MBTI</span>
                                            <span style={{ fontSize: '0.85rem', color: mbti ? 'var(--primary-gold)' : 'rgba(255,255,255,0.4)', transition: 'color 0.3s' }}>
                                                {mbti ? `${mbti} — AI 인사말과 맞춤 코칭에 반영돼요` : '설정하면 나만의 AI 인사말과 코칭을 받아요 ✨'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Step Progress Dots — 선택 중에만 표시 */}
                                    {mbtiStep < 4 && (
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                                        {MBTI_STEPS.map((_, i) => (
                                            <div key={i} onClick={() => { if (i < mbtiStep) setMbtiStep(i); }} style={{
                                                width: mbtiStep === i ? '28px' : '8px', height: '8px', borderRadius: '4px',
                                                background: i < mbtiStep ? 'var(--primary-gold)' : i === mbtiStep ? 'rgba(212, 175, 55, 0.6)' : 'rgba(255,255,255,0.15)',
                                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                cursor: i < mbtiStep ? 'pointer' : 'default'
                                            }} />
                                        ))}
                                    </div>
                                    )}

                                    {/* Step Content */}
                                    {mbtiStep < 4 ? (
                                        <div style={{ position: 'relative', minHeight: '120px' }}>
                                            {/* Step Label */}
                                            <div style={{ textAlign: 'center', marginBottom: '16px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                                                {MBTI_STEPS[mbtiStep]?.label}
                                            </div>
                                            {/* Two Option Cards */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                {MBTI_STEPS[mbtiStep]?.options.map(opt => {
                                                    const isSelected = mbtiPicks[mbtiStep] === opt.letter;
                                                    return (
                                                        <button key={opt.letter} onClick={() => handleMbtiPick(opt.letter, mbtiStep)} style={{
                                                            padding: '20px 16px', borderRadius: '16px',
                                                            background: isSelected
                                                                ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.1))'
                                                                : 'rgba(255, 255, 255, 0.04)',
                                                            border: `2px solid ${isSelected ? 'var(--primary-gold)' : 'rgba(255, 255, 255, 0.08)'}`,
                                                            cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                                            transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                                                            boxShadow: isSelected ? '0 4px 20px rgba(212, 175, 55, 0.15)' : 'none'
                                                        }}>
                                                            <span style={{
                                                                fontSize: '2rem', fontWeight: 800,
                                                                color: isSelected ? 'var(--primary-gold)' : 'rgba(255,255,255,0.7)',
                                                                lineHeight: 1, transition: 'color 0.3s'
                                                            }}>{opt.letter}</span>
                                                            <span style={{
                                                                fontSize: '0.9rem', fontWeight: 600,
                                                                color: isSelected ? 'white' : 'rgba(255,255,255,0.6)'
                                                            }}>{opt.title}</span>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                color: isSelected ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                                                                lineHeight: 1.3, textAlign: 'center'
                                                            }}>{opt.desc}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {/* Progress Letters */}
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
                                                {[0,1,2,3].map(i => (
                                                    <span key={i} style={{
                                                        fontSize: '1.1rem', fontWeight: 700, width: '28px', textAlign: 'center',
                                                        color: mbtiPicks[i] ? 'var(--primary-gold)' : 'rgba(255,255,255,0.15)',
                                                        transition: 'color 0.3s'
                                                    }}>{mbtiPicks[i] || '·'}</span>
                                                ))}
                                            </div>
                                            {/* 완료 버튼 — 4개 다 선택했을 때만 */}
                                            {mbtiPicks.length >= 4 && mbtiPicks[3] && (
                                                <button onClick={handleMbtiConfirm} style={{
                                                    marginTop: '16px', width: '100%', padding: '14px',
                                                    borderRadius: '14px', border: 'none', cursor: 'pointer',
                                                    background: 'linear-gradient(135deg, var(--primary-gold), #f5d17a)',
                                                    color: '#1a1a2e', fontSize: '1rem', fontWeight: 700,
                                                    letterSpacing: '2px',
                                                    boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)',
                                                    transition: 'all 0.3s ease'
                                                }}>
                                                    {mbtiPicks.join('')} 완료 ✓
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        /* Completed State */
                                        <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                            <div style={{
                                                fontSize: '2.5rem', fontWeight: 800, letterSpacing: '8px',
                                                background: 'linear-gradient(135deg, var(--primary-gold), #f5d17a)',
                                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                                marginBottom: '12px'
                                            }}>{mbti}</div>
                                            <button onClick={handleMbtiReset} style={{
                                                padding: '6px 16px', borderRadius: '8px',
                                                background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer'
                                            }}>다시 선택</button>
                                        </div>
                                    )}
                                </div>

                                {/* PWA Install Guide */}
                                {!isPwaStandalone && (deferredPrompt || deviceOS === 'ios') && (
                                    <div className="glass-panel" style={{
                                        padding: '20px 25px',
                                        background: deviceOS === 'ios' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(var(--primary-rgb), 0.1)',
                                        marginBottom: '20px', borderRadius: '24px',
                                        border: deviceOS === 'ios' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(var(--primary-rgb), 0.3)',
                                        display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)', animation: 'fadeIn 0.5s ease-out'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: deviceOS === 'ios' ? '#3B82F6' : 'var(--primary-gold)', color: deviceOS === 'ios' ? 'white' : 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {deviceOS === 'ios' ? <Share size={24} weight="bold" /> : <DownloadSimple size={24} weight="bold" />}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>{deviceOS === 'ios' ? t('installIOS') : t('installAndroid')}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{deviceOS === 'ios' ? t('installIOSDesc') : t('installAndroidDesc')}</span>
                                            </div>
                                        </div>
                                        {deviceOS === 'ios' ? (
                                            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '15px', borderRadius: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
                                                    <span style={{ background: '#3B82F6', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>1</span>
                                                    <span>{t('iosShareStep1')}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)' }}>
                                                    <span style={{ background: '#3B82F6', color: 'white', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>2</span>
                                                    <span>{t('iosShareStep2')}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={installApp} style={{ background: 'var(--primary-gold)', color: 'var(--text-on-primary)', border: 'none', padding: '12px 18px', borderRadius: '14px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <DownloadSimple size={20} weight="bold" /> {t('installBtn')}
                                            </button>
                                        )}
                                    </div>
                                )}
                                <SocialLinks t={t} />
                            </div>
                        </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                        <div className="fade-in">
                            <AttendanceHistory logs={logs} member={member} language={language} t={t} aiAnalysis={aiAnalysis} />
                        </div>
                    )}

                    {/* SCHEDULE TAB */}
                    {activeTab === 'schedule' && (
                        <ScheduleTab t={t} scheduleView={scheduleView} setScheduleView={setScheduleView}
                            scheduleBranch={scheduleBranch} setScheduleBranch={setScheduleBranch}
                            validLogs={validLogs} scheduleMonth={scheduleMonth} setScheduleMonth={setScheduleMonth}
                            images={images} timeTable1={timeTable1} timeTable2={timeTable2}
                            setLightboxImage={setLightboxImage} member={member} />
                    )}

                    {/* MEDITATION TAB */}
                    {activeTab === 'meditation' && (
                        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10000, background: '#18181b' }}>
                            <Suspense fallback={<div style={{ padding: '50px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Loading Meditation AI...</div>}>
                                <MeditationPage onClose={() => setActiveTab('home')} />
                            </Suspense>
                        </div>
                    )}

                    {/* PRICES TAB */}
                    {activeTab === 'prices' && (
                        <PriceTab memberId={member.id} member={member} images={images} priceTable1={priceTable1} priceTable2={priceTable2} setLightboxImage={setLightboxImage} />
                    )}

                    {/* NOTICES TAB */}
                    {activeTab === 'notices' && (
                        <NoticeTab t={t} notices={notices} selectedNoticeId={selectedNoticeId} setSelectedNoticeId={setSelectedNoticeId} setLightboxImage={setLightboxImage} />
                    )}

                    {/* MESSAGES TAB */}
                    {activeTab === 'messages' && (
                        <MessagesTab messages={messages} t={t} setActiveTab={(tab, noticeId) => { setActiveTab(tab); if (noticeId) setSelectedNoticeId(noticeId); }} />
                    )}
                </div>
            </div>

            {/* Bottom Navigation */}
            {activeTab !== 'meditation' && <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} t={t} config={config} />}

            {/* Modals */}
            {modals.confirm.isOpen && <CustomGlassModal message={modals.confirm.message} isConfirm={modals.confirm.isConfirm} onConfirm={modals.confirm.onConfirm} onCancel={closeConfirmModal} />}
            {lightboxImage && <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
            <InstallBanner onManualInstallClick={openInstallGuide} />
            <InstallGuideModal isOpen={modals.installGuide} onClose={closeInstallGuide} />

            <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: '0.6rem', color: 'white' }}>
                <span style={{ opacity: 0.1 }}>v1.0.5 | {config.IDENTITY?.NAME?.toLowerCase().replace(/\s/g, '-') || 'studio'}</span>
                <br />
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none', fontSize: '0.65rem' }}>개인정보처리방침</a>
            </div>
        </div>
    );
};

export default MemberProfile;
