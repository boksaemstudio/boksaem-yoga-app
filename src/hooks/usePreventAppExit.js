import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * [SaaS Global] PWA 뒤로가기 앱 종료 방지 훅
 * 
 * PWA에서 하드웨어/제스처 뒤로가기 시 앱이 종료되는 문제를 방지합니다.
 * history 스택에 dummy state를 push하고, popstate 이벤트에서
 * 앱 내 네비게이션으로 처리합니다.
 * 
 * 모든 앱(Admin, Instructor, Member, Kiosk, CheckIn)에 적용됩니다.
 */
export const usePreventAppExit = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // PWA standalone 모드에서만 동작
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;

    if (!isPWA) return;

    // 현재 페이지에 history state가 없으면 dummy state 추가
    if (!window.history.state?.preventExit) {
      window.history.pushState({ preventExit: true }, '');
    }

    const handlePopState = (e) => {
      // 만약 히스토리에 preventExit 키가 없다면 강제로 다시 추가하여 앱 이탈 방지
      if (document.visibilityState === 'visible' && !e.state?.tab && !e.state?.modalOpen) {
         window.history.pushState({ preventExit: true }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
};
