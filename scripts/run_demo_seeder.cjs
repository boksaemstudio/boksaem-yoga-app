const admin = require('firebase-admin');
const acc = require('../functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(acc) });

const { refreshDemoData } = require('../functions/helpers/demoSeeder');

refreshDemoData()
  .then(() => {
    console.log("Seeding complete for demo-yoga.");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
