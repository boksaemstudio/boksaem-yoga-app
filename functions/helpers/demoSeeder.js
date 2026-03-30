const admin = require('firebase-admin');

async function refreshDemoData() {
    const db = admin.firestore();
    const tenantDb = db.doc('studios/demo-yoga');

    console.log('🔄 [슈퍼 시더 실행] 데모 사이트용 (passflow-demo-0324) 최상급 리얼 데이터 시딩을 시작합니다...');

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
        if (batchCount === 400) {
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
    
    // 2. 강사 데이터 (요가/필라테스 리얼리티)
    const instructors = [
        { id: 'ins-master', name: '김보람 원장', phone: '010-1111-1111', role: '원장' },
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

    // 3. 가격표 (매우 구체적, 월간/주수 별 정액, 횟수권)
    const prices = [
        { name: '요가 1개월 무제한권', category: 'yoga', price: 150000, validDays: 30, useCount: 999 },
        { name: '요가 3개월 주3회권 (36회)', category: 'yoga', price: 380000, validDays: 90, useCount: 36 },
        { name: '기구필라테스 주3회 12주 (36회)', category: 'pilates', price: 680000, validDays: 90, useCount: 36 },
        { name: '바디프로필 1:1 PT 10회권', category: 'pt', price: 770000, validDays: 90, useCount: 10 },
        { name: '요가 지도자 과정 (TTC 200h)', category: 'special', price: 2500000, validDays: 180, useCount: 1 }
    ];
    for (const p of prices) {
        const id = tenantDb.collection('pricing').doc().id;
        await addOp(() => currentBatch.set(tenantDb.collection('pricing').doc(id), {
            id, ...p, isPublished: true, createdAt: new Date().toISOString()
        }));
    }

    console.log('✅ 가격표 시딩 완료.');

    // 4. 회원 데이터 (그룹별 다채롭게 150명 생성)
    const firstNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
    const lastNames = ['민준', '서준', '도윤', '예준', '시우', '하준', '지호', '지훈', '서연', '서윤', '지우', '서현', '하은', '하윤', '민서', '지민', '희은', '태희', '연아', '수진', '지영'];
    const getRandomName = () => firstNames[Math.floor(Math.random() * firstNames.length)] + lastNames[Math.floor(Math.random() * lastNames.length)];

    const memberIds = [];
    const membersDataMap = {}; // [FIX] To populate attendance logs correctly
    for (let i = 0; i < 150; i++) {
        const isDemo = i === 0;
        const id = isDemo ? 'demo-member' : tenantDb.collection('members').doc().id;
        memberIds.push(id);
        const name = isDemo ? '최우수회원 (데모)' : getRandomName();
        const phone = isDemo ? '010-0000-0000' : `010-${String(Math.floor(Math.random() * 8999) + 1000)}-${String(Math.floor(Math.random() * 8999) + 1000)}`;
        membersDataMap[id] = { name, phone, profileImageUrl: null };
        
        const type = Math.random() > 0.4 ? 'yoga_unlimited' : 'pilates_count';
        const isUnlimited = type === 'yoga_unlimited';
        let credits = 0;
        
        // 활동/휴면 비율 분배: 80% 활성, 20% 만료/소진
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
                hasFaceDescriptor: Math.random() > 0.15, // 85% 안면 정보 보유
                status: credits > 0 ? 'active' : 'expired',
                createdAt: new Date(new Date(regDate).getTime() - 86400000).toISOString(),
                branchId: 'main',
                lastAttendance: lastAttendanceStr,
                lastPaymentDate: lastPaymentStr
            });
        });
    }

    console.log('✅ 회원 시딩 완료.');

    // 4.5. 기타 필수 데모 자산 (로고, 시간표 이미지, 휴지통 예시)
    await addOp(() => {
        currentBatch.set(db.doc('studios/demo-yoga/images/logo'), {
            url: 'https://passflow-0324.web.app/assets/passflow_ai_logo_transparent_final.png',
            updatedAt: new Date().toISOString()
        }, { merge: true });
        
        currentBatch.set(db.doc(`studios/demo-yoga/images/timetable_main_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`), {
            url: 'https://passflow-0324.web.app/assets/hero_bg_ai.png',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // 다음 달 시간표
        const nextDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        currentBatch.set(db.doc(`studios/demo-yoga/images/timetable_main_${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`), {
            url: 'https://passflow-0324.web.app/assets/hero_bg_ai.png',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // 휴지통
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
    console.log('✅ 추가 데모 자산 시딩 완료.');

    // 5. 공지사항 및 히스토리
    const notices = [
        { title: '[필독] 회원 안면 데이터 관리 시스템 변경 안내', content: 'PassFlow Ai 서버 이중화 완료로 더욱 정교한 인증과 데이터 보안이 가능해졌습니다.', type: 'notice', isImportant: true },
        { title: '4월 요가/필라테스 그룹 레슨 시간표 개편 확정', content: '오전 7시 아쉬탕가 클래스가 주 5회로 확대 편성됩니다. 어플에서 신규 시간표를 확인하세요.', type: 'event', isImportant: false },
        { title: '스튜디오 대청소로 인한 일주 휴관 안내', content: '방역 및 프리미엄 소독 완료. 최상의 센터 컨디션을 약속드립니다.', type: 'notice', isImportant: false }
    ];
    for (const notice of notices) {
        const id = tenantDb.collection('board_notices').doc().id;
        await addOp(() => currentBatch.set(tenantDb.collection('board_notices').doc(id), {
            id, ...notice,
            author: '김보람 원장', createdAt: new Date(today.getTime() - Math.random()*86400000*5).toISOString()
        }));
    }

    console.log('✅ 공지사항 시딩 완료.');

    // 6. 매출 데이터 (그래프 극대화를 위해 최근 4달간 120건 생성)
    for (let m = 0; m < 4; m++) {
        for (let i = 0; i < 30; i++) {
            const saleId = tenantDb.collection('sales').doc().id;
            const saleDate = new Date(today);
            saleDate.setMonth(today.getMonth() - m);
            saleDate.setDate(Math.floor(Math.random() * 28) + 1);
            
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
                    amount: priceItem.price * (Math.random() > 0.9 ? 0.8 : 1), // 할인 로직
                    status: 'completed', branchId: 'main',
                    createdAt: saleDate.toISOString()
                });
            });
        }
    }

    console.log('✅ 매출 통계 데이터 시딩 완료.');

    // 7. 실시간 출석 및 매일 시간표 (28일 전 ~ 7일 후 클래스 스케줄 생성)
    const scheduleTemplate = [
        { time: '07:00', names: ['아쉬탕가 풀프라이머리', '리포머 코어포커스'] },
        { time: '10:00', names: ['하타 인텐시브', '빈야사 플로우'] },
        { time: '12:00', names: ['인양 테라피'], ins: '이수아 강사' }, 
        { time: '18:30', names: ['캐딜락&바렐 그룹', '빈야사 플로우'] },
        { time: '19:30', names: ['플라잉 베이직', '아쉬탕가 풀프라이머리'] },
        { time: '20:30', names: ['리포머 코어포커스', '프라이빗 1:1 레슨'] }
    ];

    let attendanceCount = 0;

    for (let d = -28; d <= 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() + d);
        const dateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const isPast = d < 0;
        const isToday = d === 0;

        const dailyClasses = [];

        for (const slot of scheduleTemplate) {
            const time = slot.time;
            const className = slot.names[Math.floor(Math.random() * slot.names.length)];
            const insName = slot.ins || instructors[Math.floor(Math.random() * instructors.length)].name;
            
            // 피크타임일 수록 예약자가 많음 (저녁)
            let maxCount = (time.startsWith('18') || time.startsWith('19') || time.startsWith('20')) ? 16 : 8;
            const attendeesCount = Math.floor(Math.random() * 5) + maxCount - 4; 
            
            // 7.1 수강/예약 멤버 할당
            const attendees = [...memberIds].sort(() => 0.5 - Math.random()).slice(0, attendeesCount);

            if (isToday && !attendees.includes('demo-member')) {
                attendees.push('demo-member'); // 데모 멤버는 오늘 모든 수업에 억지로 넣어둠 (확인하기 쉽게)
            }

            dailyClasses.push({
                time, title: className,
                instructor: insName,
                status: 'normal',
                capacity: 20, attendees,
                duration: 60, level: ''
            });

            // 7.2 과거/당일 출석 데이터 기록 시딩 (밑에서 계속 활용하기 위해 class 정보 전달)
            slot.currentAttendees = attendees;
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

        for (const slot of scheduleTemplate) {
            const time = slot.time;
            const attendees = slot.currentAttendees || [];


            // 7.2 과거/당일 출석 데이터 기록 시딩
            const slotHour = parseInt(time.split(':')[0], 10);
            const currentHour = today.getHours();
            
            // 이미 지난 시간이면 출석 기록에 넣기
            if (isPast || (isToday && slotHour <= currentHour)) {
                for (const memberId of attendees) {
                    if (Math.random() > 0.85) continue; // 15% No-show
                    
                    const logId = tenantDb.collection('attendance').doc().id;
                    const timestampObj = new Date(`${dateStr}T${time}:00+09:00`);
                    // 출석 시간 리얼하게 클래스 시작 -15분 ~ +2분 사이
                    timestampObj.setMinutes(timestampObj.getMinutes() - Math.floor(Math.random() * 15) + 2);

                    await addOp(() => {
                        const mData = membersDataMap[memberId] || { name: '데모 회원', phone: '010-0000-0000', profileImageUrl: null };
                        currentBatch.set(tenantDb.collection('attendance').doc(logId), {
                            id: logId, memberId,
                            memberName: mData.name,
                            memberPhone: mData.phone,
                            profileImageUrl: mData.profileImageUrl,
                            // [CRITICAL FIX] ISO string for timestamps identical to production behavior!
                            timestamp: timestampObj.toISOString(),
                            date: dateStr, 
                            className: className,
                            classTime: time, // Added classTime for grouping
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
    console.log('🎉 완벽하게 현실적이고 차트가 꽉차는 슈퍼 데모 데이터 셋업이 완료되었습니다. (passflow-demo-0324)');
}

module.exports = { refreshDemoData };
