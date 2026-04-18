const fs = require('fs');
const file = 'src/utils/translations.js';
let content = fs.readFileSync(file, 'utf8');

const keys = {
    en: { g_7c4e80: 'Instructor Only', g_2e3374: 'After scanning the QR code,', g_c6d12b: 'enter the last 4 digits of your phone number', g_6f02fe: '' },
    ja: { g_7c4e80: '講師専用', g_2e3374: 'QRコードをスキャンした後、', g_c6d12b: '電話番号の下4桁', g_6f02fe: 'を入力してください' },
    zh: { g_7c4e80: '仅限讲师', g_2e3374: '扫描二维码后，', g_c6d12b: '输入手机号后4位', g_6f02fe: '即可' },
    es: { g_7c4e80: 'Solo instructores', g_2e3374: 'Tras escanear el QR,', g_c6d12b: 'ingresa los últimos 4 dígitos de tu teléfono', g_6f02fe: '' },
    pt: { g_7c4e80: 'Apenas instrutores', g_2e3374: 'Após escanear o QR,', g_c6d12b: 'insira os últimos 4 dígitos do seu telefone', g_6f02fe: '' },
    ru: { g_7c4e80: 'Для инструкторов', g_2e3374: 'Отсканировав QR-код,', g_c6d12b: 'введите последние 4 цифры вашего телефона', g_6f02fe: '' },
    fr: { g_7c4e80: 'Instructeurs', g_2e3374: 'Après avoir scanné le QR,', g_c6d12b: 'entrez les 4 derniers chiffres de votre téléphone', g_6f02fe: '' },
    de: { g_7c4e80: 'Nur Instruktoren', g_2e3374: 'Nach dem Scannen des QR-Codes', g_c6d12b: 'die letzten 4 Ziffern der Telefonnummer eingeben', g_6f02fe: '' },
    vi: { g_7c4e80: 'Dành cho giảng viên', g_2e3374: 'Sau khi quét mã QR,', g_c6d12b: 'nhập 4 số cuối điện thoại', g_6f02fe: '' },
    th: { g_7c4e80: 'สำหรับผู้สอน', g_2e3374: 'สแกน QR แล้ว', g_c6d12b: 'ระบุเลข 4 ตัวท้ายของเบอร์โทรศัพท์', g_6f02fe: '' }
};

Object.keys(keys).forEach(lang => {
    const target = lang + ': {\n';
    const idx = content.indexOf(target);
    if (idx !== -1) {
        // extract the block to check
        const nextLangIdx = content.indexOf('},', idx);
        const block = content.slice(idx, nextLangIdx);
        
        const insertLines = Object.entries(keys[lang])
            .filter(([k]) => !block.includes(`    ${k}: `)) // only check inside the language block!
            .map(([k, v]) => `        ${k}: "${v}",`)
            .join('\n');
            
        if (insertLines.length > 0) {
            content = content.slice(0, idx + target.length) + insertLines + '\n' + content.slice(idx + target.length);
        }
    }
});

fs.writeFileSync(file, content);
console.log('done patching!');
