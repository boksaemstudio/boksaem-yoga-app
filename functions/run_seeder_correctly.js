const admin = require('firebase-admin');
const sa = require('./service-account-key.json');

console.log('Initializing Root...');
admin.initializeApp({
    credential: admin.credential.cert(sa)
});

console.log('Including Helper...');
const { refreshDemoData } = require('./helpers/demoSeeder.js');

console.log('Running...');
refreshDemoData()
    .then(() => {
        console.log('Done!');
        process.exit(0);
    })
    .catch(e => {
        console.error('Error!', e);
        process.exit(1);
    });
