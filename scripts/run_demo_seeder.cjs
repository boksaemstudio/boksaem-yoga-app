const { initializeApp, cert } = require('firebase-admin/app');
const acc = require('../functions/service-account-key.json');
try { initializeApp({ credential: cert(acc) }); } catch (e) {}

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
