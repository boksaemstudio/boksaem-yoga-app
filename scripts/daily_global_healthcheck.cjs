#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  PassFlow AI — 글로벌 SEO & 마케팅 일일 헬스체크 스크립트     ║
 * ║  매일 1회 실행하여 12개국 랜딩 페이지의 건강 상태를 점검합니다   ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * 실행: node scripts/daily_global_healthcheck.cjs
 * 워크플로우: /daily-audit 에서 호출 가능
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── 설정 ──────────────────────────────────────────────
const BASE = 'https://passflowai.web.app';
const LANGS = [
  { code: 'ko', path: '/home.html',       label: '🇰🇷 한국어',     market: 'Korea' },
  { code: 'en', path: '/en/home.html',    label: '🇺🇸 English',    market: 'US/Global' },
  { code: 'ja', path: '/ja/home.html',    label: '🇯🇵 日本語',     market: 'Japan' },
  { code: 'zh', path: '/zh/home.html',    label: '🇨🇳 中文',       market: 'China' },
  { code: 'ru', path: '/ru/home.html',    label: '🇷🇺 Русский',   market: 'Russia' },
  { code: 'es', path: '/es/home.html',    label: '🇪🇸 Español',   market: 'Spain/LatAm' },
  { code: 'pt', path: '/pt/home.html',    label: '🇧🇷 Português', market: 'Brazil' },
  { code: 'fr', path: '/fr/home.html',    label: '🇫🇷 Français',  market: 'France' },
  { code: 'de', path: '/de/home.html',    label: '🇩🇪 Deutsch',   market: 'Germany' },
  { code: 'in', path: '/in/home.html',    label: '🇮🇳 India',     market: 'India' },
  { code: 'au', path: '/au/home.html',    label: '🇦🇺 Australia', market: 'Australia' },
  { code: 'ca', path: '/ca/home.html',    label: '🇨🇦 Canada',    market: 'Canada' },
];

const CRITICAL_PAGES = [
  '/sitemap.xml',
  '/robots.txt',
  '/privacy',
  '/features.html',
  '/en/vs-mindbody.html',
  '/en/vs-vagaro.html',
  '/en/vs-glofox.html',
  '/en/vs-zenplanner.html',
  '/onboarding',
];

const SEO_CHECKS = [
  { name: '<title> 태그', regex: /<title>(.+?)<\/title>/s },
  { name: 'meta description', regex: /<meta\s+name="description"\s+content="([^"]+)"/i },
  { name: 'og:title', regex: /<meta\s+property="og:title"\s+content="([^"]+)"/i },
  { name: 'og:description', regex: /<meta\s+property="og:description"\s+content="([^"]+)"/i },
  { name: 'canonical', regex: /<link\s+rel="canonical"\s+href="([^"]+)"/i },
  { name: 'hreflang (x-default)', regex: /hreflang="x-default"/i },
  { name: 'ld+json 구조화 데이터', regex: /application\/ld\+json/i },
  { name: 'GA4 (G-3D6011MNHF)', regex: /G-3D6011MNHF/i },
  { name: 'Google Ads (AW-)', regex: /AW-\d+/i },
];

// ─── HTTP 요청 유틸 ──────────────────────────────────────
function fetchUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const start = Date.now();
    const req = client.get(url, { timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          body,
          timeMs: Date.now() - start,
          ok: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });
    req.on('error', (e) => {
      resolve({ url, status: 0, body: '', timeMs: Date.now() - start, ok: false, error: e.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: 0, body: '', timeMs: Date.now() - start, ok: false, error: 'timeout' });
    });
  });
}

// ─── SEO 분석 ────────────────────────────────────────────
function analyzeSeo(html, lang) {
  const results = [];
  for (const check of SEO_CHECKS) {
    const match = html.match(check.regex);
    results.push({
      name: check.name,
      found: !!match,
      value: match ? (match[1] || '✓').substring(0, 80) : '❌ 누락',
    });
  }

  // 추가: title 길이 (50-60자 권장)
  const titleMatch = html.match(/<title>(.+?)<\/title>/s);
  if (titleMatch) {
    const len = titleMatch[1].length;
    if (len > 70) results.push({ name: 'title 길이 경고', found: false, value: `${len}자 (70자 초과 — 검색 결과에서 잘림)` });
  }

  // 추가: meta description 길이 (150-160자 권장)
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  if (descMatch) {
    const len = descMatch[1].length;
    if (len > 170) results.push({ name: 'description 길이 경고', found: false, value: `${len}자 (170자 초과)` });
    if (len < 80) results.push({ name: 'description 길이 경고', found: false, value: `${len}자 (80자 미만 — 너무 짧음)` });
  }

  // 추가: h1 태그 확인
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count === 0) results.push({ name: 'h1 태그', found: false, value: '❌ h1 태그 없음' });
  if (h1Count > 1) results.push({ name: 'h1 태그 중복', found: false, value: `⚠️ ${h1Count}개 (1개 권장)` });

  // 추가: 이미지 alt 태그 미검증 수
  const imgTotal = (html.match(/<img /gi) || []).length;
  const imgNoAlt = (html.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
  if (imgNoAlt > 0) results.push({ name: 'img alt 누락', found: false, value: `${imgNoAlt}/${imgTotal}개 이미지` });

  return results;
}

// ─── 콘텐츠 현지화 품질 체크 ─────────────────────────────
function checkLocalization(html, lang) {
  const issues = [];
  const koreanRegex = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/;
  
  if (lang.code !== 'ko') {
    // lang-dropdown 영역 제외하고 한국어 검사
    const cleaned = html.replace(/<div[^>]*(?:lang-dropdown|langDrop)[^>]*>[\s\S]*?<\/div>/gi, '');
    const bodyMatch = cleaned.match(/<body[\s\S]*<\/body>/i);
    if (bodyMatch) {
      // script 태그 제거
      const noScript = bodyMatch[0].replace(/<script[\s\S]*?<\/script>/gi, '');
      // 태그 제거
      const textOnly = noScript.replace(/<[^>]+>/g, ' ');
      if (koreanRegex.test(textOnly)) {
        // 어디에 있는지 찾기
        const lines = textOnly.split('\n');
        for (const line of lines) {
          if (koreanRegex.test(line) && line.trim().length > 2) {
            issues.push(`본문에 한국어 혼입: "${line.trim().substring(0, 40)}..."`);
            break;
          }
        }
      }
    }
  }
  
  // html lang 속성 확인
  const langAttr = html.match(/<html\s+lang="([^"]+)"/i);
  if (langAttr) {
    const expectedLangs = { ko: 'ko', en: 'en', ja: 'ja', zh: 'zh', ru: 'ru', es: 'es', pt: 'pt', fr: 'fr', de: 'de', in: 'en', au: 'en', ca: 'en' };
    if (!langAttr[1].startsWith(expectedLangs[lang.code] || lang.code)) {
      issues.push(`html lang="${langAttr[1]}" — "${expectedLangs[lang.code]}"이어야 함`);
    }
  }

  return issues;
}

// ─── 성능 등급 판정 ──────────────────────────────────────
function gradeSpeed(ms) {
  if (ms < 500) return '🟢 빠름';
  if (ms < 1500) return '🟡 보통';
  return '🔴 느림';
}

// ─── 메인 실행 ───────────────────────────────────────────
async function main() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('ko-KR', { hour12: false });
  
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   PassFlow AI — 글로벌 SEO & 마케팅 일일 헬스체크          ║');
  console.log(`║   ${dateStr} ${timeStr}                                    ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  let report = `# PassFlow AI 글로벌 헬스체크 보고서\n`;
  report += `> 점검 시각: ${dateStr} ${timeStr} KST\n\n`;

  // ── Phase 1: 핵심 인프라 점검 ──
  console.log('━━━ Phase 1: 핵심 인프라 점검 ━━━');
  report += `## Phase 1: 핵심 인프라\n\n`;
  report += `| 페이지 | 상태 | 응답시간 |\n|---|---|---|\n`;
  
  for (const pagePath of CRITICAL_PAGES) {
    const res = await fetchUrl(BASE + pagePath);
    const icon = res.ok ? '✅' : '❌';
    const speed = gradeSpeed(res.timeMs);
    console.log(`  ${icon} ${pagePath} — ${res.status} (${res.timeMs}ms) ${speed}`);
    report += `| \`${pagePath}\` | ${icon} ${res.status} | ${res.timeMs}ms ${speed} |\n`;
  }
  report += `\n`;

  // ── Phase 2: 12개국 랜딩 페이지 SEO 점검 ──
  console.log('');
  console.log('━━━ Phase 2: 12개국 랜딩 페이지 SEO 전수점검 ━━━');
  report += `## Phase 2: 언어별 SEO 점검\n\n`;

  let totalIssues = 0;
  const langSummaries = [];

  for (const lang of LANGS) {
    const url = BASE + lang.path;
    const res = await fetchUrl(url);
    
    console.log(`\n  ${lang.label} (${lang.market})`);
    console.log(`    URL: ${url}`);
    console.log(`    상태: ${res.ok ? '✅' : '❌'} ${res.status} | ${res.timeMs}ms ${gradeSpeed(res.timeMs)}`);
    
    report += `### ${lang.label} — ${lang.market}\n`;
    report += `- URL: \`${lang.path}\`\n`;
    report += `- 상태: ${res.ok ? '✅' : '❌'} ${res.status} | ${res.timeMs}ms\n`;

    if (!res.ok) {
      console.log(`    ❌ 접속 불가!`);
      report += `- **❌ 접속 불가!**\n\n`;
      totalIssues++;
      langSummaries.push({ lang: lang.label, issues: 1, grade: '❌' });
      continue;
    }

    // SEO 분석
    const seoResults = analyzeSeo(res.body, lang);
    const seoIssues = seoResults.filter(r => !r.found);
    
    for (const r of seoResults) {
      const icon = r.found ? '  ✓' : '  ✗';
      if (!r.found) console.log(`    ${icon} ${r.name}: ${r.value}`);
    }
    if (seoIssues.length === 0) console.log('    ✓ SEO 항목 모두 정상');
    
    // 현지화 체크
    const locIssues = checkLocalization(res.body, lang);
    for (const issue of locIssues) {
      console.log(`    ⚠️ ${issue}`);
    }

    const langIssueCount = seoIssues.length + locIssues.length;
    totalIssues += langIssueCount;
    
    if (seoIssues.length > 0) {
      report += `- SEO 문제:\n`;
      for (const r of seoIssues) report += `  - ${r.name}: ${r.value}\n`;
    }
    if (locIssues.length > 0) {
      report += `- 현지화 문제:\n`;
      for (const issue of locIssues) report += `  - ${issue}\n`;
    }
    if (langIssueCount === 0) report += `- ✅ 모든 항목 정상\n`;
    report += `\n`;

    langSummaries.push({
      lang: lang.label,
      issues: langIssueCount,
      grade: langIssueCount === 0 ? '🟢' : langIssueCount <= 2 ? '🟡' : '🔴',
      speedMs: res.timeMs,
    });
  }

  // ── Phase 3: 사이트맵 무결성 검증 ──
  console.log('');
  console.log('━━━ Phase 3: 사이트맵/robots.txt 무결성 ━━━');
  report += `## Phase 3: 사이트맵 무결성\n\n`;
  
  const sitemapRes = await fetchUrl(BASE + '/sitemap.xml');
  if (sitemapRes.ok) {
    const urlCount = (sitemapRes.body.match(/<loc>/g) || []).length;
    const hasHreflang = sitemapRes.body.includes('hreflang');
    console.log(`  ✅ sitemap.xml 정상 — ${urlCount}개 URL, hreflang: ${hasHreflang ? '있음' : '없음'}`);
    report += `- sitemap.xml: ✅ ${urlCount}개 URL, hreflang ${hasHreflang ? '✅' : '❌'}\n`;
    
    // 모든 랜딩 페이지가 사이트맵에 있는지 확인
    for (const lang of LANGS) {
      const fullUrl = BASE + lang.path;
      if (!sitemapRes.body.includes(fullUrl)) {
        console.log(`  ⚠️ 사이트맵에 누락: ${fullUrl}`);
        report += `- ⚠️ 사이트맵 누락: \`${lang.path}\`\n`;
        totalIssues++;
      }
    }
  } else {
    console.log(`  ❌ sitemap.xml 접속 불가!`);
    report += `- ❌ sitemap.xml 접속 불가!\n`;
    totalIssues++;
  }
  report += `\n`;

  // ── 최종 요약 ──
  console.log('');
  console.log('━━━ 최종 요약 ━━━');
  console.log(`  점검 페이지: ${LANGS.length + CRITICAL_PAGES.length}개`);
  console.log(`  발견 이슈: ${totalIssues}건`);
  console.log('');
  console.log('  언어별 등급:');
  for (const s of langSummaries) {
    console.log(`    ${s.grade} ${s.lang} — 이슈 ${s.issues}건 (${s.speedMs}ms)`);
  }

  report += `## 최종 요약\n\n`;
  report += `| 언어 | 등급 | 이슈 | 응답속도 |\n|---|---|---|---|\n`;
  for (const s of langSummaries) {
    report += `| ${s.lang} | ${s.grade} | ${s.issues}건 | ${s.speedMs}ms |\n`;
  }
  report += `\n**총 이슈: ${totalIssues}건**\n`;

  // 보고서 파일 저장
  const reportDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `healthcheck_${dateStr}.md`);
  fs.writeFileSync(reportPath, report, 'utf8');
  
  console.log('');
  console.log(`  📄 보고서 저장: reports/healthcheck_${dateStr}.md`);
  console.log('');

  // 이슈가 있으면 exit code 1
  if (totalIssues > 0) {
    console.log(`  ⚠️ ${totalIssues}건의 이슈가 발견되었습니다. 보고서를 확인하세요.`);
    process.exit(1);
  } else {
    console.log('  ✅ 모든 점검 항목 정상!');
    process.exit(0);
  }
}

main().catch(e => {
  console.error('헬스체크 스크립트 오류:', e);
  process.exit(2);
});
