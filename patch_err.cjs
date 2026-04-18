const fs = require('fs');
const file = 'src/utils/translations.js';
let content = fs.readFileSync(file, 'utf8');

const keys = {
    en: { g_04cdab: '😔 This number is not registered', g_f7866f: '⏳ Membership expired' },
    ja: { g_04cdab: '😔 登録されていない番号です', g_f7866f: '⏳ 利用券の有効期限が切れています' },
    zh: { g_04cdab: '😔 该号码未注册', g_f7866f: '⏳ 会员卡已过期' },
    es: { g_04cdab: '😔 Este número no está registrado', g_f7866f: '⏳ Membresía caducada' },
    pt: { g_04cdab: '😔 Este número não está registrado', g_f7866f: '⏳ Assinatura expirada' },
    ru: { g_04cdab: '😔 Этот номер не зарегистрирован', g_f7866f: '⏳ Срок действия абонемента истек' },
    fr: { g_04cdab: "😔 Ce numéro n'est pas enregistré", g_f7866f: "⏳ Abonnement expiré" },
    de: { g_04cdab: '😔 Diese Nummer ist nicht registriert', g_f7866f: '⏳ Mitgliedschaft abgelaufen' },
    vi: { g_04cdab: '😔 Số này chưa được đăng ký', g_f7866f: '⏳ Thẻ thành viên đã hết hạn' },
    th: { g_04cdab: '😔 หมายเลขนี้ยังไม่ได้ลงทะเบียน', g_f7866f: '⏳ สมาชิกหมดอายุแล้ว' }
};

Object.keys(keys).forEach(lang => {
    const target = lang + ': {\n';
    const idx = content.indexOf(target);
    if (idx !== -1) {
        const nextLangIdx = content.indexOf('},', idx);
        const block = content.slice(idx, nextLangIdx);
        
        const insertLines = Object.entries(keys[lang])
            .filter(([k]) => !block.includes(`    ${k}: `))
            .map(([k, v]) => `        ${k}: "${v}",`)
            .join('\n');
            
        if (insertLines.length > 0) {
            content = content.slice(0, idx + target.length) + insertLines + '\n' + content.slice(idx + target.length);
        }
    }
});

fs.writeFileSync(file, content);
console.log('done patching 2!');
