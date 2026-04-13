const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// ──────────────────────────────────────────────────────────────
// [SaaS] 동적 SSR 엔진 — HTML 메타태그 + PWA 매니페스트 + 파비콘
// 모든 테넌트(스튜디오)가 관리자 설정 기반으로 완전히 독립된
// 브랜딩 아이덴티티를 갖도록 하는 SaaS의 심장부입니다.
// ──────────────────────────────────────────────────────────────

// 인메모리 캐시를 통한 HTML 로딩 최적화
let baseHtml = null;

// ──────────────────────────────────────────────────────────────
// [SaaS] 도메인 → 스튜디오ID 해석 (SSR + Manifest + Favicon 공통)
// ──────────────────────────────────────────────────────────────
function resolveStudioIdFromHost(host) {
    if (host.includes('passflowai') || host.includes('demo')) {
        return 'demo-yoga';
    } else if (host.includes('ssangmun')) {
        return 'ssangmun-yoga';
    } else if (host.includes('boksaem')) {
        return 'boksaem-yoga';
    } else {
        // [SaaS 확장성] xxx.passflow.co.kr 형태로 무한 확장 대비
        const parts = host.split('.');
        if (parts.length >= 3 && parts[0] !== 'www') {
            return parts[0];
        }
        return 'boksaem-yoga'; // 기본값
    }
}

// ──────────────────────────────────────────────────────────────
// [SaaS] 스튜디오 Config 캐시 (1분 TTL) — Firestore 과다 호출 방지
// ──────────────────────────────────────────────────────────────
const configCache = {};
const CONFIG_TTL_MS = 60 * 1000; // 1분

async function getStudioConfig(studioId) {
    const now = Date.now();
    const cached = configCache[studioId];
    if (cached && (now - cached.timestamp) < CONFIG_TTL_MS) {
        return cached.data;
    }
    
    try {
        // [ROOT FIX] 클라이언트(StudioContext.jsx L41)가 studios/{studioId} 루트 문서에 저장하므로
        // 동일한 경로에서 읽어야 합니다. config/main은 존재하지 않는 경로였습니다!
        const docSnap = await admin.firestore().doc(`studios/${studioId}`).get();
        const config = docSnap.exists ? docSnap.data() : {};
        configCache[studioId] = { data: config, timestamp: now };
        return config;
    } catch (error) {
        console.error(`[SSR] Config fetch failed for ${studioId}:`, error);
        return cached?.data || {};
    }
}

// ──────────────────────────────────────────────────────────────
// [SaaS] PWA 역할별 매니페스트 동적 생성
// 각 스튜디오의 관리자 설정(로고, 이름, 테마색)이 
// 홈 화면 아이콘 + 앱 이름에 100% 동적 반영됩니다.
// ──────────────────────────────────────────────────────────────
function generateManifest(config, roleType) {
    const studioName = config.IDENTITY?.NAME || '요가 스튜디오';
    const logoUrl = config.IDENTITY?.LOGO_URL || '/logo_circle.png';
    const themeColor = config.THEME?.PRIMARY_COLOR || '#D4AF37';
    const gcmSenderId = "103953800507";
    
    // 역할별 앱 이름, 시작 URL, 표시 모드 정의
    const roleConfig = {
        admin: {
            name: `${studioName} 관리자`,
            shortName: '관리자',
            description: `${studioName} 관리자 대시보드`,
            startUrl: '/admin',
            scope: '/admin',
            display: 'standalone',
            orientation: 'portrait'
        },
        member: {
            name: `${studioName}`,
            shortName: studioName.length > 6 ? studioName.substring(0, 6) : studioName,
            description: `${studioName} 회원 전용 서비스`,
            startUrl: '/member',
            scope: '/member',
            display: 'standalone',
            orientation: 'portrait'
        },
        instructor: {
            name: `${studioName} 선생님`,
            shortName: '선생님',
            description: `${studioName} 강사 전용 시스템`,
            startUrl: '/instructor',
            scope: '/instructor',
            display: 'standalone',
            orientation: 'portrait'
        },
        checkin: {
            name: `${studioName} 출석체크`,
            shortName: '출석체크',
            description: `${studioName} 출석체크 대시보드`,
            startUrl: '/checkin',
            scope: '/checkin',
            display: 'fullscreen',
            orientation: 'landscape'
        },
        landing: {
            name: `PassFlow AI | ${studioName}`,
            shortName: 'PassFlow',
            description: '스마트 출석·운영 기록 시스템',
            startUrl: '/',
            scope: '/',
            display: 'standalone',
            orientation: 'portrait'
        }
    };
    
    const role = roleConfig[roleType] || roleConfig.landing;
    
    // [핵심] icons src에 스튜디오 로고 URL 직접 삽입
    // Firebase Storage URL이든 로컬 경로든 그대로 사용
    const icons = [
        {
            src: logoUrl,
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
        },
        {
            src: logoUrl,
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
        },
        {
            src: logoUrl,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
        }
    ];
    
    return {
        name: role.name,
        short_name: role.shortName,
        description: role.description,
        start_url: role.startUrl,
        gcm_sender_id: gcmSenderId,
        scope: role.scope,
        display: role.display,
        background_color: "#000000",
        theme_color: themeColor,
        orientation: role.orientation,
        icons
    };
}

// ──────────────────────────────────────────────────────────────
// [SaaS] URL 경로 → 역할 타입 해석
// ──────────────────────────────────────────────────────────────
function resolveRoleFromPath(requestPath) {
    // [안전장치] manifest JSON 파일 요청만 매칭 — 일반 HTML/JS 요청 오탐 방지
    if (requestPath.endsWith('.json') || requestPath.includes('manifest')) {
        if (requestPath.includes('manifest-admin')) return 'admin';
        if (requestPath.includes('manifest-member')) return 'member';
        if (requestPath.includes('manifest-instructor')) return 'instructor';
        if (requestPath.includes('manifest-checkin')) return 'checkin';
        // /manifest.json 범용 요청 → 기본값 landing
        return 'landing';
    }
    
    // 일반 HTML 경로 해석용
    if (requestPath.startsWith('/admin')) return 'admin';
    if (requestPath.startsWith('/member')) return 'member';
    if (requestPath.startsWith('/instructor')) return 'instructor';
    if (requestPath.startsWith('/checkin')) return 'checkin';
    
    return 'landing';
}

// ──────────────────────────────────────────────────────────────
// 메인 Cloud Function
// ──────────────────────────────────────────────────────────────
exports.serveDynamicSaaS = onRequest(
    {
        region: "asia-northeast3",
        maxInstances: 20
    },
    async (req, res) => {
        const host = req.hostname;
        const studioId = resolveStudioIdFromHost(host);
        const requestPath = req.path;

        try {
            const config = await getStudioConfig(studioId);

            // [FIX] 데모 사이트 오버라이드를 제거하여 사용자가 관리자 화면에서 변경한 내용이 그대로 OG에 반영되도록 수정.

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // [Route 1] PWA 매니페스트 요청 → 동적 JSON 응답
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            if (requestPath.endsWith('.json') || requestPath.includes('manifest')) {
                const roleType = resolveRoleFromPath(requestPath);
                const manifest = generateManifest(config, roleType);
                res.set('Content-Type', 'application/manifest+json');
                res.set('Cache-Control', 'public, max-age=60, s-maxage=600');
                res.set('Access-Control-Allow-Origin', '*');
                return res.status(200).json(manifest);
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // [Route 2] HTML 페이지 요청 → 동적 메타태그 치환
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            const studioName = config.IDENTITY?.NAME || '요가 스튜디오';
            const desc = config.IDENTITY?.DESCRIPTION || '스마트 출석·운영 기록 시스템';
            let logoUrl = config.IDENTITY?.LOGO_URL || '/assets/passflow_square_logo.png';
            
            // [ROOT FIX] 카카오톡 등 소셜 크롤러는 상대경로(/) OG 이미지를 인식하지 못합니다. 무조건 절대 경로(https://...)로 변환.
            if (logoUrl.startsWith('/')) {
                logoUrl = `https://${host}${logoUrl}`;
            }
            
            const themeColor = config.THEME?.PRIMARY_COLOR || '#D4AF37';
            
            // 역할에 따른 Title 설정
            const htmlRole = resolveRoleFromPath(requestPath);
            let displayTitle = studioName;
            if (htmlRole === 'admin') displayTitle = `${studioName} 관리자`;
            if (htmlRole === 'instructor') displayTitle = `${studioName} 선생님`;
            if (htmlRole === 'checkin') displayTitle = `${studioName} 출석체크`;

            // HTML 원본 로드
            if (!baseHtml) {
                const htmlPath = path.join(__dirname, '../app.html');
                if (fs.existsSync(htmlPath)) {
                    baseHtml = fs.readFileSync(htmlPath, 'utf8');
                } else {
                    baseHtml = `<!DOCTYPE html><html lang="ko"><head><title>${displayTitle}</title><meta property="og:image" content="${logoUrl}"></head><body><script>window.location.reload();</script></body></html>`;
                }
            }

            // ── OG 메타태그 치환 (카카오톡/페이스북 크롤러 완벽 대응) ──
            // 관리자가 설정한 로고 하나가 파비콘, PWA, 카카오톡 미리보기에 모두 동일하게 적용
            let finalHtml = baseHtml
                .replace(/<title>.*?<\/title>/gi, `<title>${displayTitle}</title>`)
                .replace(/<meta property="og:title" content=".*?">/gi, `<meta property="og:title" content="${displayTitle}">`)
                .replace(/<meta property="og:site_name" content=".*?">/gi, `<meta property="og:site_name" content="${studioName}">`)
                .replace(/<meta property="og:description" content=".*?">/gi, `<meta property="og:description" content="${desc}">`)
                .replace(/<meta name="description" content=".*?">/gi, `<meta name="description" content="${desc}">`)
                .replace(/<meta property="og:image" content=".*?">/gi, `<meta property="og:image" content="${logoUrl}">\n  <meta property="og:image:width" content="512">\n  <meta property="og:image:height" content="512">\n  <meta property="og:image:alt" content="${studioName}">\n  <meta name="twitter:card" content="summary">\n  <meta name="twitter:title" content="${displayTitle}">\n  <meta name="twitter:description" content="${desc}">\n  <meta name="twitter:image" content="${logoUrl}">\n  <meta itemprop="image" content="${logoUrl}">`);

            // ── [ROOT FIX] 파비콘 + apple-touch-icon 동적 치환 ──
            // 각 스튜디오의 관리자 설정 로고가 브라우저 탭 아이콘에 반영
            finalHtml = finalHtml
                .replace(/<link rel="icon"[^>]*>/gi, `<link rel="icon" type="image/png" href="${logoUrl}">`)
                .replace(/<link rel="apple-touch-icon"[^>]*>/gi, `<link rel="apple-touch-icon" href="${logoUrl}">`);

            // ── [ROOT FIX] iOS 홈 화면 이름 동적 치환 ──
            // index.html의 JS를 제거하고 SSR에서 주입 (iOS PWA 지원)
            if (!finalHtml.includes('apple-mobile-web-app-title')) {
                finalHtml = finalHtml.replace('</head>', `  <meta name="apple-mobile-web-app-title" content="${displayTitle}">\n</head>`);
            }

            // ── [ROOT FIX] theme-color 동적 치환 ──
            finalHtml = finalHtml
                .replace(/<meta name="theme-color" content=".*?">/gi, `<meta name="theme-color" content="${themeColor}">`);

            // CDN 엣지 캐싱
            res.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
            res.status(200).send(finalHtml);

        } catch (error) {
            console.error(`[SSR] 동적 메타태그 생성 중 오류 발생 (${studioId}):`, error);
            if (baseHtml) {
               res.set('Cache-Control', 'public, max-age=60');
               res.status(200).send(baseHtml);
            } else {
               res.status(500).send("서버 일시 오류. 잠시 후 다시 시도해주세요.");
            }
        }
    }
);
