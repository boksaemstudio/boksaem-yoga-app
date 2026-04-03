const admin = require('firebase-admin');

async function refreshDemoData() {
    const db = admin.firestore();
    const tenantDb = db.doc('studios/demo-yoga');

    console.log('🔄 [슈퍼 시더 실행] 데모 사이트용 (passflowai) 최상급 리얼 데이터 시딩을 시작합니다...');

    // 0. 필수 설정 복원 (UI 렌더링 방어)
    await tenantDb.set({
        BRANCHES: [{ id: 'main', name: '요가&필라테스 패스플로우 (본점)', color: '#D4AF37', themeColor: '#FBB117' }],
        IDENTITY: { NAME: '요가&필라테스 패스플로우 (본점)' },
        FEATURES: { MULTI_BRANCH: false }
    }, { merge: true });

    const collections = [
        'members', 'attendance', 'sales', 'board_notices',
        'instructors', 'daily_classes', 'notification_logs', 'pricing'
    ];

    // 1. 기존 데이터 초기화 (Batch Delete)
    async function deleteCollection(collectionPath, batchSize = 100) {
        const collectionRef = tenantDb.collection(collectionPath);
        const query = collectionRef.orderBy('__name__').limit(batchSize);

        return new Promise((resolve, reject) => {
            deleteQueryBatch(query, resolve).catch(reject);
        });
    }

    async function deleteQueryBatch(query, resolve) {
        const snapshot = await query.get();
        const batchSize = snapshot.size;
        if (batchSize === 0) {
            resolve();
            return;
        }
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        process.nextTick(() => deleteQueryBatch(query, resolve));
    }

    for (const coll of collections) {
        await deleteCollection(coll);
    }
    console.log('✅ 기존 데이터 초기화 완료.');

    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const today = new Date(); // 로컬 시각 기준 (스크립트 실행)
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
            console.log('...배치 처리 중...');
        }
    }

    async function commitBatch() {
        if (batchCount > 0) {
            await currentBatch.commit();
        }
    }

    const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    
    // 2. 강사 데이터
    const instructors = [
        { id: 'ins-master', name: '엠마 원장 선생님', phone: '010-1111-1111', role: '원장' },
        { id: 'ins-01', name: '박태민 수석강사', phone: '010-2222-2222', role: '전임강사' },
        { id: 'ins-02', name: '이수아 강사', phone: '010-3333-3333', role: '오전전담' },
        { id: 'ins-03', name: '정다은 강사 (필라테스)', phone: '010-4444-4444', role: '파트타임' }
    ];
    for (const ins of instructors) {
        await addOp(() => currentBatch.set(tenantDb.collection('instructors').doc(ins.id), {
            ...ins, profileImageUrl: '', status: 'active', createdAt: new Date().toISOString()
        }));
    }

    console.log('✅ 강사 시딩 완료.');

    // 3. 가격표
    const prices = [
        { name: '요가 1개월 무제한권', category: 'yoga', price: 150000, validDays: 30, useCount: 999 },
        { name: '요가 3개월 주3회권 (36회)', category: 'yoga', price: 380000, validDays: 90, useCount: 36 },
        { name: '기구필라테스 주3회 12주 (36회)', category: 'pilates', price: 680000, validDays: 90, useCount: 36 },
        { name: '바디프로필 1:1 PT 10회권', category: 'pt', price: 770000, validDays: 90, useCount: 10 },
        { name: '요가 지도자 과정 (TTC 200h)', category: 'special', price: 2500000, validDays: 180, useCount: 1 }
    ];
        // Generate advanced pricing document directly into settings/pricing, 
        // which powers AdminPriceManager instead of creating raw legacy docs
        const pricingConfig = {
            general: {
                label: "요가 일반 수강권 (월/횟수)",
                branches: ["main"],
                options: [
                    { id: "gen_1m", label: "요가 1개월 무제한", basePrice: 150000, credits: 9999, months: 1, type: "subscription", discount3: 400000, discount6: 750000, cashPrice: 140000 },
                    { id: "gen_3m", label: "요가 3개월 주3회", basePrice: 380000, credits: 36, months: 3, type: "ticket", cashPrice: 350000},
                    { id: "gen_6m", label: "요가 6개월 주3회", basePrice: 650000, credits: 72, months: 6, type: "ticket", cashPrice: 600000 }
                ]
            },
            intensive: {
                label: "소그룹 기구 필라테스",
                branches: ["main"],
                options: [
                    { id: "int_1m", label: "기구 필라 10회 (1개월)", basePrice: 200000, credits: 10, months: 1, type: "ticket", cashPrice: 180000 },
                    { id: "int_3m", label: "기구 필라 30회 (3개월)", basePrice: 550000, credits: 30, months: 3, type: "ticket", cashPrice: 500000 },
                    { id: "int_6m", label: "기구 필라 50회 (6개월)", basePrice: 850000, credits: 50, months: 6, type: "ticket", cashPrice: 780000 }
                ]
            },
            private: {
                label: "프리미엄 1:1 개인 PT",
                branches: ["main"],
                options: [
                    { id: "pt_10", label: "1:1 집중코칭 10회", basePrice: 770000, credits: 10, months: 2, type: "ticket", cashPrice: 700000 },
                    { id: "pt_20", label: "1:1 집중코칭 20회", basePrice: 1400000, credits: 20, months: 4, type: "ticket", cashPrice: 1300000 },
                    { id: "pt_30", label: "1:1 바디프로필 30회", basePrice: 2000000, credits: 30, months: 6, type: "ticket", cashPrice: 1850000 }
                ]
            }
        };
        await addOp(() => currentBatch.set(tenantDb.collection('settings').doc('pricing'), pricingConfig));


    console.log('✅ 가격표 시딩 완료.');

    // 4. 회원 데이터 (그룹별 다채롭게 150명 생성)
    const firstNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
    const lastNames = ['민준', '서준', '도윤', '예준', '시우', '하준', '지호', '지훈', '서연', '서윤', '지우', '서현', '하은', '하윤', '민서', '지민', '희은', '태희', '연아', '수진', '지영'];
    const getRandomName = () => firstNames[Math.floor(Math.random() * firstNames.length)] + lastNames[Math.floor(Math.random() * lastNames.length)];

    const memberIds = [];
    const membersDataMap = {};
    for (let i = 0; i < 150; i++) {
        const isDemo = i === 0;
        const id = isDemo ? 'demo-member' : tenantDb.collection('members').doc().id;
        memberIds.push(id);
        const name = isDemo ? '최우수회원 (데모)' : getRandomName();
        const phone = isDemo ? '010-1234-5678' : `010-${String(Math.floor(Math.random() * 8999) + 1000)}-${String(Math.floor(Math.random() * 8999) + 1000)}`;
        membersDataMap[id] = { name, phone, profileImageUrl: null };
        
        const type = Math.random() > 0.4 ? 'yoga_unlimited' : 'pilates_count';
        const isUnlimited = type === 'yoga_unlimited';
        let credits = 0;
        
        let lastAttendanceStr = null;
        let lastPaymentStr = null;
        if (Math.random() > 0.2) {
            credits = isUnlimited ? 999 : Math.floor(Math.random() * 20) + 5;
            lastAttendanceStr = getRandomDate(new Date(today.getTime() - 7*86400000), today).toISOString();
            lastPaymentStr = getRandomDate(new Date(today.getTime() - 30*86400000), today).toISOString();
        } else {
            credits = Math.floor(Math.random() * 2); 
            lastAttendanceStr = getRandomDate(threeMonthsAgo, new Date(today.getTime() - 30*86400000)).toISOString();
            lastPaymentStr = getRandomDate(threeMonthsAgo, new Date(today.getTime() - 90*86400000)).toISOString();
        }

        const regDate = getRandomDate(threeMonthsAgo, new Date()).toLocaleDateString('sv-SE', {timeZone: 'Asia/Seoul'});

        await addOp(() => {
            currentBatch.set(tenantDb.collection('members').doc(id), {
                id, name, phone, membershipType: type, credits,
                originalCredits: isUnlimited ? 999 : 36,
                regDate,
                hasFaceDescriptor: Math.random() > 0.15,
                status: credits > 0 ? 'active' : 'expired',
                createdAt: new Date(new Date(regDate).getTime() - 86400000).toISOString(),
                branchId: 'main',
                lastAttendance: lastAttendanceStr,
                lastPaymentDate: lastPaymentStr
            });
        });
    }

    console.log('✅ 회원 시딩 완료.');

    // 4.5. 기타 필수 데모 자산 (로고, 시간표 이미지, 가격표, 휴지통 예시)
    const todayKST = todayStr;
    await addOp(() => {
        // --- 1. 스튜디오 코어 설정 (BRANCHES, 로고) 강제 주입 ---
        currentBatch.set(db.doc('studios/demo-yoga'), {
            BRANCHES: [{ id: 'main', name: '패스플로우', color: '#D4AF37', themeColor: '#FBB117' }],
            IDENTITY: {
                NAME: '데모스튜디오',
                LOGO_URL: '/assets/demo_logo.png' // 다운받은 신규 투명 로고
            },
            THEME: { PRIMARY_COLOR: '#FBB117' }
        }, { merge: true });

        // --- 2. 레거시 images 호환 모델 ---
        currentBatch.set(db.doc('studios/demo-yoga/images/logo'), {
            url: '/assets/demo_logo.png',
            updatedAt: new Date().toISOString()
        }, { merge: true });
        
        currentBatch.set(db.doc(`studios/demo-yoga/images/timetable_main_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`), {
            url: 'https://passflowai.web.app/assets/timetable_1.png', // 변경 완료
            updatedAt: new Date().toISOString()
        }, { merge: true });

        const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        currentBatch.set(db.doc(`studios/demo-yoga/images/timetable_main_${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`), {
            url: 'https://passflowai.web.app/assets/timetable_2.png', // timetable_2로 변경
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // --- 2. 최신 assets 스키마 ---
        currentBatch.set(tenantDb.collection('assets').doc('schedule'), {
            currentUrl: '/assets/timetable_1.png',
            nextUrl: '/assets/timetable_2.png', // timetable_2로 교차 적용
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // Add to legacy images collection which the dashboard relies on
        currentBatch.set(db.doc('studios/demo-yoga/images/price_table_1'), {
            url: 'https://passflowai.web.app/assets/pricing_1_bg.png',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        currentBatch.set(db.doc('studios/demo-yoga/images/price_table_2'), {
            url: 'https://passflowai.web.app/assets/pricing_2_bg.png',
            updatedAt: new Date().toISOString()
        }, { merge: true });


        currentBatch.set(tenantDb.collection('assets').doc('pricing'), {
            mainUrl: '/assets/pricing_1_bg.png',
            subUrl: '/assets/pricing_2_bg.png',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        currentBatch.set(tenantDb.collection('assets').doc('logo'), {
            url: '/assets/demo_logo.png',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // --- 3. 휴지통 기록 예시 ---
        currentBatch.set(tenantDb.collection('trash').doc('trash_member_demo'), {
            type: 'member',
            originalId: 'trash_member_demo',
            deletedAt: new Date().toISOString(),
            data: { name: '이수진 (휴지통 예시)', phone: '010-9988-7766' },
            deletedBy: 'admin@passflow.kr'
        });
        currentBatch.set(tenantDb.collection('trash').doc('trash_att_demo'), {
            type: 'attendance',
            originalId: 'trash_att_demo',
            deletedAt: new Date().toISOString(),
            data: { memberName: '김민준', className: '아쉬탕가 베이직', date: todayKST },
            deletedBy: 'admin@passflow.kr'
        });
    });
    console.log('✅ 추가 데모 자산(시간표 포함) 시딩 완료.');

    // 5. 공지사항 및 히스토리
    const notices = [
        { title: '[필독] 회원 안면 데이터 관리 시스템 운영 변경 안내', content: 'PassFlow Ai 서버 이중화 완료로 더욱 정교한 인증과 데이터 보안이 가능해졌습니다. 안전한 스튜디오 운영을 위해 협조 부탁드립니다.', type: 'notice', isImportant: true },
        { title: '가정의 달 프로모션 요가/필라테스 그룹 레슨 시간표 개편 확정', content: '오전 7시 아쉬탕가 클래스가 주 5회로 확대 편성됩니다. 어플에서 신규 시간표를 확인하시고 예약해 주세요.', type: 'event', isImportant: false },
        { title: '스튜디오 대청소로 인한 일주 휴관 안내', content: '방역 및 프리미엄 소독 완료. 최상의 센터 컨디션을 약속드립니다.', type: 'notice', isImportant: false },
        { title: '신규 원데이 클래스 오픈 (인양 테라피)', content: '많은 분들이 요청해주셨던 인양 테라피 클래스가 일요일 오전 10시에 오픈됩니다.', type: 'event', isImportant: false }
    ];
    for (const notice of notices) {
        const id = tenantDb.collection('board_notices').doc().id;
        await addOp(() => currentBatch.set(tenantDb.collection('board_notices').doc(id), {
            id, ...notice,
            author: '엠마 원장 선생님', createdAt: new Date(today.getTime() - Math.random()*86400000*5).toISOString()
        }));
    }

    console.log('✅ 공지사항 시딩 완료.');

    // 6. 매출 데이터
    for (let m = 0; m < 4; m++) {
        // [FIX] 이번 달(m=0)의 경우 오늘 날짜를 넘기지 않도록 제약 (미래 매출 방지)
        let maxDays = 28;
        if (m === 0) {
            maxDays = today.getDate(); // 1일이면 1만 반환
        }
        // 당월 초반(1~5일)일 경우 데이터가 빈약해 지는 것을 방지하기 위해 최소 8건 보장
        const runCount = m === 0 ? Math.max(8, Math.floor(30 * (maxDays / 28))) : 30;

        for (let i = 0; i < runCount; i++) {
            const saleId = tenantDb.collection('sales').doc().id;
            const saleDate = new Date(today);
            saleDate.setMonth(today.getMonth() - m);
            saleDate.setDate(Math.floor(Math.random() * maxDays) + 1);
            
            const priceItem = prices[Math.floor(Math.random() * prices.length)];
            
            await addOp(() => {
                currentBatch.set(tenantDb.collection('sales').doc(saleId), {
                    id: saleId,
                    date: saleDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
                    timestamp: saleDate.toISOString(),
                    itemType: priceItem.category,
                    itemName: priceItem.name,
                    memberName: getRandomName(),
                    memberId: memberIds[Math.floor(Math.random() * memberIds.length)],
                    paymentMethod: Math.random() > 0.4 ? 'card' : 'cash',
                    amount: priceItem.price * (Math.random() > 0.9 ? 0.8 : 1),
                    status: 'completed', branchId: 'main',
                    createdAt: saleDate.toISOString()
                });
            });
        }
    }

    console.log('✅ 매출 통계 데이터 시딩 완료.');

    // 7. 실시간 출석 및 매일 시간표 (요일별 리얼 스케줄)
    const scheduleTemplateWeakday = [
        { time: '07:00', names: ['아쉬탕가 풀프라이머리', '하타 요가'], ins: '엠마 원장 선생님' },
        { time: '09:00', names: ['리포머 코어포커스', '바렐 기초'], ins: '정다은 강사 (필라테스)' },
        { time: '10:00', names: ['하타 인텐시브', '빈야사 플로우'], ins: '이수아 강사' },
        { time: '12:00', names: ['인양 테라피', '릴랙스 요가'], ins: '이수아 강사' }, 
        { time: '18:30', names: ['캐딜락&바렐 그룹', '기구 필라테스'], ins: '정다은 강사 (필라테스)' },
        { time: '19:30', names: ['플라잉 베이직', '아쉬탕가 풀프라이머리'], ins: '박태민 수석강사' },
        { time: '20:30', names: ['리포머 코어포커스', '빈야사 플로우'], ins: '박태민 수석강사' }
    ];

    const scheduleTemplateWeekend = [
        { time: '10:00', names: ['인양 테라피', '하타 요가'], ins: '엠마 원장 선생님' },
        { time: '11:00', names: ['플라잉 요가', '리듬 요가'], ins: '이수아 강사' },
        { time: '14:00', names: ['기구 필라테스', '코어 강화'], ins: '정다은 강사 (필라테스)' }
    ];

    let attendanceCount = 0;

    // [월간 시간표 꽉 채우기] - 저번달 1일부터 다음달 말일까지 3개월 전체 시딩
    const seedStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const seedEndDate = new Date(today.getFullYear(), today.getMonth() + 2, 0); // 다음달 마지막 날
    const seedDaysDiff = Math.ceil((seedEndDate.getTime() - seedStartDate.getTime()) / (1000 * 3600 * 24));

    for (let d = 0; d <= seedDaysDiff; d++) {
        const date = new Date(seedStartDate);
        date.setDate(seedStartDate.getDate() + d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const dayOfWeek = date.getDay(); // 0: Sun, 1: Mon, ...
        const isPast = date.getTime() < today.getTime();
        const isToday = date.toDateString() === today.toDateString();

        const scheduleSlots = (dayOfWeek === 0 || dayOfWeek === 6) ? scheduleTemplateWeekend : scheduleTemplateWeakday;
        const dailyClasses = [];
        const dailyClassInfos = []; 

        for (const slot of scheduleSlots) {
            const time = slot.time;
            const className = slot.names[Math.floor(Math.random() * slot.names.length)];
            const insName = slot.ins;
            
            let maxCount = (time.startsWith('18') || time.startsWith('19') || time.startsWith('20')) ? 16 : 8;
            const attendeesCount = Math.floor(Math.random() * 5) + maxCount - 4; 
            
            const attendees = [...memberIds].sort(() => 0.5 - Math.random()).slice(0, attendeesCount);

            if (isToday && !attendees.includes('demo-member')) {
                attendees.push('demo-member');
            }

            dailyClasses.push({
                time, title: className,
                instructor: insName,
                status: 'normal',
                capacity: 20, attendees,
                duration: 60, level: ''
            });

            dailyClassInfos.push({
                time, className, insName, attendees
            });
        }

        const dateId = `main_${dateStr}`;
        await addOp(() => {
            currentBatch.set(tenantDb.collection('daily_classes').doc(dateId), {
                branchId: 'main',
                date: dateStr,
                classes: dailyClasses,
                updatedAt: new Date().toISOString()
            });
        });

        const [y, m, dNum] = dateStr.split('-');
        const metaDocId = `main_${parseInt(y)}_${parseInt(m)}`;
        await addOp(() => {
            currentBatch.set(tenantDb.collection('monthly_schedules').doc(metaDocId), {
                branchId: 'main',
                year: parseInt(y),
                month: parseInt(m),
                isSaved: true
            }, { merge: true });
        });

        for (const slotInfo of dailyClassInfos) {
            const { time, className, insName, attendees } = slotInfo;

            const slotHour = parseInt(time.split(':')[0], 10);
            const currentHour = today.getHours();
            
            if (isPast || (isToday && slotHour <= currentHour + 1)) { // 진행중이거나 과거 강좌
                for (const memberId of attendees) {
                    if (Math.random() > 0.85) continue; 
                    
                    const logId = tenantDb.collection('attendance').doc().id;
                    const timestampObj = new Date(`${dateStr}T${time}:00+09:00`);
                    timestampObj.setMinutes(timestampObj.getMinutes() - Math.floor(Math.random() * 20) + 5);

                    await addOp(() => {
                        const mData = membersDataMap[memberId] || { name: '데모 회원', phone: '010-0000-0000', profileImageUrl: null };
                        currentBatch.set(tenantDb.collection('attendance').doc(logId), {
                            id: logId, memberId,
                            memberName: mData.name,
                            memberPhone: mData.phone,
                            profileImageUrl: mData.profileImageUrl,
                            timestamp: timestampObj.toISOString(),
                            date: dateStr, 
                            className: className,
                            classTime: time,
                            instructor: insName, 
                            status: Math.random() > 0.95 ? 'denied' : 'approved',
                            denialReason: '사유 없음',
                            branchId: 'main'
                        });
                    });
                    attendanceCount++;
                }
            }
        }
    }

    console.log(`✅ 시간표 및 출석 시딩 완료 (${attendanceCount}건의 출석 로그 생성).`);

    await commitBatch();
    console.log('🎉 완벽하게 현실적이고 차트가 꽉차는 슈퍼 데모 데이터 셋업이 완료되었습니다. (passflowai)');
}

module.exports = { refreshDemoData };
