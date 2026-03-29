import React, { useState, useRef } from 'react';
import { X, PaperPlaneTilt, Calendar, CurrencyKrw } from '@phosphor-icons/react';
import { storageService } from '../../../services/storage';

const SEND_MODES = [
    { id: 'push_only', label: '앱 푸시만', desc: '무료', icon: '📱', color: '#10b981' },
    { id: 'push_first', label: '푸시 우선', desc: '푸시 실패 시 SMS', icon: '📱➡📩', color: 'var(--primary-gold)' },
    { id: 'sms_only', label: 'SMS/LMS만', desc: '문자 비용 발생', icon: '📩', color: '#3B82F6' }
];

const BulkMessageModal = ({ isOpen, onClose, selectedMemberIds, memberCount }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const [sendMode, setSendMode] = useState('push_first');
    const scheduleInputRef = useRef(null);

    if (!isOpen) return null;

    const templates = [
        "[일괄연장] 휴무로 인해 전 회원 수강 기간이 O일 연장되었습니다.",
        "[임시휴무] O월 O일~O일 휴무 안내드립니다. 양해 부탁드립니다 🙏",
        "[명절인사] 즐거운 명절 보내세요! 연휴 기간 수강권이 자동 연장됩니다.",
        "[수업변경] 다음 주 수업 시간표가 변경됩니다. 확인 부탁드립니다.",
        "[이벤트] 친구 추천 이벤트! 함께 등록 시 할인 혜택을 드립니다 🎁"
    ];

    const calculateCost = (msg) => {
        let bytes = 0;
        for (let i = 0; i < msg.length; i++) {
            const code = msg.charCodeAt(i);
            bytes += (code >> 7) ? 2 : 1;
        }
        const isLMS = bytes > 90;
        // Push is free, SMS costs apply only for sms_only/push_first fallback
        const costPerMsg = sendMode === 'push_only' ? 0 : (isLMS ? 25 : 8.4);
        return { bytes, isLMS, costPerMsg, totalCost: costPerMsg * memberCount };
    };

    const costInfo = calculateCost(message);

    const handleSend = async () => {
        if (!message.trim()) return;
        if (isScheduled && !scheduledTime) {
            alert("예약 시간을 선택해주세요.");
            return;
        }

        const modeLabel = SEND_MODES.find(m => m.id === sendMode)?.label || sendMode;
        const costText = sendMode === 'push_only' ? '무료' : `약 ${costInfo.totalCost.toLocaleString()}원`;
        if (!confirm(`${memberCount}명에게 ${modeLabel} 방식으로 전송하시겠습니까?\n예상 비용: ${costText}`)) {
            return;
        }

        setSending(true);
        try {
            await storageService.sendBulkMessages(
                selectedMemberIds, 
                message, 
                isScheduled ? scheduledTime : null, 
                sendMode
            );
            alert(isScheduled ? "예약 발송이 설정되었습니다." : "전송이 시작되었습니다.");
            onClose();
            setMessage('');
            setIsScheduled(false);
            setScheduledTime('');
            setSendMode('push_first');
        } catch (error) {
            console.error("Bulk send failed:", error);
            alert("전송 실패: " + error.message);
        } finally {
            setSending(false);
        }
    };

    // [UX] Auto-open picker when scheduled is checked
    const handleScheduleToggle = (e) => {
        const checked = e.target.checked;
        setIsScheduled(checked);
        if (checked) {
            setTimeout(() => {
                try {
                    if (scheduleInputRef.current) scheduleInputRef.current.showPicker();
                } catch (err) { console.log('showPicker not supported', err); }
            }, 100);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, backdropFilter: 'blur(5px)'
        }}>
            <div className="fade-in" style={{
                background: '#1d1d2b', width: '90%', maxWidth: '500px',
                borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
                padding: '24px', color: 'white',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PaperPlaneTilt weight="fill" color="var(--primary-gold)" />
                        단체 메시지 전송
                    </h3>
                    <button 
                        onClick={onClose} 
                        disabled={sending}
                        style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.3 : 1 }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div style={{ marginBottom: '16px', color: '#e4e4e7', fontSize: '0.95rem' }}>
                    <span style={{ color: 'var(--primary-gold)', fontWeight: 'bold' }}>{memberCount}명</span>의 회원에게 메시지를 보냅니다.
                </div>

                {/* [NEW] Send Mode Selection — 3-way button group */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: '#a1a1aa' }}>전송 방식</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {SEND_MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setSendMode(mode.id)}
                                style={{
                                    flex: 1,
                                    padding: '10px 6px',
                                    borderRadius: '10px',
                                    border: sendMode === mode.id ? `2px solid ${mode.color}` : '1px solid rgba(255,255,255,0.1)',
                                    background: sendMode === mode.id ? `${mode.color}15` : 'rgba(255,255,255,0.03)',
                                    color: sendMode === mode.id ? mode.color : '#a1a1aa',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: sendMode === mode.id ? '700' : '500',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '3px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span style={{ fontSize: '1.1rem' }}>{mode.icon}</span>
                                <span>{mode.label}</span>
                                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{mode.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '16px' }}>
                    <textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="전송할 내용을 입력하세요..."
                        style={{
                            width: '100%', height: '120px', background: 'transparent', border: 'none',
                            color: 'white', fontSize: '1rem', resize: 'none', outline: 'none'
                        }}
                    />
                    
                    {/* Cost & SMS/LMS Info Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '10px', fontSize: '0.8rem', color: '#a1a1aa' }}>
                        {sendMode === 'push_only' ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <span>{message.length}자</span>
                                <span style={{ color: '#10b981', fontWeight: '600' }}>📱 앱 푸시 • 무료</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ 
                                        background: costInfo.isLMS ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                        color: costInfo.isLMS ? '#f59e0b' : '#10b981',
                                        padding: '2px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.7rem'
                                    }}>
                                        {costInfo.isLMS ? 'LMS' : 'SMS'}
                                    </span>
                                    <span>{message.length}자 • {costInfo.bytes}/{costInfo.isLMS ? 2000 : 90} bytes</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: costInfo.isLMS ? '#f59e0b' : '#10b981', fontWeight: '600' }}>
                                    <span>건당 {costInfo.costPerMsg}원</span>
                                    <span style={{ opacity: 0.6 }}>×</span>
                                    <span>{memberCount}명</span>
                                    <span style={{ opacity: 0.6 }}>=</span>
                                    <span style={{ fontWeight: '700' }}>약 {costInfo.totalCost.toLocaleString()}원</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Scheduling */}
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                    <input 
                        type="checkbox" 
                        id="bulkSchedule" 
                        checked={isScheduled} 
                        onChange={handleScheduleToggle}
                        style={{ accentColor: 'var(--primary-gold)', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="bulkSchedule" style={{ color: '#e4e4e7', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={16} /> 예약 발송
                    </label>
                    {isScheduled && (
                        <input 
                            ref={scheduleInputRef}
                            type="datetime-local" 
                            value={scheduledTime}
                            onChange={e => setScheduledTime(e.target.value)}
                            onClick={() => {
                                try {
                                    if(scheduleInputRef.current) scheduleInputRef.current.showPicker();
                                } catch(e) { /* ignore */ }
                            }}
                            style={{ 
                                background: 'rgba(255,255,255,0.1)', 
                                border: '1px solid rgba(255,255,255,0.2)', 
                                borderRadius: '6px', 
                                padding: '6px 8px', 
                                color: 'white', 
                                fontSize: '0.9rem',
                                marginLeft: 'auto',
                                cursor: 'pointer'
                            }}
                        />
                    )}
                </div>

                {/* Templates (Quick Text) */}
                <div style={{ marginBottom: '25px' }}>
                    <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '8px' }}>자주 쓰는 문구</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {templates.map((t, i) => (
                            <button
                                key={i}
                                onClick={() => setMessage(t)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '20px', padding: '6px 12px', color: '#e4e4e7', fontSize: '0.8rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {t.length > 15 ? t.substring(0, 15) + '...' : t}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleSend}
                    disabled={sending || !message.trim()}
                    style={{
                        width: '100%',
                        background: sending ? '#52525b' : 'var(--primary-gold)',
                        color: sending ? '#d4d4d8' : 'var(--text-on-primary)',
                        border: 'none', borderRadius: '12px', padding: '14px',
                        fontSize: '1rem', fontWeight: 'bold', cursor: sending ? 'wait' : 'pointer',
                        boxShadow: sending ? 'none' : '0 4px 12px rgba(var(--primary-rgb), 0.3)'
                    }}
                >
                    {sending ? '전송 중...' : (isScheduled ? '예약 발송하기' : '전송하기')}
                </button>
            </div>
        </div>
    );
};

export default BulkMessageModal;
