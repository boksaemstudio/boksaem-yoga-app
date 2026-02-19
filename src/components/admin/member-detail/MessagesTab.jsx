import { useState, useEffect, useRef } from 'react';

import { storageService } from '../../../services/storage';
import { onSnapshot, collection, query, where, orderBy, limit as firestoreLimit, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';

const MessagesTab = ({ memberId }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState([]);
    const [msgLimit, setMsgLimit] = useState(10);
    const [notices, setNotices] = useState([]);
    
    // [NEW] Scheduled Sending State
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const scheduleInputRef = useRef(null);

    // [Solapi] AlimTalk Templates
    const alimTalkTemplates = [
        { id: '', name: '일반 문자 (LMS/SMS)' },
        { id: 'KA01TP260219025216404VfhzWLRH3F5', name: '휴무일 오늘 수업변경안내 (단축)', content: '(템플릿 내용에 맞춰주세요)' },
        { id: 'KA01TP260219025023679E4NxugsIDNd', name: '휴무일 내일 수업변경안내 (단축)', content: '(템플릿 내용에 맞춰주세요)' },
        { id: 'KA01TP260219024739217NOCrSlZrNo0', name: '휴무일 수업안내 (전수업휴강)', content: '(템플릿 내용에 맞춰주세요)' }
    ];

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

    const handleTemplateSelect = (e) => {
        const id = e.target.value;
        setSelectedTemplateId(id);
    };

    // [REAL-TIME] Individual Message History Listener
    useEffect(() => {
        if (!memberId) return;

        console.log(`[MessagesTab] Subscribing to messages for member: ${memberId}`);
        const q = query(
            collection(db, 'messages'),
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
                    collection(db, 'push_history'),
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
        
        let method = selectedTemplateId ? '알림톡' : '문자(LMS)';
        let confirmMsg = `메시지를 실제 전송하시겠습니까? 회원의 스마트폰으로 ${method}가 발송됩니다.`;
        if (isScheduled) {
            if (!scheduledTime) {
                alert('예약 시간을 설정해주세요.');
                return;
            }
            const scheduledDate = new Date(scheduledTime);
            if (scheduledDate <= new Date()) {
                alert('예약 시간은 현재 시간 이후여야 합니다.');
                return;
            }
            confirmMsg = `메시지를 예약하시겠습니까?\n발송 예정: ${scheduledDate.toLocaleString()}`;
        }

        if (!confirm(confirmMsg)) return;

        setSending(true);
        try {
            await storageService.addMessage(
                memberId, 
                message, 
                isScheduled ? new Date(scheduledTime).toISOString() : null,
                selectedTemplateId
            );
            setMessage('');
            setIsScheduled(false);
            setScheduledTime('');
            setSelectedTemplateId('');
            if (isScheduled) alert('메시지가 예약되었습니다.');
        } catch (error) {
            console.error("Message send failed:", error);
            alert('발송에 실패했습니다. 네트워크 상태를 확인해주세요.');
        } finally {
            setSending(false);
        }
    };

    const templates = [
        "회원님, 재등록 기간입니다. 확인 부탁드려요! 🧘‍♀️",
        "안녕하세요! 이번 주 휴강 안내드립니다.",
        "오랜만이네요! 수련하러 오세요 ✨",
        "수강권이 7일 남았습니다."
    ];

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Input Area */}
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                
                {/* [Solapi] Template Selection */}
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#a1a1aa' }}>발송 유형 (알림톡/문자)</label>
                    <select
                        value={selectedTemplateId}
                        onChange={handleTemplateSelect}
                        style={{
                            width: '100%', padding: '8px', borderRadius: '8px',
                            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white', outline: 'none', cursor: 'pointer', fontSize: '0.9rem'
                        }}
                    >
                        {alimTalkTemplates.map(t => (
                            <option key={t.id} value={t.id} style={{ background: '#1d1d2b' }}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>

                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={selectedTemplateId ? "알림톡 템플릿 내용과 일치하게 입력해주세요." : "회원에게 보낼 메시지를 입력하세요..."}
                    style={{
                        width: '100%', height: '80px', background: 'transparent', border: 'none',
                        color: 'white', fontSize: '1rem', resize: 'none', outline: 'none'
                    }}
                />
                
                {/* [NEW] Cost Estimation */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', color: '#a1a1aa', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '8px' }}>
                    {(() => {
                        // Simple byte calculation (Korean ~2bytes, English 1byte)
                        // Solapi/LMS standard: SMS <= 90 bytes, LMS > 90 bytes
                        let bytes = 0;
                        for (let i = 0; i < message.length; i++) {
                            const code = message.charCodeAt(i);
                            bytes += (code >> 7) ? 2 : 1;
                        }
                        const isLMS = bytes > 90;
                        const cost = selectedTemplateId ? 15 : (isLMS ? 45 : 18); // Approx rates
                        return (
                            <span style={{ color: selectedTemplateId ? 'var(--primary-gold)' : (isLMS ? '#f59e0b' : '#10b981') }}>
                                {bytes} bytes ({selectedTemplateId ? '알림톡' : (isLMS ? 'LMS' : 'SMS')}) • 예상 비용: 약 {cost}원
                            </span>
                        );
                    })()}
                </div>

                {/* [NEW] Scheduling UI */}
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
                            background: sending ? '#52525b' : 'var(--primary-gold)',
                            color: sending ? '#d4d4d8' : 'black',
                            border: 'none', borderRadius: '8px', padding: '8px 20px',
                            fontWeight: 'bold', cursor: sending ? 'wait' : 'pointer'
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
                                    background: log.type === 'notice' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(0,0,0,0.3)', 
                                    padding: '12px', 
                                    borderRadius: '8px',
                                    border: log.type === 'notice' ? '1px solid rgba(212, 175, 55, 0.2)' : 'none'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ 
                                                fontSize: '0.7rem', 
                                                color: log.type === 'notice' ? 'var(--primary-gold)' : '#3B82F6',
                                                fontWeight: '700',
                                                padding: '2px 6px',
                                                background: log.type === 'notice' ? 'rgba(212, 175, 55, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                borderRadius: '4px'
                                            }}>
                                                {log.type === 'notice' ? '공지' : '개별'}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : '전송 중...'}
                                            </span>
                                        </div>
                                        {log.type === 'individual' && (
                                            log.pushStatus?.sent ? (
                                                <span style={{ fontSize: '0.8rem', color: '#10b981' }}>✅ 수신 확인</span>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>전송 완료</span>
                                            )
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
