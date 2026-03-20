import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export function initServerWarmup() {
  if (typeof window !== 'undefined') {
    try {
      console.log('🔥 [Warm-up] Sending signals to Cloud Functions...');
      httpsCallable(functions, 'checkInMemberV2Call')({ ping: true }).catch(() => {});
      httpsCallable(functions, 'generateMeditationGuidance')({ type: 'warmup' }).catch(() => {});
    } catch (e) {
      console.debug('Warm-up signal failed (harmless):', e);
    }
  }
}
