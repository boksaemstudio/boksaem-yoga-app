/**
 * 환경별 로깅 유틸리티
 * 프로덕션에서는 민감한 디버그 로그를 숨깁니다.
 * 
 * @example
 * import { logger } from '../utils/logger';
 * logger.log('[Storage] Member loaded'); // DEV에서만 출력
 * logger.warn('[Security] Suspicious activity'); // 항상 출력
 * logger.error('[Error] Failed to load'); // 항상 출력
 */

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

export const logger = {
    /**
     * 개발 환경에서만 로그 출력
     */
    log: (...args) => {
        if (isDev) console.log(...args);
    },
    
    /**
     * 경고는 항상 출력 (보안 관련)
     */
    warn: (...args) => {
        console.warn(...args);
    },
    
    /**
     * 에러는 항상 출력
     */
    error: (...args) => {
        console.error(...args);
    },
    
    /**
     * 디버그용 (개발 환경에서만)
     */
    debug: (...args) => {
        if (isDev) console.debug(...args);
    },
    
    /**
     * 강제 로그 (환경 무관하게 출력)
     */
    force: (...args) => {
        console.log(...args);
    }
};

export default logger;
