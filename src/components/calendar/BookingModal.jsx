import { useState, useEffect } from 'react';
import * as bookingService from '../../services/bookingService';

export const BookingModal = ({
  info,
  config,
  branchId,
  bookingLoading,
  onBook,
  onCancel,
  onClose,
  t
}) => {
  const { classInfo, dateStr, booking } = info;
  const capacity = bookingService.getClassCapacity(classInfo, branchId, config);
  const [classBookings, setClassBookings] = useState([]);
  
  useEffect(() => {
    bookingService.getClassBookings(dateStr, info.classIndex, branchId).then(setClassBookings);
  }, [dateStr, info.classIndex, branchId]);
  
  const confirmedCount = classBookings.filter(b => b.status === 'booked' || b.status === 'attended').length;
  const isFull = confirmedCount >= capacity;
  const isBooked = booking && (booking.status === 'booked' || booking.status === 'waitlisted');
  const isWaitlisted = booking?.status === 'waitlisted';
  const rules = config?.POLICIES?.BOOKING_RULES || {};
  
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={onClose}>
      <div style={{
        background: 'rgba(30,30,30,0.98)', borderRadius: '20px', padding: '28px', maxWidth: '340px', width: '90%',
        border: '1px solid rgba(var(--primary-rgb), 0.3)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--primary-gold)', fontWeight: 'bold', marginBottom: '4px' }}>
                {dateStr} {classInfo?.time || ''}
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: 'white', fontWeight: 800 }}>
                {classInfo?.title || classInfo?.name || t("g_550350") || "Class"}
            </h3>
            {classInfo?.instructor && <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                👤 {classInfo.instructor}
            </div>}
        </div>
        <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{t("g_f91285") || "Capacity"}</span>
                <span style={{ color: isFull ? '#ff6b6b' : 'var(--primary-gold)', fontWeight: 'bold' }}>
                    {confirmedCount} / {capacity}{t("g_5a62fd") || "people"}
                </span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: '3px', width: `${Math.min(confirmedCount / capacity * 100, 100)}%`,
                    background: isFull ? 'linear-gradient(90deg, #ff6b6b, #ee5a24)' : 'linear-gradient(90deg, var(--primary-gold), #f0c040)',
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{
                flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer'
            }}>{t("g_94b7db") || "Close"}</button>
            {isBooked ? (
                <button onClick={onCancel} disabled={bookingLoading} style={{
                    flex: 2, padding: '12px', borderRadius: '12px', border: 'none', background: '#ff6b6b', color: 'white',
                    fontSize: '0.9rem', fontWeight: 'bold', cursor: bookingLoading ? 'wait' : 'pointer', opacity: bookingLoading ? 0.5 : 1
                }}>{bookingLoading ? t("g_e6e1a2") || "처리 중..." : isWaitlisted ? t("g_afcbc1") || "Waitlisted at position 취소" : t("g_7f40dc") || "Booking Cancelled"}</button>
            ) : (
                <button onClick={onBook} disabled={bookingLoading} style={{
                    flex: 2, padding: '12px', borderRadius: '12px', border: 'none',
                    background: isFull ? rules.enableWaitlist ? 'linear-gradient(135deg, #f39c12, #e67e22)' : 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--primary-gold), #c9a02e)',
                    color: isFull && !rules.enableWaitlist ? 'rgba(255,255,255,0.3)' : isFull ? 'white' : 'black',
                    fontSize: '0.9rem', fontWeight: 'bold', cursor: isFull && !rules.enableWaitlist ? 'not-allowed' : bookingLoading ? 'wait' : 'pointer', opacity: bookingLoading ? 0.5 : 1
                }}>{bookingLoading ? t("g_e6e1a2") || "처리 중..." : isFull ? rules.enableWaitlist ? t("g_78841d") || "Waitlisted at position 등록" : t("g_27a026") || "정원 마감" : t("g_379fdd") || "예약하기"}</button>
            )}
        </div>
      </div>
    </div>
  );
};
