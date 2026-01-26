import React, { useState, useEffect } from 'react';
import { storageService } from '../../../services/storage';
import { onSnapshot, collection, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { db } from '../../../firebase';

const MessagesTab = ({ memberId }) => {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState([]);
    const [msgLimit, setMsgLimit] = useState(10);

    // [REAL-TIME] Unified Message History Listener
    useEffect(() => {
        if (!memberId) return;

        console.log(`[MessagesTab] Subscribing to messages for member: ${memberId}`);
        const q = query(
            collection(db, 'messages'),
            where("memberId", "==", memberId),
            // orderBy("timestamp", "desc"), // [FIX] Remove orderBy temporarily to avoid index issues
            firestoreLimit(msgLimit)
        );

        const unsub = onSnapshot(q, (snap) => {
            const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // [FIX] Sort client-side
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setHistory(logs);
        }, (err) => {
            console.error("[MessagesTab] History listener error:", err);
        });

        return () => unsub();
    }, [memberId, msgLimit]);

    const handleSend = async () => {
        if (!message.trim() || !memberId) return;
        if (!confirm('메시지를 실제 전송하시겠습니까? 회원의 스마트폰으로 푸시 알림이 즉시 발송됩니다.')) return;

        setSending(true);
        try {
            await storageService.addMessage(memberId, message);
            setMessage('');
            // UI will update automatically via onSnapshot listener
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
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="회원에게 보낼 메시지를 입력하세요..."
                    style={{
                        width: '100%', height: '80px', background: 'transparent', border: 'none',
                        color: 'white', fontSize: '1rem', resize: 'none', outline: 'none'
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                        onClick={handleSend}
                        disabled={sending || !message.trim()}
                        style={{
                            background: sending ? '#52525b' : 'var(--primary-gold)',
                            color: sending ? '#d4d4d8' : 'black',
                            border: 'none', borderRadius: '8px', padding: '10px 20px',
                            fontWeight: 'bold', cursor: sending ? 'wait' : 'pointer'
                        }}
                    >
                        {sending ? '전송 중...' : '전송 하기'}
                    </button>
                </div>
            </div>

            {/* Templates */}
            <div style={{ marginBottom: '25px' }}>
                <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '8px' }}>자주 쓰는 문구</p>
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
                <h4 style={{ color: 'var(--primary-gold)', fontSize: '0.95rem', marginBottom: '10px' }}>발송 이력</h4>
                {history.length === 0 ? (
                    <p style={{ color: '#52525b', textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>발송된 메시지가 없습니다.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {history.map(log => (
                            <div key={log.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '전송 중...'}
                                    </span>
                                    {log.pushStatus?.sent ? (
                                        <span style={{ fontSize: '0.8rem', color: '#10b981' }}>✅ 수신 확인</span>
                                    ) : (
                                        <span style={{ fontSize: '0.8rem', color: '#f59e0b' }}>전송 완료</span>
                                    )}
                                </div>
                                <div style={{ color: 'white', fontSize: '0.9rem' }}>{log.content}</div>
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
                )}
            </div>
        </div>
    );
};

export default MessagesTab;
