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
    const MBTI_TYPES = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'];
    const [mbti, setMbti] = useState(() => localStorage.getItem('member_mbti') || member?.mbti || '');
    const handleMbtiChange = (value) => {
        setMbti(value);
        localStorage.setItem('member_mbti', value);
        if (member?.id) {
            storageService.updateMember(member.id, { mbti: value });
        }
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
    const onNotificationToggle = async (e) => {
        if (e.target.checked) {
            const result = await handleNotificationToggle(true);
            if (result.success) alert(t('pushSetSuccess'));
            else alert(t('pushSetFail') + ': ' + result.message);
        } else {
            if (window.confirm(t('pushTurnOffConfirm'))) handleNotificationToggle(false);
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
                                <MembershipInfo member={member} daysRemaining={daysRemaining} t={t} />
                                <MyStatsChart logs={validLogs} />
                                <AISection aiExperience={aiExperience} weatherData={weatherData} greetingVisible={greetingVisible} t={t} getTraditionalYogaMessage={getTraditionalYogaMessage} />
                                <HomeYogaSection language={language} t={t} />
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
                                            background: pushStatus === 'granted' ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: `1px solid ${pushStatus === 'granted' ? 'rgba(var(--primary-rgb), 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {pushStatus === 'granted' ? <BellRinging size={22} weight="fill" color="var(--primary-gold)" /> : <BellSlash size={22} color="rgba(255,255,255,0.4)" />}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>{t('pushNotification')}</span>
                                            <span style={{ fontSize: '0.85rem', color: pushStatus === 'granted' ? 'var(--primary-gold)' : 'rgba(255,255,255,0.4)', transition: 'color 0.3s' }}>
                                                {pushStatus === 'granted' ? t('pushOnLabel') : t('pushOffLabel')}
                                            </span>
                                        </div>
                                    </div>
                                    <label className="premium-switch" style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px' }}>
                                        <input type="checkbox" checked={pushStatus === 'granted'} onChange={onNotificationToggle} style={{ opacity: 0, width: 0, height: 0 }} />
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

                                {/* MBTI Selector */}
                                <div className="glass-panel" style={{
                                    padding: '25px 30px', background: 'linear-gradient(145deg, rgba(20, 20, 35, 0.9), rgba(15, 15, 25, 0.95))',
                                    marginBottom: '20px', borderRadius: '24px', border: `1px solid ${mbti ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '50%',
                                            background: mbti ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: `1px solid ${mbti ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                            transition: 'all 0.3s ease'
                                        }}>
                                            <span style={{ fontSize: '1.2rem' }}>🧬</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>나의 MBTI</span>
                                            <span style={{ fontSize: '0.85rem', color: mbti ? 'var(--primary-gold)' : 'rgba(255,255,255,0.4)', transition: 'color 0.3s' }}>
                                                {mbti ? `${mbti} — AI 인사말에 반영됩니다` : 'MBTI를 설정하면 맞춤 인사말이 바뀌어요'}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                        {MBTI_TYPES.map(type => (
                                            <button key={type} onClick={() => handleMbtiChange(type)} style={{
                                                padding: '8px 0', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600,
                                                background: mbti === type ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                border: `1px solid ${mbti === type ? 'var(--primary-gold)' : 'rgba(255, 255, 255, 0.1)'}`,
                                                color: mbti === type ? 'var(--primary-gold)' : 'rgba(255, 255, 255, 0.6)',
                                                cursor: 'pointer', transition: 'all 0.2s ease'
                                            }}>{type}</button>
                                        ))}
                                    </div>
                                    {mbti && (
                                        <button onClick={() => handleMbtiChange('')} style={{
                                            marginTop: '12px', padding: '6px 16px', borderRadius: '8px',
                                            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                                            color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', cursor: 'pointer'
                                        }}>선택 해제</button>
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
                                            <button onClick={installApp} style={{ background: 'var(--primary-gold)', color: 'black', border: 'none', padding: '12px 18px', borderRadius: '14px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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

            <div style={{ padding: '40px 20px', textAlign: 'center', opacity: 0.1, fontSize: '0.6rem', color: 'white' }}>
                v1.0.5 | {config.IDENTITY?.NAME?.toLowerCase().replace(/\s/g, '-') || 'studio'}
            </div>
        </div>
    );
};

export default MemberProfile;
