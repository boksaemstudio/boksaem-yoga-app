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
import BranchCrowdChart from '../components/profile/BranchCrowdChart';
import MessagesTab from '../components/profile/MessagesTab';
import ImageLightbox from '../components/common/ImageLightbox';

// [REFACTOR] Extracted Components & Hooks
import ProfileSkeleton from '../components/profile/ProfileSkeleton';
import LoginPage from '../components/profile/LoginPage';
import { useMemberProfile } from '../hooks/useMemberProfile';
import { useMemberUI } from '../hooks/useMemberUI';
import { storageService } from '../services/storage';
const MemberProfile = () => {
  const {
    config
  } = useStudioConfig();
  const {
    language,
    t
  } = useLanguage();

  // ─── Business Logic Hook (~400줄 → 1줄) ───
  const {
    member,
    loading,
    logs,
    validLogs,
    notices,
    images,
    weatherData,
    aiExperience,
    aiAnalysis,
    messages,
    pushStatus,
    daysRemaining,
    handleLogin,
    handleLogout,
    handleNotificationToggle,
    getTraditionalYogaMessage
  } = useMemberProfile(language, t);

  // ─── UI State Hook ───
  const {
    activeTab,
    setActiveTab,
    selectedNoticeId,
    setSelectedNoticeId,
    scheduleView,
    setScheduleView,
    scheduleMonth,
    setScheduleMonth,
    scheduleBranch,
    setScheduleBranch,
    lightboxImage,
    setLightboxImage,
    greetingVisible,
    setGreetingVisible,
    modals,
    openConfirmModal,
    closeConfirmModal,
    openInstallGuide,
    closeInstallGuide
  } = useMemberUI();

  // ─── Derived Assets (SaaS) ───
  const logo = config.IDENTITY?.LOGO_URL || images.logo || config.ASSETS?.LOGO?.WIDE || '/assets/passflow_logo.png';
  const memberBg = images.memberBg || config.ASSETS?.MEMBER_BG;
  const timeTable1 = images.timeTable1 || config.ASSETS?.TIMETABLE?.BRANCH1;
  const timeTable2 = images.timeTable2 || config.ASSETS?.TIMETABLE?.BRANCH2;
  const priceTable1 = images.priceTable1 || config.ASSETS?.PRICETABLE?.BRANCH1;
  const priceTable2 = images.priceTable2 || config.ASSETS?.PRICETABLE?.BRANCH2;

  // ─── Language Label Animation ───
  const [langLabelIndex, setLangLabelIndex] = useState(0);
  const langLabels = [t("g_23eb27") || t("g_23eb27") || t("g_23eb27") || "\uC5B8\uC5B4", "Language", "Язык", "语言", "言語"];
  useEffect(() => {
    const interval = setInterval(() => setLangLabelIndex(p => (p + 1) % langLabels.length), 3000);
    return () => clearInterval(interval);
  }, [langLabels.length]);

  // ─── Wearable Sync State (Mock) ───
  const [watchSync, setWatchSync] = useState(() => localStorage.getItem('watchSync') === 'true');
  const toggleWatchSync = e => {
    const checked = e.target.checked;
    setWatchSync(checked);
    localStorage.setItem('watchSync', checked ? 'true' : 'false');
  };

  // ─── MBTI State ───
  const MBTI_STEPS = [{
    label: t('member_mbti_step1_label') || t("g_b2dfa4") || t("g_b2dfa4") || t("g_b2dfa4") || "\uC5D0\uB108\uC9C0 \uBC29\uD5A5",
    options: [{
      letter: 'E',
      title: t('member_mbti_step1_opt1_title') || t("g_948092") || t("g_948092") || t("g_948092") || "\uC678\uD5A5",
      desc: t('member_mbti_step1_opt1_desc') || t("g_cc7f1e") || t("g_cc7f1e") || t("g_cc7f1e") || "\uC0AC\uB78C\uB4E4\uACFC \uC5B4\uC6B8\uB9AC\uBA70 \uC5D0\uB108\uC9C0 \uCDA9\uC804"
    }, {
      letter: 'I',
      title: t('member_mbti_step1_opt2_title') || t("g_326663") || t("g_326663") || t("g_326663") || "\uB0B4\uD5A5",
      desc: t('member_mbti_step1_opt2_desc') || t("g_c31caf") || t("g_c31caf") || t("g_c31caf") || "\uD63C\uC790\uB9CC\uC758 \uC2DC\uAC04\uC73C\uB85C \uC5D0\uB108\uC9C0 \uCDA9\uC804"
    }]
  }, {
    label: t('member_mbti_step2_label') || t("g_d4f935") || t("g_d4f935") || t("g_d4f935") || "\uC778\uC2DD \uAE30\uB2A5",
    options: [{
      letter: 'S',
      title: t('member_mbti_step2_opt1_title') || t("g_1c0c79") || t("g_1c0c79") || t("g_1c0c79") || "\uAC10\uAC01",
      desc: t('member_mbti_step2_opt1_desc') || t("g_b45ef6") || t("g_b45ef6") || t("g_b45ef6") || "\uD604\uC2E4\uC801, \uAD6C\uCCB4\uC801 \uC0AC\uC2E4 \uC911\uC2DC"
    }, {
      letter: 'N',
      title: t('member_mbti_step2_opt2_title') || t("g_50a1d5") || t("g_50a1d5") || t("g_50a1d5") || "\uC9C1\uAD00",
      desc: t('member_mbti_step2_opt2_desc') || t("g_f7e4e2") || t("g_f7e4e2") || t("g_f7e4e2") || "\uAC00\uB2A5\uC131\uACFC \uC544\uC774\uB514\uC5B4 \uC911\uC2DC"
    }]
  }, {
    label: t('member_mbti_step3_label') || t("g_128658") || t("g_128658") || t("g_128658") || "\uD310\uB2E8 \uAE30\uB2A5",
    options: [{
      letter: 'T',
      title: t('member_mbti_step3_opt1_title') || t("g_f1aa9d") || t("g_f1aa9d") || t("g_f1aa9d") || "\uC0AC\uACE0",
      desc: t('member_mbti_step3_opt1_desc') || t("g_04926b") || t("g_04926b") || t("g_04926b") || "\uB17C\uB9AC\uC640 \uC6D0\uCE59\uC73C\uB85C \uD310\uB2E8"
    }, {
      letter: 'F',
      title: t('member_mbti_step3_opt2_title') || t("g_519521") || t("g_519521") || t("g_519521") || "\uAC10\uC815",
      desc: t('member_mbti_step3_opt2_desc') || t("g_8875c3") || t("g_8875c3") || t("g_8875c3") || "\uC0AC\uB78C\uACFC \uAD00\uACC4\uB97C \uBA3C\uC800 \uACE0\uB824"
    }]
  }, {
    label: t('member_mbti_step4_label') || t("g_29cf93") || t("g_29cf93") || t("g_29cf93") || "\uC0DD\uD65C \uC591\uC2DD",
    options: [{
      letter: 'J',
      title: t('member_mbti_step4_opt1_title') || t("g_88d56b") || t("g_88d56b") || t("g_88d56b") || "\uD310\uB2E8",
      desc: t('member_mbti_step4_opt1_desc') || t("g_42f541") || t("g_42f541") || t("g_42f541") || "\uACC4\uD68D\uC801\uC774\uACE0 \uCCB4\uACC4\uC801\uC778 \uC0DD\uD65C"
    }, {
      letter: 'P',
      title: t('member_mbti_step4_opt2_title') || t("g_e4b268") || t("g_e4b268") || t("g_e4b268") || "\uC778\uC2DD",
      desc: t('member_mbti_step4_opt2_desc') || t("g_d093ac") || t("g_d093ac") || t("g_d093ac") || "\uC720\uC5F0\uD558\uACE0 \uC790\uC720\uB85C\uC6B4 \uC0DD\uD65C"
    }]
  }];
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
    if (member?.id) storageService.updateMember(member.id, {
      mbti: result
    });
    setMbtiStep(4);
  };
  const handleMbtiReset = () => {
    setMbtiPicks([]);
    setMbtiStep(0);
    setMbti('');
    localStorage.removeItem('member_mbti');
    if (member?.id) storageService.updateMember(member.id, {
      mbti: ''
    });
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
      if (noticeId) {
        setSelectedNoticeId(noticeId);
        setActiveTab('notices');
      } else if (tab && ['home', 'history', 'schedule', 'prices', 'notices', 'messages'].includes(tab)) setActiveTab(tab);
      if (tab || noticeId) setTimeout(() => window.history.replaceState({}, '', window.location.pathname), 500);
    };
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [setActiveTab, setSelectedNoticeId]);

  // ─── AI Preloader ───
  useEffect(() => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(async () => {
        await new Promise(r => setTimeout(r, 4000));
        try {
          await Promise.all([import('@mediapipe/pose'), import('@tensorflow/tfjs-core'), import('@tensorflow/tfjs-backend-webgl')]);
        } catch {}
      }, {
        timeout: 10000
      });
    }
  }, []);

  // ─── PWA ───
  const pwaCtx = useContext(PWAContext) || {};
  const {
    deferredPrompt,
    installApp,
    deviceOS,
    isDemo
  } = pwaCtx;
  const isPwaStandalone = pwaCtx.isStandalone;

  // ─── Push Toggle Wrapper ───
  const [pushLoading, setPushLoading] = useState(false);
  const onNotificationToggle = async e => {
    if (e.target.checked) {
      setPushLoading(true);
      try {
        const result = await handleNotificationToggle(true);
        if (result.success) alert(t('pushSetSuccess'));else alert(t('pushSetFail') + ': ' + result.message);
      } finally {
        setPushLoading(false);
      }
    } else {
      if (window.confirm(t('pushTurnOffConfirm'))) {
        setPushLoading(true);
        try {
          await handleNotificationToggle(false);
        } finally {
          setPushLoading(false);
        }
      }
    }
  };

  // ─── Logout Wrapper ───
  const onLogout = () => {
    if (window.confirm(t('logoutConfirm'))) handleLogout();
  };

  // ═══ RENDER ═══

  if (loading) return <ProfileSkeleton />;
  if (!member) return <LoginPage config={config} t={t} onLogin={handleLogin} loading={loading} />;

  // ─── Particle Mode ───
  const getParticleMode = () => {
    if (validLogs.length > 0) {
      const lastLog = validLogs[0];
      const daysSinceLast = (new Date() - new Date(lastLog.timestamp || lastLog.date)) / (1000 * 60 * 60 * 24);
      if (daysSinceLast > 14) return 'stillness';
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentLogs = validLogs.filter(l => new Date(l.timestamp || l.date) > oneWeekAgo);
      if (recentLogs.length >= 3 || validLogs.length >= 8) return 'burning';
    } else if (member.regDate) {
      if ((new Date() - new Date(member.regDate)) / (1000 * 60 * 60 * 24) > 14) return 'stillness';
    }
    return 'calm';
  };
  return <div className="member-profile-wrapper" style={{
    minHeight: '100dvh',
    position: 'relative',
    overflowX: 'hidden',
    overflowY: 'auto',
    background: '#000000'
  }}>
            {/* Background Layers */}
            <div className="profile-bg" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url(${memberBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      zIndex: 1,
      opacity: 1
    }} />
            <div className="bg-aura" style={{
      position: 'fixed',
      zIndex: 3,
      pointerEvents: 'none'
    }} />
            <InteractiveParticles mode={getParticleMode()} />
            <div className="profile-overlay" style={{
      background: 'rgba(0,0,0,0.1)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 4
    }} />

            {/* Content */}
            <div className="profile-container" style={{
      paddingBottom: 'calc(130px + env(safe-area-inset-bottom))',
      position: 'relative',
      zIndex: 10
    }}>
                <ProfileHeader logo={logo} studioName={config.IDENTITY?.NAME} langLabelIndex={langLabelIndex} langLabels={langLabels} t={t} logout={onLogout} />

                <div className="tabs-content" style={{
        padding: '0 10px'
      }}>
                    {/* HOME TAB */}
                    {activeTab === 'home' && <div className="fade-in">
                            <div className="glass-panel" style={{
            padding: '24px',
            marginBottom: '20px',
            background: 'rgba(20, 20, 20, 0.9)',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
                                <MembershipInfo member={member} daysRemaining={daysRemaining} logs={validLogs} t={t} />
                                <MyStatsChart logs={validLogs} />
                                <AISection aiExperience={aiExperience} weatherData={weatherData} greetingVisible={greetingVisible} t={t} getTraditionalYogaMessage={getTraditionalYogaMessage} />
                                <HomeYogaSection language={language} t={t} mbti={mbti} weatherData={weatherData} logs={validLogs} />
                                <RecentAttendance logs={validLogs} language={language} t={t} setActiveTab={setActiveTab} />

                                {/* Push Notification Toggle */}
                                <div className="glass-panel" style={{
              padding: '25px 30px',
              background: 'linear-gradient(145deg, rgba(25, 25, 25, 0.9), rgba(15, 15, 15, 0.95))',
              marginBottom: '20px',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                                    <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                                        <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: pushLoading ? 'rgba(var(--primary-rgb), 0.1)' : pushStatus === 'granted' ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${pushStatus === 'granted' ? 'rgba(var(--primary-rgb), 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                  transition: 'all 0.3s ease'
                }}>
                                            {pushLoading ? <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(var(--primary-rgb), 0.2)',
                    borderTop: '2px solid var(--primary-gold)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} /> : pushStatus === 'granted' ? <BellRinging size={22} weight="fill" color="var(--primary-gold)" /> : <BellSlash size={22} color="rgba(255,255,255,0.4)" />}
                                        </div>
                                        <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                                            <span style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'white'
                  }}>{t('pushNotification')}</span>
                                            <span style={{
                    fontSize: '0.85rem',
                    color: pushLoading ? 'var(--primary-gold)' : pushStatus === 'granted' ? 'var(--primary-gold)' : 'rgba(255,255,255,0.4)',
                    transition: 'color 0.3s'
                  }}>
                                                {pushLoading ? t("g_d98339") || t("g_d98339") || t("g_d98339") || "\uC124\uC815 \uC911..." : pushStatus === 'granted' ? t('pushOnLabel') : t('pushOffLabel')}
                                            </span>
                                        </div>
                                    </div>
                                    <label className="premium-switch" style={{
                position: 'relative',
                display: 'inline-block',
                width: '56px',
                height: '30px',
                opacity: pushLoading ? 0.5 : 1,
                pointerEvents: pushLoading ? 'none' : 'auto'
              }}>
                                        <input type="checkbox" checked={pushStatus === 'granted'} onChange={onNotificationToggle} disabled={pushLoading} style={{
                  opacity: 0,
                  width: 0,
                  height: 0
                }} />
                                        <span className="premium-slider-track" style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: pushStatus === 'granted' ? 'rgba(var(--primary-rgb), 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  transition: '0.4s',
                  borderRadius: '34px',
                  border: `1px solid ${pushStatus === 'granted' ? 'var(--primary-gold)' : 'rgba(255, 255, 255, 0.2)'}`
                }}>
                                            <span style={{
                    position: 'absolute',
                    height: '22px',
                    width: '22px',
                    left: pushStatus === 'granted' ? '30px' : '4px',
                    bottom: '3px',
                    backgroundColor: pushStatus === 'granted' ? 'var(--primary-gold)' : 'rgba(255, 255, 255, 0.4)',
                    transition: '0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                                        </span>
                                    </label>
                                </div>

                                {/* Smartwatch / Wearable Sync Toggle */}
                                <div className="glass-panel" style={{
              padding: '25px 30px',
              background: 'linear-gradient(145deg, rgba(20, 25, 30, 0.9), rgba(15, 15, 20, 0.95))',
              marginBottom: '20px',
              borderRadius: '24px',
              border: '1px solid rgba(0, 255, 204, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                                    <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                                        <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: watchSync ? 'rgba(0, 255, 204, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${watchSync ? 'rgba(0, 255, 204, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                  transition: 'all 0.3s ease'
                }}>
                                            <span style={{
                    fontSize: '1.2rem',
                    filter: watchSync ? 'none' : 'grayscale(1)'
                  }}>⌚</span>
                                        </div>
                                        <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                                            <span style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'white'
                  }}>{t('member_health_sync_title') || t("g_306384") || t("g_306384") || t("g_306384") || "\uAC74\uAC15 \uB370\uC774\uD130 \uC5F0\uB3D9"}</span>
                                            <span style={{
                    fontSize: '0.85rem',
                    color: watchSync ? '#00ffcc' : 'rgba(255,255,255,0.4)',
                    transition: 'color 0.3s'
                  }}>
                                                {watchSync ? t('member_health_sync_on') || t("g_67ba8d") || t("g_67ba8d") || t("g_67ba8d") || "Apple/Samsung Health \uC5F0\uACB0\uB428" : t('member_health_sync_off') || t("g_49e5a2") || t("g_49e5a2") || t("g_49e5a2") || "\uC2EC\uBC15\uC218\xB7\uCE7C\uB85C\uB9AC \uAE30\uB85D \uAD00\uB9AC"}
                                            </span>
                                        </div>
                                    </div>
                                    <label className="premium-switch" style={{
                position: 'relative',
                display: 'inline-block',
                width: '56px',
                height: '30px'
              }}>
                                        <input type="checkbox" checked={watchSync} onChange={toggleWatchSync} style={{
                  opacity: 0,
                  width: 0,
                  height: 0
                }} />
                                        <span className="premium-slider-track" style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: watchSync ? 'rgba(0, 255, 204, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  transition: '0.4s',
                  borderRadius: '34px',
                  border: `1px solid ${watchSync ? '#00ffcc' : 'rgba(255, 255, 255, 0.2)'}`
                }}>
                                            <span style={{
                    position: 'absolute',
                    height: '22px',
                    width: '22px',
                    left: watchSync ? '30px' : '4px',
                    bottom: '3px',
                    backgroundColor: watchSync ? '#00ffcc' : 'rgba(255, 255, 255, 0.4)',
                    transition: '0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                                        </span>
                                    </label>
                                </div>

                                {/* MBTI Selector — 4-Step Flow */}
                                <div className="glass-panel" style={{
              padding: '25px 30px',
              background: 'linear-gradient(145deg, rgba(20, 20, 35, 0.9), rgba(15, 15, 25, 0.95))',
              marginBottom: '20px',
              borderRadius: '24px',
              border: `1px solid ${mbti ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden'
            }}>
                                    {/* Header */}
                                    <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '20px'
              }}>
                                        <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: mbti ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${mbti ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                  transition: 'all 0.3s ease'
                }}>
                                            <span style={{
                    fontSize: '1.2rem'
                  }}>🧬</span>
                                        </div>
                                        <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  flex: 1
                }}>
                                            <span style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'white'
                  }}>{t('member_mbti_title') || t("g_0ccf9f") || t("g_0ccf9f") || t("g_0ccf9f") || "\uB098\uC758 MBTI"}</span>
                                            <span style={{
                    fontSize: '0.85rem',
                    color: mbti ? 'var(--primary-gold)' : 'rgba(255,255,255,0.4)',
                    transition: 'color 0.3s'
                  }}>
                                                {mbti ? `${mbti}${t('member_mbti_badge_desc_set') || t("g_34061b") || t("g_34061b") || t("g_34061b") || " \u2014 AI \uC778\uC0AC\uB9D0\uACFC \uB9DE\uCDA4 \uCF54\uCE6D\uC5D0 \uBC18\uC601\uB3FC\uC694"}` : t('member_mbti_badge_desc_unset') || t("g_13000c") || t("g_13000c") || t("g_13000c") || "\uC124\uC815\uD558\uBA74 \uB098\uB9CC\uC758 AI \uC778\uC0AC\uB9D0\uACFC \uCF54\uCE6D\uC744 \uBC1B\uC544\uC694 \u2728"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Step Progress Dots — 선택 중에만 표시 */}
                                    {mbtiStep < 4 && <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '20px'
              }}>
                                        {MBTI_STEPS.map((_, i) => <div key={i} onClick={() => {
                  if (i < mbtiStep) setMbtiStep(i);
                }} style={{
                  width: mbtiStep === i ? '28px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i < mbtiStep ? 'var(--primary-gold)' : i === mbtiStep ? 'rgba(212, 175, 55, 0.6)' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: i < mbtiStep ? 'pointer' : 'default'
                }} />)}
                                    </div>}

                                    {/* Step Content */}
                                    {mbtiStep < 4 ? <div style={{
                position: 'relative',
                minHeight: '120px'
              }}>
                                            {/* Step Label */}
                                            <div style={{
                  textAlign: 'center',
                  marginBottom: '16px',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.8rem',
                  letterSpacing: '2px',
                  textTransform: 'uppercase'
                }}>
                                                {MBTI_STEPS[mbtiStep]?.label}
                                            </div>
                                            {/* Two Option Cards */}
                                            <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px'
                }}>
                                                {MBTI_STEPS[mbtiStep]?.options.map(opt => {
                    const isSelected = mbtiPicks[mbtiStep] === opt.letter;
                    return <button key={opt.letter} onClick={() => handleMbtiPick(opt.letter, mbtiStep)} style={{
                      padding: '20px 16px',
                      borderRadius: '16px',
                      background: isSelected ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.1))' : 'rgba(255, 255, 255, 0.04)',
                      border: `2px solid ${isSelected ? 'var(--primary-gold)' : 'rgba(255, 255, 255, 0.08)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                      boxShadow: isSelected ? '0 4px 20px rgba(212, 175, 55, 0.15)' : 'none'
                    }}>
                                                            <span style={{
                        fontSize: '2rem',
                        fontWeight: 800,
                        color: isSelected ? 'var(--primary-gold)' : 'rgba(255,255,255,0.7)',
                        lineHeight: 1,
                        transition: 'color 0.3s'
                      }}>{opt.letter}</span>
                                                            <span style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: isSelected ? 'white' : 'rgba(255,255,255,0.6)'
                      }}>{opt.title}</span>
                                                            <span style={{
                        fontSize: '0.75rem',
                        color: isSelected ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                        lineHeight: 1.3,
                        textAlign: 'center'
                      }}>{opt.desc}</span>
                                                        </button>;
                  })}
                                            </div>
                                            {/* Progress Letters */}
                                            <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '16px'
                }}>
                                                {[0, 1, 2, 3].map(i => <span key={i} style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    width: '28px',
                    textAlign: 'center',
                    color: mbtiPicks[i] ? 'var(--primary-gold)' : 'rgba(255,255,255,0.15)',
                    transition: 'color 0.3s'
                  }}>{mbtiPicks[i] || '·'}</span>)}
                                            </div>
                                            {/* 완료 버튼 — 4개 다 선택했을 때만 */}
                                            {mbtiPicks.length >= 4 && mbtiPicks[3] && <button onClick={handleMbtiConfirm} style={{
                  marginTop: '16px',
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, var(--primary-gold), #f5d17a)',
                  color: '#1a1a2e',
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)',
                  transition: 'all 0.3s ease'
                }}>
                                                    {mbtiPicks.join('')}{t('member_mbti_btn_complete') || t("g_76520e") || t("g_76520e") || t("g_76520e") || " \uC644\uB8CC \u2713"}
                                                </button>}
                                        </div> : (/* Completed State */
              <div style={{
                textAlign: 'center',
                padding: '10px 0'
              }}>
                                            <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  letterSpacing: '8px',
                  background: 'linear-gradient(135deg, var(--primary-gold), #f5d17a)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '12px'
                }}>{mbti}</div>
                                            <button onClick={handleMbtiReset} style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}>{t('member_mbti_btn_reselect') || t("g_2aacea") || t("g_2aacea") || t("g_2aacea") || "\uB2E4\uC2DC \uC120\uD0DD"}</button>
                                        </div>)}
                                </div>

                                {/* PWA Install Guide */}
                                {!isDemo && !isPwaStandalone && (deferredPrompt || deviceOS === 'ios') && <div className="glass-panel" style={{
              padding: '20px 25px',
              background: deviceOS === 'ios' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(var(--primary-rgb), 0.1)',
              marginBottom: '20px',
              borderRadius: '24px',
              border: deviceOS === 'ios' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(var(--primary-rgb), 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              animation: 'fadeIn 0.5s ease-out'
            }}>
                                        <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                                            <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: deviceOS === 'ios' ? '#3B82F6' : 'var(--primary-gold)',
                  color: deviceOS === 'ios' ? 'white' : 'black',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                                                {deviceOS === 'ios' ? <Share size={24} weight="bold" /> : <DownloadSimple size={24} weight="bold" />}
                                            </div>
                                            <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                                                <span style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'white'
                  }}>{deviceOS === 'ios' ? t('installIOS') : t('installAndroid')}</span>
                                                <span style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.7)'
                  }}>{deviceOS === 'ios' ? t('installIOSDesc') : t('installAndroidDesc')}</span>
                                            </div>
                                        </div>
                                        {deviceOS === 'ios' ? <div style={{
                background: 'rgba(59, 130, 246, 0.15)',
                padding: '15px',
                borderRadius: '16px'
              }}>
                                                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '10px',
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.9)'
                }}>
                                                    <span style={{
                    background: '#3B82F6',
                    color: 'white',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>1</span>
                                                    <span>{t('iosShareStep1')}</span>
                                                </div>
                                                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.9rem',
                  color: 'rgba(255,255,255,0.9)'
                }}>
                                                    <span style={{
                    background: '#3B82F6',
                    color: 'white',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>2</span>
                                                    <span>{t('iosShareStep2')}</span>
                                                </div>
                                            </div> : <button onClick={installApp} style={{
                background: 'var(--primary-gold)',
                color: 'var(--text-on-primary)',
                border: 'none',
                padding: '12px 18px',
                borderRadius: '14px',
                fontWeight: 'bold',
                fontSize: '0.95rem',
                cursor: 'pointer',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                                                <DownloadSimple size={20} weight="bold" /> {t('installBtn')}
                                            </button>}
                                    </div>}
                                <SocialLinks t={t} />
                            </div>
                        </div>}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && <div className="fade-in">
                            <BranchCrowdChart />
                            <AttendanceHistory logs={logs} member={member} language={language} t={t} aiAnalysis={aiAnalysis} />
                        </div>}

                    {/* SCHEDULE TAB */}
                    {activeTab === 'schedule' && <ScheduleTab t={t} scheduleView={scheduleView} setScheduleView={setScheduleView} scheduleBranch={scheduleBranch} setScheduleBranch={setScheduleBranch} validLogs={validLogs} scheduleMonth={scheduleMonth} setScheduleMonth={setScheduleMonth} images={images} timeTable1={timeTable1} timeTable2={timeTable2} setLightboxImage={setLightboxImage} member={member} />}

                    {/* MEDITATION TAB */}
                    {activeTab === 'meditation' && <div className="fade-in" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10000,
          background: '#18181b'
        }}>
                            <Suspense fallback={<div style={{
            padding: '50px',
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center'
          }}>Loading Meditation AI...</div>}>
                                <MeditationPage onClose={() => setActiveTab('home')} />
                            </Suspense>
                        </div>}

                    {/* PRICES TAB */}
                    {activeTab === 'prices' && <PriceTab memberId={member.id} member={member} images={images} priceTable1={priceTable1} priceTable2={priceTable2} setLightboxImage={setLightboxImage} />}

                    {/* NOTICES TAB */}
                    {activeTab === 'notices' && <NoticeTab t={t} notices={notices} selectedNoticeId={selectedNoticeId} setSelectedNoticeId={setSelectedNoticeId} setLightboxImage={setLightboxImage} />}

                    {/* MESSAGES TAB */}
                    {activeTab === 'messages' && <MessagesTab messages={messages} t={t} setActiveTab={(tab, noticeId) => {
          setActiveTab(tab);
          if (noticeId) setSelectedNoticeId(noticeId);
        }} />}
                </div>
            </div>

            {/* Bottom Navigation */}
            {activeTab !== 'meditation' && <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} t={t} config={config} />}

            {/* Modals */}
            {modals.confirm.isOpen && <CustomGlassModal message={modals.confirm.message} isConfirm={modals.confirm.isConfirm} onConfirm={modals.confirm.onConfirm} onCancel={closeConfirmModal} />}
            {lightboxImage && <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
            <InstallBanner onManualInstallClick={openInstallGuide} />
            <InstallGuideModal isOpen={modals.installGuide} onClose={closeInstallGuide} />

            <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      fontSize: '0.6rem',
      color: 'white'
    }}>
                <span style={{
        opacity: 0.1
      }}>v1.0.5 | {config.IDENTITY?.NAME?.toLowerCase().replace(/\s/g, '-') || 'studio'}</span>
                <br />
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{
        color: 'rgba(255,255,255,0.2)',
        textDecoration: 'none',
        fontSize: '0.65rem'
      }}>{t('member_footer_privacy') || t("g_5381fd") || t("g_5381fd") || t("g_5381fd") || "\uAC1C\uC778\uC815\uBCF4\uCC98\uB9AC\uBC29\uCE68"}</a>
            </div>
        </div>;
};
export default MemberProfile;