/**
 * Booking Service — Class Booking & Waitlist
 * TypeScript version
 */
import { db } from "../firebase";
import { getDoc, getDocs, setDoc, query, where, onSnapshot, serverTimestamp, Unsubscribe } from "firebase/firestore";
import { tenantDb } from '../utils/tenantDb';

// ── Types ──
export interface BookingRules { defaultCapacity: number; windowDays: number; deadlineHours: number; cancelDeadlineHours: number; maxActiveBookings: number; maxDailyBookings: number; noshowCreditDeduct: number; enableWaitlist: boolean; branchCapacity: Record<string, number>; }
export interface BookingData { id: string; memberId: string; memberName: string; date: string; classIndex: number; className: string; classTime: string; instructor: string; branchId: string; status: string; waitlistPosition: number | null; [key: string]: unknown; }
export interface ClassItem { name?: string; time?: string; instructor?: string; capacity?: number; [key: string]: unknown; }
export interface StudioConfig { POLICIES?: { ALLOW_BOOKING?: boolean; BOOKING_RULES?: Partial<BookingRules> }; [key: string]: unknown; }
type BookingResult = { ok: boolean; reason?: string; booking?: BookingData; message?: string; creditDeducted?: number };

// ── Helpers ──
const getBookingRules = (config: StudioConfig): BookingRules => (config?.POLICIES?.BOOKING_RULES as BookingRules) || { defaultCapacity: 15, windowDays: 7, deadlineHours: 1, cancelDeadlineHours: 3, maxActiveBookings: 3, maxDailyBookings: 2, noshowCreditDeduct: 1, enableWaitlist: true, branchCapacity: {} };
export const getClassCapacity = (classItem: ClassItem | null, branchId: string, config: StudioConfig): number => { if (classItem?.capacity) return classItem.capacity; const rules = getBookingRules(config); if (branchId && rules.branchCapacity?.[branchId]) return rules.branchCapacity[branchId]; return rules.defaultCapacity || 15; };

// ── Queries ──
export const getBooking = async (date: string, classIndex: number, memberId: string): Promise<BookingData | null> => { const snap = await getDoc(tenantDb.doc('bookings', `${date}_${classIndex}_${memberId}`)); return snap.exists() ? (snap.data() as BookingData) : null; };
export const getActiveBookings = async (memberId: string): Promise<BookingData[]> => { const today = new Date().toISOString().split('T')[0]; const q = query(tenantDb.collection('bookings'), where('memberId', '==', memberId), where('date', '>=', today)); const snap = await getDocs(q); return snap.docs.map(d => d.data() as BookingData).filter(b => b.status === 'booked' || b.status === 'waitlisted'); };
export const getClassBookings = async (date: string, classIndex: number, branchId: string, statusFilter: string | null = null): Promise<BookingData[]> => { const base = [where('date', '==', date), where('classIndex', '==', classIndex), where('branchId', '==', branchId || '')]; if (statusFilter) base.push(where('status', '==', statusFilter)); const q = query(tenantDb.collection('bookings'), ...base); const snap = await getDocs(q); return snap.docs.map(d => d.data() as BookingData); };
export const getDayBookings = async (date: string, branchId: string): Promise<BookingData[]> => { const q = query(tenantDb.collection('bookings'), where('date', '==', date), where('branchId', '==', branchId || '')); const snap = await getDocs(q); return snap.docs.map(d => d.data() as BookingData); };

export const getBookingStats = async (branchId: string, startDate: string, endDate: string) => {
    const q = query(tenantDb.collection('bookings'), where('branchId', '==', branchId || ''), where('date', '>=', startDate), where('date', '<=', endDate));
    const snap = await getDocs(q); const bookings = snap.docs.map(d => d.data() as BookingData);
    return { total: bookings.length, booked: bookings.filter(b => b.status === 'booked').length, attended: bookings.filter(b => b.status === 'attended').length, noshow: bookings.filter(b => b.status === 'noshow').length, cancelled: bookings.filter(b => b.status === 'cancelled').length, waitlisted: bookings.filter(b => b.status === 'waitlisted').length, bookings };
};

export const getMemberBookingHistory = async (memberId: string): Promise<BookingData[]> => { const q = query(tenantDb.collection('bookings'), where('memberId', '==', memberId)); const snap = await getDocs(q); return snap.docs.map(d => d.data() as BookingData).sort((a, b) => b.date.localeCompare(a.date)); };

// ── Validation ──
export const validateBooking = async (memberId: string, date: string, classIndex: number, branchId: string, config: StudioConfig): Promise<{ ok: boolean; reason?: string }> => {
    const rules = getBookingRules(config); const now = new Date();
    if (!config?.POLICIES?.ALLOW_BOOKING) return { ok: false, reason: '예약 기능이 비활성화되어 있습니다' };
    const classDate = new Date(date); const diffDays = Math.ceil((classDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > rules.windowDays) return { ok: false, reason: `예약은 ${rules.windowDays}일 전부터 가능합니다` };
    if (diffDays < 0) return { ok: false, reason: '지난 수업은 예약할 수 없습니다' };
    const activeBookings = await getActiveBookings(memberId);
    if (activeBookings.length >= rules.maxActiveBookings) return { ok: false, reason: `동시에 ${rules.maxActiveBookings}건까지만 예약 가능합니다` };
    if (activeBookings.filter(b => b.date === date).length >= rules.maxDailyBookings) return { ok: false, reason: `하루 ${rules.maxDailyBookings}건까지만 예약 가능합니다` };
    const existing = await getBooking(date, classIndex, memberId);
    if (existing && existing.status !== 'cancelled') return { ok: false, reason: '이미 이 수업에 예약되어 있습니다' };
    return { ok: true };
};

// ── Mutations ──
export const createBooking = async (memberId: string, memberName: string, date: string, classIndex: number, classInfo: ClassItem | null, branchId: string, config: StudioConfig): Promise<BookingResult> => {
    const rules = getBookingRules(config); const capacity = getClassCapacity(classInfo, branchId, config);
    const currentBookings = await getClassBookings(date, classIndex, branchId); const confirmedCount = currentBookings.filter(b => b.status === 'booked').length;
    let status = 'booked'; let waitlistPosition: number | null = null;
    if (confirmedCount >= capacity) { if (!rules.enableWaitlist) return { ok: false, reason: '정원이 찼습니다' }; status = 'waitlisted'; waitlistPosition = currentBookings.filter(b => b.status === 'waitlisted').length + 1; }
    const bookingId = `${date}_${classIndex}_${memberId}`;
    const bookingData: BookingData = { id: bookingId, memberId, memberName, date, classIndex, className: classInfo?.name || '', classTime: classInfo?.time || '', instructor: classInfo?.instructor || '', branchId: branchId || '', status, waitlistPosition };
    await setDoc(tenantDb.doc('bookings', bookingId), { ...bookingData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { ok: true, booking: bookingData, message: status === 'waitlisted' ? `대기 ${waitlistPosition}번째로 등록되었습니다` : '예약이 완료되었습니다' };
};

const promoteWaitlist = async (date: string, classIndex: number, branchId: string): Promise<BookingData | null> => {
    try { const waitlisted = await getClassBookings(date, classIndex, branchId, 'waitlisted'); if (waitlisted.length === 0) return null;
    const sorted = waitlisted.sort((a, b) => (a.waitlistPosition || 0) - (b.waitlistPosition || 0)); const promoted = sorted[0];
    await setDoc(tenantDb.doc('bookings', promoted.id), { status: 'booked', waitlistPosition: null, promotedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    for (let i = 1; i < sorted.length; i++) await setDoc(tenantDb.doc('bookings', sorted[i].id), { waitlistPosition: i, updatedAt: serverTimestamp() }, { merge: true });
    return promoted; } catch (error) { console.error('[bookingService] promoteWaitlist error:', error); return null; }
};

export const cancelBooking = async (date: string, classIndex: number, memberId: string, branchId: string, config: StudioConfig): Promise<BookingResult> => {
    try { const rules = getBookingRules(config); const bookingRef = tenantDb.doc('bookings', `${date}_${classIndex}_${memberId}`); const snap = await getDoc(bookingRef);
    if (!snap.exists()) return { ok: false, reason: '예약을 찾을 수 없습니다' }; const booking = snap.data() as BookingData;
    if (booking.status === 'cancelled') return { ok: false, reason: '이미 취소된 예약입니다' };
    await setDoc(bookingRef, { status: 'cancelled', cancelledAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    if (booking.status === 'booked' && rules.enableWaitlist) await promoteWaitlist(date, classIndex, branchId);
    return { ok: true, message: '예약이 취소되었습니다' }; } catch (error) { console.error('[bookingService] cancelBooking error:', error); return { ok: false, reason: '예약 취소 중 에러가 발생했습니다.' }; }
};

export const markAttendance = async (date: string, classIndex: number, memberId: string): Promise<BookingResult> => {
    try { await setDoc(tenantDb.doc('bookings', `${date}_${classIndex}_${memberId}`), { status: 'attended', attendedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }); return { ok: true }; }
    catch (error) { console.error('[bookingService] markAttendance error:', error); return { ok: false, reason: '출석 처리 중 에러가 발생했습니다.' }; }
};

export const markNoshow = async (date: string, classIndex: number, memberId: string, config: StudioConfig): Promise<BookingResult> => {
    try { const rules = getBookingRules(config); await setDoc(tenantDb.doc('bookings', `${date}_${classIndex}_${memberId}`), { status: 'noshow', noshowAt: serverTimestamp(), creditDeducted: rules.noshowCreditDeduct, updatedAt: serverTimestamp() }, { merge: true }); return { ok: true, creditDeducted: rules.noshowCreditDeduct }; }
    catch (error) { console.error('[bookingService] markNoshow error:', error); return { ok: false, reason: '노쇼 처리 중 에러가 발생했습니다.' }; }
};

// ── Subscriptions ──
export const subscribeDayBookings = (date: string, branchId: string, callback: (b: BookingData[]) => void): Unsubscribe => { const q = query(tenantDb.collection('bookings'), where('date', '==', date), where('branchId', '==', branchId || '')); return onSnapshot(q, s => callback(s.docs.map(d => d.data() as BookingData)), err => { console.warn('[BookingService] subscribeDayBookings error:', err); callback([]); }); };
export const subscribeMonthBookings = (branchId: string, year: number, month: number, callback: (b: BookingData[]) => void): Unsubscribe => { const startDate = `${year}-${String(month).padStart(2, '0')}-01`; const daysInMonth = new Date(year, month, 0).getDate(); const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`; const q = query(tenantDb.collection('bookings'), where('branchId', '==', branchId || ''), where('date', '>=', startDate), where('date', '<=', endDate)); return onSnapshot(q, s => callback(s.docs.map(d => d.data() as BookingData)), err => { console.warn('[BookingService] subscribeMonthBookings error:', err); callback([]); }); };
export const subscribeClassBookings = (date: string, classIndex: number, branchId: string, callback: (b: BookingData[]) => void): Unsubscribe => { const q = query(tenantDb.collection('bookings'), where('date', '==', date), where('classIndex', '==', classIndex), where('branchId', '==', branchId || '')); return onSnapshot(q, s => callback(s.docs.map(d => d.data() as BookingData))); };
export const subscribeMemberBookings = (memberId: string, callback: (b: BookingData[]) => void): Unsubscribe => { const today = new Date().toISOString().split('T')[0]; const q = query(tenantDb.collection('bookings'), where('memberId', '==', memberId), where('date', '>=', today)); return onSnapshot(q, s => callback(s.docs.map(d => d.data() as BookingData))); };
