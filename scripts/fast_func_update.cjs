const fs = require('fs');
const file = 'c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/functions/modules/superAdmin.js';
let content = fs.readFileSync(file, 'utf8');

// Require onDocumentCreated
content = content.replace(
    /const { onSchedule } = require\("firebase-functions\/v2\/scheduler"\);/,
    "const { onSchedule } = require(\"firebase-functions/v2/scheduler\");\nconst { onDocumentCreated } = require(\"firebase-functions/v2/firestore\");"
);

// Update inquiry check in report
content = content.replace(
    /const inquiriesSnap = await db\.collection\('inquiries'\)\.where\('status', '==', 'new'\)\.get\(\);/,
    "const inquiriesSnap = await db.collection('platform_inquiries').where('status', '==', 'new').get();"
);

// Add the new trigger
const newTrigger = `

/**
 * 신규 도입 문의(platform_inquiries) 발생 시 실시간 푸시 알림
 */
exports.notifyNewPlatformInquiry = onDocumentCreated({
    document: "platform_inquiries/{inquiryId}",
    region: "asia-northeast3"
}, async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    
    try {
        const { tokens } = await getAllFCMTokens(null, { role: 'superadmin', studioId: 'boksaem-yoga' });
        
        if (tokens.length > 0) {
            const bodyStr = \`[\${data.country || 'Global'}] \${data.studioName || data.email}\\n\${(data.message || '').substring(0, 50)}...\`;
            await admin.messaging().sendEachForMulticast({
                tokens,
                data: {
                    title: "🔔 신규 글로벌 도입 문의",
                    body: bodyStr,
                    url: '/superadmin'
                },
                webpush: { headers: { Urgency: 'high' } },
                android: { priority: 'high' }
            });
            console.log(\`[Push] Sent new inquiry alert to \${tokens.length} superadmins.\`);
        }
    } catch (e) {
        console.error('notifyNewPlatformInquiry failed:', e);
    }
});
`;

content += newTrigger;
fs.writeFileSync(file, content);
console.log('updated superadmin cloud functions');
