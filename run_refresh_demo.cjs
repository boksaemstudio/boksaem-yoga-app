const admin = require('firebase-admin');
const { refreshDemoData } = require('./functions/helpers/demoSeeder');

// Initialize admin with the correct project ID from .env
if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'boksaem-yoga'
    });
}

async function main() {
    try {
        console.log('🚀 Starting demo data refresh for 11 regional tenants...');
        await refreshDemoData();
        console.log('✅ Demo data refresh completed successfully.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error refreshing demo data:', e);
        process.exit(1);
    }
}

main();
