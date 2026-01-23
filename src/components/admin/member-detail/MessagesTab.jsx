import React from 'react';

const MessagesTab = () => {
    const [message, setMessage] = React.useState('');
    const [sending, setSending] = React.useState(false);
    const [history, setHistory] = React.useState([]);

    const handleSend = async () => {
        if (!message.trim()) return;
        if (!confirm('메시지를 전송하시겠습니까? (현재는 알림 전송만 시뮬레이션 됩니다)')) return;

        setSending(true);
        await new Promise(r => setTimeout(r, 1000));

        const newLog = {
            id: Date.now(),
            text: message,
            date: new Date().toISOString(),
            status: 'success'
        };
        setHistory([newLog, ...history]);
        setMessage('');
        setSending(false);
        alert('메시지가 전송되었습니다.');
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
                                    <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>{new Date(log.date).toLocaleString()}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#10b981' }}>전송 완료</span>
                                </div>
                                <div style={{ color: 'white', fontSize: '0.9rem' }}>{log.text}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesTab;
