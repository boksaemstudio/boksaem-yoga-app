const admin = require('firebase-admin');

// 🌐 [i18n] 국가별 데모 시딩 데이터셋 (SaaS 1:1 맞춤형 뉘앙스 최적화)
const demoDatasets = {
    ko: {
        studioName: '요가&필라테스 패스플로우 (본점)',
        instructors: [
            { id: 'ins-master', name: '엠마 원장 선생님', phone: '010-1111-1111', role: '원장' },
            { id: 'ins-01', name: '박태민 수석강사', phone: '010-2222-2222', role: '전임강사' },
            { id: 'ins-02', name: '이수아 강사', phone: '010-3333-3333', role: '오전전담' },
            { id: 'ins-03', name: '정다은 강사 (필라테스)', phone: '010-4444-4444', role: '파트타임' }
        ],
        classes: {
            morning: ['아쉬탕가 풀프라이머리', '하타 요가', '리포머 코어포커스', '바렐 기초'],
            afternoon: ['하타 인텐시브', '빈야사 플로우', '인양 테라피', '릴랙스 요가'],
            evening: ['캐딜락&바렐 그룹', '플라잉 베이직', '기구 필라테스']
        },
        members: {
            lastNames: ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'],
            firstNames: ['민준', '서준', '도윤', '예준', '시우', '하준', '지호', '지훈', '서연', '서윤', '지우', '서현', '하은', '하윤', '민서', '지민', '희은', '태희', '연아', '수진', '지영']
        },
        pricing: {
            p1: '요가 1개월 무제한권', p2: '요가 3개월 주3회권 (36회)', p3: '기구필라테스 주3회 12주', p4: '바디프로필 1:1 PT 10회권', p5: '요가 지도자 과정 (TTC)'
        },
        notices: [
            { title: '[필독] 회원 안면 데이터 관리 시스템 운영 변경 안내', content: 'PassFlow Ai 서버 이중화 완료로 더욱 정교한 인증과 데이터 보안이 가능해졌습니다.', type: 'notice', isImportant: true },
            { title: '가정의 달 프로모션 요가/필라테스 그룹 레슨 시간표 개편 확정', content: '오전 7시 아쉬탕가 클래스가 주 5회로 확대 편성됩니다.', type: 'event', isImportant: false }
        ],
        assets: {
            timetable1: '/assets/timetable_1.png', timetable2: '/assets/timetable_1.png',
            pricing1: '/assets/pricing_1_bg.png', pricing2: '/assets/pricing_2_bg.png'
        }
    },
    en: {
        studioName: 'PassFlow Yoga & Pilates Studio (HQ)',
        instructors: [
            { id: 'ins-master', name: 'Emma (Principal Director)', phone: '212-555-0101', role: 'Director' },
            { id: 'ins-01', name: 'James Parker', phone: '212-555-0102', role: 'Head Instructor' },
            { id: 'ins-02', name: 'Sophia Lee', phone: '212-555-0103', role: 'Morning Pro' },
            { id: 'ins-03', name: 'Olivia Smith', phone: '212-555-0104', role: 'Pilates Spec.' }
        ],
        classes: {
            morning: ['Ashtanga Full Primary', 'Hatha Yoga', 'Reformer Core Focus', 'Barrel Basics'],
            afternoon: ['Hatha Intensive', 'Vinyasa Flow', 'Yin Yoga Therapy', 'Restorative Yoga'],
            evening: ['Cadillac & Barrel Group', 'Aerial Basics', 'Apparatus Pilates']
        },
        members: {
            lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson'],
            firstNames: ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth']
        },
        pricing: {
            p1: 'Yoga 1 Month Unlimited', p2: 'Yoga 3 Months (36 Sessions)', p3: 'Pilates 12 Weeks Plan', p4: '1:1 PT 10 Sessions', p5: 'Yoga Teacher Training (TTC 200h)'
        },
        notices: [
            { title: '[Urgent] Biometric Data Security Upgrade', content: 'PassFlow AI server replication completed for enhanced facial recognition security.', type: 'notice', isImportant: true },
            { title: 'Thanksgiving Promotion: New Schedule Layout', content: 'The 7 AM Ashtanga class is now expanded to 5 times a week.', type: 'event', isImportant: false }
        ],
        assets: {
            timetable1: '/assets/timetable_en.png', timetable2: '/assets/timetable_en.png',
            pricing1: '/assets/pricing_en.png', pricing2: '/assets/pricing_en.png'
        }
    },
    ja: {
        studioName: 'PassFlow ヨガ＆ピラティス (本店)',
        instructors: [
            { id: 'ins-master', name: 'エマ院長', phone: '090-1111-1111', role: '院長' },
            { id: 'ins-01', name: '高橋 健太 (首席)', phone: '090-2222-2222', role: '専任講師' },
            { id: 'ins-02', name: '佐藤 真由美', phone: '090-3333-3333', role: '午前専属' },
            { id: 'ins-03', name: '中村 櫻 (ピラティス)', phone: '090-4444-4444', role: 'パートタイム' }
        ],
        classes: {
            morning: ['アシュタンガ・プライマリー', 'ハタヨガ', 'リフォーマー・コア', 'バレル基礎'],
            afternoon: ['ハタ・インテンシブ', 'ヴィンヤサ・フロー', '陰ヨガセラピー', 'リラクゼーションヨガ'],
            evening: ['キャデラック・グループ', 'エアリアル基礎', 'マシンピラティス']
        },
        members: {
            lastNames: ['佐藤', '鈴木', '高橋', '田中', '渡辺', '伊藤', '山本', '中村', '小林', '加藤'],
            firstNames: ['翔', '結衣', '蓮', '陽菜', '奏太', '咲良', '大翔', '莉子', '悠真', '葵']
        },
        pricing: {
            p1: 'ヨガ1ヶ月無制限コース', p2: 'ヨガ3ヶ月（週3回）', p3: 'マシンピラティス12週コース', p4: '1対1パーソナル10回券', p5: 'ヨガインストラクター養成講座'
        },
        notices: [
            { title: '[重要] 顔認証データセキュリティのアップグレード', content: 'PassFlow AIサーバーの二重化が完了し、より高度なセキュリティを提供します。', type: 'notice', isImportant: true },
            { title: '春のプロモーション：グループスケジュールの変更', content: '午前7時のアシュタンガクラスが週5回に拡大されます。', type: 'event', isImportant: false }
        ],
        assets: {
            timetable1: '/assets/timetable_ja.png', timetable2: '/assets/timetable_ja.png',
            pricing1: '/assets/pricing_ja.png', pricing2: '/assets/pricing_ja.png'
        }
    },
    zh: {
        studioName: 'PassFlow 瑜伽与普拉提中心 (总店)',
        instructors: [
            { id: 'ins-master', name: 'Emma 院长', phone: '138-1111-1111', role: '院长' },
            { id: 'ins-01', name: '王刚 (首席导师)', phone: '138-2222-2222', role: '全职导师' },
            { id: 'ins-02', name: '李娜', phone: '138-3333-3333', role: '早间专属' },
            { id: 'ins-03', name: '张雪 (普拉提)', phone: '138-4444-4444', role: '兼职导师' }
        ],
        classes: {
            morning: ['阿斯汤加初级', '哈他瑜伽', '核心塑形床', '梯桶基础'],
            afternoon: ['哈他进阶', '流瑜伽', '阴瑜伽疗愈', '修复瑜伽'],
            evening: ['凯迪拉克小班', '空中瑜伽基础', '器械普拉提']
        },
        members: {
            lastNames: ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周'],
            firstNames: ['伟', '芳', '娜', '敏', '静', '强', '磊', '洋', '艳', '勇']
        },
        pricing: {
            p1: '瑜伽1个月不限次卡', p2: '瑜伽3个月(每周3次)', p3: '器械普拉提12周计划', p4: '1:1 私教 10次卡', p5: '瑜伽教练培训课程(TTC)'
        },
        notices: [
            { title: '[必读] 人脸识别数据隐私升级通知', content: 'PassFlow AI 服务器已完成双重备份，为您提供更精准的考勤与数据安全保障。', type: 'notice', isImportant: true },
            { title: '五一黄金周：团课时间表调整方案', content: '早上7点的阿斯汤加课程现增至每周5次。', type: 'event', isImportant: false }
        ],
        assets: {
            timetable1: '/assets/timetable_zh.png', timetable2: '/assets/timetable_zh.png',
            pricing1: '/assets/pricing_zh.png', pricing2: '/assets/pricing_zh.png'
        }
    }
};

async function processTenantSeeding(tenantId, langCode) {
    const db = admin.firestore();
    const tenantDb = db.doc(`studios/${tenantId}`);
    const data = demoDatasets[langCode] || demoDatasets['en'];

    console.log(`🔄 [${langCode}] 데모 테넌트(${tenantId}) 시딩 시작...`);

    // 0. 필수 설정 복원
    await tenantDb.set({
        BRANCHES: [{ id: 'main', name: data.studioName, color: '#D4AF37', themeColor: '#FBB117' }],
        IDENTITY: { NAME: data.studioName, LOGO_URL: '/assets/demo_logo_v2.png' },
        FEATURES: { MULTI_BRANCH: false },
        lang: langCode
    }, { merge: true });

    // 1. 기존 데이터 초기화 (Batch Delete)
    const collections = ['members', 'attendance', 'sales', 'board_notices', 'instructors', 'daily_classes', 'notification_logs', 'pricing'];
    async function deleteCollection(collectionPath, batchSize = 100) {
        const collectionRef = tenantDb.collection(collectionPath);
        const query = collectionRef.orderBy('__name__').limit(batchSize);
        return new Promise((res, rej) => deleteQueryBatch(query, res).catch(rej));
    }
    async function deleteQueryBatch(query, resolve) {
        const snapshot = await query.get();
        if (snapshot.size === 0) return resolve();
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        process.nextTick(() => deleteQueryBatch(query, resolve));
    }
    for (const coll of collections) {
        await deleteCollection(coll);
    }

    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const today = new Date();
    const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

    let batchCount = 0;
    let currentBatch = db.batch();
    async function addOp(opFunc) {
        opFunc();
        batchCount++;
        if (batchCount > 400) {
            await currentBatch.commit();
            currentBatch = db.batch();
            batchCount = 0;
        }
    }
    async function commitBatch() {
        if (batchCount > 0) await currentBatch.commit();
    }

    // 2. 강사
    for (const ins of data.instructors) {
        await addOp(() => currentBatch.set(tenantDb.collection('instructors').doc(ins.id), {
            ...ins, profileImageUrl: '', status: 'active', createdAt: new Date().toISOString()
        }));
    }

    // 3. 가격표
    const prices = [
        { name: data.pricing.p1, category: 'yoga', price: 150000, validDays: 30, useCount: 999 },
        { name: data.pricing.p2, category: 'yoga', price: 380000, validDays: 90, useCount: 36 },
        { name: data.pricing.p3, category: 'pilates', price: 680000, validDays: 90, useCount: 36 },
        { name: data.pricing.p4, category: 'pt', price: 770000, validDays: 90, useCount: 10 },
        { name: data.pricing.p5, category: 'special', price: 2500000, validDays: 180, useCount: 1 }
    ];
    for (const [idx, pr] of prices.entries()) {
        await addOp(() => currentBatch.set(tenantDb.collection('settings').collection('pricingPlans').doc(`p_${idx}`), pr));
    }

    // 4. 회원 데이터
    const getRandomName = () => {
        if(langCode === 'en') return data.members.firstNames[Math.floor(Math.random() * 10)] + ' ' + data.members.lastNames[Math.floor(Math.random() * 10)];
        return data.members.lastNames[Math.floor(Math.random() * data.members.lastNames.length)] + data.members.firstNames[Math.floor(Math.random() * data.members.firstNames.length)];
    };
    const memberIds = [];
    const membersDataMap = {};
    for (let i = 0; i < 60; i++) {
        const isDemo = i === 0;
        const id = isDemo ? 'demo-member' : tenantDb.collection('members').doc().id;
        memberIds.push(id);
        const name = isDemo ? (langCode==='ko'?'최우수회원 (데모)':(langCode==='ja'?'最高会員(デモ)':'VIP Demo Member')) : getRandomName();
        // Generate valid locale phone
        let phone = `010-${String(Math.floor(Math.random() * 8999) + 1000)}-${String(Math.floor(Math.random() * 8999) + 1000)}`;
        if (langCode === 'en') phone = `212-${String(Math.floor(Math.random() * 899) + 100)}-${String(Math.floor(Math.random() * 8999) + 1000)}`;
        
        membersDataMap[id] = { name, phone, profileImageUrl: null };
        const credits = Math.floor(Math.random() * 20) + 5;
        await addOp(() => {
            currentBatch.set(tenantDb.collection('members').doc(id), {
                id, name, phone, membershipType: 'yoga_unlimited', credits, originalCredits: 999,
                regDate: new Date().toLocaleDateString('sv-SE'),
                hasFaceDescriptor: Math.random() > 0.15, status: 'active',
                createdAt: new Date().toISOString(), branchId: 'main',
                lastAttendance: new Date().toISOString()
            });
        });
    }

    // 5. 애셋 / 공지사항
    await addOp(() => currentBatch.set(tenantDb.collection('assets').doc('schedule'), {
        currentUrl: data.assets.timetable1, nextUrl: data.assets.timetable2, updatedAt: new Date().toISOString()
    }, { merge: true }));
    await addOp(() => currentBatch.set(tenantDb.collection('assets').doc('pricing'), {
        mainUrl: data.assets.pricing1, subUrl: data.assets.pricing2, updatedAt: new Date().toISOString()
    }, { merge: true }));
    currentBatch.set(db.doc(`platform/registry/studios/${tenantId}`), { logoUrl: '/assets/demo_logo_v2.png' }, { merge: true });

    for (const notice of data.notices) {
        const id = tenantDb.collection('board_notices').doc().id;
        await addOp(() => currentBatch.set(tenantDb.collection('board_notices').doc(id), {
            id, ...notice, author: data.instructors[0].name, createdAt: new Date().toISOString()
        }));
    }

    // 6. 스케줄 배분 (간략화된 7일 스케줄 복사)
    for (let d = 0; d <= 28; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - 14 + d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const dayOfWeek = date.getDay();
        
        const slotTimes = ['07:00','10:00','18:30','19:30'];
        const dailyClasses = [];
        
        for (const time of slotTimes) {
            const pool = (time === '07:00' || time === '10:00') ? data.classes.morning : data.classes.evening;
            const className = pool[Math.floor(Math.random() * pool.length)];
            const insName = data.instructors[Math.floor(Math.random() * data.instructors.length)].name;
            const attendees = [...memberIds].sort(() => 0.5 - Math.random()).slice(0, 5);
            if (date.toDateString() === today.toDateString() && !attendees.includes('demo-member')) attendees.push('demo-member');
            
            dailyClasses.push({
                time, title: className, instructor: insName, status: 'normal', capacity: 20, attendees, duration: 60, level: ''
            });

            // 지난 일자면 출석 로그 생성
            if (date.getTime() < today.getTime()) {
                for (const memberId of attendees) {
                    const logId = tenantDb.collection('attendance').doc().id;
                    const mData = membersDataMap[memberId];
                    await addOp(() => currentBatch.set(tenantDb.collection('attendance').doc(logId), {
                        id: logId, memberId, memberName: mData.name, memberPhone: mData.phone,
                        timestamp: new Date(`${dateStr}T${time}:00+09:00`).toISOString(),
                        date: dateStr, className, classTime: time, instructor: insName,
                        status: 'approved', branchId: 'main'
                    }));
                }
            }
        }
        await addOp(() => currentBatch.set(tenantDb.collection('daily_classes').doc(`main_${dateStr}`), {
            branchId: 'main', date: dateStr, classes: dailyClasses, updatedAt: new Date().toISOString()
        }));
    }

    // 7. 매출 추가
    for (let i = 0; i < 20; i++) {
        const saleId = tenantDb.collection('sales').doc().id;
        const pInfo = prices[Math.floor(Math.random() * prices.length)];
        await addOp(() => currentBatch.set(tenantDb.collection('sales').doc(saleId), {
            id: saleId, date: todayStr, timestamp: new Date().toISOString(),
            itemType: pInfo.category, itemName: pInfo.name, memberName: getRandomName(),
            memberId: memberIds[0], paymentMethod: 'card', amount: pInfo.price, status: 'completed', branchId: 'main', createdAt: new Date().toISOString()
        }));
    }

    await commitBatch();
    console.log(`🎉 [${langCode}] 데모 테넌트(${tenantId}) 시딩 완료!`);
}

async function refreshDemoData() {
    console.log('🔄 [슈퍼 시더] 글로벌 다중 데모 (Multi-Tenant Demo) 환경 시딩 시작...');
    
    // 글로벌 4개 언어 테넌트를 순차적으로 초기화 및 생성
    const targets = [
        { id: 'demo-yoga', lang: 'ko' },       // 기본 한국어 데모
        { id: 'demo-yoga-en', lang: 'en' },    // 영어 데모
        { id: 'demo-yoga-ja', lang: 'ja' },    // 일본어 데모
        { id: 'demo-yoga-zh', lang: 'zh' }     // 중국어 데모
    ];

    for (const target of targets) {
        await processTenantSeeding(target.id, target.lang);
    }
}

module.exports = { refreshDemoData };
