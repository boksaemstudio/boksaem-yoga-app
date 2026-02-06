import { useRegisterSW } from 'virtual:pwa-register/react';

import { WarningCircle, ArrowsClockwise } from '@phosphor-icons/react';

function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  return null;
}

export default ReloadPrompt;
