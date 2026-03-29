const admin = require('./functions/node_modules/firebase-admin');
const sa = require('./boksaem-yoga-firebase-adminsdk.json');
admin.initializeApp({credential: admin.credential.cert(sa)});
admin.firestore().collection('studios').doc('boksaem-yoga').get().then(doc => { 
    console.log(JSON.stringify(doc.data().policies, null, 2)); 
    process.exit(0); 
}).catch(console.error);
