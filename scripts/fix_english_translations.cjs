const fs = require('fs');

let c = fs.readFileSync('src/utils/translations.js', 'utf8');

// Find the index of the start of the English dictionary
let enIndex = c.indexOf('en: {');
if (enIndex !== -1) {
    let koPart = c.slice(0, enIndex);
    let enPart = c.slice(enIndex);

    // Replace the specific Instructor Login / Member Login keys in the English part
    enPart = enPart.replace(/g_d4bfea: "선생님 선택"/g, 'g_d4bfea: "Select Instructor"');
    enPart = enPart.replace(/g_36069e: "전화번호 뒤 4자리"/g, 'g_36069e: "Last 4 Digits"');
    enPart = enPart.replace(/g_2228c5: "로그인"/g, 'g_2228c5: "Log In"');
    enPart = enPart.replace(/g_f238ae: "로그인 중..."/g, 'g_f238ae: "Logging in..."');
    enPart = enPart.replace(/g_d6d014: "한국어"/g, 'g_d6d014: "Language"');
    enPart = enPart.replace(/g_d6d014: "Korean"/g, 'g_d6d014: "Language"');

    // Home / Member login keys
    enPart = enPart.replace(/g_d6d014: "한국어"/g, 'g_d6d014: "Language"');
    
    // Put them back together
    fs.writeFileSync('src/utils/translations.js', koPart + enPart);
    console.log("Proper English translations injected for key Auth screens.");
}
