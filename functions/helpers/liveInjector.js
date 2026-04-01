const { admin, getKSTDateString } = require('./common');

async function injectLiveActivity() {
    const db = admin.firestore();
    const tenantDb = db.doc('studios/demo-yoga');

    console.log('⚡ [Live Injector] 데모 환경 1분 주기 수시 활동 시뮬레이션 시작');

    const now = new Date();
    // KST 시간 변환
    const kstOffset = 9 * 60 * 60 * 1000;
    const nowKst = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + kstOffset);
    const todayStr = getKSTDateString(now);

    const currentHour = nowKst.getHours();
    const currentMin = nowKst.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

    try {
        let batch = db.batch();
        let ops = 0;

        // 1. 활성 회원 100명 무작위 샘플링
        const membersSnap = await tenantDb.collection('members').where('status', '==', 'active').limit(100).get();
        if (membersSnap.empty) return;
        const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 2. 오늘의 시간표 로드
        const docId = `main_${todayStr}`;
        const dailyDocRef = tenantDb.collection('daily_classes').doc(docId);
        const dailyDocSnap = await dailyDocRef.get();
        
        if (dailyDocSnap.exists()) {
            const data = dailyDocSnap.data();
            let classesUpdated = false;
            
            for (let i = 0; i < data.classes.length; i++) {
                const cls = data.classes[i];
                const [startH, startM] = cls.time.split(':').map(Number);
                
                // 시간 차이(분 단위) 계산
                const diffMinutes = (currentHour * 60 + currentMin) - (startH * 60 + startM);

                // [수시 출석] 수업 시작 전 15분 ~ 수업 시작 후 5분 사이인 경우
                if (diffMinutes >= -15 && diffMinutes <= 5) {
                    // 참석자 중 랜덤으로 한 명 출석시키기 (30% 확률로 1분에 1명씩 찍힘 -> 15분간 약 4~5명 찍힘)
                    if (cls.attendees && cls.attendees.length > 0 && Math.random() < 0.3) {
                        const randomMemberId = cls.attendees[Math.floor(Math.random() * cls.attendees.length)];
                        
                        // 이미 오늘 출석했는지 확인
                        const attCheck = await tenantDb.collection('attendance')
                            .where('memberId', '==', randomMemberId)
                            .where('className', '==', cls.title)
                            .where('date', '==', todayStr).get();
                            
                        if (attCheck.empty) {
                            const mData = members.find(m => m.id === randomMemberId) || { name: '데모회원' };
                            const logId = tenantDb.collection('attendance').doc().id;

                            // 출석 로깅
                            batch.set(tenantDb.collection('attendance').doc(logId), {
                                id: logId,
                                memberId: randomMemberId,
                                memberName: mData.name,
                                profileImageUrl: mData.profileImageUrl || null,
                                timestamp: now.toISOString(),
                                date: todayStr,
                                className: cls.title,
                                classTime: cls.time,
                                instructor: cls.instructor,
                                status: 'approved',
                                denialReason: '사유 없음',
                                branchId: 'main'
                            });
                            console.log(`⏱️ [Live Injector] 출석 발생: ${mData.name} 님이 ${cls.time} ${cls.title} 수업에 출석했습니다.`);
                            ops++;
                        }
                    }
                }

                // [수시 예약 변동] 수업 시작 1~3시간 전인 경우 (취소 나오거나 새로운 사람 예약)
                if (diffMinutes >= -180 && diffMinutes <= -60) {
                    if (Math.random() < 0.05) { // 5% 확률로 예약 변경
                        if (Math.random() < 0.5 && cls.attendees.length < (cls.capacity || 15)) {
                            // 신규 예약 추가
                            const randomMember = members[Math.floor(Math.random() * members.length)];
                            if (!cls.attendees.includes(randomMember.id)) {
                                cls.attendees.push(randomMember.id);
                                classesUpdated = true;
                                console.log(`⏱️ [Live Injector] 예약 추가: ${randomMember.name} 님이 ${cls.time} 수업을 예약했습니다.`);
                                
                                // Booking History 로그 생성
                                const historyId = tenantDb.collection('booking_histories').doc().id;
                                batch.set(tenantDb.collection('booking_histories').doc(historyId), {
                                    id: historyId, memberId: randomMember.id, memberName: randomMember.name,
                                    branchId: 'main', className: cls.title, date: todayStr, time: cls.time,
                                    status: 'booked', timestamp: now.toISOString()
                                });
                                ops++;
                            }
                        } else if (cls.attendees.length > 2) {
                            // 누군가 예약 취소
                            const cancelIndex = Math.floor(Math.random() * cls.attendees.length);
                            const canceledId = cls.attendees[cancelIndex];
                            cls.attendees.splice(cancelIndex, 1);
                            classesUpdated = true;
                            console.log(`⏱️ [Live Injector] 예약 취소: ${canceledId} 님이 ${cls.time} 수업 예약을 취소했습니다.`);
                            
                            const historyId = tenantDb.collection('booking_histories').doc().id;
                            batch.set(tenantDb.collection('booking_histories').doc(historyId), {
                                id: historyId, memberId: canceledId, memberName: '회원',
                                branchId: 'main', className: cls.title, date: todayStr, time: cls.time,
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

        // 3. 실시간 매출 발생 (1시간에 1건 정도 터지도록 1% 확률 1분=1% => 60분에 0.6건)
        // 근무 시간(09:00 ~ 21:00) 중에만 발생
        if (currentHour >= 9 && currentHour <= 21 && Math.random() < 0.015) {
             const saleId = tenantDb.collection('sales').doc().id;
             const m = members[Math.floor(Math.random() * members.length)];
             batch.set(tenantDb.collection('sales').doc(saleId), {
                 id: saleId,
                 date: todayStr,
                 timestamp: now.toISOString(),
                 itemType: 'yoga',
                 itemName: Math.random() > 0.5 ? '요가 1개월 무제한권' : '요가 3개월 주3회권',
                 memberName: m.name,
                 memberId: m.id,
                 paymentMethod: Math.random() > 0.4 ? 'card' : 'cash',
                 amount: Math.random() > 0.5 ? 150000 : 380000,
                 status: 'completed', 
                 branchId: 'main',
                 createdAt: now.toISOString(),
                 isLiveSimulated: true
             });
             console.log(`⏱️ [Live Injector] 💸 매출 발생: ${m.name} 님의 결제가 등록되었습니다.`);
             ops++;
        }

        if (ops > 0) {
            await batch.commit();
        }

    } catch (e) {
        console.error("Live Simulator Error:", e);
    }
}

module.exports = { injectLiveActivity };
