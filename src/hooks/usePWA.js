import { useContext } from 'react';
import { PWAContext } from '../contexts/PWAContextDef';

export const usePWA = () => useContext(PWAContext);
