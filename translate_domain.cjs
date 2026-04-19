const fs = require('fs');
const translateModule = require('translate');
const translate = translateModule.default || translateModule;

// Configure translation engine
translate.engine = 'google';

// Domain Dictionary (Fitness, Yoga, Pilates SaaS Terms)
const domainDict = {
    ja: {
        "수강권": "チケット",
        "회원": "会員",
        "예약": "予約",
        "출석": "出席",
        "노쇼": "無断キャンセル",
        "지점": "店舗",
        "강사": "インストラクター",
        "원장": "ディレクター",
        "본점": "本店",
        "결제": "決済",
        "이용권": "利用券",
        "정원": "定員",
        "대기": "キャンセル待ち",
        "라커": "ロッカー",
        "수업": "レッスン",
        "시간표": "スケジュール",
        "요가원": "ヨガスタジオ",
        "필라테스": "ピラティス",
        "피트니스": "フィットネス"
    },
    zh: {
        "수강권": "会员卡",
        "회원": "会员",
        "예약": "预约",
        "출석": "签到",
        "노쇼": "爽约",
        "지점": "门店",
        "강사": "教练",
        "원장": "馆长",
        "본점": "总店",
        "결제": "支付",
        "이용권": "使用券",
        "정원": "名额",
        "대기": "候补",
        "라커": "储物柜",
        "수업": "课程",
        "시간표": "课表",
        "요가원": "瑜伽馆",
        "필라테스": "普拉提",
        "피트니스": "健身房"
    },
    es: {
        "수강권": "Membresía",
        "회원": "Miembro",
        "예약": "Reserva",
        "출석": "Asistencia",
        "노쇼": "No Show",
        "지점": "Sucursal",
        "강사": "Instructor",
        "원장": "Director",
        "본점": "Sede Principal",
        "결제": "Pago",
        "이용권": "Pase",
        "정원": "Capacidad",
        "대기": "Lista de espera",
        "라커": "Casillero",
        "수업": "Clase",
        "시간표": "Horario",
        "요가원": "Estudio de Yoga",
        "필라테스": "Pilates",
        "피트니스": "Gimnasio"
    },
    de: {
        "수강권": "Mitgliedschaft",
        "회원": "Mitglied",
        "예약": "Buchung",
        "출석": "Anwesenheit",
        "노쇼": "Nicht erschienen",
        "지점": "Filiale",
        "강사": "Trainer",
        "원장": "Studioleiter",
        "본점": "Hauptsitz",
        "결제": "Zahlung",
        "이용권": "Pass",
        "정원": "Kapazität",
        "대기": "Warteliste",
        "라커": "Spind",
        "수업": "Kurs",
        "시간표": "Stundenplan",
        "요가원": "Yogastudio",
        "필라테스": "Pilates",
        "피트니스": "Fitnessstudio"
    },
    vi: {
        "수강권": "Gói tập",
        "회원": "Hội viên",
        "예약": "Đặt lịch",
        "출석": "Điểm danh",
        "노쇼": "Vắng mặt",
        "지점": "Chi nhánh",
        "강사": "Huấn luyện viên",
        "원장": "Giám đốc",
        "본점": "Trụ sở chính",
        "결제": "Thanh toán",
        "이용권": "Thẻ tập",
        "정원": "Sức chứa",
        "대기": "Danh sách chờ",
        "라커": "Tủ đồ",
        "수업": "Lớp học",
        "시간표": "Thời khóa biểu",
        "요가원": "Phòng tập Yoga",
        "필라테스": "Pilates",
        "피트니스": "Phòng Gym"
    },
    th: {
        "수강권": "แพ็กเกจเรียน",
        "회원": "สมาชิก",
        "예약": "จองคลาส",
        "출석": "เช็คอิน",
        "노쇼": "ไม่มาเรียน",
        "지점": "สาขา",
        "강사": "ครูฝึก",
        "원장": "ผู้อำนวยการ",
        "본점": "สำนักงานใหญ่",
        "결제": "ชำระเงิน",
        "이용권": "บัตรผ่าน",
        "정원": "ความจุ",
        "대기": "รอคิว",
        "라커": "ล็อกเกอร์",
        "수업": "คลาสเรียน",
        "시간표": "ตารางเรียน",
        "요가원": "สตูดิโอโยคะ",
        "필라테스": "พิลาทิส",
        "피트니스": "ฟิตเนส"
    }
};

const translationsPath = './src/utils/translations.js';
let translationsData;
try {
    const { translations } = require(translationsPath);
    translationsData = translations;
} catch (e) {
    console.error("Failed to load translations", e);
    process.exit(1);
}

// Ensure languages exist
const langsToProcess = ['ja', 'zh', 'es', 'de', 'vi', 'th'];

async function processTranslations() {
    console.log("Starting Advanced Domain-Aware Translation Pipeline...");

    for (const lang of langsToProcess) {
        console.log(`\n=== Processing Language: ${lang} ===`);
        const targetObj = translationsData[lang];
        const koObj = translationsData.ko;
        const dict = domainDict[lang] || {};

        let missingKeys = [];
        for (const key in koObj) {
            // If the translation is missing (fallback to ko or en)
            if (targetObj[key] === koObj[key] || targetObj[key] === translationsData.en[key]) {
                missingKeys.push(key);
            }
        }

        console.log(`Found ${missingKeys.length} missing keys for ${lang}. Starting batch translation...`);

        // Process in small batches to avoid rate limits
        const batchSize = 50;
        let translatedCount = 0;

        for (let i = 0; i < missingKeys.length; i += batchSize) {
            const batch = missingKeys.slice(i, i + batchSize);
            const promises = batch.map(async (key) => {
                let originalText = koObj[key];
                
                // 1. Domain Term Substitution (Pre-translation)
                // We use a trick: If the text is short, we can just replace it entirely if it matches perfectly.
                // For longer text, we replace the domain words, but that might mess up grammar in the translation API.
                // Actually, the translation API is quite smart. But we can post-process or pre-process.
                // To guarantee expert domain terms, we will translate first, then force replace.
                // Wait, if we force replace Korean -> Lang after translation, it won't work because the translation won't have Korean words.
                // So we do string matching: if originalText matches a dictionary key perfectly, use it.
                
                if (dict[originalText]) {
                    targetObj[key] = dict[originalText];
                    return;
                }

                try {
                    // Call translation API
                    let translated = await translate(originalText, { from: 'ko', to: lang });
                    
                    // 2. Post-processing with domain dictionary (Optional refinement)
                    // If the original contained a domain term, ensure the translated text contains the domain term.
                    // This is complex. We will trust the API for sentences, and rely on exact matches for short terms.

                    targetObj[key] = translated;
                } catch (e) {
                    console.log(`Translation failed for ${key}: ${originalText}`, e.message);
                }
            });

            await Promise.all(promises);
            translatedCount += batch.length;
            console.log(`[${lang}] Translated ${translatedCount} / ${missingKeys.length}`);
            
            // Wait 2 seconds between batches to respect rate limits
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log("\nWriting updated translations to translations.js...");
    let newFileContent = "export const translations = {\n";
    for (const lang in translationsData) {
        newFileContent += `  ${lang}: {\n`;
        for (const key in translationsData[lang]) {
            const value = translationsData[lang][key];
            newFileContent += `    "${key}": ${JSON.stringify(value)},\n`;
        }
        newFileContent += "  },\n";
    }
    newFileContent += "};\n";

    fs.writeFileSync(translationsPath, newFileContent);
    console.log("Translation pipeline completed successfully!");
}

processTranslations();
