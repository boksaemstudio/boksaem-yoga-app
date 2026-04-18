/**
 * 데모 더미 데이터 현지화 유틸리티
 */

const LOCALIZED_NAMES = {
    en: [
        'Emma Johnson', 'Sophia Williams', 'Olivia Brown', 'Ava Davis',
        'Isabella Wilson', 'Mia Anderson', 'Charlotte Thomas', 'Amelia Taylor',
        'Harper Martinez', 'Evelyn Robinson', 'Luna Clark', 'Camila Lewis',
        'Gianna Walker', 'Elizabeth Hall', 'Eleanor Allen', 'Abigail Young',
        'Sofia King', 'Avery Wright', 'Scarlett Hill', 'Emily Scott',
        'Aria Green', 'Penelope Adams', 'Chloe Baker', 'Layla Nelson',
        'Riley Carter', 'Zoey Mitchell', 'Nora Roberts', 'Lily Collins',
        'Grace Stewart', 'Hannah Morgan', 'Stella Cooper', 'Violet Reed',
        'Aurora Cox', 'Savannah Ward', 'Brooklyn Bailey', 'Bella Rivera',
        'Claire Sullivan', 'Skylar Russell', 'Lucy Griffin', 'Paisley Hayes',
    ],
    ja: [
        '山田 花子', '佐藤 美咲', '鈴木 陽子', '田中 真理',
        '高橋 千尋', '伊藤 さくら', '渡辺 結衣', '中村 愛',
        '小林 理恵', '加藤 優子', '吉田 美紀', '山口 智子',
        '松本 恵子', '井上 麻衣', '木村 綾', '石井 瞳',
        '前田 由美', '藤田 奈々', '後藤 翔子', '岡田 真由美',
        '長谷川 舞', '近藤 千春', '村上 亜希', '遠藤 涼子',
        '青木 香織', '坂本 明美', '斎藤 裕子', '福田 桃子',
        '太田 彩花', '三浦 詩織', '森 由紀子', '池田 菜々子',
        '橋本 茜', '阿部 礼子', '石田 美穂', '山崎 春香',
        '中島 友美', '横山 直美', '宮崎 絵里', '西村 久美子',
    ],
    zh: [
        '王芳', '李娜', '张伟', '刘洋', '陈静', '杨丽',
        '赵敏', '黄蕾', '周婷', '吴秀英', '徐佳', '孙悦',
        '胡雪', '朱玲', '高晓', '林清', '何梅', '郭芳',
        '马丽', '罗琴', '梁洁', '宋雅', '郑琳', '谢颖',
        '韩丹', '唐薇', '冯蓓', '许萌', '邓慧', '曹岚',
        '彭晶', '曾欢', '萧静', '田园', '董雪', '潘美',
        '蒋芸', '蔡莉', '余霞', '杜鹃',
    ],
    es: [
        'Valentina García', 'Camila López', 'Sofía Martínez', 'Isabella Rodríguez',
        'Luciana Hernández', 'Mariana Pérez', 'Gabriela Sánchez', 'Daniela Ramírez',
        'Paula Torres', 'Andrea Flores', 'Natalia Díaz', 'Carolina Morales',
        'Fernanda Ortiz', 'María Castillo', 'Ana Vargas', 'Laura Mendoza',
        'Elena Ruiz', 'Alejandra Cruz', 'Victoria Reyes', 'Catalina Gutiérrez',
        'Renata Rojas', 'Valeria Medina', 'Jimena Aguilar', 'Regina Herrera',
        'Ximena Castro', 'Emilia Romero', 'Sara Navarro', 'Lucia Vega',
        'Julia Ramos', 'Diana Guerrero', 'Adriana Molina', 'Teresa Delgado',
        'Carmen Ríos', 'Rocío Suárez', 'Pilar Acosta', 'Inés Silva',
        'Alicia Campos', 'Rosa Peña', 'Claudia Lara', 'Patricia Vera',
    ],
    pt: [
        'Ana Silva', 'Beatriz Santos', 'Camila Oliveira', 'Diana Costa',
        'Eduarda Lima', 'Fernanda Pereira', 'Gabriela Souza', 'Helena Rodrigues',
        'Isabela Almeida', 'Juliana Carvalho', 'Larissa Nascimento', 'Mariana Araújo',
        'Natália Gomes', 'Paula Ribeiro', 'Rafaela Martins', 'Sofia Ferreira',
        'Valentina Barbosa', 'Yasmin Rocha', 'Amanda Moreira', 'Bianca Teixeira',
        'Carolina Monteiro', 'Débora Cardoso', 'Elisa Correia', 'Flávia Mendes',
        'Giovanna Vieira', 'Heloísa Lopes', 'Ingrid Dias', 'Jéssica Andrade',
        'Karina Cunha', 'Letícia Campos', 'Manuela Rezende', 'Nicole Freitas',
        'Olívia Pinto', 'Priscila Ramos', 'Renata Reis', 'Sabrina Castro',
        'Tatiana Duarte', 'Vanessa Nunes', 'Viviane Moura', 'Aline Fonseca',
    ],
    ru: [
        'Анна Иванова', 'Мария Петрова', 'Елена Сидорова', 'Ольга Козлова',
        'Наталья Новикова', 'Екатерина Морозова', 'Татьяна Волкова', 'Ирина Алексеева',
        'Светлана Лебедева', 'Юлия Семёнова', 'Дарья Егорова', 'Алёна Павлова',
        'Ксения Николаева', 'Виктория Кузнецова', 'Анастасия Попова', 'Полина Соколова',
        'Александра Михайлова', 'Марина Фёдорова', 'Валентина Орлова', 'Людмила Андреева',
        'Вероника Макарова', 'Диана Степанова', 'Кристина Романова', 'Алина Захарова',
        'Надежда Белова', 'Софья Тихонова', 'Регина Комарова', 'Лариса Григорьева',
        'Галина Кудрявцева', 'Евгения Баранова', 'Оксана Куликова', 'Инна Смирнова',
        'Жанна Власова', 'Тамара Медведева', 'Раиса Ковалёва', 'Зоя Ильина',
        'Лилия Гусева', 'Нина Титова', 'Варвара Калинина', 'Маргарита Воронова',
    ],
    fr: [
        'Camille Dupont', 'Léa Martin', 'Manon Bernard', 'Chloé Petit',
        'Emma Durand', 'Inès Leroy', 'Jade Moreau', 'Louise Simon',
        'Zoé Laurent', 'Alice Lefebvre', 'Lina Michel', 'Rose Garnier',
        'Juliette Faure', 'Anna Roux', 'Mila André', 'Eva Mercier',
        'Charlotte Blanc', 'Romane Guérin', 'Agathe Muller', 'Margaux Boyer',
        'Clara Fournier', 'Sarah Girard', 'Mathilde Bonnet', 'Lucie Lambert',
        'Ambre Fontaine', 'Léonie Rousseau', 'Nora Vincent', 'Elsa Clément',
        'Victoire Gauthier', 'Anaïs Perrin', 'Adèle Robin', 'Iris Morel',
        'Nina Henry', 'Capucine Bertrand', 'Céleste Arnaud', 'Margot Nicolas',
        'Apolline Roche', 'Constance Renault', 'Diane Picard', 'Hélène Marchand',
    ],
    de: [
        'Lena Müller', 'Sophie Schmidt', 'Marie Schneider', 'Anna Fischer',
        'Laura Weber', 'Johanna Meyer', 'Hannah Wagner', 'Emilia Becker',
        'Lina Hoffmann', 'Mila Schulz', 'Ella Koch', 'Clara Bauer',
        'Amelie Richter', 'Lea Wolf', 'Maja Klein', 'Ida Schröder',
        'Frieda Neumann', 'Charlotte Schwarz', 'Luisa Zimmermann', 'Nora Braun',
        'Greta Hofmann', 'Emma Krüger', 'Sophia Hartmann', 'Mia Werner',
        'Mathilda Schmitt', 'Hanna Lange', 'Pia Krause', 'Lotta Meier',
        'Theresa Beck', 'Antonia König', 'Ronja Winter', 'Marlene Huber',
        'Finja Schmid', 'Romy Kaiser', 'Tilda Fuchs', 'Juna Scholz',
        'Stella Lang', 'Carla Weiß', 'Valentina Hahn', 'Helena Vogel',
    ],
    vi: [
        'Nguyễn Thị Lan', 'Trần Thị Hoa', 'Lê Thị Mai', 'Phạm Thị Hương',
        'Hoàng Thị Linh', 'Huỳnh Thị Ngọc', 'Võ Thị Thu', 'Đặng Thị Trang',
        'Bùi Thị Thanh', 'Đỗ Thị Phương', 'Ngô Thị Yến', 'Dương Thị Hà',
        'Lý Thị Oanh', 'Vũ Thị Diệu', 'Trịnh Thị Nhung', 'Đinh Thị Thảo',
        'Phan Thị Kim', 'Tạ Thị Hạnh', 'Lương Thị Bích', 'Hồ Thị Mỹ',
        'Cao Thị Ánh', 'Tô Thị Xuân', 'Châu Thị Ngân', 'Quách Thị Tuyết',
        'Mai Thị Loan', 'Từ Thị Dung', 'Lâm Thị Cúc', 'Tăng Thị Sen',
        'Kiều Thị Vân', 'Hà Thị Lý', 'La Thị Đào', 'Ung Thị Trúc',
        'Tiêu Thị Nga', 'Mạc Thị Hiền', 'Sơn Thị Quyên', 'Khương Thị Giang',
        'Giáp Thị An', 'Thạch Thị Minh', 'Cung Thị Vy', 'Nghiêm Thị Thùy',
    ],
    th: [
        'สมใจ วงศ์ไพศาล', 'นิตยา สุขสวัสดิ์', 'พรพิมล จันทร์เพ็ญ', 'วิภาดา รัตนะ',
        'สุกัญญา ศรีสุข', 'อรุณี ทองดี', 'กนกวรรณ ประเสริฐ', 'จิราพร พงศ์พันธุ์',
        'ธนพร แก้วมณี', 'ปิยะดา สมบูรณ์', 'มนัสนันท์ วิไล', 'ลักษณา บุญเรือง',
        'ศิริพร อินทร์แก้ว', 'อัจฉรา เจริญผล', 'กุลนาถ ภูมิพันธ์', 'ชนิดา สุวรรณ',
        'ณัฐธิดา พิทักษ์', 'ดารณี มงคล', 'ทิพวรรณ ศักดิ์ศรี', 'นภาพร ชัยยา',
        'บุษบา เดชะ', 'ปาริชาติ โชติกุล', 'ผกามาศ นิลวรรณ', 'พัชรี ธรรมชาติ',
        'มาลินี อมรเทพ', 'รัชนี สุขุม', 'วราภรณ์ พิศาล', 'ศศิธร เกษม',
        'สุชาดา ปัญญา', 'อุไรวรรณ จิตรา', 'จารุวรรณ สันติ', 'ฐิติมา วัฒนา',
        'ณิชา เมธา', 'ดวงใจ ประดิษฐ์', 'ทัศนีย์ อุดม', 'นริศรา ถาวร',
        'บังอร วรรณา', 'ปวีณา กิตติ', 'พิมพ์ใจ สิริ', 'รุ่งนภา ภัทร',
    ],
};

const LOCALIZED_CLASSES = {
    en: {
        '하타': 'Hatha', '아쉬탕가': 'Ashtanga', '마이솔': 'Mysore',
        '빈야사': 'Vinyasa', '힐링': 'Healing', '인요가': 'Yin Yoga',
        '인양요가': 'Yin Yang', '플라잉': 'Aerial', '로우플라잉': 'Low Aerial',
        '키즈플라잉': 'Kids Aerial', '임신부요가': 'Prenatal',
        '하타 인텐시브': 'Hatha Intensive', '심화': 'Advanced',
        '일반': 'General', '자율수련': 'Self Practice',
        '지도자과정': 'Teacher Training',
    },
    ja: {
        '하타': 'ハタ', '아쉬탕가': 'アシュタンガ', '마이솔': 'マイソール',
        '빈야사': 'ヴィンヤサ', '힐링': 'ヒーリング', '인요가': '陰ヨガ',
        '인양요가': '陰陽ヨガ', '플라잉': 'エアリアル', '로우플라잉': 'ローエアリアル',
        '키즈플라잉': 'キッズエアリアル', '임신부요가': 'マタニティ',
        '하타 인텐시브': 'ハタインテンシブ', '심화': 'アドバンス',
        '일반': '一般', '자율수련': '自主練習',
        '지도자과정': '指導者コース',
    },
    zh: {
        '하타': '哈他', '아쉬탕가': '阿斯汤加', '마이솔': '迈索尔',
        '빈야사': '流瑜伽', '힐링': '疗愈', '인요가': '阴瑜伽',
        '인양요가': '阴阳瑜伽', '플라잉': '空中瑜伽', '로우플라잉': '低空瑜伽',
        '키즈플라잉': '儿童空中', '임신부요가': '孕妇瑜伽',
        '하타 인텐시브': '哈他强化', '심화': '进阶',
        '일반': '普通', '자율수련': '自主练习',
        '지도자과정': '教师培训',
    },
    ru: {
        '하타': 'Хатха', '아쉬탕가': 'Аштанга', '마이솔': 'Майсор',
        '빈야사': 'Виньяса', '힐링': 'Исцеление', '인요가': 'Инь-йога',
        '인양요가': 'Инь-Ян', '플라잉': 'Аэройога', '로우플라잉': 'Низкий аэро',
        '키즈플라잉': 'Детский аэро', '임신부요가': 'Пренатальная',
        '하타 인텐시브': 'Хатха интенсив', '심화': 'Продвинутый',
        '일반': 'Общий', '자율수련': 'Самостоятельная',
        '지도자과정': 'Подготовка тренеров',
    },
    vi: {
        '하타': 'Hatha', '아쉬탕가': 'Ashtanga', '마이솔': 'Mysore',
        '빈야사': 'Vinyasa', '힐링': 'Chữa lành', '인요가': 'Âm Yoga',
        '인양요가': 'Âm Dương', '플라잉': 'Yoga bay', '로우플라잉': 'Bay thấp',
        '키즈플라잉': 'Bay trẻ em', '임신부요가': 'Yoga bầu',
        '하타 인텐시브': 'Hatha nâng cao', '심화': 'Nâng cao',
        '일반': 'Cơ bản', '자율수련': 'Tự luyện',
        '지도자과정': 'Đào tạo giáo viên',
    },
    th: {
        '하타': 'หฐะ', '아쉬탕가': 'อัษฎางค์', '마이솔': 'ไมซอร์',
        '빈야사': 'วินยาสะ', '힐링': 'ฮีลลิ่ง', '인요가': 'หยินโยคะ',
        '인양요가': 'หยินหยาง', '플라잉': 'แอเรียล', '로우플라잉': 'โลว์แอเรียล',
        '키즈플라잉': 'คิดส์แอเรียล', '임신부요가': 'โยคะคนท้อง',
        '하타 인텐시브': 'หฐะอินเทนซีฟ', '심화': 'ขั้นสูง',
        '일반': 'ทั่วไป', '자율수련': 'ฝึกด้วยตนเอง',
        '지도자과정': 'หลักสูตรครู',
    },
};

const LOCALIZED_BRANCHES = {
    en: { '광흥창점': 'Gwangheungchang', '마포점': 'Mapo' },
    ja: { '광흥창점': '光興倉店', '마포점': '麻浦店' },
    zh: { '광흥창점': '光兴仓店', '마포점': '麻浦店' },
    es: { '광흥창점': 'Gwangheungchang', '마포점': 'Mapo' },
    pt: { '광흥창점': 'Gwangheungchang', '마포점': 'Mapo' },
    ru: { '광흥창점': 'Кванхынчхан', '마포점': 'Мапо' },
    fr: { '광흥창점': 'Gwangheungchang', '마포점': 'Mapo' },
    de: { '광흥창점': 'Gwangheungchang', '마포점': 'Mapo' },
    vi: { '광흥창점': 'Gwangheungchang', '마포점': 'Mapo' },
    th: { '광흥창점': 'Gwangheungchang', '마포점': 'Mapo' },
};

const LOCALIZED_CURRENCY = {
    en: { code: 'USD', symbol: '$', rate: 0.00075 },
    ja: { code: 'JPY', symbol: '¥', rate: 0.11 },
    zh: { code: 'CNY', symbol: '¥', rate: 0.0054 },
    es: { code: 'EUR', symbol: '€', rate: 0.00068 },
    fr: { code: 'EUR', symbol: '€', rate: 0.00068 },
    de: { code: 'EUR', symbol: '€', rate: 0.00068 },
    ru: { code: 'RUB', symbol: '₽', rate: 0.07 },
    pt: { code: 'BRL', symbol: 'R$', rate: 0.0037 },
    vi: { code: 'VND', symbol: '₫', rate: 18.5 },
    th: { code: 'THB', symbol: '฿', rate: 0.026 },
};

const LOCALIZED_PRICING_NAMES = {
    en: { 'MTypeC (Pass)': 'Unlimited Pass', '정규권(3개월)': 'Regular (3 Months)', '쿠폰(10회)': 'Drop-in (10 Class)', '원데이 클래스': 'One-Day Class' },
    ja: { 'MTypeC (Pass)': '通い放題パス', '정규권(3개월)': 'レギュラー(3ヶ月)', '쿠폰(10회)': 'クーポン(10回)', '원데이 클래스': 'ワンデークラス' },
    zh: { 'MTypeC (Pass)': '无限次通票', '정규권(3개월)': '定期通票(3个月)', '쿠폰(10회)': '次卡(10次)', '원데이 클래스': '单次体验课' },
    es: { 'MTypeC (Pass)': 'Pase Ilimitado', '정규권(3개월)': 'Regular (3 Meses)', '쿠폰(10회)': 'Bono (10 Clases)', '원데이 클래스': 'Clase de Prueba' },
    pt: { 'MTypeC (Pass)': 'Passe Ilimitado', '정규권(3개월)': 'Regular (3 Meses)', '쿠폰(10회)': 'Pacote (10 Aulas)', '원데이 클래스': 'Aula Avulsa' },
    ru: { 'MTypeC (Pass)': 'Безлимит', '정규권(3개월)': 'Абонемент (3 мес.)', '쿠폰(10회)': 'Купон (10 зан.)', '원데이 클래스': 'Пробное занятие' },
    fr: { 'MTypeC (Pass)': 'Pass Illimité', '정규권(3개월)': 'Abonnement (3 Mois)', '쿠폰(10회)': 'Carnet (10 Cours)', '원데이 클래스': 'Cours d\'essai' },
    de: { 'MTypeC (Pass)': 'Flatrate-Pass', '정규권(3개월)': 'Abo (3 Monate)', '쿠폰(10회)': '10er-Karte', '원데이 클래스': 'Schnupperstunde' },
    vi: { 'MTypeC (Pass)': 'Vé Không Giới Hạn', '정규권(3개월)': 'Gói 3 Tháng', '쿠폰(10회)': 'Gói 10 Buổi', '원데이 클래스': 'Lớp Thử' },
    th: { 'MTypeC (Pass)': 'บัตรไม่จำกัด', '정규권(3개월)': 'แพ็คเกจ 3 เดือน', '쿠폰(10회)': 'แพ็คเกจ 10 ครั้ง', '원데이 클래스': 'คลาสทดลอง' },
};

const LOCALIZED_INSIGHTS = {
    en: { '근면성실도': 'Diligence', '주간 출석': 'Weekly Check-ins', '수간 출석': 'Weekly Check-ins', '규칙성': 'Regularity', '꾸준함': 'Consistency', '최근 활력': 'Recent Vitality', '호흡해요! 꾸준함이 빛나는 수련자': 'Breathe! A practitioner shining with consistency' },
    ja: { '근면성실도': '勤勉性', '주간 출석': '週間出席', '수간 출석': '週間出席', '규칙성': '規則性', '꾸준함': '着実さ', '최근 활력': '最近の活力', '호흡해요! 꾸준함이 빛나는 수련자': '呼吸して！着実さが輝く修練者' },
    zh: { '근면성실도': '勤奋度', '주간 출석': '每周出勤', '수간 출석': '每周出勤', '규칙성': '规律性', '꾸준함': '坚持度', '최근 활력': '近期活力', '호흡해요! 꾸준함이 빛나는 수련자': '呼吸吧！坚持不懈的练习者' },
    es: { '근면성실도': 'Diligencia', '주간 출석': 'Asistencia semanal', '수간 출석': 'Asistencia semanal', '규칙성': 'Regularidad', '꾸준함': 'Constancia', '최근 활력': 'Vitalidad reciente', '호흡해요! 꾸준함이 빛나는 수련자': '¡Respira! Un practicante que brilla con constancia' },
    pt: { '근면성실도': 'Dedicação', '주간 출석': 'Frequência semanal', '수간 출석': 'Frequência semanal', '규칙성': 'Regularidade', '꾸준함': 'Consistência', '최근 활력': 'Vitalidade recente', '호흡해요! 꾸준함이 빛나는 수련자': 'Respire! Um praticante que brilha com consistência' },
    ru: { '근면성실도': 'Усердие', '주간 출석': 'Посещения за неделю', '수간 출석': 'Посещения за неделю', '규칙성': 'Регулярность', '꾸준함': 'Стабильность', '최근 활력': 'Недавняя активность', '호흡해요! 꾸준함이 빛나는 수련자': 'Дышите! Практик, сияющий стабильностью' },
    fr: { '근면성실도': 'Assiduité', '주간 출석': 'Présence hebdo', '수간 출석': 'Présence hebdo', '규칙성': 'Régularité', '꾸준함': 'Persévérance', '최근 활력': 'Vitalité récente', '호흡해요! 꾸준함이 빛나는 수련자': 'Respirez ! Un pratiquant rayonnant de persévérance' },
    de: { '근면성실도': 'Fleiß', '주간 출석': 'Wochenbesuche', '수간 출석': 'Wochenbesuche', '규칙성': 'Regelmäßigkeit', '꾸준함': 'Beständigkeit', '최근 활력': 'Aktuelle Vitalität', '호흡해요! 꾸준함이 빛나는 수련자': 'Atme! Ein Praktizierender, der vor Beständigkeit strahlt' },
    vi: { '근면성실도': 'Chuyên cần', '주간 출석': 'Điểm danh tuần', '수간 출석': 'Điểm danh tuần', '규칙성': 'Tính đều đặn', '꾸준함': 'Kiên trì', '최근 활력': 'Sức sống gần đây', '호흡해요! 꾸준함이 빛나는 수련자': 'Hít thở! Người tập toả sáng với sự kiên trì' },
    th: { '근면성실도': 'ความขยัน', '주간 출석': 'เช็คอินรายสัปดาห์', '수간 출석': 'เช็คอินรายสัปดาห์', '규칙성': 'ความสม่ำเสมอ', '꾸준함': 'ความสม่ำเสมอ', '최근 활력': 'พลังล่าสุด', '호흡해요! 꾸준함이 빛나는 수련자': 'หายใจ! ผู้ฝึกที่เปล่งประกายด้วยความสม่ำเสมอ' },
};

const nameCache = {};

export function localizeKoreanName(sourceName, lang) {
    if (!sourceName || lang === 'ko') return sourceName;
    const names = LOCALIZED_NAMES[lang] || LOCALIZED_NAMES.en;
    const cacheKey = `${lang}:${sourceName}`;
    if (nameCache[cacheKey]) return nameCache[cacheKey];

    // Check if source name is Korean or English (both need conversion for non-en/ko targets)
    const isKorean = /[\uAC00-\uD7AF]/.test(sourceName);
    const isEnglish = /^[A-Za-z\s\-'.]+$/.test(sourceName);

    // If the name is already in the target language's script, skip
    if (!isKorean && !isEnglish) return sourceName;
    // English name + English target = no conversion needed
    if (isEnglish && lang === 'en') return sourceName;
    // Korean name stays as-is handled above (lang === 'ko' check)

    let hash = 0;
    for (let i = 0; i < sourceName.length; i++) {
        hash = ((hash << 5) - hash) + sourceName.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % names.length;
    const localizedName = names[index];
    nameCache[cacheKey] = localizedName;
    return localizedName;
}

export function localizeClassName(koreanName, lang) {
    if (!koreanName || lang === 'ko') return koreanName;
    const classMap = LOCALIZED_CLASSES[lang] || LOCALIZED_CLASSES.en;
    return classMap[koreanName] || koreanName;
}

export function localizeBranchName(branchName, lang) {
    if (!branchName || lang === 'ko') return branchName;
    const branchMap = LOCALIZED_BRANCHES[lang] || LOCALIZED_BRANCHES.en;
    return branchMap[branchName] || branchName;
}

export function isDemoEnvironment() {
    if (typeof window === 'undefined') return false;
    return window.location.hostname.includes('passflow') ||
           window.location.hostname.includes('demo') ||
           window.location.hostname === 'localhost' ||
           localStorage.getItem('lastStudioId')?.startsWith('demo') ||
           localStorage.getItem('lastStudioId') === 'passflowai';
}

export function localizeMember(member, lang) {
    if (!member || lang === 'ko' || !isDemoEnvironment()) return member;
    return {
        ...member,
        name: localizeKoreanName(member.name, lang),
        memo: member.memo ? '...' : '',
    };
}

export function localizeMembers(members, lang) {
    if (!members || lang === 'ko' || !isDemoEnvironment()) return members;
    return members.map(m => localizeMember(m, lang));
}

// === NEW PROXY FUNCTIONS ===

export function localizeConfig(config, lang) {
    if (!config || lang === 'ko' || !isDemoEnvironment()) return config;
    const newConfig = JSON.parse(JSON.stringify(config));
    
    // Identity details localization
    const STRINGS = {
        en: { name: 'Lotus Yoga Studio', intro: 'A quiet time to meet my inner self' },
        ja: { name: 'ロータスヨガスタジオ', intro: '自分自身に出会う静かな時間' },
        zh: { name: '莲花瑜伽工作室', intro: '与自己相遇的安静时光' },
        es: { name: 'Lotus Yoga Studio', intro: 'Un momento de tranquilidad para encontrarme' },
        pt: { name: 'Lotus Yoga Studio', intro: 'Um momento tranquilo para me encontrar' },
        ru: { name: 'Lotus Yoga Studio', intro: 'Тихое время для встречи с собой' },
        fr: { name: 'Lotus Yoga Studio', intro: 'Un moment calme pour se retrouver' },
        de: { name: 'Lotus Yoga Studio', intro: 'Eine ruhige Zeit, um sich selbst zu begegnen' },
        vi: { name: 'Lotus Yoga Studio', intro: 'Khoảnh khắc yên tĩnh gặp gỡ chính mình' },
        th: { name: 'Lotus Yoga Studio', intro: 'ช่วงเวลาเงียบสงบเพื่อพบตัวเอง' },
    };
    const s = STRINGS[lang] || STRINGS.en;
    if (newConfig.IDENTITY) {
        newConfig.IDENTITY.STUDIO_NAME = s.name;
        newConfig.IDENTITY.NAME = s.name;
        newConfig.IDENTITY.ONE_LINE_INTRO = s.intro;
    }
    return newConfig;
}

export function localizeScheduleItem(item, lang) {
    if (!item || lang === 'ko' || !isDemoEnvironment()) return item;
    const modified = { ...item };
    modified.classType = localizeClassName(item.classType, lang);
    if (modified.instructor) {
        modified.instructor = localizeKoreanName(modified.instructor, lang);
    }
    // Remove image if localization makes it weird
    if (modified.imageUrl) {
        modified.imageUrl = null;
    }
    return modified;
}

export function localizeSchedules(schedules, lang) {
    if (!schedules || !Array.isArray(schedules)) return schedules;
    return schedules.map(s => localizeScheduleItem(s, lang));
}

export function localizePricingItem(item, lang) {
    if (!item || lang === 'ko' || !isDemoEnvironment()) return item;
    const modified = { ...item };
    
    const nameMap = LOCALIZED_PRICING_NAMES[lang] || LOCALIZED_PRICING_NAMES.en;
    if (modified.title && nameMap[modified.title]) {
        modified.title = nameMap[modified.title];
    }

    if (modified.imageUrl) {
        modified.imageUrl = null; 
    }

    // Currency Conversion
    const currency = LOCALIZED_CURRENCY[lang] || LOCALIZED_CURRENCY.en;
    if (modified.price && typeof modified.price === 'number') { // original is KRW
        const rawConverted = modified.price * currency.rate;
        // Make nice numbers (e.g., 59.99 for USD)
        if (currency.code === 'JPY') {
            modified.price = Math.round(rawConverted / 100) * 100; // round to 100 yens
            modified.priceFormatted = currency.symbol + modified.price.toLocaleString();
        } else if (currency.code === 'CNY') {
            modified.price = Math.round(rawConverted);
            modified.priceFormatted = currency.symbol + modified.price;
        } else {
            modified.price = Math.floor(rawConverted) + 0.99;
            modified.priceFormatted = currency.symbol + modified.price;
        }
    }
    return modified;
}

export function localizePricings(pricings, lang) {
    if (!pricings || !Array.isArray(pricings)) return pricings;
    return pricings.map(p => localizePricingItem(p, lang));
}

export function localizeInsightObject(insight, lang) {
    if (!insight || lang === 'ko' || !isDemoEnvironment()) return insight;
    // Walk the insight object and replace keys/values
    const newInsight = JSON.parse(JSON.stringify(insight));
    const dict = LOCALIZED_INSIGHTS[lang] || LOCALIZED_INSIGHTS.en;
    
    const translateDeep = (obj) => {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                for (const kr in dict) {
                    if (obj[key].includes(kr)) {
                        obj[key] = obj[key].replace(new RegExp(kr, 'g'), dict[kr]);
                    }
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                translateDeep(obj[key]);
            }
        }
    };
    translateDeep(newInsight);
    return newInsight;
}

export function localizeNoticeItem(item, lang) {
    if (!item || lang === 'ko' || !isDemoEnvironment()) return item;
    const modified = { ...item };
    
    // Replace hardcoded korean strings with language equivalents
    const noticesMap = {
        en: { title: 'Welcome to PassFlow Demo', content: 'Explore the powerful features of our Global SaaS Yoga Studio Management System.' },
        ja: { title: 'PassFlowデモへようこそ', content: 'グローバルSaaSヨガスタジオ管理システムの強力な機能をご覧ください。' },
        zh: { title: '欢迎来到PassFlow演示', content: '探索我们全球SaaS瑜伽工作室管理系统的强大功能。' },
        es: { title: 'Bienvenido al demo de PassFlow', content: 'Explore las poderosas funciones de nuestro sistema.' },
        fr: { title: 'Bienvenue dans la démo PassFlow', content: 'Explorez les puissantes fonctionnalités de notre système.' },
    };
    const s = noticesMap[lang] || noticesMap.en;
    modified.title = s.title || noticesMap.en.title;
    modified.content = s.content || noticesMap.en.content;
    modified.imageUrl = null; // Removed images to prevent awkward korean texts on demo images
    return modified;
}

export function localizeNotices(notices, lang) {
    if (!notices || !Array.isArray(notices)) return notices;
    return notices.map(n => localizeNoticeItem(n, lang));
}

export function localizeInstructorItem(instructor, lang) {
    if (!instructor || lang === 'ko' || !isDemoEnvironment()) return instructor;
    return {
        ...instructor,
        name: localizeKoreanName(instructor.name, lang),
        bio: instructor.bio ? '...' : instructor.bio,
    };
}

export function localizeInstructors(instructors, lang) {
    if (!instructors || !Array.isArray(instructors)) return instructors;
    return instructors.map(i => localizeInstructorItem(i, lang));
}
