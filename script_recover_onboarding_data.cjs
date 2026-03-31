const admin = require('firebase-admin');
const sa = require('./functions/service-account-key.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
    try {
        console.log('--- Rescuing Original Onboarding Data for dg and hhh ---');
        
        // Find the pending forms by email
        const motionptSnaps = await db.collection('platform/registry/pending_studios').where('ownerEmail', '==', 'motionpt@gmail.com').get();
        const sjoSnaps = await db.collection('platform/registry/pending_studios').where('ownerEmail', '==', 'sjo@motopjdkd').get();

        const processSnap = async (snap, targetStudioId) => {
            if(snap.empty) {
                console.log(`No original onboarding form found for ${targetStudioId}`);
                return;
            }
            
            // Assume the latest application (or only one)
            const formData = snap.docs[snap.docs.length - 1].data();
            console.log(`Found onboarding data for ${targetStudioId}: Logo=`, formData.logoUrl, 'Files=', formData.scheduleUrls?.length || 0);
            
            const updates = {};
            if(formData.logoUrl) updates.logoUrl = formData.logoUrl;
            if(formData.scheduleUrls && formData.scheduleUrls.length > 0) updates.scheduleUrls = formData.scheduleUrls;
            else if (formData.scheduleUrl) updates.scheduleUrls = [formData.scheduleUrl];

            if(Object.keys(updates).length > 0) {
                await db.doc(`platform/registry/studios/${targetStudioId}`).update(updates);
                console.log(`Successfully restored data for registry/${targetStudioId}`);
                
                // Also restore the logo inside the studio config if present
                if(updates.logoUrl && !updates.logoUrl.includes('passflow_logo')) {
                    await db.doc(`studios/${targetStudioId}`).set({
                        ASSETS: { LOGO: { WIDE: updates.logoUrl, SQUARE: updates.logoUrl } },
                        IDENTITY: { LOGO_URL: updates.logoUrl }
                    }, {merge: true});
                }
            }
        };

        await processSnap(motionptSnaps, 'dg');
        await processSnap(sjoSnaps, 'hhh');
        console.log('Complete!');
        process.exit(0);
    } catch(e) {
        console.error('Failed:', e);
        process.exit(1);
    }
})();
