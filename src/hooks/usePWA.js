import { useContext } from 'react';
import { PWAContext } from '../context/PWAContextDef';

export const usePWA = () => useContext(PWAContext);
