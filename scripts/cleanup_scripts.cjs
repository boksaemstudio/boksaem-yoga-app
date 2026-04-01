const fs = require('fs');
const path = require('path');

// 1. Define safe keepers
const KEEPER_SCRIPTS = [
    // Build / System
    'update_version.js', 
    'verify_assets.js', 
    'test_stress_simulation.js', 
    'deploy_all.cjs',
    'cleanup_scripts.cjs', // Self
    
    // Core Utilities & Generators
    'nuke_garbage.cjs',
    'seed_april_ssangmun.cjs',
    'seed_ssangmun_pricing.cjs',
    'backup_manager.cjs',
    'seed_demo_data.cjs',
    'seed_demo_data.js'
];

const scriptsDir = __dirname;
const archiveDir = path.join(scriptsDir, 'archive');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFolder = path.join(archiveDir, `legacy_scripts_${timestamp}`);

async function cleanup() {
    console.log("🧹 [SaaS Desk Cleanup] 대청소 시작...");
    
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir);
    if (!fs.existsSync(backupFolder)) fs.mkdirSync(backupFolder);

    console.log(`📦 백업을 위해 원본 파일들을 /archive/${path.basename(backupFolder)}/ 로 이동합니다...`);

    const files = fs.readdirSync(scriptsDir);
    let moveCount = 0;
    
    for (const file of files) {
        const fullPath = path.join(scriptsDir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isFile()) {
            if (!KEEPER_SCRIPTS.includes(file)) {
                // Move instead of delete
                const destPath = path.join(backupFolder, file);
                fs.renameSync(fullPath, destPath);
                moveCount++;
            }
        }
    }

    console.log(`✅ 총 ${moveCount}개의 찌꺼기 파일이 근본적으로 백업 박스에 들어갔습니다.`);
    console.log(`✨ 책상 위에는 유지된 핵심 파츠 ${KEEPER_SCRIPTS.length}개만 남았습니다!`);
    console.log("새로운 출발을 축하드립니다!");
}

cleanup().catch(e => console.error(e));
