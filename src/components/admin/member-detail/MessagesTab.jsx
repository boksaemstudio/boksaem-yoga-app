import { useState, useEffect, useRef } from 'react';

import { storageService } from '../../../services/storage';
import { onSnapshot, query, where, orderBy, limit as firestoreLimit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { tenantDb } from '../../../utils/tenantDb';
import { DeviceMobileSpeaker, PaperPlaneTilt, ChatText } from '@phosphor-icons/react';

const SEND_MODES = [
    { id: 'push_only', label: '앱 푸시만', desc: '무료', icon: '📱', color: '#10b981' },
    { id: 'push_first', label: '푸시 우선', desc: '푸시 실패 시 SMS', icon: '📱➡📩', color: 'var(--primary-gold)' },
    { id: 'sms_only', label: 'SMS/LMS만', desc: '문자 비용 발생', icon: '📩', color: '#3B82F6' }
];

const MessagesTab = ({ memberId, member, prefillMessage, onPrefillConsumed }) => {
    const isUnlimited = member && (member.credits >= 999999 || member.endDate === 'unlimited');
    const [attendanceSmsEnabled, setAttendanceSmsEnabled] = useState(member?.attendanceSmsEnabled || false);
    const [smsSaving, setSmsSaving] = useState(false);

    const handleToggleAttendanceSms = async () => {
        const newVal = !attendanceSmsEnabled;
        setSmsSaving(true);
        try {
            const memberRef = doc(tenantDb.collection('members'), memberId);
            await updateDoc(memberRef, { attendanceSmsEnabled: newVal });
            setAttendanceSmsEnabled(newVal);
        } catch (err) {
            console.error('[MessagesTab] Toggle SMS failed:', err);
            alert('설정 저장 실패');
        } finally {
            setSmsSaving(false);
        }
    };
    const [message, setMessage] = useState('');

    // 변경 내역 자동 채우기 (회원정보 저장 후 메시지 탭 이동 시)
    useEffect(() => {
        if (prefillMessage) {
            setMessage(prefillMessage);
            setSendMode('push_first');
            onPrefillConsumed?.();
        }
    }, [prefillMessage]);
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState([]);
    const [msgLimit, setMsgLimit] = useState(10);
    const [notices, setNotices] = useState([]);
    const [sendMode, setSendMode] = useState('push_first');
    
    // [NEW] Scheduled Sending State
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const scheduleInputRef = useRef(null);

    // [UX] Auto-open picker when scheduled is checked
    const handleScheduleToggle = (e) => {
        const checked = e.target.checked;
        setIsScheduled(checked);
        if (checked) {
            setTimeout(() => {
                try {
                    if (scheduleInputRef.current) scheduleInputRef.current.showPicker();
                } catch (e) {
                    // ignore
                }
            }, 100);
        }
    };

    // [REAL-TIME] Individual Message History Listener
    useEffect(() => {
        if (!memberId) return;

        console.log(`[MessagesTab] Subscribing to messages for member: ${memberId}`);
        const q = query(
            tenantDb.collection('messages'),
            where("memberId", "==", memberId),
            orderBy("timestamp", "desc"),
            firestoreLimit(msgLimit)
        );

        const unsub = onSnapshot(q, (snap) => {
            const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'individual' }));
            // [FIX] Sort client-side
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setHistory(logs);
        }, (err) => {
            console.error("[MessagesTab] History listener error:", err);
        });

        return () => unsub();
    }, [memberId, msgLimit]);

    // [NEW] Load Notice/Campaign Push History
    useEffect(() => {
        const loadNotices = async () => {
            try {
                const q = query(
                    tenantDb.collection('push_history'),
                    where('type', 'in', ['campaign', 'notice']),
                    orderBy('createdAt', 'desc'),
                    firestoreLimit(20)
                );
                const snapshot = await getDocs(q);
                const noticeList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    type: 'notice',
                    timestamp: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
                }));
                setNotices(noticeList);
            } catch (err) {
                console.error('[MessagesTab] Failed to load notices:', err);
            }
        };
        loadNotices();
    }, []);

    const handleSend = async () => {
        if (!message.trim() || !memberId) return;
        
        setSending(true);
        try {
            await storageService.addMessage(
                memberId, 
                message, 
                isScheduled ? new Date(scheduledTime).toISOString() : null,
                sendMode
            );
            const sentMsg = message;
            setMessage('');
            setIsScheduled(false);
            setScheduledTime('');
            // [UX FIX] 전송 성공 피드백
            alert(isScheduled ? '메시지가 예약되었습니다.' : '✅ 메시지가 전송되었습니다.');
        } catch (error) {
            console.error("Message send failed:", error);
            alert('❌ 발송에 실패했습니다. 네트워크 상태를 확인해주세요.');
        } finally {
            setSending(false);
        }
    };

    const templates = [
        "회원님, 재등록 기간입니다. 확인 부탁드려요! 🧘‍♀️",
        "오랜만이네요! 수련하러 오세요 ✨",
        "수강권이 곧 만료됩니다. 재등록을 안내드려요!",
        "잔여 횟수가 얼마 남지 않았어요. 확인해주세요!"
    ];

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* 출석 알림 설정 */}
            <div style={{ 
                background: 'rgba(255,255,255,0.05)', padding: '14px 16px', borderRadius: '12px', marginBottom: '16px',
                border: '1px solid rgba(255,255,255,0.08)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1rem' }}>📲</span>
                        <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: '700' }}>출석 알림 설정</span>
                    </div>
                </div>
                {/* 앱 푸시 안내 */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px', borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)',
                    marginBottom: '8px'
                }}>
                    <span style={{ fontSize: '0.8rem' }}>📱</span>
                    <span style={{ fontSize: '0.78rem', color: '#10b981' }}>
                        앱 푸시 알림: 출석 시 자동 전송 (잔여 횟수 · 기간 정보 포함, 무료)
                    </span>
                </div>
                {/* SMS 옵션 — 출석 시 자동 / 지금 보내기 */}
                {!isUnlimited ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {/* 자동 보내기 토글 */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 10px', borderRadius: '8px',
                            background: attendanceSmsEnabled ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${attendanceSmsEnabled ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.8rem' }}>📩</span>
                                <div>
                                    <div style={{ fontSize: '0.78rem', color: attendanceSmsEnabled ? '#3B82F6' : '#a1a1aa', fontWeight: attendanceSmsEnabled ? '700' : '500' }}>
                                        출석 시 자동 SMS 발송
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: '#71717a', marginTop: '2px' }}>
                                        ⚠️ 건당 8.4원 비용 발생 • 잔여횟수 · 기간 · 만료일
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleToggleAttendanceSms}
                                disabled={smsSaving}
                                style={{
                                    width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                                    background: attendanceSmsEnabled ? '#3B82F6' : 'rgba(255,255,255,0.15)',
                                    cursor: smsSaving ? 'not-allowed' : 'pointer',
                                    position: 'relative', transition: 'background 0.2s'
                                }}
                            >
                                <div style={{
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    background: 'white', position: 'absolute', top: '3px',
                                    left: attendanceSmsEnabled ? '22px' : '4px',
                                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                }} />
                            </button>
                        </div>
                        {/* 지금 보내기 버튼 */}
                        <button
                            onClick={() => {
                                setSendMode('sms_only');
                                const name = member?.name || '회원';
                                const credits = member?.credits;
                                const endDate = member?.endDate;
                                const count = member?.attendanceCount || 0;
                                const parts = [`${name} 회원님 출석 현황 안내`];
                                if (credits !== undefined && credits < 999999) parts.push(`잔여 ${credits}회`);
                                if (endDate && endDate !== 'TBD' && endDate !== 'unlimited') {
                                    const today = new Date();
                                    const end = new Date(endDate);
                                    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
                                    parts.push(`기간: ~${endDate.slice(5)} (${diff >= 0 ? diff + '일 남음' : '만료'})`);
                                }
                                if (count > 0) parts.push(`누적 ${count}회 출석`);
                                setMessage(parts.join('\n'));
                            }}
                            style={{
                                padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
                                color: '#3B82F6', fontSize: '0.78rem', fontWeight: '700',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                transition: 'all 0.15s'
                            }}
                        >
                            📤 지금 SMS로 잔여 정보 보내기
                            <span style={{ fontSize: '0.65rem', fontWeight: '500', opacity: 0.7 }}>(건당 8.4원)</span>
                        </button>
                    </div>
                ) : (
                    <div style={{
                        padding: '8px 10px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '0.78rem', color: '#71717a'
                    }}>
                        📩 SMS 알림: 무제한 회원은 보내지 않습니다 (잔여 횟수 정보 없음)
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                
                {/* [NEW] Send Mode Selection — 3-way radio */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#a1a1aa' }}>전송 방식</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {SEND_MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setSendMode(mode.id)}
                                style={{
                                    flex: 1,
                                    padding: '8px 6px',
                                    borderRadius: '8px',
                                    border: sendMode === mode.id ? `2px solid ${mode.color}` : '1px solid rgba(255,255,255,0.1)',
                                    background: sendMode === mode.id ? `${mode.color}15` : 'rgba(255,255,255,0.03)',
                                    color: sendMode === mode.id ? mode.color : '#a1a1aa',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: sendMode === mode.id ? '700' : '500',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span style={{ fontSize: '1rem' }}>{mode.icon}</span>
                                <span>{mode.label}</span>
                                <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{mode.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="회원에게 보낼 메시지를 입력하세요..."
                    style={{
                        width: '100%', height: '80px', background: 'transparent', border: 'none',
                        color: 'white', fontSize: '1rem', resize: 'none', outline: 'none'
                    }}
                />
                
                {/* Cost & SMS/LMS Info Bar */}
                <div style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: '0.8rem', color: '#a1a1aa', 
                    borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '8px'
                }}>
                    {(() => {
                        let bytes = 0;
                        for (let i = 0; i < message.length; i++) {
                            const code = message.charCodeAt(i);
                            bytes += (code >> 7) ? 2 : 1;
                        }
                        const isLMS = bytes > 90;
                        const smsCost = 8.4;
                        const lmsCost = 25;
                        const cost = sendMode === 'push_only' ? 0 : (isLMS ? lmsCost : smsCost);
                        const maxBytes = isLMS ? 2000 : 90;

                        return sendMode === 'push_only' ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <span>{message.length}자</span>
                                <span style={{ color: '#10b981', fontWeight: '600' }}>📱 앱 푸시 • 무료</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ 
                                        background: isLMS ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                        color: isLMS ? '#f59e0b' : '#10b981',
                                        padding: '2px 6px', borderRadius: '4px', fontWeight: '700', fontSize: '0.7rem'
                                    }}>
                                        {isLMS ? 'LMS' : 'SMS'}
                                    </span>
                                    <span>{message.length}자 • {bytes}/{maxBytes} bytes</span>
                                </div>
                                <span style={{ color: isLMS ? '#f59e0b' : '#10b981', fontWeight: '600' }}>
                                    건당 {cost}원{sendMode === 'push_first' ? ' (푸시 실패 시)' : ''}
                                </span>
                            </div>
                        );
                    })()}
                </div>

                {/* Scheduling UI */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                            type="checkbox" 
                            id="scheduleCheck" 
                            checked={isScheduled} 
                            onChange={handleScheduleToggle}
                            style={{ accentColor: 'var(--primary-gold)', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="scheduleCheck" style={{ color: '#e4e4e7', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            ⏰ 예약 발송
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
                                    } catch(e) {
                                        // ignore
                                    }
                                }}
                                style={{ 
                                    background: 'rgba(0,0,0,0.3)', 
                                    border: '1px solid rgba(255,255,255,0.2)', 
                                    borderRadius: '6px', 
                                    padding: '4px 8px', 
                                    color: 'white', 
                                    marginLeft: '8px',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                            />
                        )}
                    </div>
                
                    <button
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                        style={{
                            background: (sending || !message.trim()) ? '#52525b' : 'var(--primary-gold)',
                            color: (sending || !message.trim()) ? '#71717a' : 'var(--text-on-primary)',
                            border: 'none', borderRadius: '8px', padding: '8px 20px',
                            fontWeight: 'bold', 
                            cursor: (sending || !message.trim()) ? 'not-allowed' : 'pointer',
                            opacity: (sending || !message.trim()) ? 0.5 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        {sending ? '처리 중...' : (isScheduled ? '예약 하기' : '전송 하기')}
                    </button>
                </div>
            </div>

            {/* Templates */}
            <div style={{ marginBottom: '25px' }}>
                <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '8px' }}>자주 쓰는 문구 (비용 절약 💡)</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {templates.map((t, i) => (
                        <button
                            key={i}
                            onClick={() => setMessage(t)}
                            style={{
                                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '20px', padding: '8px 12px', color: '#e4e4e7', fontSize: '0.85rem',
                                cursor: 'pointer', textAlign: 'left'
                            }}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* History */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <h4 style={{ color: 'var(--primary-gold)', fontSize: '0.95rem', marginBottom: '10px' }}>발송 이력 (개별 + 공지)</h4>
                {(() => {
                    // Merge and sort messages and notices
                    const combined = [...history, ...notices];
                    combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    return combined.length === 0 ? (
                        <p style={{ color: '#52525b', textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>발송된 메시지가 없습니다.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {combined.map(log => (
                                <div key={log.id} style={{ 
                                    background: log.type === 'notice' ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(0,0,0,0.3)', 
                                    padding: '12px', 
                                    borderRadius: '8px',
                                    border: log.type === 'notice' ? '1px solid rgba(var(--primary-rgb), 0.2)' : 'none'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ 
                                                fontSize: '0.7rem', 
                                                color: log.type === 'notice' ? 'var(--primary-gold)' : '#3B82F6',
                                                fontWeight: '700',
                                                padding: '2px 6px',
                                                background: log.type === 'notice' ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                borderRadius: '4px'
                                            }}>
                                                {log.type === 'notice' ? '공지' : '개별'}
                                            </span>
                                            {/* Send Mode Badge */}
                                            {log.sendMode && (
                                                <span style={{ fontSize: '0.65rem', color: '#a1a1aa', padding: '1px 4px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                                                    {log.sendMode === 'push_only' ? '📱푸시' : log.sendMode === 'sms_only' ? '📩SMS' : '📱➡📩'}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                                                {log.timestamp ? new Date(log.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '전송 중...'}
                                            </span>
                                        </div>
                                        {log.type === 'individual' && (
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                {/* Push Status */}
                                                {log.pushStatus && (
                                                    log.pushStatus.sent ? (
                                                        <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>앱푸시 성공</span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.75rem', color: '#6b7280', background: 'rgba(107, 114, 128, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>앱푸시 실패</span>
                                                    )
                                                )}
                                                
                                                {/* SMS Status — 앱 푸시만 모드에서는 숨기기 */}
                                                {log.sendMode !== 'push_only' && (() => {
                                                    const st = log.smsStatus || log.solapiStatus;
                                                    if (!st) return null;
                                                    return st.sent ? (
                                                        <span style={{ fontSize: '0.75rem', color: '#3B82F6', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                                            문자 성공
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }} title={st.error || '알 수 없는 오류'}>
                                                            문자 실패
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ color: 'white', fontSize: '0.9rem' }}>{log.content || log.body}</div>
                                </div>
                            ))}

                            {/* Pagination: Load More */}
                            {history.length >= msgLimit && (
                                <button
                                    onClick={() => setMsgLimit(prev => prev + 10)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: '#a1a1aa',
                                        border: '1px dashed rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        marginTop: '5px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    ▿ 이전 메시지 더보기 (10개 추가)
                                </button>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default MessagesTab;
