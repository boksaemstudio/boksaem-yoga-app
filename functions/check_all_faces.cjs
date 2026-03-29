const admin = require('firebase-admin');
const sa = require('./boksaem-yoga-firebase-adminsdk.json');
admin.initializeApp({credential: admin.credential.cert(sa)});
admin.firestore().collection('studios/boksaem-yoga/members').get().then(snap => { 
    let count = 0; 
    let members = [];
    snap.forEach(doc => { 
        const d = doc.data(); 
        if(d.faceDescriptor || (d.faceDescriptors && d.faceDescriptors.length >0)) {
            count++; 
            members.push(d.name + ' (' + d.phone + ')');
        }
    }); 
    console.log('Registered count: ', count); 
    console.log('Members:', members.join(', '));
    process.exit(0); 
}).catch(console.error);
