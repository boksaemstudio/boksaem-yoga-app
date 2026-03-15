import { db } from "../firebase";
import {
    collection, doc, getDoc, getDocs, setDoc, deleteDoc,
    query, where, orderBy, onSnapshot, serverTimestamp, runTransaction
} from "firebase/firestore";

/**
 * 🧘 수업 예약 서비스
 * 
 * Firestore 컬렉션: bookings
 * 문서 ID: {date}_{classIndex}_{memberId}
 * 
 * 상태 흐름: booked → attended / noshow / cancelled
 *           waitlisted → booked (취소 발생 시 자동 승격)
 */

// ─── 헬퍼: config에서 예약 규칙 가져오기 ───
const getBookingRules = (config) => {
    return config?.POLICIES?.BOOKING_RULES || {
        defaultCapacity: 15,
        windowDays: 7,
        deadlineHours: 1,
        cancelDeadlineHours: 3,
        maxActiveBookings: 3,
        maxDailyBookings: 2,
        noshowCreditDeduct: 1,
        enableWaitlist: true,
        branchCapacity: {}
    };
};

// ─── 헬퍼: 수업 정원 구하기 (수업자체 > 지점별 > 기본값) ───
export const getClassCapacity = (classItem, branchId, config) => {
    // 1순위: 수업 자체에 설정된 정원
    if (classItem?.capacity) return classItem.capacity;
    
    const rules = getBookingRules(config);
    
    // 2순위: 지점별 정원
    if (branchId && rules.branchCapacity?.[branchId]) {
        return rules.branchCapacity[branchId];
    }
    
    // 3순위: 기본값
    return rules.defaultCapacity || 15;
};

// ─── 예약 가능 여부 검증 ───
export const validateBooking = async (memberId, date, classIndex, branchId, config) => {
    const rules = getBookingRules(config);
    const now = new Date();
    
    // 1. 예약 기능 ON 확인
    if (!config?.POLICIES?.ALLOW_BOOKING) {
        return { ok: false, reason: '예약 기능이 비활성화되어 있습니다' };
    }
    
    // 2. 예약 가능 기간 확인 (N일 전부터)
    const classDate = new Date(date);
    const diffDays = Math.ceil((classDate - now) / (1000 * 60 * 60 * 24));
    if (diffDays > rules.windowDays) {
        return { ok: false, reason: `예약은 ${rules.windowDays}일 전부터 가능합니다` };
    }
    if (diffDays < 0) {
        return { ok: false, reason: '지난 수업은 예약할 수 없습니다' };
    }
    
    // 3. 예약 마감 확인
    // classItem의 시작 시간을 기준으로 N시간 전까지만 예약 가능
    // (classItem이 없는 경우 날짜만으로 판단)
    
    // 4. 동시 예약 한도 확인
    const activeBookings = await getActiveBookings(memberId);
    if (activeBookings.length >= rules.maxActiveBookings) {
        return { ok: false, reason: `동시에 ${rules.maxActiveBookings}건까지만 예약 가능합니다` };
    }
    
    // 5. 당일 예약 한도 확인
    const dailyBookings = activeBookings.filter(b => b.date === date);
    if (dailyBookings.length >= rules.maxDailyBookings) {
        return { ok: false, reason: `하루 ${rules.maxDailyBookings}건까지만 예약 가능합니다` };
    }
    
    // 6. 중복 예약 확인
    const existingBooking = await getBooking(date, classIndex, memberId);
    if (existingBooking && existingBooking.status !== 'cancelled') {
        return { ok: false, reason: '이미 이 수업에 예약되어 있습니다' };
    }
    
    return { ok: true };
};

// ─── 예약 생성 ───
export const createBooking = async (memberId, memberName, date, classIndex, classInfo, branchId, config) => {
    const rules = getBookingRules(config);
    const capacity = getClassCapacity(classInfo, branchId, config);
    
    // 현재 예약 수 확인
    const currentBookings = await getClassBookings(date, classIndex, branchId);
    const confirmedCount = currentBookings.filter(b => b.status === 'booked').length;
    
    let status = 'booked';
    let waitlistPosition = null;
    
    if (confirmedCount >= capacity) {
        if (!rules.enableWaitlist) {
            return { ok: false, reason: '정원이 찼습니다' };
        }
        status = 'waitlisted';
        const waitlistCount = currentBookings.filter(b => b.status === 'waitlisted').length;
        waitlistPosition = waitlistCount + 1;
    }
    
    const bookingId = `${date}_${classIndex}_${memberId}`;
    const bookingData = {
        id: bookingId,
        memberId,
        memberName,
        date,
        classIndex,
        className: classInfo?.name || '',
        classTime: classInfo?.time || '',
        instructor: classInfo?.instructor || '',
        branchId: branchId || '',
        status,
        waitlistPosition,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'bookings', bookingId), bookingData);
    
    return { 
        ok: true, 
        booking: bookingData,
        message: status === 'waitlisted' 
            ? `대기 ${waitlistPosition}번째로 등록되었습니다` 
            : '예약이 완료되었습니다'
    };
};

// ─── 예약 취소 ───
export const cancelBooking = async (date, classIndex, memberId, branchId, config) => {
    const rules = getBookingRules(config);
    const bookingId = `${date}_${classIndex}_${memberId}`;
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
        return { ok: false, reason: '예약을 찾을 수 없습니다' };
    }
    
    const booking = bookingSnap.data();
    
    if (booking.status === 'cancelled') {
        return { ok: false, reason: '이미 취소된 예약입니다' };
    }
    
    // 취소 마감 확인 (노쇼가 아닌 경우만)
    if (booking.status === 'booked') {
        // 여기에 시간 기반 취소 마감 검증 추가 가능
    }
    
    await setDoc(bookingRef, { 
        status: 'cancelled', 
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    }, { merge: true });
    
    // 대기열 승격 처리
    if (booking.status === 'booked' && rules.enableWaitlist) {
        await promoteWaitlist(date, classIndex, branchId);
    }
    
    return { ok: true, message: '예약이 취소되었습니다' };
};

// ─── 대기열 자동 승격 ───
const promoteWaitlist = async (date, classIndex, branchId) => {
    const waitlisted = await getClassBookings(date, classIndex, branchId, 'waitlisted');
    
    if (waitlisted.length === 0) return null;
    
    // 가장 먼저 대기 등록한 사람 승격
    const sorted = waitlisted.sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0));
    const promoted = sorted[0];
    
    const bookingRef = doc(db, 'bookings', promoted.id);
    await setDoc(bookingRef, { 
        status: 'booked', 
        waitlistPosition: null, 
        promotedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    }, { merge: true });
    
    // 나머지 대기자들 순서 재조정
    for (let i = 1; i < sorted.length; i++) {
        await setDoc(doc(db, 'bookings', sorted[i].id), { 
            waitlistPosition: i,
            updatedAt: serverTimestamp()
        }, { merge: true });
    }
    
    return promoted;
};

// ─── 출석 처리 ───
export const markAttendance = async (date, classIndex, memberId) => {
    const bookingId = `${date}_${classIndex}_${memberId}`;
    const bookingRef = doc(db, 'bookings', bookingId);
    
    await setDoc(bookingRef, { 
        status: 'attended', 
        attendedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    }, { merge: true });
    
    return { ok: true };
};

// ─── 노쇼 처리 ───
export const markNoshow = async (date, classIndex, memberId, config) => {
    const rules = getBookingRules(config);
    const bookingId = `${date}_${classIndex}_${memberId}`;
    const bookingRef = doc(db, 'bookings', bookingId);
    
    await setDoc(bookingRef, { 
        status: 'noshow', 
        noshowAt: serverTimestamp(),
        creditDeducted: rules.noshowCreditDeduct,
        updatedAt: serverTimestamp()
    }, { merge: true });
    
    return { ok: true, creditDeducted: rules.noshowCreditDeduct };
};

// ─── 조회 함수들 ───

// 특정 예약 조회
export const getBooking = async (date, classIndex, memberId) => {
    const bookingId = `${date}_${classIndex}_${memberId}`;
    const snap = await getDoc(doc(db, 'bookings', bookingId));
    return snap.exists() ? snap.data() : null;
};

// 회원의 활성 예약 목록
export const getActiveBookings = async (memberId) => {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
        collection(db, 'bookings'),
        where('memberId', '==', memberId),
        where('date', '>=', today)
    );
    const snap = await getDocs(q);
    // 클라이언트에서 상태 필터 (in + >= 복합 쿼리 대신)
    return snap.docs.map(d => d.data()).filter(b => b.status === 'booked' || b.status === 'waitlisted');
};

// 특정 수업의 예약 목록
export const getClassBookings = async (date, classIndex, branchId, statusFilter = null) => {
    let q;
    if (statusFilter) {
        q = query(
            collection(db, 'bookings'),
            where('date', '==', date),
            where('classIndex', '==', classIndex),
            where('branchId', '==', branchId || ''),
            where('status', '==', statusFilter)
        );
    } else {
        q = query(
            collection(db, 'bookings'),
            where('date', '==', date),
            where('classIndex', '==', classIndex),
            where('branchId', '==', branchId || '')
        );
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
};

// 특정 날짜의 모든 예약 (관리자/강사용)
export const getDayBookings = async (date, branchId) => {
    const q = query(
        collection(db, 'bookings'),
        where('date', '==', date),
        where('branchId', '==', branchId || '')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
};

// 기간별 예약 통계 (관리자 대시보드)
export const getBookingStats = async (branchId, startDate, endDate) => {
    const q = query(
        collection(db, 'bookings'),
        where('branchId', '==', branchId || ''),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
    );
    const snap = await getDocs(q);
    const bookings = snap.docs.map(d => d.data());
    
    return {
        total: bookings.length,
        booked: bookings.filter(b => b.status === 'booked').length,
        attended: bookings.filter(b => b.status === 'attended').length,
        noshow: bookings.filter(b => b.status === 'noshow').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
        waitlisted: bookings.filter(b => b.status === 'waitlisted').length,
        bookings
    };
};

// ─── 실시간 구독: 특정 날짜의 예약 ───
export const subscribeDayBookings = (date, branchId, callback) => {
    const q = query(
        collection(db, 'bookings'),
        where('date', '==', date),
        where('branchId', '==', branchId || '')
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => d.data()));
    }, (err) => {
        console.warn('[BookingService] subscribeDayBookings error:', err);
        callback([]);
    });
};

// ─── 실시간 구독: 월간 예약 ───
export const subscribeMonthBookings = (branchId, year, month, callback) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const q = query(
        collection(db, 'bookings'),
        where('branchId', '==', branchId || ''),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
    );
    return onSnapshot(q, (snap) => {
        const bookings = snap.docs.map(d => d.data());
        callback(bookings);
    }, (err) => {
        console.warn('[BookingService] subscribeMonthBookings error:', err);
        callback([]);
    });
};

// 회원의 예약 이력 (전체)
export const getMemberBookingHistory = async (memberId) => {
    const q = query(
        collection(db, 'bookings'),
        where('memberId', '==', memberId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data()).sort((a, b) => b.date.localeCompare(a.date));
};

// ─── 실시간 구독 ───

// 특정 수업의 예약 실시간 구독
export const subscribeClassBookings = (date, classIndex, branchId, callback) => {
    const q = query(
        collection(db, 'bookings'),
        where('date', '==', date),
        where('classIndex', '==', classIndex),
        where('branchId', '==', branchId || '')
    );
    
    return onSnapshot(q, (snapshot) => {
        const bookings = snapshot.docs.map(d => d.data());
        callback(bookings);
    });
};

// 회원의 예약 실시간 구독
export const subscribeMemberBookings = (memberId, callback) => {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
        collection(db, 'bookings'),
        where('memberId', '==', memberId),
        where('date', '>=', today)
    );
    
    return onSnapshot(q, (snapshot) => {
        const bookings = snapshot.docs.map(d => d.data());
        callback(bookings);
    });
};
