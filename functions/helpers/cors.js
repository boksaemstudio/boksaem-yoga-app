/**
 * SaaS CORS 중앙화
 * 모든 Cloud Functions의 CORS 허용 목록을 한 곳에서 관리합니다.
 * 새 스튜디오 추가 시 이 파일만 수정하면 됩니다.
 * 
 * @module helpers/cors
 */

const STUDIO_HOSTS = {
    'boksaem-yoga': [
        'https://boksaem-yoga.web.app',
        'https://boksaem-yoga.firebaseapp.com'
    ],
    // 새 스튜디오 추가 시 여기에 추가:
    // 'new-studio': ['https://new-studio.web.app', 'https://new-studio.firebaseapp.com'],
};

const DEV_HOSTS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000'
];

/** 모든 스튜디오 + 개발 호스트를 포함한 CORS 허용 목록 */
const ALLOWED_ORIGINS = [
    ...Object.values(STUDIO_HOSTS).flat(),
    ...DEV_HOSTS
];

module.exports = { ALLOWED_ORIGINS, STUDIO_HOSTS, DEV_HOSTS };
