const { admin, getKSTDateString } = require('./common');

// 국가별 타임존 오프셋 정의 (UTC 기준 시간 단위)
const DEMO_TENANTS = [
    { id: 'demo-yoga', tzOffset: 9 },       // KST (한국)
    { id: 'demo-yoga-ja', tzOffset: 9 },    // JST (일본)
    { id: 'demo-yoga-zh', tzOffset: 8 },    // CST (중국)
    { id: 'demo-yoga-vi', tzOffset: 7 },    // ICT (베트남)
    { id: 'demo-yoga-th', tzOffset: 7 },    // ICT (태국)
    { id: 'demo-yoga-ru', tzOffset: 3 },    // MSK (러시아)
    { id: 'demo-yoga-fr', tzOffset: 2 },    // CEST (프랑스)
    { id: 'demo-yoga-de', tzOffset: 2 },    // CEST (독일)
    { id: 'demo-yoga-es', tzOffset: 2 },    // CEST (스페인)
    { id: 'demo-yoga-pt', tzOffset: 1 },    // WEST (포르투갈)
    { id: 'demo-yoga-en', tzOffset: -5 }    // EST (미국 동부)
];

// 범용 로컬 타임 문자열 생성기 (YYYY-MM-DD)
function getLocalDateString(date, tzOffset) {
    const localDate = new Date(date.getTime() + (tzOffset * 60 * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

async function injectLiveActivity() {
    const db = admin.firestore();
    console.log('⚡ [Live Injector] 글로벌 데모 환경 1분 주기 수시 활동 시뮬레이션 시작');

    const now = new Date();

    for (const tenant of DEMO_TENANTS) {
        const tenantDb = db.doc(`studios/${tenant.id}`);
        
        // 해당 테넌트의 현지 시간 계산
        const localNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (tenant.tzOffset * 60 * 60 * 1000));
        const todayStr = getLocalDateString(now, tenant.tzOffset);
        
        const currentHour = localNow.getHours();
        const currentMin = localNow.getMinutes();

        // 근무 시간(07:00 ~ 22:00)이 아니면 패스 (새벽에는 활동 없음)
        if (currentHour < 6 || currentHour > 22) continue;

        try {
            let batch = db.batch();
            let ops = 0;

            // 1. 활성 회원 100명 무작위 샘플링
            const membersSnap = await tenantDb.collection('members').where('status', '==', 'active').limit(100).get();
            if (membersSnap.empty) continue;
            const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 2. 오늘의 시간표 로드
            const docId = Math.random() > 0.5 ? `main_${todayStr}` : `branch2_${todayStr}`;
            const dailyDocRef = tenantDb.collection('daily_classes').doc(docId);
            const dailyDocSnap = await dailyDocRef.get();
            
            if (dailyDocSnap.exists) {
                const data = dailyDocSnap.data();
                let classesUpdated = false;
                
                for (let i = 0; i < data.classes.length; i++) {
                    const cls = data.classes[i];
                    const [startH, startM] = cls.time.split(':').map(Number);
                    
                    // 시간 차이(분 단위) 계산
                    const diffMinutes = (currentHour * 60 + currentMin) - (startH * 60 + startM);

                    // [수시 출석] 수업 시작 전 15분 ~ 수업 시작 후 5분 사이인 경우
                    if (diffMinutes >= -15 && diffMinutes <= 5) {
                        if (cls.attendees && cls.attendees.length > 0 && Math.random() < 0.3) {
                            const randomMemberId = cls.attendees[Math.floor(Math.random() * cls.attendees.length)];
                            
                            const attCheck = await tenantDb.collection('attendance')
                                .where('memberId', '==', randomMemberId)
                                .where('className', '==', cls.title)
                                .where('date', '==', todayStr).get();
                                
                            if (attCheck.empty) {
                                const mData = members.find(m => m.id === randomMemberId) || { name: '데모회원' };
                                const logId = tenantDb.collection('attendance').doc().id;

                                batch.set(tenantDb.collection('attendance').doc(logId), {
                                    id: logId, memberId: randomMemberId, memberName: mData.name,
                                    profileImageUrl: mData.profileImageUrl || null,
                                    timestamp: now.toISOString(), date: todayStr,
                                    className: cls.title, classTime: cls.time, instructor: cls.instructor,
                                    status: 'approved', denialReason: '사유 없음', branchId: docId.startsWith('main') ? 'main' : 'branch2'
                                });
                                console.log(`⏱️ [${tenant.id}] 출석: ${mData.name} 님이 ${cls.time} ${cls.title} 수업에 출석했습니다. (현지시간: ${currentHour}:${currentMin})`);
                                ops++;
                            }
                        }
                    }

                    // [수시 예약 변동] 수업 시작 1~3시간 전인 경우 (취소 나오거나 새로운 사람 예약)
                    if (diffMinutes >= -180 && diffMinutes <= -60) {
                        if (Math.random() < 0.05) { // 5% 확률
                            if (Math.random() < 0.5 && cls.attendees.length < (cls.capacity || 15)) {
                                const randomMember = members[Math.floor(Math.random() * members.length)];
                                if (!cls.attendees.includes(randomMember.id)) {
                                    cls.attendees.push(randomMember.id);
                                    classesUpdated = true;
                                    
                                    const historyId = tenantDb.collection('booking_histories').doc().id;
                                    batch.set(tenantDb.collection('booking_histories').doc(historyId), {
                                        id: historyId, memberId: randomMember.id, memberName: randomMember.name,
                                        branchId: docId.startsWith('main') ? 'main' : 'branch2', className: cls.title, date: todayStr, time: cls.time,
                                        status: 'booked', timestamp: now.toISOString()
                                    });
                                    ops++;
                                }
                            } else if (cls.attendees.length > 2) {
                                const cancelIndex = Math.floor(Math.random() * cls.attendees.length);
                                const canceledId = cls.attendees[cancelIndex];
                                cls.attendees.splice(cancelIndex, 1);
                                classesUpdated = true;
                                
                                const historyId = tenantDb.collection('booking_histories').doc().id;
                                batch.set(tenantDb.collection('booking_histories').doc(historyId), {
                                    id: historyId, memberId: canceledId, memberName: '회원',
                                    branchId: docId.startsWith('main') ? 'main' : 'branch2', className: cls.title, date: todayStr, time: cls.time,
                                    status: 'cancelled', timestamp: now.toISOString()
                                });
                                ops++;
                            }
                        }
                    }
                }
                
                if (classesUpdated) {
                    batch.update(dailyDocRef, { classes: data.classes, updatedAt: now.toISOString() });
                    ops++;
                }
            }

            // 3. 실시간 매출 발생 (현지시간 09:00 ~ 21:00 중에만 발생, 1.5% 확률)
            if (currentHour >= 9 && currentHour <= 21 && Math.random() < 0.015) {
                 const saleId = tenantDb.collection('sales').doc().id;
                 const m = members[Math.floor(Math.random() * members.length)];
                 const isYoga = Math.random() > 0.5;
                 batch.set(tenantDb.collection('sales').doc(saleId), {
                     id: saleId, date: todayStr, timestamp: now.toISOString(),
                     itemType: isYoga ? 'yoga' : 'pilates',
                     itemName: isYoga ? 'Membership (Auto)' : 'Personal Training',
                     memberName: m.name, memberId: m.id,
                     paymentMethod: Math.random() > 0.4 ? 'card' : 'cash',
                     amount: isYoga ? 150000 : 380000,
                     status: 'completed', branchId: docId.startsWith('main') ? 'main' : 'branch2',
                     createdAt: now.toISOString(), isLiveSimulated: true
                 });
                 console.log(`⏱️ [${tenant.id}] 💸 매출: ${m.name} 결제 발생. (현지시간: ${currentHour}:${currentMin})`);
                 ops++;
            }

            if (ops > 0) {
                await batch.commit();
            }

        } catch (e) {
            console.error(`Live Simulator Error [${tenant.id}]:`, e);
        }
    }
}

module.exports = { injectLiveActivity };
