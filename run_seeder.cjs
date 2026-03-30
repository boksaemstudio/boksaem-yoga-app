const admin = require('firebase-admin');
const { refreshDemoData } = require('./functions/helpers/demoSeeder.js');
const sa = require('./functions/service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(sa)
    });
}

console.log('Starting seed...');
refreshDemoData()
    .then(() => {
        console.log('Seed execution finished correctly.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Seed execution failed:', err);
        process.exit(1);
    });
