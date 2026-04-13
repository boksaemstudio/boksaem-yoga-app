const fs = require('fs');
const path = 'c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/src/utils/translations.js';
let content = fs.readFileSync(path, 'utf8');

const additions = {
  ko: 'demoNotice1Title: "[안내] 임시 공휴일 휴관 안내", demoNotice1Content: "이번 금요일은 임시 공휴일로 스튜디오 전체 휴관입니다.", demoNotice2Title: "[이벤트] 친구 추천 프로모션", demoNotice2Content: "지인 추천 시 수강권 2회를 추가로 제공합니다.",',
  en: 'demoNotice1Title: "[Notice] Holiday Closure", demoNotice1Content: "The studio will be closed this Friday for a public holiday.", demoNotice2Title: "[Event] Refer-a-Friend Promo", demoNotice2Content: "Refer a friend and get 2 extra class credits.",',
  ja: 'demoNotice1Title: "[お知らせ] 臨時休業のご案内", demoNotice1Content: "今週の金曜日は祝日のため、全館休業となります。", demoNotice2Title: "[イベント] 友達紹介キャンペーン", demoNotice2Content: "お友達をご紹介いただくと、レッスンチケットを2回分プレゼントします。",',
  ru: 'demoNotice1Title: "[Объявление] Закрытие на праздник", demoNotice1Content: "В эту пятницу студия будет закрыта в связи с праздником.", demoNotice2Title: "[Акция] Приведи друга", demoNotice2Content: "Приведите друга и получите 2 дополнительных занятия.",',
  zh: 'demoNotice1Title: "[通知] 节假日闭馆", demoNotice1Content: "本周五因法定节假日闭馆一天。", demoNotice2Title: "[活动] 推荐有礼", demoNotice2Content: "推荐好友加入可额外获得2节课程体验。",',
  es: 'demoNotice1Title: "[Aviso] Cierre por día festivo", demoNotice1Content: "El estudio permanecerá cerrado este viernes por festivo.", demoNotice2Title: "[Evento] Promoción Recomienda a un Amigo", demoNotice2Content: "Recomienda a un amigo y obtén 2 clases extra.",',
  pt: 'demoNotice1Title: "[Aviso] Fechamento no feriado", demoNotice1Content: "O estúdio estará fechado nesta sexta-feira devido ao feriado nacional.", demoNotice2Title: "[Evento] Promoção Indique um Amigo", demoNotice2Content: "Indique um amigo e ganhe 2 aulas extras.",',
  fr: 'demoNotice1Title: "[Avis] Fermeture pour jour férié", demoNotice1Content: "Le studio sera fermé ce vendredi pour cause de jour férié.", demoNotice2Title: "[Événement] Promo Parrainez un ami", demoNotice2Content: "Parrainez un ami et obtenez 2 cours supplémentaires.",',
  de: 'demoNotice1Title: "[Hinweis] Geschlossen (Feiertag)", demoNotice1Content: "Das Studio bleibt diesen Freitag wegen eines Feiertags geschlossen.", demoNotice2Title: "[Event] Freunde werben Aktion", demoNotice2Content: "Werben Sie einen Freund und erhalten Sie 2 zusätzliche Kurse.",'
};

const regex = /demoStudioName:\s*"[^"]*",/g;
let matchCount = 0;
content = content.replace(regex, (match) => {
    let lang = Object.keys(additions)[matchCount];
    if (lang) {
        matchCount++;
        return match + '\n          ' + additions[lang];
    }
    return match;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Matches replaced: ' + matchCount);
