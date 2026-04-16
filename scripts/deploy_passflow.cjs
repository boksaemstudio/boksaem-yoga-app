const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '..', 'dist');

const tenants = [
    {
        siteId: 'boksaem-yoga',
        name: '복샘요가',
        title: '복샘요가 - 출석 관리 솔루션',
        ogDesc: '복샘요가 출석·수련 기록 서비스',
        ogImage: '/pwa-icon-512.png'
    },
    {
        siteId: 'ssangmunyoga',
        name: '쌍문요가',
        title: '쌍문요가 - 출석 관리 솔루션',
        ogDesc: '쌍문요가 출석·수련 기록 서비스',
        ogImage: '/assets/demo_logo_v2.png'
    },
    {
        siteId: 'passflowai',
        name: 'PassFlow Ai',
        title: 'PassFlow Ai - 스마트 스튜디오 관리 솔루션',
        ogDesc: 'AI가 함께하는 스튜디오 운영. 출석·매출·회원 관리를 하나로.',
        ogImage: '/assets/passflow_logo.png'
    }
];

function updateFileContent(filePath, replaceFn) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = replaceFn(content);
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
        }
    }
}

function updateManifest(filename, newName, newShortName) {
    const filePath = path.join(distDir, filename);
    if (!fs.existsSync(filePath)) return;
    try {
        let manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        manifest.name = newName;
        manifest.short_name = newShortName;
        fs.writeFileSync(filePath, JSON.stringify(manifest, null, 4), 'utf8');
    } catch (e) {
        console.error(`Error updating manifest ${filename}:`, e);
    }
}

console.log("🚀 [Deploy All] Starting dynamic multi-tenant deployment...");

// Ensure dist exists (run build if not)
if (!fs.existsSync(distDir)) {
    console.log("⚙️  Running initial build...");
    // execSync
} else {
    // Force a fresh build to ensure base files are correct before we mutate them
    console.log("⚙️  Running fresh build to reset dist assets...");
    execSync('npm run build', { stdio: 'inherit' });
}

// SSR 설정: index.html을 functions/app.html로 복사만 합니다 (절대 삭제하지 않음!)
console.log("⚙️  Setting up SSR template (copy-only, no delete!)...");
const indexPath = path.join(distDir, 'index.html');
const functionsAppPath = path.join(__dirname, '..', 'functions', 'app.html');
if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, functionsAppPath);
    console.log("✅ Copied index.html to functions/app.html (index.html preserved in dist!)");
    // 🚨 절대 fs.unlinkSync(indexPath) 하지 마세요! 전체 서비스 먹통됩니다!
}

for (const tenant of tenants) {
    console.log(`\n===========================================`);
    console.log(`🚀 Preparing deployment for: ${tenant.name} (${tenant.siteId})`);
    console.log(`===========================================`);

    // 1. Update manifests PWA Names (PWA 이름은 단말기 종속이므로 빌드 시점 유지)
    updateManifest('manifest-admin.json', `${tenant.name} 관리자`, '관리자');
    updateManifest('manifest-checkin.json', `${tenant.name} 출석체크`, '출석체크');
    updateManifest('manifest-instructor.json', `${tenant.name} 강사`, '강사');
    updateManifest('manifest-member.json', `내요가 (${tenant.name})`, '내요가');
    console.log(`✅ Inject PWA Manifest Names based on: ${tenant.name}`);

    // 2. Deploy App Hosting
    console.log(`☁️  Uploading Hosting to Firebase (${tenant.siteId})...`);
    try {
        execSync(`npx firebase deploy --only hosting:${tenant.siteId}`, { stdio: 'inherit' });
        console.log(`🎉 Hosting Deployment successful for ${tenant.siteId}!`);
    } catch (err) {
        console.error(`🚨 Deployment failed for ${tenant.siteId}`);
        process.exit(1);
    }
}

console.log(`\n✅ All tenants seamlessly built and deployed with Cloud Function SSR!`);

