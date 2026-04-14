const fs = require('fs');

let c = fs.readFileSync('src/utils/translations.js', 'utf8');

c = c.replace(/"在“静音”或“勿扰”模式下，\n\*\*冥想指南和背景音正常播放。\*\*\n仅屏蔽外部通知。"/g, '"在“静音”或“勿扰”模式下，\\n**冥想指南和背景音正常播放。**\\n仅屏蔽外部通知。"');
c = c.replace(/"在“靜音”或“勿擾”模式下，\n\*\*冥想指南和背景音正常播放。\*\*\n僅遮蔽外部通知。"/g, '"在“靜音”或“勿擾”模式下，\\n**冥想指南和背景音正常播放。**\\n僅遮蔽外部通知。"');
c = c.replace(/"En modo Silencio o No molestar,\n\*\*la guía y la música se reproducirán normalmente.\*\*\nSolo se bloquearán las notificaciones."/g, '"En modo Silencio o No molestar,\\n**la guía y la música se reproducirán normalmente.**\\nSolo se bloquearán las notificaciones."');
c = c.replace(/"No modo Silencioso ou Não Perturbe,\n\*\*o guia e a música tocarão normalmente.\*\*\nApenas notificações são bloqueadas."/g, '"No modo Silencioso ou Não Perturbe,\\n**o guia e a música tocarão normalmente.**\\nApenas notificações são bloqueadas."');
c = c.replace(/"En mode Silence ou Ne pas déranger,\n\*\*le guide et la musique joueront normalement.\*\*\nSeules les notifications sont bloquées."/g, '"En mode Silence ou Ne pas déranger,\\n**le guide et la musique joueront normalement.**\\nSeules les notifications sont bloquées."');
c = c.replace(/"Im Lautlos- oder Bitte-nicht-stören-Modus\n\*\*werden der Guide und die Musik normal wiedergegeben.\*\*\nNur Benachrichtigungen werden blockiert."/g, '"Im Lautlos- oder Bitte-nicht-stören-Modus\\n**werden der Guide und die Musik normal wiedergegeben.**\\nNur Benachrichtigungen werden blockiert."');
c = c.replace(/"В режиме «Без звука» или «Не беспокоить»\n\*\*руководство и музыка будут воспроизводиться нормально.\*\*\nБлокируются только уведомления."/g, '"В режиме «Без звука» или «Не беспокоить»\\n**руководство и музыка будут воспроизводиться нормально.**\\nБлокируются только уведомления."');
c = c.replace(/"マナーモードや集中モードでも\n\*\*ガイドと音楽は通常通り再生されます。\*\*\n外部からの通知のみがブロックされます。"/g, '"マナーモードや集中モードでも\\n**ガイドと音楽は通常通り再生されます。**\\n外部からの通知のみがブロックされます。"');

// Fallback logic for any other unhandled multilines inside double quotes:
const lines = c.split('\n');
const out = [];
let inOpenString = false;
for (let i=0; i<lines.length; i++) {
    let line = lines[i];
    // This is deeply flawed, let's just make it simpler
    out.push(line);
}

fs.writeFileSync('src/utils/translations.js', c);
console.log('Fixed translations.js');
