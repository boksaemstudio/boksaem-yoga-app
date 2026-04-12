/**
 * 🌐 Global Demo Studios Seeder
 * Creates localized demo studios for 8 languages with native data
 * Run: node scripts/seed_global_demos.cjs
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'functions', 'service-account-key.json');
if (!fs.existsSync(serviceAccountPath)) { console.error('Service account key not found'); process.exit(1); }
const serviceAccount = require(serviceAccountPath);
if (!admin.apps.length) { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); }
const db = admin.firestore();

// ═══════════════════════════════════════════════════════════════
// 🌍 LOCALIZED DATA FOR EACH LANGUAGE
// ═══════════════════════════════════════════════════════════════
const STUDIOS = {
  en: {
    id: 'demo-yoga-en',
    name: 'PassFlow Demo Studio',
    slogan: 'The smartest way to run your yoga studio',
    branches: [
      { id: 'A', name: 'Downtown Studio', color: '#8B5CF6' },
      { id: 'B', name: 'Uptown Studio', color: '#3B82F6' }
    ],
    classTypes: ['Vinyasa Flow', 'Hatha Yoga', 'Yin Yoga', 'Power Yoga', 'Pilates Reformer', 'Hot Yoga'],
    classNames: ['Morning Vinyasa', 'Pilates Reformer', 'Relaxing Yin', 'Power Flow', 'Core Intensive', 'Evening Stretch'],
    instructors: [
      { name: 'Emma Johnson', role: 'admin', photo: '' },
      { name: 'Sophie Lee', role: 'manager', photo: '' },
      { name: 'Lucy Chen', role: 'instructor', photo: '' },
      { name: 'Olivia Park', role: 'instructor', photo: '' }
    ],
    firstNames: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'],
    lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'White', 'Harris', 'Clark'],
    phonePrefix: '+1-',
    phoneFormat: (i) => `+1-555-${String(100+i).padStart(4, '0')}`,
    membershipTypes: { 'MTypeA': 'Reformer Pilates 30-Class', 'MTypeB': 'Unlimited Monthly', 'MTypeC': 'Vinyasa Unlimited Pass', 'MTypeD': 'Drop-in Class' },
    pricingLabel: { group: 'Group Classes', private: '1-on-1 Private' },
    pricingOptions: {
      group: [
        { id: '1month', label: '1 Month Unlimited', price: 150, duration: 1, popular: true, discount: '' },
        { id: '3months', label: '3 Months — 30 Classes', price: 350, duration: 3, credits: 30, popular: false, discount: '20% off' }
      ],
      private: [
        { id: '10sessions', label: '10 Private Sessions', price: 600, duration: 3, credits: 10, popular: true, discount: '' }
      ]
    },
    notice: { title: '[Notice] Spring Studio Refresh', content: 'Welcome to PassFlow Demo Studio! Our AI assistant is now available to help manage your studio. Try asking it anything!' },
    saleName: 'Membership Purchase',
    currency: 'USD',
    priceMultiplier: 1,
    timezone: 'America/New_York'
  },

  ja: {
    id: 'demo-yoga-ja',
    name: 'PassFlowデモスタジオ',
    slogan: '最もスマートなヨガスタジオ運営システム',
    branches: [
      { id: 'A', name: '六本木スタジオ', color: '#8B5CF6' },
      { id: 'B', name: '渋谷スタジオ', color: '#3B82F6' }
    ],
    classTypes: ['ヴィンヤサ', 'ハタヨガ', '陰ヨガ', 'リストラティブ', 'マシンピラティス', 'ホットヨガ'],
    classNames: ['朝のヴィンヤサ', 'マシンピラティス', 'リラックス陰ヨガ', 'パワーフロー', 'コアインテンシブ', '夜のストレッチ'],
    instructors: [
      { name: '田中 さくら', role: 'admin', photo: '' },
      { name: '山田 めい', role: 'manager', photo: '' },
      { name: '鈴木 あおい', role: 'instructor', photo: '' },
      { name: '佐藤 りん', role: 'instructor', photo: '' }
    ],
    firstNames: ['田中', '山田', '鈴木', '佐藤', '高橋', '渡辺', '伊藤', '中村', '小林', '加藤', '吉田', '山口', '松本', '井上', '木村', '林', '清水', '山崎', '森', '池田'],
    lastNames: ['さくら', 'めい', 'あおい', 'りん', 'はると', 'ゆい', 'ひな', 'みなみ', 'こころ', 'あかり', 'そうた', 'ゆうき', 'けんた', 'りょう', 'たくみ', 'かえで', 'まゆ', 'いちか', 'ほのか', 'ゆず'],
    phonePrefix: '+81-',
    phoneFormat: (i) => `+81-90-${String(1000+i).padStart(4, '0')}-${String(Math.floor(Math.random()*9000)+1000)}`,
    membershipTypes: { 'MTypeA': 'マシンピラティス30回券', 'MTypeB': '月額フリーパス', 'MTypeC': 'ヴィンヤサ無制限パス', 'MTypeD': 'ドロップイン' },
    pricingLabel: { group: 'グループレッスン', private: 'プライベートレッスン' },
    pricingOptions: {
      group: [
        { id: '1month', label: '月額フリーパス', price: 16500, duration: 1, popular: true, discount: '' },
        { id: '3months', label: '3ヶ月30回券', price: 39600, duration: 3, credits: 30, popular: false, discount: '20%OFF' }
      ],
      private: [
        { id: '10sessions', label: '10回券', price: 66000, duration: 3, credits: 10, popular: true, discount: '' }
      ]
    },
    notice: { title: '【お知らせ】春のスタジオリニューアル', content: 'PassFlowデモスタジオへようこそ！AI アシスタントが利用可能になりました。何でもお気軽にお尋ねください！' },
    saleName: '受講料お支払い',
    currency: 'JPY',
    priceMultiplier: 110,
    timezone: 'Asia/Tokyo'
  },

  zh: {
    id: 'demo-yoga-zh',
    name: 'PassFlow演示工作室',
    slogan: '最智能的瑜伽工作室管理系统',
    branches: [
      { id: 'A', name: '朝阳中心店', color: '#8B5CF6' },
      { id: 'B', name: '海淀旗舰店', color: '#3B82F6' }
    ],
    classTypes: ['流瑜伽', '哈达瑜伽', '阴瑜伽', '力量瑜伽', '普拉提大器械', '高温瑜伽'],
    classNames: ['晨间流瑜伽', '普拉提大器械', '放松阴瑜伽', '力量流瑜伽', '核心强化', '晚间拉伸'],
    instructors: [
      { name: '王丽华', role: 'admin', photo: '' },
      { name: '张美玲', role: 'manager', photo: '' },
      { name: '李晓燕', role: 'instructor', photo: '' },
      { name: '陈雨婷', role: 'instructor', photo: '' }
    ],
    firstNames: ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗'],
    lastNames: ['美玲', '丽华', '晓燕', '雨婷', '静怡', '思涵', '欣怡', '梦瑶', '佳琪', '梓萱', '伟', '浩然', '志强', '明辉', '建国', '天宇', '博文', '子涵', '一诺', '宇轩'],
    phonePrefix: '+86-',
    phoneFormat: (i) => `+86-138-${String(1000+i).padStart(4, '0')}-${String(Math.floor(Math.random()*9000)+1000)}`,
    membershipTypes: { 'MTypeA': '大器械普拉提30次卡', 'MTypeB': '月度无限次卡', 'MTypeC': '流瑜伽畅享卡', 'MTypeD': '单次体验' },
    pricingLabel: { group: '团课', private: '一对一私教' },
    pricingOptions: {
      group: [
        { id: '1month', label: '月度无限次卡', price: 1200, duration: 1, popular: true, discount: '' },
        { id: '3months', label: '季卡30次', price: 2800, duration: 3, credits: 30, popular: false, discount: '8折优惠' }
      ],
      private: [
        { id: '10sessions', label: '10次私教课', price: 5000, duration: 3, credits: 10, popular: true, discount: '' }
      ]
    },
    notice: { title: '【公告】春季工作室焕新', content: '欢迎来到PassFlow演示工作室！AI助手现已上线，可以帮助您管理工作室的一切事务！' },
    saleName: '课程费用支付',
    currency: 'CNY',
    priceMultiplier: 7,
    timezone: 'Asia/Shanghai'
  },

  es: {
    id: 'demo-yoga-es',
    name: 'PassFlow Estudio Demo',
    slogan: 'La forma más inteligente de gestionar tu estudio',
    branches: [
      { id: 'A', name: 'Estudio Centro', color: '#8B5CF6' },
      { id: 'B', name: 'Estudio Norte', color: '#3B82F6' }
    ],
    classTypes: ['Vinyasa Flow', 'Hatha Yoga', 'Yoga Restaurativo', 'Power Yoga', 'Pilates Máquina', 'Hot Yoga'],
    classNames: ['Vinyasa Matutino', 'Pilates Máquina', 'Yoga Restaurativo', 'Power Flow', 'Core Intensivo', 'Estiramiento Nocturno'],
    instructors: [
      { name: 'María García', role: 'admin', photo: '' },
      { name: 'Sofía Rodríguez', role: 'manager', photo: '' },
      { name: 'Lucía Martínez', role: 'instructor', photo: '' },
      { name: 'Valentina López', role: 'instructor', photo: '' }
    ],
    firstNames: ['María', 'Sofía', 'Lucía', 'Valentina', 'Martina', 'Camila', 'Isabella', 'Daniela', 'Ana', 'Paula', 'Carlos', 'Miguel', 'Alejandro', 'Diego', 'Jorge', 'Pablo', 'Andrés', 'Luis', 'Fernando', 'Javier'],
    lastNames: ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Gutiérrez', 'Ortiz', 'Ruiz'],
    phonePrefix: '+34-',
    phoneFormat: (i) => `+34-6${String(10+i).padStart(2, '0')}-${String(Math.floor(Math.random()*900)+100)}-${String(Math.floor(Math.random()*900)+100)}`,
    membershipTypes: { 'MTypeA': 'Pilates Máquina 30 Clases', 'MTypeB': 'Mensual Ilimitado', 'MTypeC': 'Pase Vinyasa Ilimitado', 'MTypeD': 'Clase Suelta' },
    pricingLabel: { group: 'Clases Grupales', private: 'Clases Privadas' },
    pricingOptions: {
      group: [
        { id: '1month', label: 'Mensual Ilimitado', price: 89, duration: 1, popular: true, discount: '' },
        { id: '3months', label: 'Trimestral 30 Clases', price: 199, duration: 3, credits: 30, popular: false, discount: '20% dto.' }
      ],
      private: [
        { id: '10sessions', label: '10 Sesiones Privadas', price: 390, duration: 3, credits: 10, popular: true, discount: '' }
      ]
    },
    notice: { title: '[Aviso] Renovación Primaveral del Estudio', content: '¡Bienvenido a PassFlow Estudio Demo! El asistente AI ya está disponible para ayudarte a gestionar tu estudio.' },
    saleName: 'Pago de Membresía',
    currency: 'EUR',
    priceMultiplier: 0.9,
    timezone: 'Europe/Madrid'
  },

  fr: {
    id: 'demo-yoga-fr',
    name: 'PassFlow Studio Démo',
    slogan: 'La gestion la plus intelligente pour votre studio',
    branches: [
      { id: 'A', name: 'Studio Marais', color: '#8B5CF6' },
      { id: 'B', name: 'Studio Bastille', color: '#3B82F6' }
    ],
    classTypes: ['Vinyasa Flow', 'Hatha Yoga', 'Yoga Doux', 'Power Yoga', 'Pilates Machine', 'Yoga Chaud'],
    classNames: ['Vinyasa Matinal', 'Pilates Machine', 'Yoga Doux', 'Power Flow', 'Core Intensif', 'Étirement du Soir'],
    instructors: [
      { name: 'Marie Dupont', role: 'admin', photo: '' },
      { name: 'Sophie Bernard', role: 'manager', photo: '' },
      { name: 'Lucie Martin', role: 'instructor', photo: '' },
      { name: 'Camille Petit', role: 'instructor', photo: '' }
    ],
    firstNames: ['Marie', 'Sophie', 'Lucie', 'Camille', 'Juliette', 'Léa', 'Emma', 'Chloé', 'Inès', 'Manon', 'Lucas', 'Hugo', 'Louis', 'Nathan', 'Gabriel', 'Jules', 'Raphaël', 'Arthur', 'Ethan', 'Maxime'],
    lastNames: ['Dupont', 'Bernard', 'Martin', 'Petit', 'Thomas', 'Robert', 'Richard', 'Durand', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier', 'Girard'],
    phonePrefix: '+33-',
    phoneFormat: (i) => `+33-6-${String(10+i).padStart(2, '0')}-${String(Math.floor(Math.random()*90)+10)}-${String(Math.floor(Math.random()*90)+10)}-${String(Math.floor(Math.random()*90)+10)}`,
    membershipTypes: { 'MTypeA': 'Pilates Machine 30 Cours', 'MTypeB': 'Mensuel Illimité', 'MTypeC': 'Pass Vinyasa Illimité', 'MTypeD': 'Cours à l\'Unité' },
    pricingLabel: { group: 'Cours Collectifs', private: 'Cours Privés' },
    pricingOptions: {
      group: [
        { id: '1month', label: 'Mensuel Illimité', price: 95, duration: 1, popular: true, discount: '' },
        { id: '3months', label: 'Trimestriel 30 Cours', price: 220, duration: 3, credits: 30, popular: false, discount: '-20%' }
      ],
      private: [
        { id: '10sessions', label: '10 Séances Privées', price: 450, duration: 3, credits: 10, popular: true, discount: '' }
      ]
    },
    notice: { title: '[Annonce] Renouveau Printanier du Studio', content: 'Bienvenue au PassFlow Studio Démo ! L\'assistant IA est maintenant disponible pour vous aider à gérer votre studio.' },
    saleName: 'Paiement Abonnement',
    currency: 'EUR',
    priceMultiplier: 0.9,
    timezone: 'Europe/Paris'
  },

  de: {
    id: 'demo-yoga-de',
    name: 'PassFlow Demo-Studio',
    slogan: 'Die intelligenteste Art, Ihr Studio zu verwalten',
    branches: [
      { id: 'A', name: 'Studio Mitte', color: '#8B5CF6' },
      { id: 'B', name: 'Studio Prenzlauer Berg', color: '#3B82F6' }
    ],
    classTypes: ['Vinyasa Flow', 'Hatha Yoga', 'Yin Yoga', 'Power Yoga', 'Geräte-Pilates', 'Hot Yoga'],
    classNames: ['Morgen-Vinyasa', 'Geräte-Pilates', 'Entspannendes Yin', 'Power Flow', 'Core Intensiv', 'Abend-Stretching'],
    instructors: [
      { name: 'Anna Müller', role: 'admin', photo: '' },
      { name: 'Sophie Schmidt', role: 'manager', photo: '' },
      { name: 'Lena Fischer', role: 'instructor', photo: '' },
      { name: 'Mia Wagner', role: 'instructor', photo: '' }
    ],
    firstNames: ['Anna', 'Sophie', 'Lena', 'Mia', 'Emma', 'Hannah', 'Marie', 'Lina', 'Emilia', 'Ella', 'Ben', 'Leon', 'Paul', 'Noah', 'Elias', 'Finn', 'Felix', 'Lukas', 'Jonas', 'Max'],
    lastNames: ['Müller', 'Schmidt', 'Fischer', 'Wagner', 'Weber', 'Meyer', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Becker', 'Richter', 'Wolf', 'Klein', 'Schwarz', 'Braun', 'Zimmermann', 'Krüger', 'Hartmann', 'Lange'],
    phonePrefix: '+49-',
    phoneFormat: (i) => `+49-171-${String(1000+i).padStart(4, '0')}${String(Math.floor(Math.random()*900)+100)}`,
    membershipTypes: { 'MTypeA': 'Geräte-Pilates 30er-Karte', 'MTypeB': 'Monatliche Flatrate', 'MTypeC': 'Vinyasa Unlimited', 'MTypeD': 'Einzelstunde' },
    pricingLabel: { group: 'Gruppenkurse', private: 'Privatstunden' },
    pricingOptions: {
      group: [
        { id: '1month', label: 'Monatliche Flatrate', price: 89, duration: 1, popular: true, discount: '' },
        { id: '3months', label: '3-Monats 30er-Karte', price: 199, duration: 3, credits: 30, popular: false, discount: '20% Rabatt' }
      ],
      private: [
        { id: '10sessions', label: '10er-Karte Privat', price: 420, duration: 3, credits: 10, popular: true, discount: '' }
      ]
    },
    notice: { title: '[Ankündigung] Frühjahrs-Studio-Update', content: 'Willkommen im PassFlow Demo-Studio! Der KI-Assistent steht jetzt zur Verfügung, um Ihnen bei der Verwaltung Ihres Studios zu helfen.' },
    saleName: 'Mitgliedschaftszahlung',
    currency: 'EUR',
    priceMultiplier: 0.9,
    timezone: 'Europe/Berlin'
  },

  pt: {
    id: 'demo-yoga-pt',
    name: 'PassFlow Estúdio Demo',
    slogan: 'A forma mais inteligente de gerenciar seu estúdio',
    branches: [
      { id: 'A', name: 'Estúdio Jardins', color: '#8B5CF6' },
      { id: 'B', name: 'Estúdio Pinheiros', color: '#3B82F6' }
    ],
    classTypes: ['Vinyasa Flow', 'Hatha Yoga', 'Yoga Restaurativo', 'Power Yoga', 'Pilates Aparelho', 'Hot Yoga'],
    classNames: ['Vinyasa Matinal', 'Pilates Aparelho', 'Yoga Restaurativo', 'Power Flow', 'Core Intensivo', 'Alongamento Noturno'],
    instructors: [
      { name: 'Maria Silva', role: 'admin', photo: '' },
      { name: 'Ana Oliveira', role: 'manager', photo: '' },
      { name: 'Beatriz Santos', role: 'instructor', photo: '' },
      { name: 'Larissa Costa', role: 'instructor', photo: '' }
    ],
    firstNames: ['Maria', 'Ana', 'Beatriz', 'Larissa', 'Juliana', 'Camila', 'Fernanda', 'Gabriela', 'Isabella', 'Letícia', 'João', 'Pedro', 'Lucas', 'Matheus', 'Gabriel', 'Rafael', 'Bruno', 'Diego', 'Felipe', 'Gustavo'],
    lastNames: ['Silva', 'Oliveira', 'Santos', 'Costa', 'Souza', 'Lima', 'Pereira', 'Rodrigues', 'Almeida', 'Ferreira', 'Gomes', 'Ribeiro', 'Barbosa', 'Carvalho', 'Mendes', 'Araújo', 'Nascimento', 'Melo', 'Cardoso', 'Moreira'],
    phonePrefix: '+55-',
    phoneFormat: (i) => `+55-11-9${String(1000+i).padStart(4, '0')}-${String(Math.floor(Math.random()*9000)+1000)}`,
    membershipTypes: { 'MTypeA': 'Pilates Aparelho 30 Aulas', 'MTypeB': 'Mensal Ilimitado', 'MTypeC': 'Passe Vinyasa Ilimitado', 'MTypeD': 'Aula Avulsa' },
    pricingLabel: { group: 'Aulas em Grupo', private: 'Aulas Particulares' },
    pricingOptions: {
      group: [
        { id: '1month', label: 'Mensal Ilimitado', price: 350, duration: 1, popular: true, discount: '' },
        { id: '3months', label: 'Trimestral 30 Aulas', price: 800, duration: 3, credits: 30, popular: false, discount: '20% desc.' }
      ],
      private: [
        { id: '10sessions', label: '10 Aulas Particulares', price: 1500, duration: 3, credits: 10, popular: true, discount: '' }
      ]
    },
    notice: { title: '[Aviso] Renovação do Estúdio na Primavera', content: 'Bem-vindo ao PassFlow Estúdio Demo! O assistente de IA está disponível para ajudar você a gerenciar seu estúdio.' },
    saleName: 'Pagamento de Plano',
    currency: 'BRL',
    priceMultiplier: 5,
    timezone: 'America/Sao_Paulo'
  },

  ru: {
    id: 'demo-yoga-ru',
    name: 'PassFlow Демо Студия',
    slogan: 'Самый умный способ управлять вашей студией',
    branches: [
      { id: 'A', name: 'Студия Центр', color: '#8B5CF6' },
      { id: 'B', name: 'Студия Север', color: '#3B82F6' }
    ],
    classTypes: ['Виньяса Флоу', 'Хатха Йога', 'Инь Йога', 'Power Yoga', 'Пилатес на Реформере', 'Горячая Йога'],
    classNames: ['Утренняя Виньяса', 'Пилатес Реформер', 'Релакс Инь Йога', 'Силовой Флоу', 'Кор Интенсив', 'Вечерняя Растяжка'],
    instructors: [
      { name: 'Анна Иванова', role: 'admin', photo: '' },
      { name: 'Екатерина Смирнова', role: 'manager', photo: '' },
      { name: 'Мария Козлова', role: 'instructor', photo: '' },
      { name: 'Ольга Петрова', role: 'instructor', photo: '' }
    ],
    firstNames: ['Анна', 'Екатерина', 'Мария', 'Ольга', 'Наталья', 'Елена', 'Ирина', 'Татьяна', 'Светлана', 'Юлия', 'Алексей', 'Дмитрий', 'Сергей', 'Андрей', 'Иван', 'Максим', 'Михаил', 'Николай', 'Владимир', 'Артём'],
    lastNames: ['Иванова', 'Смирнова', 'Козлова', 'Петрова', 'Новикова', 'Морозова', 'Волкова', 'Соколова', 'Лебедева', 'Кузнецова', 'Попов', 'Васильев', 'Павлов', 'Семёнов', 'Голубев', 'Виноградов', 'Богданов', 'Воробьёв', 'Фёдоров', 'Михайлов'],
    phonePrefix: '+7-',
    phoneFormat: (i) => `+7-9${String(10+Math.floor(i/100)).padStart(2, '0')}-${String(1000+i).padStart(3, '0')}-${String(Math.floor(Math.random()*90)+10)}-${String(Math.floor(Math.random()*90)+10)}`,
    membershipTypes: { 'MTypeA': 'Пилатес Реформер 30 занятий', 'MTypeB': 'Безлимит на месяц', 'MTypeC': 'Виньяса Безлимит', 'MTypeD': 'Разовое занятие' },
    pricingLabel: { group: 'Групповые Занятия', private: 'Индивидуальные Занятия' },
    pricingOptions: {
      group: [
        { id: '1month', label: 'Безлимит на Месяц', price: 8000, duration: 1, popular: true, discount: '' },
        { id: '3months', label: '3 Месяца — 30 Занятий', price: 18000, duration: 3, credits: 30, popular: false, discount: 'Скидка 20%' }
      ],
      private: [
        { id: '10sessions', label: '10 Индивидуальных Занятий', price: 35000, duration: 3, credits: 10, popular: true, discount: '' }
      ]
    },
    notice: { title: '[Объявление] Весеннее Обновление Студии', content: 'Добро пожаловать в PassFlow Демо Студию! AI-ассистент теперь доступен для помощи в управлении вашей студией.' },
    saleName: 'Оплата Абонемента',
    currency: 'RUB',
    priceMultiplier: 90,
    timezone: 'Europe/Moscow'
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔧 SEEDING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getRandomName(studio) {
  const first = studio.firstNames[Math.floor(Math.random() * studio.firstNames.length)];
  const last = studio.lastNames[Math.floor(Math.random() * studio.lastNames.length)];
  return `${first} ${last}`;
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function deleteCollection(collectionRef) {
  const batchSize = 100;
  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function seedStudio(langKey) {
  const studio = STUDIOS[langKey];
  const tenantDb = db.collection('studios').doc(studio.id);
  
  console.log(`\n🌍 [${langKey.toUpperCase()}] Seeding: ${studio.name} (${studio.id})`);

  // Clear old data
  const collections = ['members', 'daily_classes', 'attendance', 'sales', 'notices', 'push_messages'];
  for (const coll of collections) {
    await deleteCollection(tenantDb.collection(coll));
  }
  await deleteCollection(tenantDb.collection('settings'));
  console.log(`  ✅ Old data cleared`);

  // 1. Studio Config
  await tenantDb.set({
    name: studio.name,
    ownerEmail: 'demo@passflow.app',
    plan: 'pro',
    status: 'active',
    isDemo: true,
    lang: langKey,
    settings: {
      IDENTITY: { NAME: studio.name, SLOGAN: studio.slogan },
      THEME: { PRIMARY_COLOR: '#8B5CF6', SKELETON_COLOR: '#1a1a1a' },
      ASSETS: {
        LOGO: {
          SQUARE: 'https://passflowai.web.app/assets/passflow_square_logo.png',
          WIDE: 'https://passflowai.web.app/assets/passflow_ai_logo_transparent.webp'
        },
        MEMBER_BG: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop'
      },
      BRANCHES: studio.branches,
      MEMBERSHIP: { TYPES: studio.membershipTypes },
      POLICIES: { ENABLE_EXPIRATION_BLOCK: true, ENABLE_NEGATIVE_CREDITS: false }
    },
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log(`  ✅ Config seeded`);

  // 1-1. Settings
  await tenantDb.collection('settings').doc('pricing').set({
    group: {
      label: studio.pricingLabel.group,
      branches: ['A', 'B'],
      options: studio.pricingOptions.group
    },
    private: {
      label: studio.pricingLabel.private,
      branches: ['A', 'B'],
      options: studio.pricingOptions.private
    }
  });

  await tenantDb.collection('settings').doc('instructors').set({ list: studio.instructors });
  await tenantDb.collection('settings').doc('classTypes').set({ list: studio.classTypes });

  await tenantDb.collection('notices').doc('demo_notice_1').set({
    title: studio.notice.title,
    content: studio.notice.content,
    author: studio.instructors[0].name,
    createdAt: new Date().toISOString(),
    isPinned: true
  });
  console.log(`  ✅ Settings & Notices seeded`);

  // 2. Members (50 per studio for demo)
  let currentBatch = db.batch();
  let batchCount = 0;
  const commitBatch = async () => { if (batchCount > 0) { await currentBatch.commit(); currentBatch = db.batch(); batchCount = 0; } };
  const addOp = async (opFunc) => { opFunc(); batchCount++; if (batchCount >= 400) await commitBatch(); };

  const memberIdsA = [], memberIdsB = [];
  const today = new Date();
  const threeMonthsAgo = new Date(today); threeMonthsAgo.setMonth(today.getMonth() - 3);
  const threeMonthsFuture = new Date(today); threeMonthsFuture.setMonth(today.getMonth() + 3);

  const MEMBER_COUNT = 50;
  for (let i = 0; i < MEMBER_COUNT; i++) {
    const id = tenantDb.collection('members').doc().id;
    const branchId = Math.random() > 0.5 ? 'B' : 'A';
    if (branchId === 'A') memberIdsA.push(id); else memberIdsB.push(id);

    const name = getRandomName(studio);
    const typeRand = Math.random();
    const type = typeRand > 0.7 ? 'MTypeA' : typeRand > 0.4 ? 'MTypeB' : 'MTypeC';
    const isUnlimited = type === 'MTypeC';
    const credits = isUnlimited ? 999 : Math.floor(Math.random() * 30);
    const status = Math.random() > 0.85 ? 'expired' : 'active';

    await addOp(() => {
      currentBatch.set(tenantDb.collection('members').doc(id), {
        id, name, homeBranch: branchId,
        phone: studio.phoneFormat(i),
        membershipType: type, credits, originalCredits: isUnlimited ? 999 : (credits > 10 ? 30 : 10),
        regDate: getRandomDate(threeMonthsAgo, new Date()).toISOString().split('T')[0],
        endDate: status === 'expired' ? getRandomDate(threeMonthsAgo, new Date()).toISOString().split('T')[0] : getRandomDate(new Date(), threeMonthsFuture).toISOString().split('T')[0],
        hasFaceDescriptor: Math.random() > 0.2,
        status, createdAt: new Date().toISOString()
      });
    });
  }
  console.log(`  ✅ ${MEMBER_COUNT} members seeded`);

  // 3. Classes & Attendance
  const classTimes = ['07:00', '10:00', '14:00', '19:00', '21:00'];
  for (let d = -14; d <= 7; d++) {
    const date = new Date(today); date.setDate(today.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];

    for (const branchId of ['A', 'B']) {
      const memberIds = branchId === 'A' ? memberIdsA : memberIdsB;
      for (let i = 0; i < 4; i++) {
        const classId = tenantDb.collection('daily_classes').doc().id;
        const time = classTimes[i % classTimes.length];
        const attendeesCount = Math.floor(Math.random() * 10) + 3;
        const attendees = [...memberIds].sort(() => 0.5 - Math.random()).slice(0, Math.min(attendeesCount, memberIds.length));
        const cName = studio.classNames[Math.floor(Math.random() * studio.classNames.length)];
        const cInst = studio.instructors[Math.floor(Math.random() * studio.instructors.length)].name;

        await addOp(() => {
          currentBatch.set(tenantDb.collection('daily_classes').doc(classId), {
            id: classId, branchId, date: dateStr, time, name: cName, instructor: cInst,
            capacity: 15, attendees, createdAt: new Date().toISOString()
          });
        });

        if (d <= 0) {
          for (const memberId of attendees) {
            if (Math.random() > 0.8) continue;
            const logId = tenantDb.collection('attendance').doc().id;
            const timestamp = new Date(`${dateStr}T${time}:00+09:00`);
            timestamp.setMinutes(timestamp.getMinutes() - Math.floor(Math.random() * 15));
            await addOp(() => {
              currentBatch.set(tenantDb.collection('attendance').doc(logId), {
                id: logId, memberId, branchId,
                timestamp: admin.firestore.Timestamp.fromDate(timestamp),
                className: cName, instructor: cInst, status: 'approved'
              });
            });
          }
        }
      }
    }
  }
  console.log(`  ✅ Classes & Attendance seeded`);

  // 4. Sales Data
  for (const branchId of ['A', 'B']) {
    const memberIds = branchId === 'A' ? memberIdsA : memberIdsB;
    for (let m = 0; m < 3; m++) {
      for (let i = 0; i < 15; i++) {
        const saleId = tenantDb.collection('sales').doc().id;
        const saleDate = new Date(today);
        saleDate.setMonth(today.getMonth() - m);
        saleDate.setDate(Math.floor(Math.random() * 28) + 1);
        const baseAmount = (Math.floor(Math.random() * 5) + 10) * 10000;
        await addOp(() => {
          currentBatch.set(tenantDb.collection('sales').doc(saleId), {
            id: saleId, date: saleDate.toISOString().split('T')[0],
            timestamp: saleDate.toISOString(), branchId,
            itemType: Math.random() > 0.7 ? 'MTypeA' : 'MTypeB',
            itemName: studio.saleName,
            memberName: getRandomName(studio),
            memberId: memberIds[Math.floor(Math.random() * memberIds.length)] || 'unknown',
            paymentMethod: Math.random() > 0.5 ? 'card' : 'cash',
            amount: Math.round(baseAmount * studio.priceMultiplier / 10000),
            status: 'completed', createdAt: new Date().toISOString()
          });
        });
      }
    }
  }
  console.log(`  ✅ Sales seeded`);

  await commitBatch();
  console.log(`  🎉 [${langKey.toUpperCase()}] ${studio.name} — COMPLETE!`);
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🌐 GLOBAL DEMO STUDIOS SEEDER — 8 Languages');
  console.log('═══════════════════════════════════════════════════\n');

  const langs = Object.keys(STUDIOS);
  for (const lang of langs) {
    await seedStudio(lang);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ ALL 8 DEMO STUDIOS CREATED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════');
  console.log('Studios created:');
  langs.forEach(l => console.log(`  🌍 ${l.toUpperCase()}: ${STUDIOS[l].id}`));
}

main().catch(console.error).finally(() => process.exit(0));
