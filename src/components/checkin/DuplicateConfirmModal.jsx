import { useStudioConfig } from '../../contexts/StudioContext';

const DuplicateConfirmModal = ({
    show,
    duplicateTimer,
    onCancel,
    onConfirm
}) => {
    const { config } = useStudioConfig();
    if (!show) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: 'rgba(30,30,30,0.98)',
                backdropFilter: 'blur(30px)',
                border: '2px solid rgba(255,80,80,0.5)',
                borderRadius: '28px',
                padding: '30px 40px',
                maxWidth: '750px',
                width: '95%',
                textAlign: 'center',
                boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
                animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚠️</div>
                <h3 style={{
                    color: '#ff6b6b',
                    fontSize: '2rem',
                    fontWeight: 800,
                    marginBottom: '12px',
                    textShadow: '0 2px 10px rgba(255,107,107,0.3)'
                }}>잠깐만요! 방금 출석하셨어요</h3>

                <p style={{ color: 'white', fontSize: '1.3rem', lineHeight: 1.4, marginBottom: '6px', fontWeight: 600 }}>
                    혹시 <span style={{ color: '#ffd700' }}>가족/친구분</span>과 함께 오셨나요?
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', marginBottom: '25px' }}>
                    아니라면, 아래 <span style={{ color: '#ff6b6b', textDecoration: 'underline' }}>빨간 버튼</span>을 눌러주세요!
                </p>

                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onCancel(); }}
                        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onCancel(); }}
                        style={{
                            flex: '1 1 280px',
                            padding: '20px 15px',
                            borderRadius: '20px',
                            border: '3px solid #ff6b6b',
                            background: 'rgba(255,107,107,0.15)',
                            color: '#ff6b6b',
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 10px 30px rgba(255,107,107,0.2)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>😱 잘못 눌렀어요!</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, opacity: 0.8 }}>(취소하기)</span>
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onConfirm(); }}
                        style={{
                            flex: '1 1 280px',
                            padding: '20px 15px',
                            borderRadius: '20px',
                            border: 'none',
                            background: `linear-gradient(135deg, ${config.THEME?.PRIMARY_COLOR || 'var(--primary-gold)'}, #f5d76e)`,
                            color: 'var(--text-on-primary)',
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 10px 30px rgba(var(--primary-rgb), 0.4)',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>🙆‍♀️ 네, 또 왔어요</span>
                    </button>
                </div>

                <div style={{
                    marginTop: '20px',
                    padding: '12px 15px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '14px',
                    border: '1px dashed rgba(255,255,255,0.2)'
                }}>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem', marginBottom: '6px' }}>
                        아무것도 안 누르면...
                    </p>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffd700' }}>
                        <span style={{ fontSize: '1.5rem', color: '#fff' }}>{duplicateTimer}</span>초 뒤 자동으로 <span style={{ textDecoration: 'underline' }}>출석 처리</span>됩니다
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DuplicateConfirmModal;
