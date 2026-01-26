
const admin = require('firebase-admin');

// Mock firebase-admin to prevent actual initialization errors
if (!admin.apps.length) {
    const mockApp = {
        options: {},
        firestore: () => ({
            settings: () => { },
            collection: () => ({ doc: () => { } })
        })
    };
    // Manual blocking of admin initialization
    admin.initializeApp = () => mockApp;
    admin.firestore = () => mockApp.firestore();
}

try {
    console.log("Loading functions/index.js for syntax check...");
    require('../index');
    console.log("SUCCESS: index.js loaded without syntax errors.");
    process.exit(0);
} catch (e) {
    console.error("FAILURE: Syntax error or runtime error during load.");
    console.error(e);
    process.exit(1);
}
