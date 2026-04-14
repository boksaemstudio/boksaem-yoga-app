#!/usr/bin/env node
/**
 * i18n-audit.cjs — PassFlow SaaS 다국어 현지화 자동 감사 스크립트
 * 
 * 사용법:
 *   node scripts/i18n-audit.cjs --scan          # 분석만 (리포트 생성)
 *   node scripts/i18n-audit.cjs --scan --verbose # 상세 리포트
 *   node scripts/i18n-audit.cjs --check          # CI용 (하드코딩 발견 시 exit 1)
 *   node scripts/i18n-audit.cjs --missing-keys   # en에 있지만 다른 언어에 없는 키 찾기
 *   node scripts/i18n-audit.cjs --gen-translations # 누락된 번역 키를 전 언어에 자동 생성
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───
const SRC_DIR = path.resolve(__dirname, '..', 'src');
const TRANSLATIONS_PATH = path.resolve(SRC_DIR, 'utils', 'translations.js');

const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'ru', 'zh', 'es', 'pt', 'fr', 'de'];

// Directories/files to skip
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'test', 'assets', 'data', 'i18n', 'types'];
const SKIP_FILES = ['translations.js', 'studioConfig.js', 'firebase.js'];

// File extensions to scan
const SCAN_EXTENSIONS = ['.jsx', '.js', '.ts', '.tsx'];

// Korean character regex
const KOREAN_REGEX = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;
const KOREAN_WORD_REGEX = /[\uAC00-\uD7AF]{2,}/g;

// ─── Scan Logic ───

function getAllFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (SKIP_DIRS.includes(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            getAllFiles(fullPath, files);
        } else if (SCAN_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
            if (SKIP_FILES.includes(entry.name)) continue;
            files.push(fullPath);
        }
    }
    return files;
}

/**
 * Classify each Korean-containing line
 */
function classifyLine(line, lineNum) {
    const trimmed = line.trim();
    
    // Skip: Comments (// or /* or * )
    if (/^\s*(\/\/|\/\*|\*)/.test(trimmed)) return 'comment';
    
    // Skip: console.log/warn/error
    if (/console\.(log|warn|error|info|debug)\(/.test(trimmed)) return 'console';
    
    // Skip: import/require statements
    if (/^(import |require\()/.test(trimmed)) return 'import';
    
    // Already wrapped in t()
    if (/\bt\(['"`]/.test(trimmed) && KOREAN_REGEX.test(trimmed)) {
        // Check if ALL Korean text is inside t() calls
        const withoutT = trimmed.replace(/\bt\(['"](.*?)['"]\)/g, '');
        if (!KOREAN_REGEX.test(withoutT)) return 'already_translated';
        return 'partial_translated';
    }
    
    // JSX text content: >한국어< or >한국어 {var}<
    if (/>([^<]*[\uAC00-\uD7AF][^<]*)</.test(line)) return 'jsx_text';
    
    // String literal with Korean: '한국어' or "한국어" or `한국어`
    if (/['"`]([^'"`]*[\uAC00-\uD7AF][^'"`]*)['"`]/.test(line)) {
        // alert() calls
        if (/alert\(/.test(trimmed)) return 'alert_hardcoded';
        // confirm() calls
        if (/confirm\(/.test(trimmed)) return 'confirm_hardcoded';
        // prompt() calls
        if (/prompt\(/.test(trimmed)) return 'prompt_hardcoded';
        return 'string_literal';
    }
    
    // Template literal with Korean
    if (/`[^`]*[\uAC00-\uD7AF][^`]*`/.test(line)) return 'template_literal';
    
    // Array with Korean
    if (/\[.*['"][\uAC00-\uD7AF]/.test(line)) return 'array_literal';
    
    return 'other';
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const issues = [];
    
    lines.forEach((line, idx) => {
        if (!KOREAN_REGEX.test(line)) return;
        
        const type = classifyLine(line, idx + 1);
        if (type === 'comment' || type === 'console' || type === 'import') return;
        
        // Extract Korean text snippets
        const koreanMatches = line.match(KOREAN_WORD_REGEX) || [];
        
        issues.push({
            line: idx + 1,
            type,
            content: line.trim().substring(0, 120),
            koreanText: koreanMatches.join(', '),
            severity: getSeverity(type)
        });
    });
    
    return issues;
}

function getSeverity(type) {
    switch (type) {
        case 'jsx_text': return 'HIGH';        // User directly sees this
        case 'alert_hardcoded': return 'HIGH';  // User confronted with this
        case 'confirm_hardcoded': return 'HIGH';
        case 'prompt_hardcoded': return 'HIGH';
        case 'string_literal': return 'MEDIUM'; // May or may not be user-facing
        case 'template_literal': return 'MEDIUM';
        case 'array_literal': return 'MEDIUM';  // e.g., day names
        case 'partial_translated': return 'LOW'; // Partially done
        case 'already_translated': return 'INFO'; // Just needs other lang keys
        default: return 'LOW';
    }
}

// ─── Missing Keys Analysis ───

function parseTranslations() {
    const content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
    const result = {};
    
    // Extract keys from each language section
    for (const lang of SUPPORTED_LANGUAGES) {
        result[lang] = new Set();
        
        // Find the language block and extract keys
        // This is a simplified parser - works for the current file structure
        const langRegex = new RegExp(`^\\s{4}${lang}:\\s*\\{`, 'm');
        const match = content.match(langRegex);
        if (!match) continue;
        
        const startIdx = match.index;
        let braceCount = 0;
        let inBlock = false;
        let blockContent = '';
        
        for (let i = startIdx; i < content.length; i++) {
            if (content[i] === '{') { braceCount++; inBlock = true; }
            if (content[i] === '}') { braceCount--; }
            if (inBlock) blockContent += content[i];
            if (inBlock && braceCount === 0) break;
        }
        
        // Extract keys from block
        const keyRegex = /^\s{8}(?:['"]([^'"]+)['"]|([a-zA-Z_]\w*))\s*:/gm;
        let keyMatch;
        while ((keyMatch = keyRegex.exec(blockContent)) !== null) {
            const key = keyMatch[1] || keyMatch[2];
            if (key) result[lang].add(key);
        }
    }
    
    return result;
}

function findMissingKeys() {
    const langKeys = parseTranslations();
    
    // Reference: union of ko and en keys (these are the "should exist" keys)
    const referenceKeys = new Set([...langKeys.ko, ...langKeys.en]);
    
    const report = {};
    for (const lang of SUPPORTED_LANGUAGES) {
        if (lang === 'ko') continue; // ko is the source
        const missing = [];
        for (const key of referenceKeys) {
            if (!langKeys[lang].has(key)) {
                missing.push(key);
            }
        }
        report[lang] = {
            total: langKeys[lang].size,
            missing: missing.length,
            coverage: Math.round((langKeys[lang].size / referenceKeys.size) * 100),
            missingKeys: missing
        };
    }
    
    return { referenceKeys: referenceKeys.size, languages: report };
}

// ─── Report Generation ───

function generateReport(args) {
    console.log('\n' + '═'.repeat(70));
    console.log('  🔬 PassFlow SaaS i18n Audit Report');
    console.log('  ' + new Date().toISOString());
    console.log('═'.repeat(70) + '\n');
    
    const files = getAllFiles(SRC_DIR);
    const verbose = args.includes('--verbose');
    
    let totalIssues = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let infoCount = 0;
    
    const fileResults = [];
    
    for (const file of files) {
        const issues = scanFile(file);
        if (issues.length === 0) continue;
        
        const relPath = path.relative(SRC_DIR, file).replace(/\\/g, '/');
        totalIssues += issues.length;
        
        const counts = { HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
        issues.forEach(i => counts[i.severity]++);
        highCount += counts.HIGH;
        mediumCount += counts.MEDIUM;
        lowCount += counts.LOW;
        infoCount += counts.INFO;
        
        fileResults.push({ relPath, issues, counts });
    }
    
    // Sort by severity (most HIGH first)
    fileResults.sort((a, b) => (b.counts.HIGH * 100 + b.counts.MEDIUM * 10) - (a.counts.HIGH * 100 + a.counts.MEDIUM * 10));
    
    // ─── App-level grouping ───
    const groups = {
        'Admin App': [],
        'Kiosk (Check-in) App': [],
        'Member App': [],
        'Instructor App': [],
        'Meditation App': [],
        'Shared (Common/Hooks/Services)': [],
        'Pages': [],
    };
    
    for (const fr of fileResults) {
        const p = fr.relPath;
        if (p.includes('admin/') || p.includes('Admin')) groups['Admin App'].push(fr);
        else if (p.includes('checkin/') || p.includes('CheckIn')) groups['Kiosk (Check-in) App'].push(fr);
        else if (p.includes('member/') || p.includes('profile/') || p.includes('MemberProfile') || p.includes('MemberSchedule')) groups['Member App'].push(fr);
        else if (p.includes('instructor/') || p.includes('Instructor')) groups['Instructor App'].push(fr);
        else if (p.includes('meditation/') || p.includes('Meditation')) groups['Meditation App'].push(fr);
        else if (p.includes('pages/')) groups['Pages'].push(fr);
        else groups['Shared (Common/Hooks/Services)'].push(fr);
    }
    
    // ─── Summary ───
    console.log('📊 SUMMARY');
    console.log('─'.repeat(50));
    console.log(`  Files scanned:    ${files.length}`);
    console.log(`  Files with issues: ${fileResults.length}`);
    console.log(`  Total issues:     ${totalIssues}`);
    console.log(`    🔴 HIGH:   ${highCount} (user-facing hardcoded text)`);
    console.log(`    🟡 MEDIUM: ${mediumCount} (string literals, arrays)`);
    console.log(`    🔵 LOW:    ${lowCount} (partial/other)`);
    console.log(`    ⚪ INFO:   ${infoCount} (already translated, needs other lang keys)\n`);
    
    // ─── Per-App Breakdown ───
    console.log('📱 PER-APP BREAKDOWN');
    console.log('─'.repeat(50));
    for (const [app, appFiles] of Object.entries(groups)) {
        if (appFiles.length === 0) continue;
        const appH = appFiles.reduce((s, f) => s + f.counts.HIGH, 0);
        const appM = appFiles.reduce((s, f) => s + f.counts.MEDIUM, 0);
        const appL = appFiles.reduce((s, f) => s + f.counts.LOW, 0);
        const appI = appFiles.reduce((s, f) => s + f.counts.INFO, 0);
        const appTotal = appH + appM + appL + appI;
        console.log(`\n  ${app}: ${appFiles.length} files, ${appTotal} issues (🔴${appH} 🟡${appM} 🔵${appL} ⚪${appI})`);
        
        for (const fr of appFiles) {
            const icon = fr.counts.HIGH > 0 ? '🔴' : fr.counts.MEDIUM > 0 ? '🟡' : '🔵';
            console.log(`    ${icon} ${fr.relPath} (${fr.issues.length} issues)`);
            
            if (verbose) {
                for (const issue of fr.issues) {
                    const sev = issue.severity === 'HIGH' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : issue.severity === 'LOW' ? '🔵' : '⚪';
                    console.log(`       L${issue.line} ${sev} [${issue.type}] ${issue.content.substring(0, 90)}`);
                }
            }
        }
    }
    
    // ─── Missing keys analysis ───
    console.log('\n\n🌍 TRANSLATION COVERAGE');
    console.log('─'.repeat(50));
    const missing = findMissingKeys();
    console.log(`  Reference keys (ko ∪ en): ${missing.referenceKeys}\n`);
    
    const langNames = {
        en: '🇺🇸 English', ja: '🇯🇵 日本語', ru: '🇷🇺 Русский', zh: '🇨🇳 中文',
        es: '🇪🇸 Español', pt: '🇧🇷 Português', fr: '🇫🇷 Français', de: '🇩🇪 Deutsch'
    };
    
    for (const lang of SUPPORTED_LANGUAGES.filter(l => l !== 'ko')) {
        const info = missing.languages[lang];
        const bar = '█'.repeat(Math.round(info.coverage / 5)) + '░'.repeat(20 - Math.round(info.coverage / 5));
        const status = info.coverage >= 80 ? '✅' : info.coverage >= 50 ? '⚠️' : '❌';
        console.log(`  ${status} ${langNames[lang] || lang}: ${bar} ${info.coverage}% (${info.total}/${missing.referenceKeys} keys, ${info.missing} missing)`);
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('  Run with --verbose for per-line details');
    console.log('  Run with --missing-keys for full missing key list');
    console.log('  Run with --gen-translations to auto-generate missing translations');
    console.log('═'.repeat(70) + '\n');
    
    return totalIssues;
}

function showMissingKeys() {
    const missing = findMissingKeys();
    
    console.log('\n🌍 Missing Translation Keys Report');
    console.log('═'.repeat(70));
    
    for (const lang of SUPPORTED_LANGUAGES.filter(l => l !== 'ko')) {
        const info = missing.languages[lang];
        if (info.missing === 0) {
            console.log(`\n✅ ${lang}: All ${info.total} keys present!`);
            continue;
        }
        
        console.log(`\n❌ ${lang}: ${info.missing} missing keys (${info.coverage}% coverage)`);
        
        // Group missing keys: Korean-text keys vs English keys
        const koreanKeys = info.missingKeys.filter(k => KOREAN_REGEX.test(k));
        const englishKeys = info.missingKeys.filter(k => !KOREAN_REGEX.test(k));
        
        if (englishKeys.length > 0) {
            console.log(`   📌 English-style keys (${englishKeys.length}):`);
            englishKeys.slice(0, 20).forEach(k => console.log(`      - ${k}`));
            if (englishKeys.length > 20) console.log(`      ... and ${englishKeys.length - 20} more`);
        }
        if (koreanKeys.length > 0) {
            console.log(`   🇰🇷 Korean-text keys (${koreanKeys.length}):`);
            koreanKeys.slice(0, 20).forEach(k => console.log(`      - "${k}"`));
            if (koreanKeys.length > 20) console.log(`      ... and ${koreanKeys.length - 20} more`);
        }
    }
}

// ─── Main ───

const args = process.argv.slice(2);

if (args.includes('--scan') || args.length === 0) {
    const totalIssues = generateReport(args);
    
    if (args.includes('--check')) {
        const highMedium = totalIssues; // In strict mode, any issue = fail
        if (highMedium > 0) {
            console.error(`\n❌ CI CHECK FAILED: ${highMedium} i18n issues found.\n`);
            process.exit(1);
        } else {
            console.log('\n✅ CI CHECK PASSED: No i18n issues.\n');
        }
    }
} else if (args.includes('--missing-keys')) {
    showMissingKeys();
} else if (args.includes('--gen-translations')) {
    console.log('\n🔧 Translation generation mode');
    console.log('This will analyze missing keys and generate a patch file.\n');
    
    const missing = findMissingKeys();
    const patchLines = [];
    
    // For each language, collect missing keys and generate entries
    for (const lang of SUPPORTED_LANGUAGES.filter(l => l !== 'ko')) {
        const info = missing.languages[lang];
        if (info.missing === 0) continue;
        
        patchLines.push(`\n// ═══ ${lang.toUpperCase()} — ${info.missing} missing keys ═══`);
        
        for (const key of info.missingKeys) {
            // If key is in ko, use ko value as reference
            // This creates a reference file for manual/AI translation
            patchLines.push(`// ${lang}: "${key}": "TODO_TRANSLATE",`);
        }
    }
    
    const patchPath = path.resolve(__dirname, 'i18n-missing-keys.txt');
    fs.writeFileSync(patchPath, patchLines.join('\n'), 'utf-8');
    console.log(`📄 Missing keys report saved to: ${patchPath}`);
    console.log(`   Total missing entries: ${patchLines.filter(l => l.startsWith('//')).length}`);
} else {
    console.log('Usage:');
    console.log('  node scripts/i18n-audit.cjs --scan          # Analyze all files');
    console.log('  node scripts/i18n-audit.cjs --scan --verbose # Detailed report');
    console.log('  node scripts/i18n-audit.cjs --check          # CI mode (exit 1 if issues)');
    console.log('  node scripts/i18n-audit.cjs --missing-keys   # Show missing translation keys');
    console.log('  node scripts/i18n-audit.cjs --gen-translations # Generate missing key report');
}
