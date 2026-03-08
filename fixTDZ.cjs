const fs = require('fs');
const file = 'src/hooks/useAdminData.js';
let content = fs.readFileSync(file, 'utf8');

const blockStart = content.indexOf(`    // [Feature 1] Chart Data States`);
const blockEndString = `    // Hook into refreshData to trigger chart calc`;
const blockEnd = content.indexOf(blockEndString);

if (blockStart !== -1 && blockEnd !== -1) {
    const blockToMove = content.substring(blockStart, blockEnd);
    content = content.substring(0, blockStart) + content.substring(blockEnd);

    const insertPointMarker = `    const loadAIInsight = useCallback(async (members, logs, currentSummary, currentTodayClasses) => {`;
    const insertPoint = content.indexOf(insertPointMarker);
    if (insertPoint !== -1) {
        content = content.substring(0, insertPoint) + blockToMove + '\n' + content.substring(insertPoint);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed TDZ in useAdminData.js');
    } else {
        console.error('Insert point not found');
    }
} else {
    console.error('Block not found', blockStart, blockEnd);
}
