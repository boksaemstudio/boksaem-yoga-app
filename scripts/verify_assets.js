/**
 * 복샘요가 앱 자산(Assets) 무결성 검증 스크립트
 * 
 * 1. src 디렉토리 내의 모든 파일을 스캔하여 이미지 참조를 찾습니다.
 * 2. public 디렉토리에 해당 이미지가 실제로 존재하는지 확인합니다.
 * 3. 누락된 자산이 있으면 보고합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const publicDir = path.join(projectRoot, 'public');

const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'];
const assetReferences = new Set();
const missingAssets = [];

// 파일 재귀 탐색 함수
function scanDirectory(directory) {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else {
            // 소스 코드 파일만 분석 (.js, .jsx, .css, .json 등)
            if (['.js', '.jsx', '.css', '.json'].includes(path.extname(file))) {
                analyzeFile(fullPath);
            }
        }
    }
}

// 파일 내용 분석하여 에셋 참조 추출
function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // 정규식: 따옴표로 묶인 문자열 중 이미지 확장자로 끝나는 것 찾기
    // 예: "/images/logo.png", "bg-yoga.jpg"
    const regex = /['"`]([^'"`\n\r]*\.(png|jpg|jpeg|gif|svg|webp|ico))['"`]/gi;

    let match;
    while ((match = regex.exec(content)) !== null) {
        let assetPath = match[1];

        // URL이나 data URI는 제외
        if (assetPath.startsWith('http') || assetPath.startsWith('data:')) continue;

        // 쿼리 파라미터 제외 (?v=1 등)
        assetPath = assetPath.split('?')[0];

        // 상대 경로 처리 (단순화: 일단 파일명 위주로 매칭하거나, 절대 경로인 경우 public 기준 체크)
        if (assetPath.startsWith('/')) {
            assetReferences.add(assetPath);
        } else {
            // 상대 경로인 경우, 정확한 해결이 어렵지만 일단 파일명으로 public에 있는지 체크하기 위해 등록
            // (엄밀한 검증을 위해서는 import path resolving이 필요하지만 여기선 heuristic하게 접근)
            // 여기서 public 폴더 바로 아래에 있는 것으로 가정하거나, 그냥 참조로 추가
            if (!assetPath.includes('node_modules')) {
                assetReferences.add(assetPath);
            }
        }
    }
}

// 참조된 에셋 존재 여부 확인
function verifyAssets() {
    console.log('='.repeat(50));
    console.log('🔍 자산(Assets) 무결성 검증 시작');
    console.log('='.repeat(50));

    scanDirectory(srcDir);

    console.log(`총 ${assetReferences.size}개의 고유한 자산 참조 발견.`);

    for (const assetRef of assetReferences) {
        // 1. public 폴더 기준 절대 경로 확인
        let targetPath;
        if (assetRef.startsWith('/')) {
            targetPath = path.join(publicDir, assetRef);
        } else {
            // 상대 경로면 public 루트에서도 찾아보고, 파일명만으로도 찾아봄 (유연한 체크)
            targetPath = path.join(publicDir, assetRef);
        }

        if (!fs.existsSync(targetPath)) {
            // public 루트에 없으면 재귀적으로 public 폴더 내를 다 뒤져서 파일명이 같은게 있는지 확인 (Fallback)
            const fileName = path.basename(assetRef);
            const found = findFileInPublic(fileName);

            if (!found) {
                missingAssets.push(assetRef);
            }
        }
    }

    if (missingAssets.length > 0) {
        console.log('\n❌ [경고] 다음 자산 파일들을 찾을 수 없습니다 (또는 경로가 잘못됨):');
        missingAssets.forEach(asset => console.log(`   - ${asset}`));
        console.log('\n⚠️  참고: 동적 import나 별칭(@)을 사용한 경우 스크립트가 찾지 못할 수 있습니다.');
    } else {
        console.log('\n✅ 모든 자산 참조가 유효해 보입니다!');
    }

    // 추가: favicon, manifest 등 필수 파일 체크
    const requiredFiles = ['manifest.json', 'favicon.ico', 'logo192.png', 'logo512.png'];
    const missingRequired = requiredFiles.filter(f => !fs.existsSync(path.join(publicDir, f)));

    if (missingRequired.length > 0) {
        console.log('\n❌ [오류] 필수 파일 누락:');
        missingRequired.forEach(f => console.log(`   - ${f}`));
    }
}

function findFileInPublic(fileName) {
    let result = false;
    function search(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                search(fullPath);
            } else if (file === fileName) {
                result = true;
            }
        }
    }
    search(publicDir);
    return result;
}

verifyAssets();
