const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key not found:', serviceAccountPath);
    process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function fixBranches() {
    const tenants = ['demo-yoga', 'ssangmun-yoga'];
    
    for (const tenantId of tenants) {
        console.log(`\n🔍 Checking ALL branch-related fields for: ${tenantId}`);
        const tenantDoc = db.collection('studios').doc(tenantId);
        const doc = await tenantDoc.get();
        const data = doc.data();
        
        // Show all top-level keys containing 'branch'
        const branchKeys = Object.keys(data || {}).filter(k => k.toLowerCase().includes('branch'));
        console.log(`  Found branch-related keys: ${branchKeys.join(', ') || 'none'}`);
        
        for (const key of branchKeys) {
            console.log(`  ${key}: ${JSON.stringify(data[key])}`);
        }
        
        // Check settings sub-object
        if (data?.settings) {
            const settingsBranchKeys = Object.keys(data.settings).filter(k => k.toLowerCase().includes('branch'));
            console.log(`  settings branch keys: ${settingsBranchKeys.join(', ') || 'none'}`);
            for (const key of settingsBranchKeys) {
                console.log(`  settings.${key}: ${JSON.stringify(data.settings[key])}`);
            }
        }
        
        // Force update BOTH 'branches' (lowercase) AND 'BRANCHES' (uppercase)
        console.log('\n  ✏️ Force updating BRANCHES and branches to [本점 only]...');
        await tenantDoc.update({
            branches: [{ id: 'main', name: '본점', color: 'var(--primary-theme-color)' }],
            BRANCHES: [{ id: 'main', name: '본점', color: 'var(--primary-theme-color)' }]
        });
        
        // Also check if it's nested in settings
        if (data?.settings?.BRANCHES) {
            console.log(`  ✏️ settings.BRANCHES also found, updating...`);
            await tenantDoc.update({
                'settings.BRANCHES': [{ id: 'main', name: '본점', color: 'var(--primary-theme-color)' }]
            });
        }
        
        // Verify
        const verify = await tenantDoc.get();
        const vData = verify.data();
        console.log(`  ✅ Final branches: ${JSON.stringify(vData?.branches)}`);
        console.log(`  ✅ Final BRANCHES: ${JSON.stringify(vData?.BRANCHES)}`);
        if (vData?.settings?.BRANCHES) {
            console.log(`  ✅ Final settings.BRANCHES: ${JSON.stringify(vData.settings.BRANCHES)}`);
        }
    }
    
    console.log('\n🎉 Done!');
}

fixBranches().catch(console.error).finally(() => process.exit(0));
